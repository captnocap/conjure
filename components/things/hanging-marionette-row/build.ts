import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

const CAST = {
  king: 'A king in a red robe with a gold crown and a white beard.',
  queen: 'A queen in a blue gown with a small crown and yellow hair.',
  devil: 'A red devil with black horns, a pointed beard and a tail.',
  skeleton: 'A bone-white skeleton with ribs and black eye sockets.',
  peasant: 'A peasant in a brown tunic and a wide straw hat.',
  knight: 'A knight in grey plate with a plumed helmet, shield and sword.',
  witch: 'A green-faced witch in black with a tall pointed hat and a long nose.',
} as const;
type Role = keyof typeof CAST;

const COMPANY: Record<string, Role[]> = {
  court: ['queen', 'knight', 'king', 'peasant', 'knight', 'queen'],
  underworld: ['skeleton', 'witch', 'devil', 'skeleton', 'witch', 'devil'],
  folk: ['peasant', 'witch', 'devil', 'king', 'skeleton', 'peasant'],
  everyone: ['king', 'queen', 'devil', 'skeleton', 'peasant', 'knight', 'witch'],
};

export default defineThing({
  questions: {
    count: choice('How many marionettes hang on the rail?', {
      three: 'Three, a tiny cast with room between them.',
      four: 'Four, a small company.',
      five: 'Five, shoulder to shoulder.',
      six: 'Six, a crowded rail of a full troupe.',
    }),
    lead: choice('Which character hangs in the middle of the row?', CAST),
    company: choice('Who are the rest of the cast?', {
      court: 'A royal court: queens, knights and a servant.',
      underworld: 'An underworld: devils, skeletons and witches.',
      folk: 'A folk-tale mix of peasant, witch, devil, king and death.',
      everyone: 'One of every character, no two alike.',
      copies: 'Eerie identical copies of the middle character.',
    }),
    carving: choice('What puppet tradition are they from?', {
      czech: 'Czech linden wood: round painted heads, rosy cheeks, cloth costumes, thin black strings.',
      sicilian: 'Sicilian opera dei pupi: tall figures in bright brass armour with plumes, hung from iron rods.',
      burmese: 'Burmese yoke thé: white faces, gilded and sequinned costumes, tall spired headdresses.',
    }),
    hang: choice('How do they hang?', {
      neat: 'Neatly spaced and square, put away with care.',
      tangled: 'Shoved together at odd heights with strings crossed and limbs caught in each other.',
      turned: 'All bowed but one, which has turned and lifted its head to look at the others.',
      slumped: 'Hung carelessly, each folded at the waist with one arm caught high in its strings.',
    }),
    missing: noul('Is one marionette gone, leaving a control cross with empty strings?'),
    rail: choice('What do they hang from?', {
      rack: 'A plain timber travelling rack on two trestle feet.',
      painted: 'A fairground-painted rack with a striped rail and turned finials.',
      pipe: 'A black iron pipe on tripod stands, backstage issue.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const count = { three: 3, four: 4, five: 5, six: 6 }[a.count];
    const sicilian = a.carving === 'sicilian', burmese = a.carving === 'burmese';
    const H = sicilian ? 0.82 : 0.64;
    const drop = 0.25;
    const pitch = sicilian ? 0.37 : 0.3;
    const span = count * pitch + 0.25;
    const railY = H + drop + 0.14;

    const faded = (c: string) => new THREE.Color(c).lerp(new THREE.Color('#9a8c78'), mood.wear * 0.45);
    const paint = (c: string, o: THREE.MeshStandardMaterialParameters = {}) => s.material(faded(c), { roughness: 0.7, ...o });
    const gold = s.material(faded('#d9a52b'), { metalness: 0.75, roughness: 0.32 });
    const steel = s.material(faded(sicilian ? '#d8b24a' : '#aab1b6'), { metalness: 0.8, roughness: 0.3 });
    const black = paint('#1d1a1c');
    const stringMat = s.material(sicilian ? '#3a3a3d' : '#2b2622', { roughness: 0.9 });
    const wood = paint('#b98d5a');

    // The rack.
    if (a.rail === 'pipe') {
      const iron = s.material('#25272a', { metalness: 0.6, roughness: 0.45 });
      s.rod([-span / 2, railY, 0], [span / 2, railY, 0], 0.018, iron);
      for (const x of [-1, 1]) {
        s.rod([x * span / 2, 0, 0], [x * span / 2, railY + 0.03, 0], 0.016, iron);
        for (let i = 0; i < 3; i++) {
          const t = i * 2.094 + 0.5;
          s.rod([x * span / 2, 0.32, 0], [x * span / 2 + Math.cos(t) * 0.3, 0.01, Math.sin(t) * 0.3], 0.011, iron);
        }
      }
    } else {
      const post = a.rail === 'painted' ? paint('#b3312c') : wood;
      const railMat = a.rail === 'painted' ? paint('#e8d9a8') : wood;
      s.rod([-span / 2 - 0.06, railY, 0], [span / 2 + 0.06, railY, 0], 0.02, railMat);
      if (a.rail === 'painted') for (let i = 0; i < Math.floor(span / 0.16); i++) s.cylinder(0.0215, 0.0215, 0.05, [-span / 2 + 0.08 + i * 0.16, railY, 0], post, 10).rotation.z = Math.PI / 2;
      for (const x of [-1, 1]) {
        s.box([0.05, railY + 0.06, 0.05], [x * span / 2, (railY + 0.06) / 2, 0], post);
        s.box([0.06, 0.05, 0.62], [x * span / 2, 0.025, 0], post);
        s.rod([x * span / 2, 0.42, 0], [x * span / 2, 0.04, 0.27], 0.014, post);
        s.rod([x * span / 2, 0.42, 0], [x * span / 2, 0.04, -0.27], 0.014, post);
        if (a.rail === 'painted') s.ball([0.045, 0.055, 0.045], [x * span / 2, railY + 0.11, 0], gold, 12);
      }
      s.rod([-span / 2, 0.14, 0], [span / 2, 0.14, 0], 0.012, post);
    }

    const add = <T extends THREE.Object3D>(g: THREE.Group, o: T) => { g.add(o); return o; };

    const figure = (role: Role, bowed: number) => {
      const g = new THREE.Group();
      const r = H * 0.125;
      const palette: Record<Role, [string, string, string]> = {
        king: ['#b3262d', '#e8c8a0', '#f0ece2'], queen: ['#2f58b0', '#efd0b0', '#e3b33a'], devil: ['#c22a20', '#c9372a', '#17141a'],
        skeleton: ['#e9e3d0', '#eee8d6', '#17141a'], peasant: ['#8a5a34', '#e2b890', '#3f6a3a'], knight: ['#9aa3a8', '#e2b890', '#c22a20'],
        witch: ['#2a2233', '#7fae5a', '#5b3a8a'],
      };
      let [body, skin, accent] = palette[role];
      if (burmese && role !== 'skeleton' && role !== 'devil' && role !== 'witch') skin = '#f4efe6';
      const bodyMat = role === 'knight' ? steel : paint(body, burmese ? { metalness: 0.25, roughness: 0.45 } : {});
      const skinMat = paint(skin, { roughness: 0.5 });
      const accentMat = paint(accent);
      const robed = role === 'king' || role === 'queen' || role === 'witch';
      const hipY = H * 0.42, shoulderY = H * 0.71;

      // Legs and feet.
      for (const x of [-1, 1]) {
        const knee: [number, number, number] = [x * H * 0.07, H * 0.22, H * 0.035];
        const foot: [number, number, number] = [x * H * 0.075 + (random() - 0.5) * 0.02, 0.03, 0.01];
        const legMat = role === 'skeleton' ? skinMat : role === 'peasant' ? accentMat : bodyMat;
        const lr = role === 'skeleton' ? H * 0.018 : H * 0.036;
        add(g, s.rod([x * H * 0.06, hipY, 0], knee, lr, legMat));
        add(g, s.rod(knee, foot, lr, legMat));
        add(g, s.box([H * 0.07, 0.03, H * 0.13], [foot[0], 0.015, 0.035], role === 'skeleton' ? skinMat : black)).rotation.x = 0.5;
      }
      // Body.
      if (role === 'skeleton') {
        add(g, s.rod([0, hipY, 0], [0, shoulderY + 0.02, 0], H * 0.016, skinMat));
        for (let i = 0; i < 5; i++) add(g, s.ring(H * (0.075 - i * 0.006), H * 0.011, [0, shoulderY - 0.01 - i * H * 0.04, 0], skinMat)).rotation.x = Math.PI / 2;
        add(g, s.box([H * 0.17, H * 0.045, H * 0.08], [0, hipY, 0], skinMat));
      } else if (robed) {
        add(g, s.lathe([[H * 0.2, 0], [H * 0.17, H * 0.2], [H * 0.1, H * 0.5], [H * 0.12, H * 0.6], [0.001, H * 0.62]], bodyMat, [0, H * 0.1, 0]));
        add(g, s.cylinder(H * 0.105, H * 0.105, H * 0.03, [0, H * 0.47, 0], role === 'witch' ? accentMat : gold, 16));
      } else {
        add(g, s.cylinder(H * 0.12, H * 0.095, H * 0.31, [0, (hipY + shoulderY) / 2 + 0.005, 0], bodyMat, 14));
        if (role === 'peasant') add(g, s.cylinder(H * 0.125, H * 0.14, H * 0.1, [0, hipY - H * 0.02, 0], bodyMat, 14));
        if (role === 'knight' || sicilian) add(g, s.ball([H * 0.13, H * 0.12, H * 0.1], [0, shoulderY - H * 0.1, H * 0.035], steel, 14));
        if (role === 'devil') add(g, s.tube([[0, hipY, -H * 0.08], [H * 0.1, hipY - H * 0.12, -H * 0.16], [H * 0.2, hipY - H * 0.05, -H * 0.1], [H * 0.24, hipY + H * 0.06, -H * 0.1]], H * 0.014, bodyMat));
      }
      if (burmese && role !== 'skeleton') {
        add(g, s.cylinder(H * 0.2, H * 0.16, H * 0.03, [0, shoulderY + H * 0.01, 0], gold, 12));
        add(g, s.cylinder(H * 0.13, H * 0.13, H * 0.035, [0, hipY + H * 0.03, 0], gold, 12));
      }
      // Arms: limp, hands near the hip.
      const hands: THREE.Vector3[] = [];
      for (const x of [-1, 1]) {
        const sh: [number, number, number] = [x * H * 0.14, shoulderY - 0.01, 0];
        const lift = a.hang === 'slumped' && x === 1 ? H * 0.42 : 0;
        const el: [number, number, number] = [x * H * (0.2 + lift * 0.2), shoulderY - H * 0.17 + lift * 0.5, H * 0.03];
        const hand: [number, number, number] = [x * H * (0.21 + random() * 0.04), hipY - H * 0.03 + lift, H * 0.07];
        const ar = role === 'skeleton' ? H * 0.014 : H * 0.03;
        const armMat = role === 'skeleton' ? skinMat : bodyMat;
        add(g, s.rod(sh, el, ar, armMat));
        add(g, s.rod(el, hand, ar, armMat));
        add(g, s.ball([H * 0.035, H * 0.045, H * 0.03], hand, skinMat, 10));
        hands.push(new THREE.Vector3(...hand));
      }
      if (role === 'knight' || (sicilian && role !== 'witch' && role !== 'skeleton' && role !== 'queen')) {
        const [l, rgt] = hands;
        const shield = add(g, s.cylinder(H * 0.12, H * 0.12, H * 0.02, [l.x - H * 0.03, l.y, l.z + H * 0.04], paint(accent === '#17141a' ? '#c22a20' : accent), 18));
        shield.rotation.x = Math.PI / 2; shield.rotation.z = 0.2;
        add(g, s.ball([H * 0.035, H * 0.035, H * 0.03], [l.x - H * 0.03, l.y, l.z + H * 0.055], gold, 10));
        add(g, s.box([H * 0.02, H * 0.36, H * 0.008], [rgt.x + H * 0.01, rgt.y - H * 0.15, rgt.z], s.material('#d5dadd', { metalness: 0.85, roughness: 0.25 })));
        add(g, s.box([H * 0.1, H * 0.018, H * 0.018], [rgt.x + H * 0.01, rgt.y + H * 0.02, rgt.z], gold));
      }
      // Head: its own group so it can bow.
      const head = new THREE.Group();
      head.position.set(0, shoulderY + H * 0.03, 0);
      g.add(head);
      const hy = r * 1.05;
      add(head, s.ball([r * 0.92, r * 1.05, r * 0.95], [0, hy, 0], skinMat, 18));
      add(head, s.cylinder(r * 0.3, r * 0.34, r * 0.4, [0, r * 0.05, 0], skinMat, 10));
      for (const x of [-1, 1]) {
        if (role === 'skeleton') add(head, s.ball([r * 0.26, r * 0.3, r * 0.14], [x * r * 0.36, hy + r * 0.12, r * 0.82], black, 10));
        else {
          add(head, s.ball([r * 0.2, r * 0.17, r * 0.1], [x * r * 0.36, hy + r * 0.12, r * 0.84], paint('#f6f2e8'), 10));
          add(head, s.ball([r * 0.1, r * 0.1, r * 0.07], [x * r * 0.36, hy + r * 0.1, r * 0.92], black, 8));
          if (!sicilian && role !== 'devil' && role !== 'witch') add(head, s.ball([r * 0.2, r * 0.16, r * 0.06], [x * r * 0.55, hy - r * 0.22, r * 0.72], paint('#d9645a'), 8));
        }
      }
      if (role === 'skeleton') {
        add(head, s.box([r * 0.7, r * 0.3, r * 0.2], [0, hy - r * 0.62, r * 0.6], skinMat));
        for (let i = 0; i < 4; i++) add(head, s.box([r * 0.03, r * 0.26, r * 0.04], [(i - 1.5) * r * 0.16, hy - r * 0.62, r * 0.7], black));
        add(head, s.ball([r * 0.09, r * 0.14, r * 0.06], [0, hy - r * 0.18, r * 0.9], black, 8));
      } else {
        const nose = add(head, s.cylinder(0.001, r * (role === 'witch' ? 0.16 : 0.2), r * (role === 'witch' ? 0.9 : 0.5), [0, hy - r * 0.08, r * (role === 'witch' ? 1.25 : 1.05)], skinMat, 10));
        nose.rotation.x = Math.PI / 2 + (role === 'witch' ? 0.3 : 0);
        add(head, s.box([r * 0.5, r * 0.08, r * 0.05], [0, hy - r * 0.48, r * 0.8], paint(role === 'devil' ? '#17141a' : '#8f2a26')));
      }
      const top = hy + r * 0.85;
      if (burmese && (role === 'king' || role === 'queen' || role === 'knight')) {
        add(head, s.lathe([[r * 0.95, 0], [r * 0.8, r * 0.25], [r * 0.5, r * 0.4], [r * 0.55, r * 0.6], [r * 0.3, r * 0.85], [r * 0.34, r * 1.05], [r * 0.12, r * 1.5], [0.001, r * 2.4]], gold, [0, top - r * 0.3, 0]));
        for (const x of [-1, 1]) add(head, s.cylinder(0.001, r * 0.22, r * 0.9, [x * r * 0.95, hy + r * 0.35, 0], gold, 8)).rotation.z = -x * 0.5;
      } else if (role === 'king' || role === 'queen') {
        const cr = role === 'king' ? r * 0.72 : r * 0.5;
        add(head, s.cylinder(cr * 1.1, cr, r * 0.4, [0, top + r * 0.02, 0], gold, 14));
        for (let i = 0; i < 6; i++) add(head, s.cylinder(0.001, r * 0.14, r * 0.42, [Math.cos(i * 1.047) * cr * 1.05, top + r * 0.42, Math.sin(i * 1.047) * cr * 1.05], gold, 6));
      } else if (role === 'devil') {
        for (const x of [-1, 1]) add(head, s.cylinder(0.001, r * 0.2, r * 0.95, [x * r * 0.55, top + r * 0.15, 0], black, 8)).rotation.z = -x * 0.45;
      } else if (role === 'peasant') {
        add(head, s.cylinder(r * 1.75, r * 1.85, r * 0.08, [0, top - r * 0.25, 0], paint('#d9b860'), 20));
        add(head, s.cylinder(r * 0.7, r * 0.85, r * 0.55, [0, top + r * 0.02, 0], paint('#d9b860'), 14));
      } else if (role === 'knight') {
        add(head, s.ball([r * 1.02, r * 0.85, r * 1.05], [0, hy + r * 0.38, -r * 0.05], steel, 14));
        add(head, s.box([r * 1.9, r * 0.16, r * 0.3], [0, hy + r * 0.38, r * 0.85], steel));
      } else if (role === 'witch') {
        add(head, s.cylinder(r * 1.5, r * 1.6, r * 0.07, [0, top - r * 0.22, 0], black, 20));
        add(head, s.cylinder(0.001, r * 0.85, r * 2.3, [0, top + r * 0.92, 0], black, 14)).rotation.z = 0.12;
        add(head, s.cylinder(r * 0.87, r * 0.87, r * 0.18, [0, top - r * 0.1, 0], accentMat, 14));
      }
      if (sicilian && role !== 'skeleton' && role !== 'witch' && role !== 'peasant') {
        const plume = add(head, s.ball([r * 0.35, r * 0.95, r * 0.6], [0, top + r * (role === 'king' || role === 'queen' ? 1.3 : 0.95), -r * 0.3], accentMat.color.getHex() === black.color.getHex() ? paint('#c22a20') : paint(role === 'knight' ? '#c22a20' : '#f0ece2'), 10));
        plume.rotation.x = -0.4;
      }
      if (role === 'king') { const beard = add(head, s.cylinder(r * 0.62, 0.001, r * 1.3, [0, hy - r * 1.0, r * 0.62], accentMat, 10)); beard.rotation.x = 0.2; }
      if (role === 'devil') add(head, s.cylinder(r * 0.28, 0.001, r * 0.8, [0, hy - r * 1.1, r * 0.62], black, 8));
      if (role === 'queen') { add(head, s.ball([r * 1.05, r * 1.0, r * 0.9], [0, hy + r * 0.1, -r * 0.3], accentMat, 12)); for (const x of [-1, 1]) add(head, s.rod([x * r * 0.8, hy, 0], [x * r * 0.8, hy - r * 1.9, r * 0.1], r * 0.2, accentMat, r * 0.1)); }
      if (role === 'witch') for (const x of [-1, 1]) add(head, s.rod([x * r * 0.8, hy + r * 0.3, -r * 0.1], [x * r * 0.9, hy - r * 1.6, 0], r * 0.16, paint('#b9b6ae'), r * 0.05));
      head.rotation.x = bowed;
      return { g, head, hands, shoulderY, r };
    };

    // Who hangs where.
    const middle = Math.floor((count - 1) / 2);
    const pool = a.company === 'copies' ? [] : COMPANY[a.company];
    const roles: (Role | null)[] = Array.from({ length: count }, (_u, i) => (i === middle || a.company === 'copies' ? a.lead : pool[(i + (i > middle ? 0 : 1)) % pool.length]));
    if (a.company === 'everyone') { const rest = pool.filter((role) => role !== a.lead); let k = 0; for (let i = 0; i < count; i++) if (i !== middle) roles[i] = rest[k++ % rest.length]; }
    const gap = a.missing ? (middle + 1 + Math.floor(random() * (count - 1))) % count : -1;
    const turned = a.hang === 'turned' ? (gap === 0 ? count - 1 : 0) : -1;

    const swingers: { g: THREE.Group; phase: number; amp: number; base: number }[] = [];
    for (let i = 0; i < count; i++) {
      const tangled = a.hang === 'tangled';
      const x = (i - (count - 1) / 2) * pitch + (tangled ? (random() - 0.5) * pitch * 0.7 : (random() - 0.5) * 0.02);
      const hanger = new THREE.Group();
      hanger.position.set(x, railY, 0);
      s.root.add(hanger);
      const extra = tangled ? random() * 0.16 : a.hang === 'neat' ? 0 : random() * 0.04;
      const crossY = -0.07 - extra * 0.3;
      // Hook and control cross.
      add(hanger, s.ring(0.022, 0.004, [0, -0.022, 0], stringMat)).rotation.y = Math.PI / 2;
      const cross = new THREE.Group();
      cross.position.y = crossY;
      hanger.add(cross);
      if (sicilian) add(cross, s.rod([0, 0.03, 0], [0, -drop + 0.07, 0], 0.006, stringMat));
      else {
        add(cross, s.box([0.03, 0.016, 0.24], [0, 0, 0], wood));
        add(cross, s.box([0.24, 0.014, 0.026], [0, 0.012, 0.03], wood));
        add(cross, s.box([0.16, 0.014, 0.026], [0, 0.012, -0.08], wood));
      }
      if (sicilian) add(cross, s.box([0.2, 0.014, 0.024], [0, 0.0, 0], wood));
      cross.rotation.set(tangled ? (random() - 0.5) * 0.5 : 0, tangled ? (random() - 0.5) * 1.2 : (random() - 0.5) * 0.1, tangled ? (random() - 0.5) * 0.5 : 0);
      const role = i === gap ? null : roles[i];
      if (!role) {
        // Empty strings, hanging straight and curling at the ends.
        for (const [sx, sz] of [[-0.11, 0.03], [0.11, 0.03], [-0.03, 0.1], [0.03, 0.1], [0, -0.1], [-0.07, -0.08], [0.07, -0.08]] as const) {
          const len = drop + H * (0.25 + random() * 0.4);
          add(hanger, s.tube([[sx, crossY, sz], [sx + (random() - 0.5) * 0.02, crossY - len * 0.6, sz], [sx + (random() - 0.5) * 0.05, crossY - len, sz + (random() - 0.5) * 0.04], [sx + (random() - 0.5) * 0.09, crossY - len - 0.02, sz + (random() - 0.5) * 0.06]], 0.0028, stringMat));
        }
        swingers.push({ g: hanger, phase: random() * 6, amp: 0.3, base: 0 });
        continue;
      }
      const isTurned = i === turned;
      const f = figure(role, isTurned ? -0.12 : mix(0.22, 0.5, random()));
      const fy = -(drop + H) - extra;
      f.g.position.set(0, fy, 0);
      f.g.rotation.y = isTurned ? 1.25 : tangled ? (random() - 0.5) * 1.6 : (random() - 0.5) * 0.3;
      if (a.hang === 'slumped') { f.g.rotation.x = 0.14; f.g.position.z = -H * 0.06; f.head.rotation.x = 0.75; }
      if (tangled) f.g.rotation.z = (random() - 0.5) * 0.35;
      hanger.add(f.g);
      f.g.updateMatrix();
      const local = (v: THREE.Vector3) => v.clone().applyMatrix4(f.g.matrix).toArray() as [number, number, number];
      if (!sicilian) {
        const headY = f.shoulderY + H * 0.03 + f.r * 1.2;
        for (const sx of [-1, 1]) add(hanger, s.rod([sx * 0.07, crossY, -0.08], local(new THREE.Vector3(sx * f.r * 0.85, headY, 0)), 0.0026, stringMat));
        add(hanger, s.rod([0, crossY, -0.11], local(new THREE.Vector3(0, f.shoulderY, -H * 0.1)), 0.0026, stringMat));
        for (const sx of [-1, 1]) add(hanger, s.rod([sx * 0.03, crossY, 0.11], local(new THREE.Vector3(sx * H * 0.07, H * 0.22, H * 0.04)), 0.0026, stringMat));
      } else add(hanger, s.rod([0, crossY - drop + 0.07, 0], local(new THREE.Vector3(0, f.shoulderY + H * 0.03 + f.r * 1.9, 0)), 0.006, stringMat));
      f.hands.forEach((hand, k) => {
        const sx = k === 0 ? -1 : 1;
        if (mood.wear > 0.7 && random() < 0.3) return;
        add(hanger, s.rod([sx * (sicilian ? 0.095 : 0.115), crossY, sicilian ? 0 : 0.03], local(hand), 0.0026, stringMat));
      });
      if (tangled && i > 0) s.rod([x, railY + crossY, 0.03], [x - pitch * (0.7 + random() * 0.5), railY - drop - H * (0.3 + random() * 0.4), 0.06], 0.0026, stringMat);
      swingers.push({ g: hanger, phase: random() * 6, amp: mix(0.6, 1.3, random()), base: 0 });
    }

    const energy = mood.energy;
    return s.finish({
      update: (_dt, time) => {
        for (const w of swingers) {
          w.g.rotation.z = Math.sin(time * (0.9 + energy * 1.6) + w.phase) * 0.05 * w.amp * (0.15 + energy * 1.6);
          w.g.rotation.y = Math.sin(time * 0.5 + w.phase * 2) * 0.12 * w.amp * (0.2 + energy);
        }
      },
    });
  },
});
