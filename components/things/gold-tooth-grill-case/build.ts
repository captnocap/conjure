import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

export default defineThing({
  questions: {
    setting: choice('What metal and setting are the grills?', {
      gold: 'Plain polished yellow gold caps.',
      pave: 'White gold iced out with diamond pave, every surface studded.',
      fangs: 'Silver with long pointed fang caps over the canines.',
      rainbow: 'A rainbow of coloured stones running tooth to tooth.',
      single: 'Just one lone gold tooth.',
      rose: 'Rose gold with open-face windows showing the tooth through each cap.',
    }),
    rows: choice('Which rows are covered?', {
      top: 'The top row only.',
      bottom: 'The bottom row only.',
      both: 'Top and bottom, a full mouth.',
    }),
    flashy: score('How flashy is it?', ['A discreet few front teeth', 'Six across, canine to canine', 'Eight wide and gleaming', 'Every tooth, blinding']),
    mould: choice('What kind of mouth is the plaster mould cast from?', {
      human: 'An ordinary human mouth with even teeth.',
      vampire: 'A vampire mouth: fine teeth with long needle canines.',
      ape: 'An ape jaw: long muzzle, big yellowed teeth and massive tusk-like canines.',
    }),
    bite: choice('How is the mould posed?', {
      closed: 'Jaws nearly closed in a tight grin.',
      open: 'Half open, both rows on show.',
      snarl: 'Hinged wide open in a snarl.',
    }),
    case: choice('What is the case like?', {
      black: 'Black leatherette lined with red satin.',
      navy: 'Navy velvet lined with white satin, a proper jeweller.',
      steel: 'A brushed aluminium flight case with grey foam.',
      lab: 'A plain cardboard dental-lab box lined with tissue.',
    }),
    story: choice('What goes with it?', {
      none: 'Nothing, just the case.',
      gift: 'A ribbon and bow: it is a present.',
      pawn: 'A yellow pawn ticket tied to it on string.',
      cloth: 'A polishing cloth dropped beside it, just buffed.',
      slip: 'A dental-lab order slip tucked under the edge, waiting for collection.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const ape = a.mould === 'ape', vamp = a.mould === 'vampire';
    const W = 0.17, D = 0.13, BH = 0.03;
    const shell = { black: '#1b1b1f', navy: '#1b2a5c', steel: '#b9c0c4', lab: '#c2a070' }[a.case];
    const lining = { black: '#b3122a', navy: '#f4f1ea', steel: '#5a5f66', lab: '#f3efe6' }[a.case];
    const shellM = s.material(shell, { roughness: a.case === 'steel' ? 0.35 : 0.8, metalness: a.case === 'steel' ? 0.8 : 0 });
    const liningM = s.material(lining, { roughness: a.case === 'black' || a.case === 'navy' ? 0.35 : 0.95 });
    const brass = s.material('#d0aa4c', { metalness: 0.9, roughness: 0.25 });
    const corner = a.case === 'lab' ? 0.002 : 0.008;

    // Case base, cushion and open lid.
    s.mesh(new RoundedBoxGeometry(W, BH, D, 3, corner), shellM, [0, BH / 2, 0]);
    s.mesh(new RoundedBoxGeometry(W - 0.014, 0.012, D - 0.014, 3, 0.005), liningM, [0, BH - 0.003, 0]);
    const lid = new THREE.Group(); lid.position.set(0, BH, -D / 2); lid.rotation.x = -(1.75 + random() * 0.25); s.root.add(lid);
    lid.add(s.mesh(new RoundedBoxGeometry(W, 0.022, D, 3, corner), shellM, [0, 0.011, D / 2]));
    lid.add(s.mesh(new RoundedBoxGeometry(W - 0.014, 0.006, D - 0.014, 2, 0.002), liningM, [0, 0.001, D / 2]));
    const brand = { human: 'KING GOLD', vampire: 'NOCTURNE', ape: 'SILVERBACK' }[a.mould];
    const plate = s.label(a.case === 'lab' ? 'DENTAL LAB' : brand, 0.085, 0.02, [0, -0.0025, D / 2], a.case === 'navy' || a.case === 'lab' ? '#8a6a1c' : '#f0cf6a', lining);
    plate.rotation.x = Math.PI / 2; lid.add(plate);
    if (a.case !== 'lab') {
      s.box([0.024, 0.012, 0.004], [0, BH - 0.004, D / 2 + 0.001], brass);
      for (const x of [-0.05, 0.05]) s.cylinder(0.004, 0.004, 0.022, [x, BH, -D / 2 - 0.001], brass, 10).rotation.z = Math.PI / 2;
    }

    // The mould: stone-coloured plaster with pink gums, so plain teeth and caps both stand out.
    const plaster = s.material({ human: '#d9cdb8', vampire: '#b9bfcc', ape: '#c9b27a' }[a.mould], { roughness: 0.95 });
    const gum = s.material({ human: '#d9818a', vampire: '#8d4a66', ape: '#a8605a' }[a.mould], { roughness: 0.7 });
    const toothM = s.material({ human: '#fbf9f2', vampire: '#f4f6fb', ape: '#efe0a8' }[a.mould], { roughness: 0.6 });
    const glow = mix(0.35, 0.8, (mood.cheer + a.flashy) / 2);
    const metalColour = { gold: '#f6c636', pave: '#eef2f6', fangs: '#dfe5ea', rainbow: '#f6c636', single: '#f6c636', rose: '#f3a88e' }[a.setting];
    const emis = { gold: '#c98600', pave: '#9fb8d0', fangs: '#8ea0b2', rainbow: '#c98600', single: '#c98600', rose: '#c4614a' }[a.setting];
    const metal = s.material(metalColour, { metalness: 0.95, roughness: 0.16, emissive: emis, emissiveIntensity: glow });
    const sc = ape ? 1.22 : 1;
    const aw = 0.03 * (ape ? 1.05 : 1), ad = 0.04 * (ape ? 1.3 : 1);
    const widths = [0.0085, 0.007, 0.0075, 0.007, 0.007, 0.0095, 0.0095].map((w) => w * (ape ? 1.12 : 1));
    const baseT = 0.011, toothH = 0.0105 * sc;
    const reach = a.setting === 'single' ? -1 : a.flashy < 0.25 ? 1 : a.flashy < 0.6 ? 2 : a.flashy < 0.87 ? 3 : 6;
    const singleSide = random() < 0.5 ? -1 : 1, singleRank = random() < 0.5 ? 1 : 2;
    const sparkM = s.material('#ffffff', { emissive: '#fff6d8', emissiveIntensity: 1.6, roughness: 0.2 });
    const arm = (ax: 'x' | 'y' | 'z') => { const o = new THREE.OctahedronGeometry(1, 0); o.scale(ax === 'x' ? 1 : 0.09, ax === 'y' ? 1 : 0.09, ax === 'z' ? 1 : 0.09); return o; };
    const rig = new THREE.Group(); rig.position.set(0, BH + 0.003, 0.004); rig.scale.setScalar(ape ? 1.12 : 1.32); s.root.add(rig);

    const jaw = (upper: boolean) => {
      const g = new THREE.Group();
      const gemPts: { at: [number, number, number]; size: number; color: THREE.Color }[] = [];
      const sparkPts: { at: [number, number, number]; size: number }[] = [];
      const covered = a.rows === 'both' || (a.rows === 'top') === upper;
      // Solid plaster base in a D shape with a gum ridge.
      const outline: THREE.Vector2[] = [];
      for (let i = 0; i <= 24; i++) { const ph = -1.75 + i / 24 * 3.5; outline.push(new THREE.Vector2((aw + 0.006) * Math.sin(ph), -(ad + 0.006) * Math.cos(ph))); }
      const baseGeo = new THREE.ExtrudeGeometry(new THREE.Shape(outline), { depth: baseT, bevelEnabled: false });
      baseGeo.rotateX(Math.PI / 2); baseGeo.translate(0, baseT, 0);
      g.add(s.mesh(baseGeo, plaster));
      const ridge: [number, number, number][] = [];
      for (let i = 0; i <= 16; i++) { const ph = -1.7 + i / 16 * 3.4; ridge.push([aw * Math.sin(ph), baseT, ad * Math.cos(ph)]); }
      g.add(s.tube(ridge, 0.0058 * sc, gum));
      let cum = 0;
      for (let rank = 0; rank < 7; rank++) {
        const w = widths[rank];
        const ph = (cum + w / 2) / (ape ? 0.04 : 0.034);
        cum += w;
        for (const side of [-1, 1]) {
          const x = aw * Math.sin(ph * side), z = ad * Math.cos(ph);
          const isCap = covered && (a.setting === 'single' ? upper === (a.rows !== 'bottom') && rank === singleRank && side === singleSide : rank <= reach);
          const canine = rank === 2;
          const fang = canine && (vamp ? upper : ape) || (canine && isCap && a.setting === 'fangs');
          let h = toothH * (rank >= 5 ? 0.72 : rank >= 3 ? 0.85 : canine ? 1.12 : rank === 1 ? 0.92 : 1);
          const thick = (rank >= 5 ? 0.009 : rank >= 3 ? 0.0075 : 0.0052) * sc;
          const m = isCap ? metal : toothM;
          const grow = isCap ? 1.14 : 1;
          const y = baseT + 0.003;
          let tooth: THREE.Mesh;
          if (fang) {
            h = toothH * (ape ? 2.5 : vamp ? 2.2 : 1.9);
            tooth = s.cylinder(0.0004, w * 0.56 * grow * (ape ? 1.15 : 0.9), h, [x, y + h / 2, z], m, 10);
          } else {
            tooth = s.mesh(new RoundedBoxGeometry(w * 0.96 * grow, h, thick * grow, 3, Math.min(w, thick) * 0.4), m, [x, y + h / 2, z]);
          }
          tooth.rotation.y = ph * side;
          g.add(tooth);
          if (!isCap) continue;
          const nx = Math.sin(ph * side), nz = Math.cos(ph * side);
          const hue = (ph * side + 1.7) / 3.4;
          const front = (u: number, v: number, out = 0.0006): [number, number, number] => [x + nx * (thick * grow / 2 + out) + nz * u * w * 0.5, y + h * v, z + nz * (thick * grow / 2 + out) - nx * u * w * 0.5];
          if (a.setting === 'pave' || a.setting === 'rainbow') {
            const n = fang ? 2 : 3;
            for (let i = 0; i < n; i++) for (let j = 0; j < 3; j++)
              gemPts.push({ at: front((i - (n - 1) / 2) * 0.55 * (fang ? 1 - j * 0.3 : 1), 0.22 + j * 0.28), size: w * 0.15, color: a.setting === 'pave' ? new THREE.Color(j % 2 ? '#ffffff' : '#d8ecff') : new THREE.Color().setHSL(hue * 0.85, 1, 0.55) });
          } else if (a.setting === 'rose' && !fang) {
            const win = s.mesh(new RoundedBoxGeometry(w * 0.55, h * 0.5, 0.001, 2, 0.0004), toothM, front(0, 0.5, 0.0002)); win.rotation.y = ph * side; g.add(win);
          }
          if (random() < 0.25 + a.flashy * 0.5) sparkPts.push({ at: front((random() - 0.5) * 0.6, 0.3 + random() * 0.6, 0.002), size: w * (0.5 + random() * 0.5 + a.flashy * 0.4) });
        }
      }
      if (gemPts.length) g.add(s.scatter(new THREE.IcosahedronGeometry(1, 0), s.material('#ffffff', { roughness: 0.05, emissive: '#9999aa', emissiveIntensity: glow }), gemPts));
      if (sparkPts.length) g.add(s.scatter(mergeGeometries([arm('x'), arm('y'), arm('z')])!, sparkM, sparkPts));
      return g;
    };

    const yBite = baseT + 0.003 + toothH;
    const open = { closed: ape || vamp ? 0.3 : 0.06, open: 0.55, snarl: 1.0 }[a.bite];
    const lower = jaw(false); rig.add(lower);
    const hinge = new THREE.Group(); hinge.position.set(0, yBite, -ad * 0.55); hinge.rotation.x = -open; rig.add(hinge);
    const upper = jaw(true); upper.rotation.z = Math.PI; upper.position.set(0, yBite - 0.0005, ad * 0.55 - 0.002); hinge.add(upper);
    // Articulator hinge at the back.
    const steel = s.material('#c8ced2', { metalness: 0.9, roughness: 0.3 });
    rig.add(s.rod([-aw - 0.004, yBite, -ad * 0.55], [aw + 0.004, yBite, -ad * 0.55], 0.0025, steel));
    for (const x of [-1, 1]) {
      rig.add(s.rod([x * (aw + 0.003), baseT * 0.5, -ad * 0.55], [x * (aw + 0.003), yBite, -ad * 0.55], 0.002, steel));
      hinge.add(s.rod([x * (aw + 0.003), 0, 0], [x * (aw + 0.003), yBite - baseT * 0.5, 0.001], 0.002, steel));
    }
    if (a.story === 'gift') {
      const ribbon = s.material(a.case === 'black' ? '#e8c23a' : '#d1123a', { roughness: 0.35, emissive: '#400', emissiveIntensity: 0.2 });
      s.box([0.018, BH + 0.001, D + 0.002], [W * 0.3, BH / 2, 0], ribbon);
      for (const k of [-1, 1]) { const loop = s.ring(0.016, 0.005, [W * 0.3 + k * 0.016, BH * 0.6, D / 2 + 0.006], ribbon); loop.scale.set(1, 0.6, 1); loop.rotation.z = k * 0.4; }
      s.ball([0.006, 0.006, 0.006], [W * 0.3, BH * 0.6, D / 2 + 0.007], ribbon, 10);
      for (const k of [-1, 1]) s.box([0.012, 0.0008, 0.04], [W * 0.3 + k * 0.012, 0.0008, D / 2 + 0.024], ribbon).rotation.y = k * 0.35;
    } else if (a.story === 'pawn') {
      const tag = s.label('No. ' + (1000 + Math.floor(random() * 8999)), 0.06, 0.03, [W * 0.32, 0.0012, D / 2 + 0.04], '#2a2418', '#f5d83a');
      tag.rotation.set(-Math.PI / 2, 0, (random() - 0.5) * 0.8);
      s.tube([[W * 0.3, 0.002, D / 2 + 0.03], [W * 0.22, 0.012, D / 2 + 0.012], [W * 0.2, BH - 0.004, D / 2 + 0.003]], 0.0007, s.material('#b9a37a'));
    } else if (a.story === 'cloth') {
      const geo = new THREE.PlaneGeometry(0.085, 0.075, 8, 8); geo.rotateX(-Math.PI / 2);
      const p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) p.setY(i, 0.002 + Math.abs(Math.sin(p.getX(i) * 90 + p.getZ(i) * 60)) * 0.006 + random() * 0.002);
      geo.computeVertexNormals();
      s.mesh(geo, s.material('#7fb0d8', { roughness: 1, side: THREE.DoubleSide }), [-W * 0.3, 0, D / 2 + 0.04]).rotation.y = random() * 0.8;
    } else if (a.story === 'slip') {
      const slip = s.label('RX ' + (100 + Math.floor(random() * 899)) + ' COLLECT', 0.09, 0.035, [-W * 0.2, 0.001, D / 2 + 0.028], '#1f3a8a', '#fbfbf5');
      slip.rotation.set(-Math.PI / 2, 0, (random() - 0.5) * 0.4);
    }

    return s.finish({ update: (_dt, time) => { sparkM.emissiveIntensity = 1.2 + Math.sin(time * (2 + mood.energy * 5)) * 0.6 * (0.3 + mood.energy); } });
  },
});
