import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

const MENU = {
  hotdogs: 'Pink-brown hot dogs, the classic quarter-pound franks.',
  taquitos: 'Golden rolled taquitos with blistered tortilla skins.',
  sausages: 'Fat dark smoked sausages with split, glistening casings.',
  eggrolls: 'Short stubby egg rolls, bubbled and deep-fried tan.',
  mixed: 'A bit of everything in separate lanes: franks, taquitos and sausages.',
} as const;
type Food = 'hotdogs' | 'taquitos' | 'sausages' | 'eggrolls';
const FOOD: Record<Food, { colour: string; old: string; radius: number; length: number; rough: number }> = {
  hotdogs: { colour: '#cf5f44', old: '#5b2413', radius: 0.0135, length: 0.125, rough: 0.35 },
  taquitos: { colour: '#d9a652', old: '#6e4318', radius: 0.012, length: 0.13, rough: 0.8 },
  sausages: { colour: '#9a4526', old: '#3a170c', radius: 0.0165, length: 0.115, rough: 0.3 },
  eggrolls: { colour: '#cf9a4c', old: '#70431b', radius: 0.0175, length: 0.085, rough: 0.85 },
};
const CARDS = {
  twofor: ['2 FOR', '$3'],
  cheap: ['HOT DOG', '99¢'],
  ready: ['HOT &', 'READY'],
  bites: ['ROLLER', 'BITES $1.79'],
  clerk: ['ASK', 'CLERK'],
  free: ['LAST ONES', 'FREE'],
} as const;

