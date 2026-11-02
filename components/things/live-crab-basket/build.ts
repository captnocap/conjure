import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

const KINDS = {
  mud: { size: 0.155, shell: '#4f5d3a', claw: [1.9, 1.1, 0.55], long: 1 },
  hairy: { size: 0.1, shell: '#66703c', claw: [0.45, 0.36, 0.3], long: 0.9 },
  flower: { size: 0.14, shell: '#3f5fae', claw: [1.25, 1.1, 1.5], long: 1.5 },
  red: { size: 0.13, shell: '#c9482a', claw: [1.15, 0.9, 0.8], long: 1 },
} as const;
type Kind = keyof typeof KINDS;

/** A trussed crab one unit wide: carapace, folded claws and tucked legs, shaded by vertex colour. */
function trussed(claw: readonly number[], long: number) {
  const pieces: THREE.BufferGeometry[] = [];
  const piece = (size: [number, number, number], at: [number, number, number], tint: readonly number[], turn = 0, segments = 10) => {
    const g = new THREE.SphereGeometry(1, segments, Math.max(6, segments / 2)).toNonIndexed();
    g.scale(...size); g.rotateY(turn); g.translate(...at);
    const n = g.getAttribute('position').count, colours = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { const light = mix(0.7, 1.1, THREE.MathUtils.clamp(g.getAttribute('position').getY(i) / 0.3 + 0.5, 0, 1)); colours.set([tint[0] * light, tint[1] * light, tint[2] * light], i * 3); }
    g.setAttribute('color', new THREE.BufferAttribute(colours, 3));
    pieces.push(g);
  };
  piece([0.5, 0.17, 0.36], [0, 0, 0], [1, 1, 1], 0, 14);
  piece([0.3, 0.1, 0.12], [0, 0.02, 0.26], [0.85, 0.85, 0.85]);
  for (const side of [-1, 1]) {
    piece([0.18 * long, 0.085, 0.1], [side * 0.2, -0.02, 0.42], claw, side * 0.25);
    piece([0.12 * long, 0.035, 0.045], [side * 0.03, -0.01, 0.5], [0.2, 0.17, 0.15], side * 0.1, 8);
    piece([0.025, 0.035, 0.025], [side * 0.11, 0.13, 0.3], [0.1, 0.1, 0.1], 0, 6);
    for (let k = 0; k < 3; k++) piece([0.17, 0.04, 0.05], [side * 0.5, -0.05, 0.14 - k * 0.14], [0.8, 0.8, 0.75], side * (0.5 + k * 0.25), 8);
  }
  return mergeGeometries(pieces)!;
}
function strings() {
  const loop = (rx: number, ry: number, axis: 'x' | 'z', offset: number) => {
    const g = new THREE.TorusGeometry(1, 0.035, 5, 20).toNonIndexed();
    g.scale(rx, ry, 1);
    if (axis === 'z') { g.rotateY(Math.PI / 2); g.translate(offset, 0, 0.08); } else g.translate(0, 0, offset);
    return g;
  };
  return mergeGeometries([loop(0.56, 0.2, 'x', 0.06), loop(0.46, 0.2, 'z', -0.14), loop(0.46, 0.2, 'z', 0.14)])!;
}

