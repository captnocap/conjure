import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

const COLOURS = {
  rose: 'Faded rose pink.', green: 'Deep bottle green.', oxblood: 'Dark oxblood red.',
  mustard: 'Mustard yellow.', navy: 'Ink navy blue.', cream: 'Cream gone grey at the edges.', teal: 'Dusty teal.',
} as const;
const HEX: Record<keyof typeof COLOURS, string> = { rose: '#cf8d93', green: '#2e5c45', oxblood: '#752a2c', mustard: '#c99c30', navy: '#2b3d66', cream: '#e2d8be', teal: '#4d8a88' };

export default defineThing({
  questions: {
    style: choice('What kind of armchair was it?', {
      floral: 'A plump roll-arm chair in floral chintz with a pleated skirt, straight from a grandmother’s front room.',
      wingback: 'A button-tufted leather wingback on turned legs with brass castors, from a study or a club.',
      recliner: 'A fat ribbed velvet recliner with its footrest stuck out and a side lever.',
      tub: 'A low rounded tub chair in nubbly tweed, a 1960s lounge piece.',
      regency: 'An upright striped chair with a carved dark wood frame showing at the arms and legs.',
    }),
    colour: choice('What colour is the upholstery?', COLOURS),
    pose: choice('How has it come to rest?', {
      enthroned: 'Enthroned upright on top of a small heap of rubbish, presiding.',
      upright: 'Set down upright on the bare ground as if someone might still sit.',
      sunk: 'Upright but slumped at an angle, half sunk in drifted rubbish.',
      back: 'Toppled backwards and lying propped at a steep angle, front legs in the air.',
    }),
    sitter: choice('What sits in it?', {
      nothing: 'Nothing. The dent of a person is still in the cushion.',
      doll: 'A porcelain doll in a dress, sitting bolt upright.',
      cat: 'A cat curled asleep.',
      newspaper: 'A folded newspaper and a pair of reading glasses.',
      sapling: 'A sapling growing up through the seat.',
      crown: 'A paper party crown left on the cushion.',
    }),
    damage: choice('How is it coming apart?', {
      stuffing: 'White stuffing bursting out of a split arm and the seat.',
      springs: 'Coil springs poking up through the seat.',
      leg: 'One leg gone, the corner propped on a brick.',
      burnt: 'One arm and part of the back charred black.',
      moss: 'Rained on for months: moss and damp taking hold.',
    }),
    doily: noul('Is there still a lace antimacassar over the headrest?'),
    cushion: noul('Does it still have its seat cushion?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const c = new Sculpture(context);
    const { mood, random } = context;
    const base = new THREE.Color(HEX[a.colour]).lerp(new THREE.Color('#9a9080'), mood.wear * 0.3);

    // Upholstery painted by hand: pattern first, then what time did to it.
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    const css = (colour: THREE.Color, alpha = 1) => `rgba(${Math.round(colour.r * 255)},${Math.round(colour.g * 255)},${Math.round(colour.b * 255)},${alpha})`;
    const shade = (amount: number) => css(base.clone().convertLinearToSRGB().offsetHSL(0, 0, amount));
    ctx.fillStyle = shade(0); ctx.fillRect(0, 0, 256, 256);
    if (a.style === 'floral') {
      ctx.fillStyle = shade(0.12); ctx.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 26; i++) {
        const x = random() * 256, y = random() * 256, r = 9 + random() * 9;
        ctx.fillStyle = '#5d8a4e';
        for (let l = 0; l < 3; l++) { ctx.beginPath(); ctx.ellipse(x + Math.cos(l * 2.1 + i) * r * 1.2, y + Math.sin(l * 2.1 + i) * r * 1.2, r * 0.8, r * 0.4, l * 2.1 + i, 0, 6.3); ctx.fill(); }
        const bloom = ['#b83a4e', '#e9b0b8', '#f3ead2', '#8f4f8a', '#d9a13a'][Math.floor(random() * 5)];
        ctx.fillStyle = bloom; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.3); ctx.fill();
        ctx.fillStyle = 'rgba(60,20,30,0.35)'; ctx.beginPath(); ctx.arc(x, y, r * 0.45, 0, 6.3); ctx.fill();
      }
    } else if (a.style === 'recliner') {
      for (let x = 0; x < 256; x += 16) { ctx.fillStyle = shade(-0.07); ctx.fillRect(x, 0, 4, 256); ctx.fillStyle = shade(0.05); ctx.fillRect(x + 8, 0, 3, 256); }
    } else if (a.style === 'regency') {
      for (let x = 0; x < 256; x += 32) { ctx.fillStyle = '#efe6cf'; ctx.fillRect(x, 0, 12, 256); ctx.fillStyle = shade(-0.12); ctx.fillRect(x + 16, 0, 3, 256); }
    } else {
      for (let i = 0; i < 1500; i++) { ctx.fillStyle = shade((random() - 0.5) * (a.style === 'tub' ? 0.3 : 0.1)); ctx.fillRect(random() * 256, random() * 256, 3, 3); }
    }
    for (let i = 0; i < Math.round(mood.wear * 9); i++) {
      ctx.fillStyle = `rgba(70,50,30,${0.12 + random() * 0.2})`;
      ctx.beginPath(); ctx.ellipse(random() * 256, random() * 256, 12 + random() * 30, 8 + random() * 22, random() * 3, 0, 6.3); ctx.fill();
    }
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    const leather = a.style === 'wingback';
    const fabric = new THREE.MeshStandardMaterial({ map, roughness: leather ? 0.38 : 0.95 });
    const char = new THREE.MeshStandardMaterial({ color: '#1b1917', roughness: 1 });
    const wood = c.material(a.style === 'regency' ? '#3b2418' : '#4a3020', { roughness: 0.5 });
    const brass = c.material('#b89443', { metalness: 0.8, roughness: 0.3 });
    const fluff = c.material('#f1eee4', { roughness: 1 });
    const rb = (size: [number, number, number], at: [number, number, number], material: THREE.Material = fabric, radius = 0.05, into: THREE.Object3D = c.root) => {
      const mesh = c.mesh(new RoundedBoxGeometry(size[0], size[1], size[2], 3, Math.min(radius, Math.min(...size) / 2 - 0.001)), material, at);
      into.add(mesh);
      return mesh;
    };
    const burnt = a.damage === 'burnt';

    const tub = a.style === 'tub', wing = a.style === 'wingback', rec = a.style === 'recliner', reg = a.style === 'regency';
    const W = rec ? 1.0 : reg ? 0.72 : 0.9, D = 0.74, seatW = W - (reg ? 0.14 : 0.34), legH = rec ? 0.04 : tub ? 0.1 : 0.16;
    const seatY = legH + 0.26;
    rb([W, 0.26, D], [0, legH + 0.13, 0], fabric, 0.05);
    if (a.cushion) rb([seatW, 0.14, 0.6], [0, seatY + 0.06, 0.07], fabric, 0.06).rotation.y = (random() - 0.5) * 0.12;
    else rb([seatW, 0.03, 0.58], [0, seatY + 0.01, 0.06], c.material('#b9a98a', { roughness: 1 }), 0.01);
    const seatTop = seatY + (a.cushion ? 0.13 : 0.03);

    // Back, hinged at the seat so it can lean.
    const back = new THREE.Group();
    back.position.set(0, seatY - 0.05, -D / 2 + 0.1);
    back.rotation.x = rec ? -0.38 : reg ? -0.06 : -0.14;
    c.root.add(back);
    const backH = wing ? 0.86 : rec ? 0.8 : reg ? 0.75 : tub ? 0 : 0.68;
    if (!tub) {
      rb([W - (reg ? 0.1 : 0.12), backH, 0.18], [0, backH / 2, 0], fabric, 0.08, back);
      if (rec) rb([W - 0.3, 0.26, 0.2], [0, backH - 0.12, 0.06], fabric, 0.09, back);
      if (wing) {
        for (const e of [-1, 1]) rb([0.09, 0.52, 0.3], [e * (W / 2 - 0.07), backH - 0.28, 0.17], e < 0 && burnt ? char : fabric, 0.04, back).rotation.y = -e * 0.22;
        const button = c.material('#2a1a14', { roughness: 0.4 });
        for (let row = 0; row < 4; row++) for (let col = 0; col < 3 + (row % 2); col++) {
          const b = c.ball([0.018, 0.018, 0.012], [(col - (2 + (row % 2)) / 2) * 0.17, 0.22 + row * 0.16, 0.092], button, 8);
          back.add(b);
        }
      }
      if (reg) {
        rb([W, 0.07, 0.07], [0, backH + 0.01, 0], wood, 0.03, back);
        for (const e of [-1, 1]) rb([0.06, backH, 0.07], [e * (W / 2 - 0.02), backH / 2, 0], wood, 0.02, back);
        back.add(c.ball([0.09, 0.05, 0.035], [0, backH + 0.06, 0], wood, 10));
      }
      if (a.doily) {
        const lace = c.material('#f4f0e2', { roughness: 1, side: THREE.DoubleSide });
        rb([0.4, 0.03, 0.22], [0, backH + 0.005, 0], lace, 0.01, back);
        rb([0.4, 0.26, 0.012], [0, backH - 0.13, 0.098], lace, 0.004, back);
        for (let i = 0; i < 5; i++) back.add(c.cylinder(0.04, 0.04, 0.012, [-0.16 + i * 0.08, backH - 0.26, 0.098], lace, 10)).rotation.x = Math.PI / 2;
      }
    }

    // Arms.
    const armY = seatY + 0.14;
    if (tub) {
      const wall = c.mesh(new THREE.LatheGeometry([[0.3, 0], [0.47, 0], [0.49, 0.35], [0.44, 0.45], [0.36, 0.46], [0.3, 0.4], [0.3, 0]].map(([x, y]) => new THREE.Vector2(x, y)), 28, Math.PI * 0.22, Math.PI * 1.56), fabric, [0, seatY - 0.06, 0.02]);
      wall.rotation.y = Math.PI;
      wall.material.side = THREE.DoubleSide;
      for (const e of [-1, 1]) c.ball([0.1, 0.24, 0.1], [e * 0.3, seatY + 0.15, 0.31], fabric, 12);
      if (a.doily) rb([0.36, 0.2, 0.3], [0, seatY + 0.36, -0.38], c.material('#f4f0e2', { roughness: 1 }), 0.02).rotation.x = -0.2;
    } else for (const e of [-1, 1]) {
      const skin = e > 0 && burnt ? char : fabric;
      if (reg) {
        rb([0.06, 0.05, 0.6], [e * (W / 2 - 0.03), armY + 0.12, 0.02], wood, 0.02);
        rb([0.05, 0.3, 0.05], [e * (W / 2 - 0.03), armY - 0.02, 0.28], wood, 0.02);
        rb([0.07, 0.035, 0.3], [e * (W / 2 - 0.03), armY + 0.16, 0.02], fabric, 0.015);
      } else {
        rb([0.17, 0.3, D - 0.04], [e * (W / 2 - 0.085), armY, 0.02], skin, 0.05);
        const roll = c.cylinder(wing ? 0.085 : 0.115, wing ? 0.085 : 0.115, D - 0.02, [e * (W / 2 - 0.085 + (wing ? 0.02 : 0)), armY + 0.15, 0.03], skin, 16);
        roll.rotation.x = Math.PI / 2;
        if (wing) c.cylinder(0.03, 0.03, 0.01, [e * (W / 2 - 0.065), armY + 0.15, D / 2 + 0.022], brass, 10).rotation.x = Math.PI / 2;
      }
    }

    // Legs, skirt or mechanism.
    const corners: [number, number][] = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
    corners.forEach(([x, z], index) => {
      if (rec || (a.damage === 'leg' && index === 3)) return;
      const at: [number, number, number] = [x * (W / 2 - 0.07), 0, z * (D / 2 - 0.07)];
      if (wing) { c.lathe([[0.02, 0.03], [0.035, 0.06], [0.02, 0.09], [0.04, 0.13], [0.04, legH]], wood, at); c.ball([0.028, 0.028, 0.028], [at[0], 0.028, at[2]], brass, 8); }
      else if (reg) c.cylinder(0.035, 0.02, legH, [at[0], legH / 2, at[2]], wood, 8);
      else c.cylinder(0.035, 0.028, legH, [at[0], legH / 2, at[2]], wood, 8);
    });
    if (a.style === 'floral') {
      for (const [w, d, x, z] of [[W + 0.02, 0.02, 0, D / 2], [W + 0.02, 0.02, 0, -D / 2], [0.02, D, W / 2, 0], [0.02, D, -W / 2, 0]] as const) rb([w, legH + 0.04, d], [x, legH / 2 + 0.03, z], fabric, 0.004).rotation.z = (random() - 0.5) * 0.03;
    }
    if (rec) {
      const steel = c.material('#8a8d8e', { metalness: 0.7, roughness: 0.4 });
      rb([seatW + 0.08, 0.1, 0.36], [0, seatY - 0.04, D / 2 + 0.34], fabric, 0.04).rotation.x = 0.18;
      for (const e of [-1, 1]) { c.rod([e * 0.25, legH + 0.1, D / 2 - 0.05], [e * 0.25, seatY - 0.1, D / 2 + 0.36], 0.012, steel); c.rod([e * 0.25, seatY - 0.08, D / 2 - 0.05], [e * 0.25, legH + 0.18, D / 2 + 0.3], 0.012, steel); }
      c.rod([W / 2, seatY - 0.08, 0.1], [W / 2 + 0.06, seatY + 0.14, 0.2], 0.014, steel);
      c.ball([0.03, 0.03, 0.03], [W / 2 + 0.06, seatY + 0.15, 0.2], c.material('#222'), 8);
    }

    // The way it is coming apart.
    const much = mix(0.45, 1, mood.wear);
    const loose: { at: readonly [number, number, number]; size: number }[] = [];
    if (a.damage === 'stuffing') {
      const tear = (x: number, y: number, z: number, n: number, spread: number) => {
        for (let i = 0; i < n; i++) c.ball([0.05 + random() * 0.05, 0.04 + random() * 0.04, 0.05 + random() * 0.05], [x + (random() - 0.5) * spread, y + random() * 0.06, z + (random() - 0.5) * spread], fluff, 7);
      };
      tear(-(W / 2 - 0.085), armY + (tub ? 0.3 : 0.24), 0.18, Math.round(7 * much), 0.2);
      tear(0.1, seatTop, 0.3, Math.round(6 * much), 0.22);
      c.box([0.012, 0.012, 0.24], [-(W / 2 - 0.085), armY + (tub ? 0.31 : 0.265), 0.16], c.material('#2a2622')).rotation.y = 0.3;
      for (let i = 0; i < Math.round(9 * much); i++) loose.push({ at: [(random() - 0.5) * 1.8, 0.03, 0.3 + random() * 0.8], size: 0.04 + random() * 0.05 });
    }
    if (a.damage === 'springs') {
      const wire = c.material('#6f5a48', { metalness: 0.7, roughness: 0.4 });
      for (let i = 0; i < Math.round(mix(2, 4, mood.wear)); i++) {
        const x = (random() - 0.5) * (seatW - 0.2), z = 0.07 + (random() - 0.5) * 0.36, h = 0.12 + random() * 0.14, lean = (random() - 0.5) * 0.12;
        c.tube(Array.from({ length: 22 }, (_unused, k) => [x + Math.cos(k * 1.1) * 0.045 + lean * k / 22, seatTop - 0.04 + (k / 22) * h, z + Math.sin(k * 1.1) * 0.045] as const), 0.006, wire);
        c.cylinder(0.06, 0.06, 0.006, [x, seatTop + 0.002, z], c.material('#2a2622'), 10);
      }
    }
    if (burnt) {
      const soot = Array.from({ length: Math.round(10 * much) }, () => ({ at: [W / 2 - 0.1 + (random() - 0.5) * 0.3, seatY + random() * 0.5, (random() - 0.5) * 0.6] as const, size: 0.02 + random() * 0.035 }));
      c.scatter(new THREE.IcosahedronGeometry(1, 0), char, soot);
      for (let i = 0; i < 8; i++) loose.push({ at: [W / 2 + random() * 0.5, 0.02, (random() - 0.5) * 0.9], size: 0.015 + random() * 0.025 });
    }
    if (a.damage === 'moss') {
      const moss = c.material('#6f8f3a', { roughness: 1 });
      for (let i = 0; i < Math.round(16 * much); i++) {
        const onArm = random() < 0.5, e = random() < 0.5 ? -1 : 1;
        c.ball([0.05 + random() * 0.06, 0.02, 0.05 + random() * 0.06], onArm ? [e * (W / 2 - 0.085), armY + (tub ? 0.33 : reg ? 0.18 : 0.265), (random() - 0.5) * 0.5] : [(random() - 0.5) * seatW, seatTop + 0.005, 0.07 + (random() - 0.5) * 0.5], moss, 7);
      }
      for (let i = 0; i < 3; i++) c.rod([-0.2 + i * 0.05, seatTop, 0.3], [-0.25 + i * 0.09, seatTop + 0.16 + random() * 0.1, 0.33], 0.006, moss, 0.002);
    }

    // Who has it now.
    const upright = a.pose === 'enthroned' || a.pose === 'upright' || a.pose === 'sunk';
    const guest = new Sculpture(context);
    let breathe: THREE.Object3D | null = null, tail: THREE.Object3D | null = null;
    if (a.sitter === 'doll') {
      const dress = guest.material(['#3f5fa8', '#b8324a', '#e9e2c9', '#6a3f7a'][Math.floor(random() * 4)]), skin = guest.material('#f0dccb', { roughness: 0.35 });
      guest.cylinder(0.035, 0.11, 0.2, [0, 0.11, 0], dress, 12);
      guest.ball([0.065, 0.07, 0.065], [0, 0.27, 0], skin, 12);
      guest.ball([0.072, 0.06, 0.07], [0, 0.295, -0.015], guest.material('#5a3a22', { roughness: 0.9 }), 12);
      for (const e of [-1, 1]) {
        guest.rod([e * 0.04, 0.19, 0], [e * 0.12, 0.1, 0.03], 0.014, skin);
        guest.rod([e * 0.04, 0.03, 0.05], [e * 0.06, 0.03, 0.2], 0.018, skin);
        guest.ball([0.022, 0.025, 0.035], [e * 0.06, 0.035, 0.21], guest.material('#1c1c1e'), 8);
        guest.ball([0.01, 0.012, 0.006], [e * 0.025, 0.28, 0.06], guest.material('#1d2733', { roughness: 0.2 }), 6);
      }
      guest.cylinder(0.05, 0.05, 0.012, [0, 0.21, 0], guest.material('#f4f0e2'), 12);
      guest.root.scale.setScalar(1.35);
    }
    if (a.sitter === 'cat') {
      const coat = guest.material(['#c9792e', '#1f1f22', '#8a8478', '#e8e2d4'][Math.floor(random() * 4)], { roughness: 1 });
      breathe = guest.ball([0.17, 0.085, 0.13], [0, 0.08, 0], coat, 14);
      guest.ball([0.065, 0.058, 0.062], [0.12, 0.085, 0.09], coat, 12);
      for (const e of [-1, 1]) guest.mesh(new THREE.ConeGeometry(0.022, 0.045, 4), coat, [0.12 + e * 0.035, 0.145, 0.085]);
      tail = guest.tube([[-0.15, 0.04, 0], [-0.17, 0.035, 0.1], [-0.08, 0.03, 0.16], [0.05, 0.03, 0.15]], 0.02, coat);
      guest.root.scale.setScalar(1.25);
    }
    if (a.sitter === 'newspaper') {
      guest.label('DAILY NEWS', 0.3, 0.07, [0, 0.032, -0.12], '#222', '#e9e4d2').rotation.x = -Math.PI / 2;
      guest.box([0.32, 0.03, 0.4], [0, 0.015, 0], guest.material('#e3ddc9', { roughness: 1 }));
      for (let i = 0; i < 6; i++) guest.box([0.26, 0.002, 0.012], [0, 0.031, -0.04 + i * 0.035], guest.material('#77756e'));
      const rim = guest.material('#2a2a2c', { metalness: 0.5 });
      for (const e of [-1, 1]) { guest.ring(0.032, 0.005, [0.05 + e * 0.04, 0.04, 0.13], rim).rotation.x = Math.PI / 2; guest.rod([0.05 + e * 0.075, 0.04, 0.13], [0.05 + e * 0.08, 0.04, 0.02], 0.004, rim); }
      guest.root.rotation.y = 0.3;
    }
    if (a.sitter === 'sapling') {
      const bark = guest.material('#6a5a3c'), leaf = guest.material('#5f9a3e', { roughness: 0.8 });
      const h = mix(0.5, 0.95, random());
      guest.tube([[0, -0.1, 0], [0.03, h * 0.4, 0.02], [-0.02, h * 0.75, -0.02], [0.02, h, 0]], 0.012, bark);
      for (let i = 0; i < 12; i++) {
        const y = h * mix(0.35, 1.05, i / 11), t = i * 2.4;
        const l = guest.ball([0.07, 0.008, 0.035], [Math.cos(t) * 0.07, y, Math.sin(t) * 0.07], leaf, 8);
        l.rotation.set(0, -t, 0.5);
      }
    }
    if (a.sitter === 'crown') {
      const gold = guest.material('#e8c33a', { roughness: 0.5, side: THREE.DoubleSide });
      guest.mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.06, 14, 1, true), gold, [0, 0.03, 0]);
      for (let i = 0; i < 7; i++) guest.mesh(new THREE.ConeGeometry(0.028, 0.07, 3), gold, [Math.cos(i / 7 * 6.28) * 0.1, 0.09, Math.sin(i / 7 * 6.28) * 0.1]);
      guest.root.rotation.set(0.08, random() * 3, 0.12);
      guest.root.scale.setScalar(1.3);
    }

    // Put the chair where it ended up.
    s.root.add(c.root);
    let floor = 0;
    if (a.pose === 'enthroned' || a.pose === 'sunk') {
      const sunk = a.pose === 'sunk';
      floor = sunk ? 0 : mix(0.22, 0.4, mood.density);
      const junk = ['#2a2b2f', '#e8e4d8', '#4a7db3', '#c4a06c', '#c8463a', '#8d9296', '#d8c04a', '#6f9a5c'];
      s.scatter(new THREE.DodecahedronGeometry(0.5, 0), new THREE.MeshStandardMaterial({ roughness: 0.9 }), Array.from({ length: Math.round(mix(60, 120, mood.density)) }, () => {
        const r = sunk ? 0.45 + Math.sqrt(random()) * 0.6 : Math.sqrt(random()) * 0.85, t = random() * 6.28;
        return { at: [Math.cos(t) * r, sunk ? 0.03 + random() * 0.22 * (1 - (r - 0.45) / 0.6) : Math.max(0.03, floor * (1 - (r / 0.85) ** 2) - random() * 0.1), Math.sin(t) * r] as const, size: 0.09 + random() * 0.15, color: new THREE.Color(junk[Math.floor(random() * junk.length)]).lerp(new THREE.Color('#6b5d4a'), mood.wear * 0.45) };
      }));
      const rubber = s.material('#1e1e20', { roughness: 0.9 });
      s.ring(0.2, 0.07, [-0.7, 0.1, 0.4], rubber).rotation.set(1.3, 0, 0.3);
      s.ball([0.22, 0.18, 0.2], [0.72, 0.15, 0.35], s.material('#232427', { roughness: 0.35 }), 9);
      c.root.rotation.set(sunk ? -0.12 : (random() - 0.5) * 0.08, (random() - 0.5) * 0.3, sunk ? (random() < 0.5 ? 0.2 : -0.2) : (random() - 0.5) * 0.1);
    } else if (a.pose === 'upright') c.root.rotation.y = (random() - 0.5) * 0.4;
    else c.root.rotation.set(-0.95 + (rec ? 0.2 : 0), (random() - 0.5) * 0.5, (random() - 0.5) * 0.2, 'YXZ');
    if (upright && a.damage === 'leg') {
      c.root.rotation.z -= 0.07; c.root.rotation.x += 0.05;
      s.box([0.21, 0.065, 0.1], [W / 2 - 0.09, floor + 0.033, D / 2 - 0.08], s.material('#a5553c', { roughness: 1 })).rotation.y = 0.5;
    }
    c.root.updateMatrixWorld(true);
    c.root.position.y = floor - new THREE.Box3().setFromObject(c.root).min.y;
    if (upright && a.damage === 'leg') c.root.position.y += 0.02;
    if (a.pose === 'sunk') c.root.position.y -= 0.06;
    if (a.sitter !== 'nothing') {
      if (upright) { guest.root.position.set(a.sitter === 'crown' ? 0.08 : 0, seatTop + (a.sitter === 'sapling' ? -0.02 : 0), a.sitter === 'doll' ? -0.02 : 0.08); c.root.add(guest.root); }
      else { guest.root.position.set(0.8, 0, 0.35); guest.root.rotation.y += 0.5; s.root.add(guest.root); }
    }
    if (loose.length) s.scatter(new THREE.IcosahedronGeometry(1, 0), a.damage === 'burnt' ? char : fluff, loose.map((l) => ({ at: [l.at[0], l.at[1], l.at[2]] as const, size: l.size })));

    const rate = mix(0.6, 2.2, mood.energy);
    return s.finish({
      update: (_dt, time) => {
        if (breathe) breathe.scale.y = 0.085 * (1 + Math.sin(time * rate) * 0.06);
        if (tail) tail.rotation.y = Math.sin(time * rate * 0.7) * 0.08;
      },
    });
  },
});