function paint(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default defineThing({
  questions: {
    menu: choice('What is turning on the rollers?', MENU),
    left: score('How many are left on the grill?', ['One lonely survivor', 'A handful', 'Half the rollers covered', 'Loaded edge to edge']),
    age: score('How long have they been there?', ['Just put out, plump and glistening', 'An hour, browning', 'Since the last shift, wrinkled', 'Since yesterday, shrivelled dark and split']),
    card: choice('What does the price card say?', {
      twofor: 'A yellow starburst deal: 2 FOR $3.',
      cheap: 'HOT DOG 99¢, the loss leader.',
      ready: 'HOT & READY, optimistic.',
      bites: 'ROLLER BITES $1.79, corporate.',
      clerk: 'ASK CLERK, hand-lettered and unhelpful.',
      free: 'LAST ONES FREE, end of the night.',
    }),
    stand: choice('What does the grill stand on?', {
      counter: 'Nothing of its own: just the grill and bun drawer, to sit on a counter.',
      cabinet: 'Its own waist-high stainless cabinet with doors.',
      cart: 'A wheeled wire trolley with an open shelf of supplies.',
    }),
    guard: choice('What shields the food?', {
      slanted: 'A flat slanted sneeze guard of clear acrylic.',
      canopy: 'A full glass canopy with side panes, like a little greenhouse.',
      none: 'Nothing at all: open rollers under a bare heat lamp.',
    }),
    tongs: choice('Where are the tongs?', {
      hook: 'Hanging neatly at the side on their chain.',
      rollers: 'Left lying across the rollers by the last customer.',
      dangling: 'Dropped, dangling off the front by the chain.',
    }),
    drawer: choice('What is the bun drawer doing?', {
      shut: 'Shut tight, steam inside.',
      ajar: 'Pulled half open with pale buns showing.',
      empty: 'Pulled open and empty, only crumbs.',
    }),
    condiments: noul('Are there ketchup and mustard pump bottles beside it?'),
    abandoned: noul('Has someone left a half-made hot dog in a paper tray beside it?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const steel = s.material('#c3c8c9', { metalness: 0.8, roughness: 0.32 + mood.wear * 0.25 });
    const darkSteel = s.material('#5d6466', { metalness: 0.7, roughness: 0.45 });
    const black = s.material('#1c1e20', { roughness: 0.6 });
    const glass = new THREE.MeshPhysicalMaterial({ color: '#f4fbff', transparent: true, opacity: 0.16, roughness: 0.08, depthWrite: false, side: THREE.DoubleSide });

    const W = 0.64, D = 0.46;
    const baseY = a.stand === 'counter' ? 0 : a.stand === 'cabinet' ? 0.88 : 0.8;

    // What it stands on.
    if (a.stand === 'cabinet') {
      s.box([W + 0.12, 0.8, D + 0.08], [0, 0.46, 0], steel);
      s.box([W + 0.16, 0.04, D + 0.12], [0, 0.86, 0], darkSteel);
      s.box([W + 0.1, 0.06, D + 0.06], [0, 0.03, 0], black);
      for (const x of [-1, 1]) {
        s.box([W / 2 + 0.03, 0.68, 0.012], [x * (W / 4 + 0.03), 0.46, D / 2 + 0.045], s.material('#aeb4b5', { metalness: 0.8, roughness: 0.4 }));
        s.box([0.016, 0.2, 0.02], [x * 0.04, 0.52, D / 2 + 0.06], darkSteel);
      }
    } else if (a.stand === 'cart') {
      const hw = W / 2 + 0.05, hd = D / 2 + 0.03;
      for (const x of [-hw, hw]) for (const z of [-hd, hd]) {
        s.rod([x, 0.08, z], [x, 0.78, z], 0.012, steel);
        s.cylinder(0.04, 0.04, 0.025, [x, 0.04, z], black, 14).rotation.z = Math.PI / 2;
      }
      s.box([hw * 2 + 0.03, 0.025, hd * 2 + 0.03], [0, 0.79, 0], steel);
      s.box([hw * 2, 0.012, hd * 2], [0, 0.3, 0], darkSteel);
      for (let i = 0; i < 9; i++) s.rod([-hw + (i + 0.5) * hw / 4.5, 0.31, -hd], [-hw + (i + 0.5) * hw / 4.5, 0.31, hd], 0.004, steel);
      // Supplies on the open shelf: a carton and a sleeve of trays.
      s.box([0.26, 0.2, 0.22], [-0.14, 0.41, 0.02], s.material('#b89468'));
      s.label('BUNS x48', 0.2, 0.06, [-0.14, 0.42, 0.132], '#5a3a1c', '#b89468');
      s.cylinder(0.06, 0.06, 0.3, [0.18, 0.37, 0], s.material('#e9e4d4'), 14).rotation.x = Math.PI / 2;
    }

    // Bun drawer.
    const drawerH = 0.13;
    s.box([W, drawerH, D], [0, baseY + drawerH / 2, 0], steel);
    const pull = a.drawer === 'shut' ? 0 : mix(0.14, 0.22, random());
    const tray = new THREE.Group();
    tray.position.set(0, baseY + drawerH / 2, D / 2 + pull);
    s.root.add(tray);
    const add = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, at: [number, number, number]) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...at);
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    add(tray, new THREE.BoxGeometry(W - 0.06, drawerH - 0.03, 0.014), darkSteel, [0, 0, 0.007]);
    add(tray, new THREE.BoxGeometry(W * 0.5, 0.016, 0.02), steel, [0, 0.02, 0.03]);
    const buns = paint(256, 64, (ctx) => {
      ctx.fillStyle = '#4c5355'; ctx.fillRect(0, 0, 256, 64);
      ctx.fillStyle = '#e9edee'; ctx.font = 'bold 44px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('BUNS', 128, 34);
    });
    add(tray, new THREE.PlaneGeometry(0.16, 0.04), new THREE.MeshStandardMaterial({ map: buns, roughness: 0.6 }), [0, -0.025, 0.0145]);
    if (pull > 0) {
      add(tray, new THREE.BoxGeometry(W - 0.08, 0.008, pull), darkSteel, [0, -0.04, -pull / 2]);
      for (const x of [-1, 1]) add(tray, new THREE.BoxGeometry(0.008, drawerH - 0.05, pull), darkSteel, [x * (W / 2 - 0.04), -0.005, -pull / 2]);
      if (a.drawer === 'ajar') {
        const bun = s.material('#e8c487', { roughness: 0.9 });
        const count = 4 + Math.floor(random() * 3);
        for (let i = 0; i < count; i++) {
          const b = add(tray, new THREE.CapsuleGeometry(0.026, 0.1, 4, 10), bun, [-W / 2 + 0.09 + i * 0.075, -0.012, -pull / 2 + (random() - 0.5) * 0.02]);
          b.rotation.x = Math.PI / 2;
          b.rotation.y = (random() - 0.5) * 0.3;
          b.scale.set(1, 1, 0.75);
        }
      }
    }

    // Grill body with control knobs.
    const bodyY = baseY + drawerH;
    s.box([W, 0.09, D], [0, bodyY + 0.045, 0], steel);
    for (const x of [-0.22, -0.14]) {
      s.cylinder(0.018, 0.02, 0.016, [x, bodyY + 0.045, D / 2 + 0.008], black, 14).rotation.x = Math.PI / 2;
    }
    s.box([0.012, 0.012, 0.004], [0.24, bodyY + 0.05, D / 2 + 0.002], s.material('#ff5b2e', { emissive: '#ff4a1c', emissiveIntensity: 1.2 }));

    // The tilted roller bed.
    const bed = new THREE.Group();
    bed.position.set(0, bodyY + 0.125, 0);
    bed.rotation.x = 0.16;
    s.root.add(bed);
    for (const x of [-1, 1]) add(bed, new THREE.BoxGeometry(0.06, 0.07, D), steel, [x * (W / 2 - 0.03), 0, 0]);
    add(bed, new THREE.BoxGeometry(W - 0.1, 0.01, D - 0.02), black, [0, -0.03, 0]);
    const rollerSkin = paint(64, 64, (ctx) => {
      ctx.fillStyle = '#9a9c98'; ctx.fillRect(0, 0, 64, 64);
      ctx.fillStyle = '#6d7070'; ctx.fillRect(0, 0, 64, 9);
      ctx.fillStyle = `rgba(70,45,20,${0.15 + mood.wear * 0.5})`;
      for (let i = 0; i < 14; i++) ctx.fillRect(random() * 64, random() * 64, 3 + random() * 9, 2 + random() * 6);
    });
    const rollerMaterial = new THREE.MeshStandardMaterial({ map: rollerSkin, metalness: 0.55, roughness: 0.38, emissive: '#ff7a2a', emissiveIntensity: mix(0.05, 0.22, mood.warmth) });
    const rollerGeometry = new THREE.CylinderGeometry(0.017, 0.017, W - 0.12, 14).rotateZ(Math.PI / 2);
    const ROLLERS = 10, pitch = 0.042;
    const rollers: THREE.Mesh[] = [];
    for (let i = 0; i < ROLLERS; i++) rollers.push(add(bed, rollerGeometry, rollerMaterial, [0, 0, (i - (ROLLERS - 1) / 2) * pitch]));

    // Food in the grooves between rollers.
    const spinners: THREE.Object3D[] = [];
    const skins = new Map<Food, THREE.MeshStandardMaterial>();
    const skin = (food: Food) => {
      let material = skins.get(food);
      if (material) return material;
      const spec = FOOD[food];
      const colour = new THREE.Color(spec.colour).lerp(new THREE.Color(spec.old), a.age * 0.85);
      const map = paint(64, 64, (ctx) => {
        ctx.fillStyle = `#${colour.getHexString()}`; ctx.fillRect(0, 0, 64, 64);
        const marks = food === 'hotdogs' || food === 'sausages' ? 3 : 12;
        for (let i = 0; i < marks + a.age * 10; i++) {
          ctx.fillStyle = `rgba(${food === 'hotdogs' ? '60,18,8' : '70,36,10'},${0.25 + a.age * 0.35})`;
          if (marks === 3) ctx.fillRect(random() * 64, 0, 3 + random() * 4, 64);
          else ctx.fillRect(random() * 64, random() * 64, 3 + random() * 8, 3 + random() * 8);
        }
        ctx.fillStyle = `rgba(255,235,200,${0.35 * (1 - a.age)})`;
        ctx.fillRect(0, 10, 5, 44);
      });
      material = new THREE.MeshStandardMaterial({ map, roughness: mix(spec.rough, 0.95, a.age), metalness: 0.05 });
      skins.set(food, material);
      return material;
    };
    const slots: { lane: number; groove: number }[] = [];
    for (let groove = 0; groove < ROLLERS - 1; groove++) for (let lane = 0; lane < 3; lane++) slots.push({ lane, groove });
    for (let i = slots.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [slots[i], slots[j]] = [slots[j], slots[i]]; }
    const wanted = Math.max(1, Math.round(mix(1, slots.length, a.left ** 1.2) * mix(0.9, 1, random())));
    const lanes: Food[] = a.menu === 'mixed' ? ['hotdogs', 'taquitos', 'sausages'] : [a.menu, a.menu, a.menu];
    const shrink = mix(1, 0.68, a.age);
    for (const slot of slots.slice(0, wanted)) {
      const food = lanes[slot.lane], spec = FOOD[food];
      const radius = spec.radius * shrink * mix(0.94, 1.06, random());
      const spin = new THREE.Group();
      const reach = 0.017 + radius;
      spin.position.set((slot.lane - 1) * 0.165 + (random() - 0.5) * 0.02, Math.sqrt(Math.max(reach * reach - (pitch / 2) ** 2, 0.0001)), (slot.groove - (ROLLERS - 2) / 2) * pitch);
      spin.rotation.x = random() * 6;
      const geometry = food === 'taquitos' || food === 'eggrolls'
        ? new THREE.CylinderGeometry(radius, radius * 0.94, spec.length, 10)
        : new THREE.CapsuleGeometry(radius, spec.length - radius * 2, 4, 10);
      const piece = add(spin, geometry, skin(food), [0, 0, 0]);
      piece.rotation.z = Math.PI / 2 + (random() - 0.5) * 0.06;
      if (food === 'taquitos') add(spin, new THREE.CylinderGeometry(radius * 0.7, radius * 0.7, spec.length + 0.004, 8), s.material('#7a4a22'), [0, 0, 0]).rotation.z = Math.PI / 2;
      bed.add(spin);
      spinners.push(spin);
    }

    // Heat lamp hood on two posts.
    const hoodY = bodyY + 0.42;
    for (const x of [-1, 1]) s.box([0.03, hoodY - bodyY - 0.09, 0.03], [x * (W / 2 - 0.015), (hoodY + bodyY + 0.09) / 2, -D / 2 + 0.03], steel);
    s.box([W, 0.05, 0.24], [0, hoodY, -D / 2 + 0.12], steel);
    const glow = new THREE.Color().setHSL(mix(0.11, 0.035, mood.warmth), 1, 0.55);
    s.box([W - 0.1, 0.012, 0.07], [0, hoodY - 0.03, -D / 2 + 0.12], new THREE.MeshStandardMaterial({ color: glow, emissive: glow, emissiveIntensity: mix(0.7, 2.2, mood.cheer * 0.5 + mood.warmth * 0.5) }));

    // Price card on the hood.
    const [top, bottom] = CARDS[a.card];
    const hand = a.card === 'clerk' || a.card === 'free';
    const card = paint(256, 160, (ctx) => {
      ctx.fillStyle = hand ? '#f1ead6' : '#ffd21f'; ctx.fillRect(0, 0, 256, 160);
      if (!hand) { ctx.strokeStyle = '#d3201c'; ctx.lineWidth = 10; ctx.strokeRect(5, 5, 246, 150); }
      ctx.fillStyle = hand ? '#1b2a66' : '#d3201c'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = `${hand ? 'italic ' : ''}bold 44px ${hand ? 'cursive' : 'sans-serif'}`; ctx.fillText(top, 128, 48, 230);
      ctx.font = `${hand ? 'italic ' : ''}bold ${hand ? 50 : 70}px ${hand ? 'cursive' : 'sans-serif'}`; ctx.fillText(bottom, 128, 110, 230);
    });
    const cardMesh = s.mesh(new THREE.PlaneGeometry(0.2, 0.125), new THREE.MeshStandardMaterial({ map: card, roughness: 0.7, side: THREE.DoubleSide, emissive: '#ffffff', emissiveMap: card, emissiveIntensity: 0.18 }), [0.16, hoodY + 0.085, -D / 2 + 0.2]);
    cardMesh.rotation.set(-0.12, 0, hand ? (random() - 0.5) * 0.2 : 0);

    // Sneeze guard, smeared by wear.
    if (a.guard !== 'none') {
      const smear = paint(256, 256, (ctx) => {
        ctx.fillStyle = 'rgba(235,245,250,0.16)'; ctx.fillRect(0, 0, 256, 256);
        for (let i = 0; i < 6 + mood.wear * 40; i++) {
          const x = random() * 256, y = random() * 256, r = 8 + random() * 34;
          const g = ctx.createRadialGradient(x, y, 0, x, y, r);
          g.addColorStop(0, `rgba(225,205,150,${0.1 + mood.wear * 0.35})`); g.addColorStop(1, 'rgba(225,205,150,0)');
          ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
        }
        ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(0, 0, 256, 5);
      });
      const pane = new THREE.MeshStandardMaterial({ map: smear, transparent: true, depthWrite: false, roughness: 0.1, side: THREE.DoubleSide });
      const from = new THREE.Vector3(0, bodyY + 0.2, D / 2 + 0.03), to = new THREE.Vector3(0, hoodY + 0.02, -D / 2 + 0.24);
      const length = from.distanceTo(to);
      const guard = s.mesh(new THREE.PlaneGeometry(W, length), pane, from.clone().add(to).multiplyScalar(0.5).toArray() as [number, number, number]);
      guard.castShadow = false;
      guard.rotation.x = -Math.atan2(from.z - to.z, to.y - from.y);
      s.rod([-W / 2, from.y, from.z], [W / 2, from.y, from.z], 0.006, steel);
      for (const x of [-1, 1]) s.rod([x * W / 2, from.y, from.z], [x * W / 2, to.y, to.z], 0.006, steel);
      if (a.guard === 'canopy') {
        for (const x of [-1, 1]) {
          const shape = new THREE.Shape([new THREE.Vector2(from.z, from.y), new THREE.Vector2(to.z, to.y), new THREE.Vector2(-D / 2, to.y), new THREE.Vector2(-D / 2, bodyY + 0.09), new THREE.Vector2(from.z, bodyY + 0.09)]);
          const side = s.mesh(new THREE.ShapeGeometry(shape), glass, [x * W / 2, 0, 0]);
          side.rotation.y = -Math.PI / 2;
          side.castShadow = false;
        }
        s.rod([-W / 2, bodyY + 0.09, from.z], [-W / 2, from.y, from.z], 0.006, steel);
        s.rod([W / 2, bodyY + 0.09, from.z], [W / 2, from.y, from.z], 0.006, steel);
      } else for (const x of [-1, 1]) s.rod([x * W / 2, bodyY + 0.09, from.z - 0.02], [x * W / 2, from.y, from.z], 0.006, steel);
    }

    // Tongs on a chain.
    const anchor: [number, number, number] = [W / 2, bodyY + 0.2, 0.05];
    const tongs = new THREE.Group();
    for (const side of [-1, 1]) {
      const arm = add(tongs, new THREE.BoxGeometry(0.02, 0.2, 0.003), steel, [0, -0.1, side * 0.012]);
      arm.rotation.x = side * 0.09;
      add(tongs, new THREE.BoxGeometry(0.03, 0.03, 0.004), steel, [0, -0.205, side * 0.022]);
    }
    let end: [number, number, number];
    if (a.tongs === 'hook') {
      end = [W / 2 + 0.03, bodyY + 0.13, 0.12];
      tongs.position.set(...end);
      tongs.rotation.z = 0.08;
    } else if (a.tongs === 'rollers') {
      end = [0.2, bodyY + 0.2, 0.06];
      tongs.position.set(...end);
      tongs.rotation.set(0.16, 0, Math.PI / 2 + 0.2 + random() * 0.5);
    } else {
      end = [W / 2 - 0.1 - random() * 0.2, bodyY + 0.02, D / 2 + 0.045];
      tongs.position.set(...end);
      tongs.rotation.z = (random() - 0.5) * 0.3;
    }
    s.root.add(tongs);
    const sag = a.tongs === 'dangling' ? 0.02 : 0.12;
    const mid: [number, number, number] = [(anchor[0] + end[0]) / 2 + (a.tongs === 'hook' ? 0.05 : 0), Math.min(anchor[1], end[1]) - sag + (a.tongs === 'rollers' ? 0.16 : 0), (anchor[2] + end[2]) / 2 + 0.06];
    s.tube([anchor, mid, end], 0.0035, darkSteel).castShadow = false;
    s.ball([0.012, 0.012, 0.012], anchor, darkSteel, 8);

    // Beside it.
    const side = W / 2 + (a.stand === 'cabinet' ? 0.0 : 0.09);
    const deckY = a.stand === 'counter' ? 0 : a.stand === 'cabinet' ? 0.88 : 0.8025;
    if (a.condiments) {
      const cx = -(W / 2 + 0.1);
      [['#c9201c', 0], ['#e9b91a', 1]].forEach(([colour, index]) => {
        const z = -0.08 + (index as number) * 0.14;
        s.cylinder(0.045, 0.05, 0.2, [cx, deckY + 0.1, z], s.material(colour as string, { roughness: 0.35 }), 16);
        s.cylinder(0.03, 0.045, 0.03, [cx, deckY + 0.215, z], black, 16);
        s.rod([cx, deckY + 0.23, z], [cx, deckY + 0.29, z], 0.008, steel);
        s.rod([cx, deckY + 0.29, z], [cx + 0.01, deckY + 0.27, z + 0.07], 0.007, steel);
        if (mood.wear > 0.45) s.cylinder(0.02 + random() * 0.02, 0.025 + random() * 0.02, 0.004, [cx + 0.01, deckY + 0.002, z + 0.09], s.material(colour as string, { roughness: 0.3 }), 12);
      });
      if (a.stand !== 'counter') s.box([0.22, 0.02, 0.36], [cx, deckY - 0.01, 0], darkSteel);
    }
    if (a.abandoned) {
      const cx = side + 0.04, cz = 0.06;
      const turn = (random() - 0.5) * 0.9;
      const lunch = new THREE.Group();
      lunch.position.set(cx, deckY, cz);
      lunch.rotation.y = turn;
      s.root.add(lunch);
      const paperboard = paint(64, 64, (ctx) => {
        ctx.fillStyle = '#f3efe2'; ctx.fillRect(0, 0, 64, 64);
        ctx.fillStyle = '#d3201c'; for (let i = 0; i < 64; i += 16) ctx.fillRect(i, 0, 8, 64);
      });
      add(lunch, new THREE.BoxGeometry(0.1, 0.03, 0.2), new THREE.MeshStandardMaterial({ map: paperboard, roughness: 0.9 }), [0, 0.015, 0]);
      const bun = s.material('#e8c487', { roughness: 0.9 });
      for (const x of [-1, 1]) {
        const half = add(lunch, new THREE.CapsuleGeometry(0.022, 0.12, 4, 10), bun, [x * 0.018, 0.045, 0]);
        half.rotation.x = Math.PI / 2;
        half.rotation.y = x * 0.3;
      }
      const dog = add(lunch, new THREE.CapsuleGeometry(0.014, 0.1, 4, 10), skin(lanes[0] === 'hotdogs' || lanes[0] === 'sausages' ? lanes[0] : 'hotdogs'), [0, 0.062, -0.02]);
      dog.rotation.x = Math.PI / 2;
      const squiggle: [number, number, number][] = [];
      for (let i = 0; i < 7; i++) squiggle.push([cx + Math.sin(turn) * (i * 0.016 - 0.06) + Math.cos(turn) * ((i % 2) - 0.5) * 0.012, deckY + 0.079, cz + Math.cos(turn) * (i * 0.016 - 0.06) - Math.sin(turn) * ((i % 2) - 0.5) * 0.012]);
      s.tube(squiggle, 0.003, s.material('#e9b91a', { roughness: 0.3 }));
      if (a.stand !== 'counter') s.box([0.2, 0.02, 0.32], [cx, deckY - 0.01, cz - 0.04], darkSteel);
    }
    // Grease on whatever it stands on.
    if (mood.wear > 0.3) for (let i = 0; i < Math.round(mood.wear * 5); i++) s.cylinder(0.01 + random() * 0.02, 0.012 + random() * 0.02, 0.002, [(random() - 0.5) * W * 0.8, bodyY + 0.091, D / 2 - 0.03 - random() * 0.03], s.material('#8a6a2a', { roughness: 0.2 }), 10);

    const speed = mix(0.25, 1.6, mood.energy);
    return s.finish({
      update: (dt) => {
        for (const roller of rollers) roller.rotation.x += dt * speed;
        for (const spin of spinners) spin.rotation.x -= dt * speed * 1.15;
      },
    });
  },
});