export default defineThing({
  questions: {
    kind: choice('What kind of crabs are they?', {
      mud: 'Big dark olive mud crabs with heavy orange claws.',
      hairy: 'Small green-brown hairy crabs with dark furred claws, the autumn delicacy.',
      flower: 'Blue flower crabs with long thin claws.',
      red: 'Rust-red spotted reef crabs.',
      mixed: 'Several kinds in together, sorted by nobody.',
    }),
    count: score('How many crabs?', ['Two or three left', 'A single neat layer', 'A full basket', 'Heaped two deep', 'Overflowing, crabs on crabs']),
    holder: choice('What are they in?', {
      both: 'A shallow woven bamboo basket with a blue plastic tub beside it.',
      basket: 'Just the wide woven basket.',
      tub: 'A round red plastic basin with a little water.',
      foam: 'A white polystyrene box with the lid off.',
    }),
    tie: choice('What are they tied with?', {
      grass: 'Wet green rush grass, wound tight in a cross.',
      raffia: 'Pink plastic raffia.',
      straw: 'Thick yellow rice straw, half hiding each crab.',
    }),
    escape: choice('Has one got loose?', {
      none: 'No. All trussed and resigned.',
      floor: 'Yes: one is on the floor, sidling away with its string trailing.',
      rim: 'Yes: one is hauling itself over the rim.',
      defiant: 'Yes: one stands on the floor with both claws raised at you.',
    }),
    card: choice('What does the price card say, if there is one?', {
      price: 'A price per catty in red marker.',
      season: 'IN SEASON, underlined twice.',
      last: 'LAST FEW.',
      none: 'There is no card.',
    }),
    stand: choice('What is it standing on?', {
      floor: 'The wet floor.',
      crate: 'An upturned plastic crate.',
      sack: 'A folded hessian sack, damp and dark.',
    }),
    lining: choice('What lines the crab containers?', { bare: 'The container bottom is bare.', leaves: 'Broad green leaves overlap beneath the crabs.', straw: 'A thin bed of yellow straw.', cloth: 'A blue cloth folded under the catch.' }),
    rimBinding: choice('What reinforces the container rims?', { plain: 'The original rim alone.', rope: 'A thick rope around each rim.', clips: 'Four metal repair clips.', cord: 'A red cord laced around the edge.' }),
    handles: choice('How are the containers lifted?', { none: 'By the rim alone.', loops: 'Two upright rope loops.', bars: 'Two short wooden grips.', sling: 'A rope carrying sling around the sides.' }),
    cover: choice('What cover is kept behind the crabs?', { none: 'No cover.', lid: 'A woven lid propped on the floor.', net: 'A net on a hoop leaning behind the basket.', board: 'A slatted wooden cover laid behind it.' }),
    tyingKit: choice('What is used to tie the next crab?', { none: 'No tying kit.', spool: 'A raffia spool with loose cord.', shears: 'A pair of shears beside a grass bundle.', bundles: 'Three tied bundles of rush grass.' }),
    sortingTray: choice('What sorting tray sits beside the basket?', { none: 'No extra tray.', enamel: 'A shallow white enamel tray.', divided: 'A wooden tray divided into three compartments.', scale: 'A small tabletop balance with an empty pan.' }),
    scoop: choice('What tool rests across the nearest rim?', { none: 'No tool.', bamboo: 'Long split bamboo tongs.', metal: 'A pair of curved steel tongs.', net: 'A small dip net with a wooden handle.' }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const kinds = Object.keys(KINDS) as Kind[];
    const stringColour = { grass: '#7fa04a', raffia: '#ef6f9a', straw: '#d9bc5a' }[a.tie];
    const stringMaterial = s.material(stringColour, { roughness: 0.8 });
    const shellMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: mix(0.3, 0.55, mood.wear) });
    const wet = new THREE.MeshStandardMaterial({ color: '#7d959c', roughness: 0.08, metalness: 0.5, transparent: true, opacity: 0.42, depthWrite: false });

    // Stand.
    let baseY = 0;
    const twoWide = a.holder === 'both';
    if (a.stand === 'crate') {
      const crate = s.material(pick(['#c9372c', '#2f6fb3', '#e0a52a', '#3f9a5a']), { roughness: 0.6 });
      const w = twoWide ? 1.8 : 0.95;
      s.box([w, 0.26, 0.9], [twoWide ? 0.45 : 0, 0.13, 0], crate);
      for (let i = 0; i < Math.round(w / 0.14); i++) s.box([0.08, 0.16, 0.905], [(twoWide ? 0.45 : 0) - w / 2 + 0.1 + i * 0.14, 0.13, 0], s.material('#231a1a'));
      baseY = 0.26;
    } else if (a.stand === 'sack') {
      const sack = s.box([twoWide ? 2.0 : 1.1, 0.035, 1.05], [twoWide ? 0.45 : 0, 0.018, 0], s.material('#8a744c', { roughness: 1 }));
      sack.rotation.y = (random() - 0.5) * 0.2;
      baseY = 0.036;
    }

    // Containers.
    const weave = (() => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 128;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 128, 128);
      for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
        ctx.fillStyle = (x + y) % 2 ? 'rgba(90,60,20,0.35)' : 'rgba(255,240,200,0.3)'; ctx.fillRect(x * 16, y * 16, 16, 16);
        ctx.fillStyle = 'rgba(60,40,10,0.4)'; if ((x + y) % 2) ctx.fillRect(x * 16, y * 16, 16, 2); else ctx.fillRect(x * 16, y * 16, 2, 16);
      }
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace; texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(10, 3);
      return texture;
    })();
    type Bed = { x: number; y: number; r: number; square?: boolean; rimY: number };
    const beds: Bed[] = [];
    const cane = new THREE.Color('#c9a468').lerp(new THREE.Color('#7a5a36'), mood.wear * 0.7);
    const basket = (x: number) => {
      const R = 0.46;
      s.lathe([[0, 0.012], [0.36, 0.012], [R - 0.02, 0.09], [R, 0.125], [R + 0.012, 0.125], [R - 0.008, 0.08], [0.37, 0], [0, 0]], new THREE.MeshStandardMaterial({ color: cane, map: weave, roughness: 0.85, side: THREE.DoubleSide }), [x, baseY, 0]);
      s.ring(R + 0.004, 0.014, [x, baseY + 0.125, 0], s.material(cane.clone().multiplyScalar(0.7), { roughness: 0.8 })).rotation.x = Math.PI / 2;
      beds.push({ x, y: baseY + 0.02, r: 0.38, rimY: baseY + 0.135 });
    };
    const tub = (x: number, colour: string) => {
      const R = 0.38;
      s.lathe([[0, 0.012], [0.31, 0.012], [R - 0.01, 0.16], [R + 0.02, 0.17], [R + 0.02, 0.155], [R, 0.15], [0.32, 0], [0, 0]], s.material(colour, { roughness: 0.4, side: THREE.DoubleSide }), [x, baseY, 0]);
      const water = s.cylinder(0.33, 0.315, 0.02, [x, baseY + 0.04, 0], wet, 24);
      water.castShadow = false;
      beds.push({ x, y: baseY + 0.02, r: 0.3, rimY: baseY + 0.18 });
    };
    if (a.holder === 'both') { basket(0); tub(0.92, '#2a72c4'); }
    else if (a.holder === 'basket') basket(0);
    else if (a.holder === 'tub') tub(0, '#d6322c');
    else {
      const foam = s.material('#f3f3ee', { roughness: 0.95 });
      s.box([0.86, 0.03, 0.6], [0, baseY + 0.015, 0], foam);
      for (const z of [-1, 1]) s.box([0.86, 0.17, 0.04], [0, baseY + 0.085, z * 0.28], foam);
      for (const x of [-1, 1]) s.box([0.04, 0.17, 0.6], [x * 0.41, baseY + 0.085, 0], foam);
      const lid = s.box([0.86, 0.045, 0.6], [-0.03, baseY + 0.24, -0.42], foam);
      lid.rotation.x = -1.25;
      beds.push({ x: 0, y: baseY + 0.035, r: 0.26, square: true, rimY: baseY + 0.18 });
    }

    for(const bed of beds)if(a.lining!=='bare') {
      const mat=s.material(a.lining==='leaves'?'#496849':a.lining==='straw'?'#c8a75b':'#659ca5');
      if(a.lining==='cloth')s.box([bed.square?.7:bed.r*1.5,.006,bed.r*1.3],[bed.x,bed.y+.004,0],mat);
      else if(a.lining==='leaves')for(let i=0;i<5;i++)s.ball([bed.r*.5,.006,bed.r*.32],[bed.x+Math.sin(i*1.25)*bed.r*.4,bed.y+.004,Math.cos(i*1.25)*bed.r*.4],mat,12).rotation.y=i*1.25;
      else for(let i=0;i<25;i++){const t=i*2.4,r=bed.r*.65*Math.sqrt((i+.5)/25);s.rod([bed.x+Math.cos(t)*r-.04,bed.y+.004,Math.sin(t)*r-.025],[bed.x+Math.cos(t)*r+.04,bed.y+.004,Math.sin(t)*r+.025],.003,mat);}
      bed.y+=.008;
    }
    // Lay the crabs.
    const placed: { kind: Kind; at: THREE.Vector3; turn: number; tilt: number; size: number }[] = [];
    beds.forEach((bed, bedIndex) => {
      const kind: Kind = a.kind === 'mixed' ? kinds[(bedIndex + Math.floor(random() * 4)) % 4] : a.kind;
      const base = KINDS[kind].size;
      const share = bedIndex === 0 ? a.count : a.count * mix(0.4, 0.9, random());
      const perLayer = Math.max(2, Math.floor((bed.r * bed.r * (bed.square ? 5.2 : 3.4)) / (base * base * 1.25)));
      const want = Math.max(2, Math.round(mix(0.25, 2.3, share) * perLayer * mix(0.85, 1, mood.density)));
      const spots: THREE.Vector3[] = [];
      let tries = 0;
      while (spots.length < want && tries++ < 900) {
        const layer = Math.floor(spots.length / perLayer);
        const reach = Math.max(base * 0.3, bed.r - base * 0.42 + layer * 0.02 - layer * base * 0.25);
        const t = random() * Math.PI * 2, r = Math.sqrt(random()) * reach;
        const p = new THREE.Vector3(bed.x + Math.cos(t) * r * (bed.square ? 1.45 : 1), bed.y + base * 0.2 + layer * base * 0.3, Math.sin(t) * r);
        if (spots.slice(layer * perLayer).some((q) => q.distanceTo(p) < base * (tries > 500 ? 0.7 : 0.9))) continue;
        spots.push(p);
      }
      for (const at of spots) placed.push({ kind: a.kind === 'mixed' && random() < 0.35 ? pick(kinds) : kind, at, turn: random() * Math.PI * 2, tilt: (random() - 0.5) * 0.35, size: KINDS[kind].size * mix(0.85, 1.12, random()) });
    });

    const matrix = new THREE.Matrix4(), q = new THREE.Quaternion();
    const stringGeometry = strings();
    for (const kind of kinds) {
      const mine = placed.filter((one) => one.kind === kind);
      if (!mine.length) continue;
      const spec = KINDS[kind];
      const bodies = new THREE.InstancedMesh(trussed(spec.claw, spec.long), shellMaterial, mine.length);
      const ties = new THREE.InstancedMesh(stringGeometry, stringMaterial, mine.length);
      mine.forEach((one, index) => {
        q.setFromEuler(new THREE.Euler(one.tilt, one.turn, one.tilt * 0.6));
        matrix.compose(one.at, q, new THREE.Vector3(one.size, one.size, one.size));
        bodies.setMatrixAt(index, matrix);
        bodies.setColorAt(index, new THREE.Color(spec.shell).offsetHSL((random() - 0.5) * 0.03, 0, (random() - 0.5) * 0.08));
        const thick = a.tie === 'straw' ? 1.5 : 1;
        matrix.compose(one.at, q, new THREE.Vector3(one.size, one.size * thick, one.size));
        ties.setMatrixAt(index, matrix);
      });
      bodies.castShadow = bodies.receiveShadow = ties.castShadow = true;
      s.root.add(bodies, ties);
    }

    // A few free claws working slowly above the pile.
    const movers: { pivot: THREE.Object3D; phase: number; reach: number }[] = [];
    const plain = (colour: THREE.ColorRepresentation) => new THREE.MeshStandardMaterial({ color: colour, roughness: mix(0.3, 0.55, mood.wear) });
    const ball = new THREE.SphereGeometry(1, 12, 8);
    const add = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, at: [number, number, number], scale: [number, number, number], turn: [number, number, number] = [0, 0, 0]) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...at); mesh.scale.set(...scale); mesh.rotation.set(...turn);
      mesh.castShadow = true;
      parent.add(mesh);
      return mesh;
    };
    const clawOf = (kind: Kind, size: number) => {
      const spec = KINDS[kind];
      const colour = new THREE.Color(spec.shell).multiply(new THREE.Color(spec.claw[0], spec.claw[1], spec.claw[2]));
      const arm = new THREE.Group();
      const material = plain(colour), tip = plain('#231c18');
      add(arm, ball, material, [0, size * 0.2, 0], [size * 0.07, size * 0.22, size * 0.07]);
      const hand = new THREE.Group();
      hand.position.y = size * 0.42;
      add(hand, ball, material, [0, size * 0.12, 0], [size * 0.1, size * 0.17 * spec.long, size * 0.085]);
      add(hand, new THREE.ConeGeometry(size * 0.045, size * 0.22 * spec.long, 6), tip, [size * 0.035, size * (0.3 + 0.08 * spec.long), 0], [1, 1, 1]);
      const thumb = new THREE.Group();
      thumb.position.set(-size * 0.04, size * 0.2, 0);
      add(thumb, new THREE.ConeGeometry(size * 0.035, size * 0.2 * spec.long, 6), tip, [0, size * 0.1 * spec.long, 0], [1, 1, 1]);
      thumb.rotation.z = 0.5;
      hand.add(thumb);
      arm.add(hand);
      movers.push({ pivot: thumb, phase: random() * 6, reach: 0.35 }, { pivot: hand, phase: random() * 6, reach: 0.2 });
      return arm;
    };
    const topmost = placed.slice().sort((p, r) => r.at.y - p.at.y).slice(0, Math.min(placed.length, 1 + Math.round(mood.energy * 3)));
    for (const one of topmost) {
      const arm = clawOf(one.kind, one.size);
      arm.position.copy(one.at).add(new THREE.Vector3(Math.sin(one.turn) * one.size * 0.3, one.size * 0.05, Math.cos(one.turn) * one.size * 0.3));
      arm.rotation.set((random() - 0.3) * 0.7, one.turn, (random() - 0.5) * 0.8);
      s.root.add(arm);
    }

    // The one that got loose.
    let runner: THREE.Group | null = null;
    const legs: THREE.Object3D[] = [];
    if (a.escape !== 'none') {
      const kind: Kind = a.kind === 'mixed' ? pick(kinds) : a.kind;
      const spec = KINDS[kind], size = spec.size * 1.5;
      const shell = plain(spec.shell);
      const crab = new THREE.Group(); crab.name = 'escaped-crab';
      add(crab, ball, shell, [0, 0, 0], [size * 0.5, size * 0.17, size * 0.36]);
      for (const side of [-1, 1]) {
        add(crab, ball, plain('#141414'), [side * size * 0.11, size * 0.15, size * 0.3], [size * 0.028, size * 0.04, size * 0.028]);
        for (let k = 0; k < 4; k++) {
          const leg = new THREE.Group();
          leg.position.set(side * size * 0.4, 0, size * (0.16 - k * 0.12));
          add(leg, ball, shell, [side * size * 0.22, size * 0.1, 0], [size * 0.25, size * 0.035, size * 0.04], [0, 0, side * 0.45]);
          add(leg, ball, shell, [side * size * 0.52, -size * 0.06, 0], [size * 0.035, size * 0.25, size * 0.035], [0, 0, side * 0.5]);
          leg.rotation.y = side * (k - 1.5) * -0.3;
          crab.add(leg); legs.push(leg);
        }
        const arm = clawOf(kind, size);
        arm.position.set(side * size * 0.3, 0, size * 0.3);
        arm.rotation.set(a.escape === 'defiant' ? 0.25 : 1.2, 0, side * (a.escape === 'defiant' ? -0.5 : -0.9));
        crab.add(arm);
      }
      const bed = beds[0];
      const heading = mix(-0.5, 0.9, random());
      if (a.escape === 'rim') {
        const rim = (bed.square ? 0.3 : bed.r + 0.07);
        crab.position.set(bed.x + Math.sin(heading) * rim * (bed.square ? 0.4 : 1), bed.rimY + size * 0.12, bed.square ? 0.3 : Math.cos(heading) * rim);
        crab.rotation.set(-0.75, bed.square ? 0 : heading, 0, 'YXZ');
      } else {
        const out = (bed.square ? 0.6 : bed.r + 0.36) + random() * 0.12;
        crab.position.set(bed.x + Math.sin(heading) * out, size * 0.3, Math.cos(heading) * out + 0.05);
        crab.rotation.y = a.escape === 'defiant' ? heading * 0.3 : heading + Math.PI / 2;
        if (a.escape === 'defiant') crab.rotation.x = -0.3;
        // Its string, left behind.
        const from = crab.position, mid = bed.r * 0.9 + 0.2;
        s.tube([[from.x - 0.02, 0.008, from.z - 0.03], [from.x * 0.8 + 0.06, 0.008, mid * 0.9], [bed.x + 0.1, 0.008, mid * 0.8], [bed.x + 0.03, 0.008, mid * 0.62]], 0.006, stringMaterial);
      }
      s.root.add(crab);
      runner = crab;
    }

    // Price card on a split bamboo stick.
    if (a.card !== 'none') {
      const text = a.card === 'price' ? pick(['$280', '$160', '$88', '$320']) : a.card === 'season' ? 'IN SEASON' : 'LAST FEW';
      const bed = beds[0];
      const cx = bed.x - bed.r * 0.55, cz = -bed.r * 0.75, cy = bed.rimY + 0.2;
      s.rod([cx, bed.y, cz], [cx, cy, cz - 0.02], 0.006, s.material('#b9966a'));
      const label = s.label(text, 0.24, 0.13, [cx, cy + 0.04, cz - 0.015], '#d01f26', pick(['#f7f5ee', '#f3ee3a', '#f3e9c8']));
      label.rotation.set(-0.2, (random() - 0.5) * 0.3, (random() - 0.5) * 0.14);
    }
    // Damp ring on the ground.
    const damp = s.cylinder(1, 1, 0.004, [twoWide ? 0.45 : 0, 0.002, 0.05], wet, 28);
    damp.scale.set(twoWide ? 1.2 : 0.75, 1, 0.65); damp.castShadow = false;

    const caneMat=s.material(cane),ropeMat=s.material('#b29b6b'),metal=s.material('#b8c1c4',{metalness:.6,roughness:.4});
    for(const bed of beds) {
      const radius=bed.square?.4:bed.r+.07, rim=bed.rimY;
      if(a.rimBinding==='rope') {
        if(bed.square)for(const z of[-.28,.28])s.rod([bed.x-.4,rim,z],[bed.x+.4,rim,z],.012,ropeMat);
        else s.ring(radius,.012,[bed.x,rim,0],ropeMat).rotation.x=Math.PI/2;
      } else if(a.rimBinding==='clips')for(let i=0;i<4;i++){const t=Math.PI/4+i*Math.PI/2;const x=bed.square?Math.sign(Math.sin(t))*.4:Math.sin(t)*radius,z=bed.square?Math.sign(Math.cos(t))*.25:Math.cos(t)*radius;s.box([.025,.08,.035],[bed.x+x,rim-.015,z],metal).rotation.y=t;}
      else if(a.rimBinding==='cord')for(let i=0;i<12;i++){const t=i*Math.PI/6,x=bed.square?Math.sin(t)*.39:Math.sin(t)*radius,z=bed.square?Math.cos(t)*.28:Math.cos(t)*radius;s.ring(.018,.004,[bed.x+x,rim,z],s.material('#b5362e')).rotation.y=t;}
      for(const side of[-1,1]) {
        const x=bed.x+side*(bed.square?.415:radius);
        if(a.handles==='loops')s.ring(.055,.008,[x,rim+.04,0],ropeMat,Math.PI).rotation.y=Math.PI/2;
        else if(a.handles==='bars'){s.rod([x,rim,-.07],[x,rim,.07],.018,caneMat);for(const z of[-.055,.055])s.rod([x-side*.035,rim-.03,z],[x,rim,z],.007,ropeMat);}
        else if(a.handles==='sling')s.tube([[bed.x,baseY+.005,-.1],[x,baseY+.05,0],[x*1+(bed.x-x)*.15,rim+.2,0],[bed.x,rim+.33,0]],.008,ropeMat);
      }
    }
    if(a.cover!=='none') {
      const coverGroup=new THREE.Group();s.root.add(coverGroup);
      const add=(obj:THREE.Object3D)=>{coverGroup.add(obj);return obj;};
      if(a.cover==='board')for(let i=0;i<6;i++)add(s.box([.1,.025,.55],[-.275+i*.11,0,0],caneMat));
      else {
        const mesh=add(s.ring(.37,.014,[0,0,0],caneMat));mesh.rotation.x=Math.PI/2;
        if(a.cover==='lid')add(s.cylinder(.36,.36,.012,[0,0,0],new THREE.MeshStandardMaterial({color:cane,map:weave,roughness:.8}),28));
        else for(let i=-4;i<=4;i++){const x=i*.075,reach=Math.sqrt(.36*.36-x*x);add(s.rod([x,0,-reach],[x,0,reach],.002,ropeMat));add(s.rod([-reach,0,x],[reach,0,x],.002,ropeMat));}
      }
      coverGroup.position.set(twoWide?.45:0,0,-.68);coverGroup.rotation.x=a.cover==='board'?0:1.05;
      coverGroup.updateMatrixWorld(true);coverGroup.position.y-=new THREE.Box3().setFromObject(coverGroup,true).min.y;
    }
    const kx=twoWide?1.55:.68,kz=-.38;
    if(a.tyingKit==='spool'){s.cylinder(.055,.055,.1,[kx,.05,kz],stringMaterial,16);for(const y of[.008,.092])s.cylinder(.07,.07,.016,[kx,y,kz],caneMat,16);s.tube([[kx,.015,kz],[kx+.1,.005,kz+.04],[kx+.18,.005,kz-.03]],.004,stringMaterial);}
    else if(a.tyingKit==='shears'){for(const x of[-.025,.025])s.ring(.025,.006,[kx+x,.007,kz-.05],metal).rotation.x=Math.PI/2;s.rod([kx-.02,.007,kz],[kx+.025,.007,kz+.12],.008,metal);s.rod([kx+.02,.007,kz],[kx-.025,.007,kz+.12],.008,metal);for(let i=0;i<9;i++)s.rod([kx+.08+i*.005,.005,kz-.08],[kx+.1+i*.005,.005,kz+.16],.003,ropeMat);}
    else if(a.tyingKit==='bundles')for(let j=0;j<3;j++){for(let i=0;i<7;i++)s.rod([kx+(i-3)*.006,.006+j*.014,kz-.15],[kx+(i-3)*.006,.006+j*.014,kz+.15],.004,ropeMat);s.box([.055,.018,.012],[kx,.007+j*.014,kz],stringMaterial);}
    if(a.sortingTray!=='none') {
      const x=-.76,z=.05,mat=a.sortingTray==='enamel'?s.material('#ebe9d8'):caneMat;
      s.box([.35,.025,.48],[x,.0125,z],mat);
      if(a.sortingTray==='scale'){s.cylinder(.07,.08,.12,[x,.085,z],metal,16);s.rod([x-.14,.17,z],[x+.14,.17,z],.009,metal);s.lathe([[0,0],[.12,0],[.15,.035]],metal,[x,.17,z]);}
      else {for(const dx of[-.165,.165])s.box([.02,.06,.48],[x+dx,.04,z],mat);for(const dz of[-.23,.23])s.box([.35,.06,.02],[x,.04,z+dz],mat);if(a.sortingTray==='divided')for(const dz of[-.08,.08])s.box([.33,.06,.014],[x,.04,z+dz],mat);}
    }
    if(a.scoop!=='none') {
      const bed=beds[0],y=bed.rimY+.014,z=.05;
      if(a.scoop==='net'){s.rod([bed.x-.48,y,z],[bed.x+.03,y,z],.01,caneMat);s.ring(.115,.006,[bed.x+.14,y,z],metal).rotation.x=Math.PI/2;for(let i=-2;i<=2;i++){const dz=i*.035,span=Math.sqrt(.108**2-dz**2);s.rod([bed.x+.14-span,y,z+dz],[bed.x+.14+span,y,z+dz],.002,ropeMat);}}
      else for(const side of[-1,1])s.rod([bed.x-.43,y,z],[bed.x+.36,y,z+side*.045],a.scoop==='metal'?.006:.009,a.scoop==='metal'?metal:caneMat);
    }

    // Measure the moving crab in its parent's floor coordinates after every pose.
    // Yaw, world placement and the component's final centring must not change this contact.
    const localPoint = new THREE.Vector3(), relative = new THREE.Matrix4(), inverse = new THREE.Matrix4();
    const settleRunner = () => {
      if (!runner || a.escape === 'rim') return;
      runner.parent!.updateWorldMatrix(true, true);
      inverse.copy(runner.parent!.matrixWorld).invert();
      let low = Infinity;
      runner.traverse(node => {
        const mesh = node as THREE.Mesh; if (!mesh.isMesh) return;
        const positions = mesh.geometry.getAttribute('position');
        relative.multiplyMatrices(inverse, mesh.matrixWorld);
        for (let i = 0; i < positions.count; i++) {
          localPoint.fromBufferAttribute(positions, i).applyMatrix4(relative);
          low = Math.min(low, localPoint.y);
        }
      });
      if (Number.isFinite(low)) runner.position.y -= low;
    };
    settleRunner();
    const energy = mood.energy;
    const start = runner ? runner.position.clone() : null;
    return s.finish({
      footprint: twoWide ? 1.0 : 0.7,
      update(_dt, time) {
        const pace = mix(0.3, 1.3, energy);
        for (const mover of movers) mover.pivot.rotation.z = (mover.pivot.rotation.z > 0 ? 1 : 1) * (0.3 + Math.sin(time * pace + mover.phase) * mover.reach);
        legs.forEach((leg, index) => { leg.rotation.z = Math.sin(time * pace * 6 + index * 1.3) * 0.18; });
        if (runner && start && a.escape === 'floor') runner.position.x = start.x + Math.sin(time * pace * 0.8) * 0.03;
        settleRunner();
      },
    });
  },
});
