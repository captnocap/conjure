import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type P3 = [number, number, number];
type Bit = { at: P3; scale: P3; turn: P3; color?: THREE.ColorRepresentation };

const MATERIALS = {
  porcelain: 'White laboratory porcelain with a pouring lip, glazed outside and matt within.',
  granite: 'Thick speckled grey granite, a kitchen heavyweight.',
  marble: 'Veined white marble, cool and expensive.',
  basalt: 'A rough black volcanic molcajete standing on three stubby legs.',
  brass: 'A tall bell-shaped brass apothecary mortar, polished by centuries of hands.',
  olive: 'Turned olive wood with a swirling grain.',
} as const;
const CONTENTS = {
  herbs: 'Fresh green herbs bruised to a wet paste.',
  lapis: 'Lapis lazuli being ground to ultramarine pigment.',
  spice: 'Peppercorns, seeds and golden turmeric.',
  crystals: 'Blue-white crystals half crushed to sugar.',
  charcoal: 'Charcoal and sulphur, a black powder that should not be near a flame.',
  pills: 'White tablets crushed to a chalky dust.',
  petals: 'Rose petals, pink and dark red.',
  empty: 'Nothing: wiped clean and waiting.',
} as const;
const STUFF: Record<keyof typeof CONTENTS, { mound: string; bits: string[]; shape: 'leaf' | 'chunk' | 'ball' | 'pill' }> = {
  herbs: { mound: '#4f8a2c', bits: ['#3d7a24', '#6fae3a', '#2f5f1e'], shape: 'leaf' },
  lapis: { mound: '#2440c8', bits: ['#1b2f9e', '#3558e0', '#c9a84a'], shape: 'chunk' },
  spice: { mound: '#d99a1c', bits: ['#2a211c', '#7a4a22', '#c9742a', '#e8c040'], shape: 'ball' },
  crystals: { mound: '#bfe0f2', bits: ['#7fc4ee', '#e6f4fb', '#4aa6e2'], shape: 'chunk' },
  charcoal: { mound: '#222123', bits: ['#141314', '#3a383a', '#d8c23a'], shape: 'chunk' },
  pills: { mound: '#f0eee6', bits: ['#ffffff', '#e9e6dc', '#f6c9d0'], shape: 'pill' },
  petals: { mound: '#c9486a', bits: ['#e87a98', '#9c1f3c', '#f2a6ba'], shape: 'leaf' },
  empty: { mound: '#888888', bits: ['#888888'], shape: 'chunk' },
};

function stone(base: string, flecks: string[], veins: string | null, random: () => number) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < (veins ? 120 : 1400); i++) {
    ctx.fillStyle = flecks[Math.floor(random() * flecks.length)];
    const r = 0.8 + random() * 2.6;
    ctx.beginPath(); ctx.arc(random() * 256, random() * 256, r, 0, Math.PI * 2); ctx.fill();
  }
  if (veins) {
    ctx.strokeStyle = veins;
    for (let i = 0; i < 9; i++) {
      ctx.lineWidth = 1 + random() * 3;
      let x = random() * 256, y = 0;
      ctx.beginPath(); ctx.moveTo(x, y);
      while (y < 256) { x += (random() - 0.5) * 50; y += 12 + random() * 30; ctx.lineTo(x, y); }
      ctx.stroke();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

const FORMS = {
  squat: { profile: [[0, 0], [0.046, 0], [0.05, 0.006], [0.044, 0.014], [0.05, 0.03], [0.066, 0.06], [0.074, 0.086], [0.076, 0.092], [0.066, 0.092], [0.062, 0.084], [0.052, 0.055], [0.03, 0.032], [0, 0.026]], rimR: 0.07, rimY: 0.092, floorY: 0.027, moundR: 0.044 },
  molcajete: { profile: [[0, 0.03], [0.05, 0.03], [0.072, 0.046], [0.084, 0.076], [0.086, 0.092], [0.074, 0.092], [0.066, 0.074], [0.04, 0.054], [0, 0.05]], rimR: 0.08, rimY: 0.092, floorY: 0.05, moundR: 0.05 },
  bell: { profile: [[0, 0], [0.042, 0], [0.045, 0.008], [0.03, 0.016], [0.028, 0.026], [0.038, 0.04], [0.05, 0.08], [0.058, 0.114], [0.066, 0.122], [0.056, 0.122], [0.05, 0.11], [0.042, 0.075], [0.028, 0.046], [0, 0.04]], rimR: 0.058, rimY: 0.122, floorY: 0.041, moundR: 0.032 },
} as const;

export default defineThing({
  questions: {
    material: choice('What is the mortar made of?', MATERIALS),
    contents: choice('What is being ground?', CONTENTS),
    progress: score('How far has the grinding gone?', ['Only just dropped in, still whole', 'Cracked and bruised', 'Coarse and gritty', 'A fine even powder or paste']),
    spill: score('How much has scattered around the mortar?', ['Not a grain', 'A light dusting', 'A wide careless scatter and a spilled heap']),
    pestle: choice('Where is the pestle?', {
      leaning: 'Resting in the bowl, leaning on the rim, put down mid-task.',
      across: 'Laid neatly across the rim.',
      beside: 'Lying on the table beside the mortar, its head dusted with powder.',
    }),
    beside: choice('What else is on the table with it?', {
      nothing: 'Nothing.',
      raw: 'More of the raw ingredient, waiting its turn.',
      packets: 'Small folded paper packets of the finished powder, a dose in each.',
      vial: 'A little corked glass vial and a spoon.',
    }),
    handles: choice('How is the heavy bowl held?', {
      plain: 'A smooth bowl without handles.',
      ears: 'Two broad little ear handles project beside the rim.',
      loops: 'Two raised loop handles make the bowl easy to carry.',
      lugs: 'Four small squared gripping lugs sit below the rim.',
    }),
    grip: choice('How is the pestle handle finished?', {
      smooth: 'A smooth polished handle.',
      grooved: 'Five shallow turned rings give the fingers a grip.',
      wrapped: 'A short cord wrap surrounds the upper handle.',
      capped: 'A contrasting rounded cap closes the end of the handle.',
    }),
    lid: choice('What covers the mortar when work is finished?', {
      none: 'No cover is kept with it.',
      wood: 'A turned wooden lid with a small knob lies beside the bowl.',
      stone: 'A matching heavy stone lid has been set down behind the bowl.',
      cloth: 'A folded square of linen lies ready to cover the contents.',
    }),
    transfer: choice('What helps move or finish the ground material?', {
      none: 'No extra transfer tool.',
      sieve: 'A tiny handled sieve waits to separate the coarse pieces.',
      funnel: 'A small metal funnel stands ready to fill a bottle.',
      spatula: 'A slender flat spatula lies beside the pestle.',
    }),
    mark: choice('What identifies this mortar or its batch?', {
      plain: 'The bowl has no mark.',
      batch: 'A small paper batch number is stuck to the outside.',
      seal: 'A round maker’s seal stands in relief on the front.',
      tied: 'A paper label is tied around the bowl with fine string.',
    }),
    station: choice('What supports the whole grinding station?', {
      bare: 'The mortar and tools stand directly on the table.',
      tray: 'A shallow wooden tray catches spills around the tools.',
      pad: 'A thick square cloth pad softens the sound of grinding.',
      board: 'A handled wooden board keeps the bowl and tools together.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const form = FORMS[a.material === 'basalt' ? 'molcajete' : a.material === 'brass' ? 'bell' : 'squat'];
    const stuff = STUFF[a.contents];
    const empty = a.contents === 'empty';

    const body = (() => {
      switch (a.material) {
        case 'porcelain': return s.material('#f3f0e8', { roughness: 0.28 });
        case 'granite': return new THREE.MeshStandardMaterial({ map: stone('#8f9294', ['#3d4043', '#c9cccd', '#6a6d70', '#e4e4e0'], null, random), roughness: 0.85 });
        case 'marble': return new THREE.MeshStandardMaterial({ map: stone('#efece6', ['#e2ded6', '#f7f5f0'], '#8d9096', random), roughness: 0.35 });
        case 'basalt': return new THREE.MeshStandardMaterial({ map: stone('#2f2c2b', ['#151413', '#4a4644', '#3a3634'], null, random), roughness: 1 });
        case 'brass': return s.material('#c89b3a', { metalness: 0.85, roughness: mix(0.22, 0.5, mood.wear) });
        default: return new THREE.MeshStandardMaterial({ map: stone('#b98a4c', ['#a8783c', '#c99a5c'], '#5e3d1c', random), roughness: 0.6 });
      }
    })();
    if (body.map) body.map.repeat.set(3, a.material === 'granite' || a.material === 'basalt' ? 3 : 1);

    const size = a.material === 'granite' ? 1.12 : 1;
    const bowl = new THREE.Group();
    bowl.scale.setScalar(size);
    s.root.add(bowl);
    const put = <T extends THREE.Object3D>(o: T) => { bowl.add(o); return o; };
    put(s.lathe(form.profile, body));
    if (a.material === 'basalt') for (let i = 0; i < 3; i++) {
      const t = i * (Math.PI * 2) / 3 + 0.5;
      put(s.cylinder(0.02, 0.014, 0.04, [Math.cos(t) * 0.05, 0.02, Math.sin(t) * 0.05], body, 10));
    }
    if (a.material === 'porcelain') {
      put(s.ball([0.014, 0.006, 0.012], [0, form.rimY - 0.002, form.rimR + 0.006], body, 10));
      put(s.lathe([[0.03, 0.0325], [0.052, 0.0555], [0.062, 0.0845], [0.066, 0.0925]], s.material('#dcd8cc', { roughness: 0.95 })));
    }
    if (a.material === 'brass') for (const y of [0.05, 0.1]) put(s.ring(mix(0.041, 0.055, (y - 0.04) / 0.07), 0.0022, [0, y, 0], body)).rotation.x = Math.PI / 2;

    const outerRadius = (y: number) => {
      for (let i = 1; i < form.profile.length; i++) { const previous = form.profile[i - 1], next = form.profile[i]; if (next[1] > previous[1] && y >= previous[1] && y <= next[1]) return mix(previous[0], next[0], (y - previous[1]) / (next[1] - previous[1])); }
      return form.rimR;
    };
    if (a.handles === 'ears') for (const side of [-1, 1]) put(s.ball([0.022, 0.008, 0.013], [side * (form.rimR + 0.01), form.rimY - 0.013, 0], body, 14));
    if (a.handles === 'loops') for (const side of [-1, 1]) { const loop = put(s.ring(0.018, 0.005, [side * (form.rimR + 0.008), form.rimY - 0.015, 0], body)); loop.rotation.y = Math.PI / 2; for (const z of [-0.011, 0.011]) put(s.rod([side * form.rimR * 0.9, form.rimY - 0.015, z], [side * (form.rimR + 0.008), form.rimY - 0.015, z], 0.004, body)); }
    if (a.handles === 'lugs') for (let i = 0; i < 4; i++) { const angle = i * Math.PI / 2; const lug = put(s.box([0.018, 0.013, 0.018], [Math.cos(angle) * form.rimR, form.rimY - 0.016, Math.sin(angle) * form.rimR], body)); lug.rotation.y = -angle; }
    if (a.mark === 'batch' || a.mark === 'tied') put(s.label(a.mark === 'tied' ? 'GROUND / 12' : 'BATCH 07', 0.047, 0.022, [0, form.rimY * 0.57, outerRadius(form.rimY * 0.57) + 0.001], '#3d4637', '#e9dfc4'));
    if (a.mark === 'tied') { const cord = put(s.ring(outerRadius(form.rimY * 0.6) + 0.001, 0.001, [0, form.rimY * 0.6, 0], s.material('#9e8053'))); cord.rotation.x = Math.PI / 2; put(s.rod([0, form.rimY * 0.6, form.rimR * 0.86], [0.018, form.rimY * 0.39, form.rimR * 0.86], 0.001, s.material('#9e8053'))); }
    if (a.mark === 'seal') { const seal = put(s.cylinder(0.012, 0.012, 0.004, [0, form.rimY * 0.53, outerRadius(form.rimY * 0.53) + 0.001], body, 14)); seal.rotation.x = Math.PI / 2; put(s.label('M', 0.015, 0.016, [0, form.rimY * 0.53, outerRadius(form.rimY * 0.53) + 0.004], '#675943', '#d2c5a6')); }

    // What is in the bowl.
    const moundMat = s.material(stuff.mound, { roughness: a.contents === 'herbs' || a.contents === 'petals' ? 0.5 : 1 });
    const geometry = { leaf: new THREE.SphereGeometry(1, 8, 6), chunk: new THREE.DodecahedronGeometry(1, 0), ball: new THREE.SphereGeometry(1, 8, 6), pill: new THREE.CylinderGeometry(1, 1, 0.45, 12) }[stuff.shape];
    const bitScale = (whole: number): P3 => {
      const k = (0.0035 + random() * 0.003) * mix(0.55, 1.9, whole);
      return stuff.shape === 'leaf' ? [k * 2.1, k * 0.25, k * 1.3] : stuff.shape === 'pill' ? [k * 1.25, k * 1.25, k * 1.25] : [k, k * (0.7 + random() * 0.5), k];
    };
    const bits: Bit[] = [];
    const tint = () => stuff.bits[Math.floor(random() * stuff.bits.length)];
    if (!empty) {
      const fine = a.progress;
      const m = put(s.ball([form.moundR, mix(0.008, 0.022, fine), form.moundR], [0, form.floorY + 0.01, 0], moundMat, 20));
      m.position.x = (random() - 0.5) * 0.008;
      const count = Math.round(mix(46, 14, fine) * mix(0.8, 1.2, mood.density));
      for (let i = 0; i < count; i++) {
        const t = random() * 6.28, r = Math.sqrt(random()) * form.moundR * 0.92;
        const y = form.floorY + 0.012 + mix(0.004, 0.018, fine) * (1 - (r / form.moundR) ** 2) + (r / form.moundR) ** 2 * 0.012;
        bits.push({ at: [Math.cos(t) * r * size, y * size, Math.sin(t) * r * size], scale: bitScale(1 - fine), turn: [random() * 3, random() * 3, random() * 3], color: tint() });
      }
      // A smear of residue climbing the inside wall.
      for (let i = 0; i < 14; i++) {
        const t = random() * 6.28;
        bits.push({ at: [Math.cos(t) * (form.moundR + 0.008) * size, (form.floorY + 0.03 + random() * 0.012) * size, Math.sin(t) * (form.moundR + 0.008) * size], scale: bitScale(0), turn: [random() * 3, random() * 3, random() * 3], color: stuff.mound });
      }
    }

    // Pestle.
    const pestleMat = a.material === 'basalt' || a.material === 'granite' || a.material === 'marble' || a.material === 'brass' ? body : a.material === 'olive' ? body : s.material('#f3f0e8', { roughness: 0.3 });
    const pestle = new THREE.Group();
    const part = (o: THREE.Object3D) => { pestle.add(o); return o; };
    const stubby = a.material === 'basalt';
    const len = stubby ? 0.115 : 0.165;
    part(s.lathe(stubby ? [[0, 0], [0.018, 0.004], [0.026, 0.025], [0.024, 0.05], [0.017, 0.09], [0.014, 0.108], [0, 0.115]] : [[0, 0], [0.013, 0.003], [0.019, 0.018], [0.018, 0.036], [0.012, 0.062], [0.0098, 0.14], [0.0125, 0.156], [0.008, 0.164], [0, 0.165]], pestleMat));
    if (a.material === 'porcelain') part(s.lathe([[0.0125, 0.066], [0.0105, 0.14], [0.013, 0.156], [0.008, 0.1645], [0, 0.1655]], s.material('#9a6b3c', { roughness: 0.7 })));
    const gripY = stubby ? 0.088 : 0.129;
    if (a.grip === 'grooved') for (let i = 0; i < 5; i++) { const ring = part(s.ring(stubby ? 0.016 : 0.011, 0.0014, [0, gripY - 0.014 + i * 0.005, 0], pestleMat)); ring.rotation.x = Math.PI / 2; }
    if (a.grip === 'wrapped') part(s.tube(Array.from({ length: 90 }, (_, i): P3 => { const angle = i / 89 * Math.PI * 12; return [Math.cos(angle) * (stubby ? 0.017 : 0.012), gripY - 0.015 + i / 89 * 0.03, Math.sin(angle) * (stubby ? 0.017 : 0.012)]; }), 0.0015, s.material('#bca16a')));
    if (a.grip === 'capped') part(s.ball([0.014, 0.007, 0.014], [0, len - 0.002, 0], s.material('#68543d'), 14));
    if (!empty) part(s.ball([0.0195, 0.008, 0.0195], [0, 0.008, 0], moundMat, 12)).scale.multiplyScalar(stubby ? 1.3 : 1);
    s.root.add(pestle);
    const aim = (from: THREE.Vector3, to: THREE.Vector3) => {
      pestle.position.copy(from);
      pestle.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize());
    };
    const swing = 0.3 + random() * 1.2;
    if (a.pestle === 'leaning') {
      const head = new THREE.Vector3(-Math.cos(swing) * form.moundR * 0.35, form.floorY + 0.016, Math.sin(swing) * form.moundR * 0.35).multiplyScalar(size);
      const rim = new THREE.Vector3(Math.cos(swing) * (form.rimR - 0.004), form.rimY + 0.012, -Math.sin(swing) * (form.rimR - 0.004)).multiplyScalar(size);
      aim(head, rim);
    } else if (a.pestle === 'across') {
      const y = form.rimY * size + 0.011;
      const dir = new THREE.Vector3(Math.cos(swing), 0, -Math.sin(swing));
      aim(dir.clone().multiplyScalar(-len * 0.5).setY(y + 0.006), dir.clone().multiplyScalar(len * 0.5).setY(y));
    } else {
      const z = form.rimR * size + 0.045;
      aim(new THREE.Vector3(-len * 0.45, stubby ? 0.025 : 0.0185, z + 0.012), new THREE.Vector3(len * 0.55, 0.013, z - 0.012));
    }

    // Spill around the foot.
    const reach = form.rimR * size;
    if (!empty && a.spill > 0.08) {
      const count = Math.round(mix(6, 70, a.spill) * mix(0.8, 1.2, mood.density));
      for (let i = 0; i < count; i++) {
        const t = random() * 6.28, r = reach * 0.75 + random() * mix(0.03, 0.11, a.spill);
        bits.push({ at: [Math.cos(t) * r, 0.002, Math.sin(t) * r * 0.9 + 0.01], scale: bitScale(1 - a.progress), turn: [0, random() * 3, 0], color: random() < 0.5 ? stuff.mound : tint() });
      }
      for (let i = 0; i < Math.round(a.spill * 7); i++) {
        const t = random() * 6.28, r = reach + random() * 0.07, w = 0.008 + random() * 0.016;
        s.cylinder(w, w * 1.1, 0.0012, [Math.cos(t) * r, 0.0006, Math.sin(t) * r * 0.9 + 0.01], moundMat, 12).scale.z = 0.6 + random() * 0.6;
      }
      if (a.spill > 0.6) {
        const heap = s.lathe([[0, 0.016], [0.01, 0.013], [0.024, 0.005], [0.034, 0]], moundMat, [-(reach + 0.04), 0, 0.05]);
        heap.scale.set(1, mix(0.6, 1.2, a.spill), 0.8);
      }
    }

    // Company on the table.
    const bx = reach + 0.06;
    if (a.beside === 'raw' && !empty) {
      if (a.contents === 'herbs' || a.contents === 'petals') {
        const stem = s.material('#3d6b26');
        s.tube([[bx - 0.03, 0.003, 0.05], [bx, 0.006, 0.01], [bx + 0.025, 0.004, -0.04]], 0.0018, stem);
        for (let i = 0; i < 9; i++) {
          const t = i / 8, x = mix(bx - 0.025, bx + 0.022, t), z = mix(0.045, -0.035, t), side = i % 2 ? 1 : -1;
          bits.push({ at: [x + side * 0.012, 0.006, z], scale: a.contents === 'herbs' ? [0.014, 0.0015, 0.007] : [0.012, 0.004, 0.011], turn: [0.2 * side, random() * 3, 0.2], color: tint() });
        }
        if (a.contents === 'petals') s.ball([0.016, 0.016, 0.016], [bx + 0.03, 0.016, -0.05], s.material('#b02a4a', { roughness: 0.6 }), 10);
      } else {
        for (let i = 0; i < 9; i++) {
          const k = a.contents === 'spice' ? 0.004 : 0.008 + random() * 0.008;
          bits.push({ at: [bx + (random() - 0.5) * 0.05, k * 0.8, (random() - 0.5) * 0.06], scale: stuff.shape === 'pill' ? [0.007, 0.007, 0.007] : [k, k, k], turn: [random() * 3, random() * 3, random() * 3], color: tint() });
        }
        if (a.contents === 'spice') s.rod([bx - 0.02, 0.006, 0.05], [bx + 0.04, 0.006, 0.065], 0.006, s.material('#8a4f26', { roughness: 0.9 }));
        if (a.contents === 'pills') {
          s.cylinder(0.017, 0.017, 0.045, [bx + 0.01, 0.0225, -0.05], s.material('#c9772a', { roughness: 0.25, transparent: true, opacity: 0.9 }), 16);
          s.cylinder(0.018, 0.018, 0.012, [bx + 0.01, 0.051, -0.05], s.material('#f4f4f0'), 16);
        }
      }
    } else if (a.beside === 'packets') {
      const paper = s.material('#f1ead6', { roughness: 0.95 });
      for (let i = 0; i < 3 + Math.round(mood.density * 2); i++) {
        const p = s.box([0.034, 0.004, 0.022], [bx + (random() - 0.5) * 0.03, 0.002 + i * 0.0042, (i % 2 ? 0.03 : -0.02) + (random() - 0.5) * 0.02], paper);
        p.rotation.y = (random() - 0.5) * 0.9;
      }
      if (!empty) s.cylinder(0.008, 0.01, 0.001, [bx - 0.01, 0.0005, 0.06], moundMat, 10);
    } else if (a.beside === 'vial') {
      s.cylinder(0.011, 0.011, 0.04, [bx, 0.02, -0.02], new THREE.MeshPhysicalMaterial({ color: '#d5ecf0', transparent: true, opacity: 0.4, roughness: 0.05, depthWrite: false }), 14);
      if (!empty) s.cylinder(0.0095, 0.0095, 0.022, [bx, 0.012, -0.02], moundMat, 14);
      s.cylinder(0.009, 0.0075, 0.012, [bx, 0.044, -0.02], s.material('#b98a55', { roughness: 0.95 }), 12);
      const horn = s.material('#d9c9a0', { roughness: 0.5 });
      s.rod([bx - 0.02, 0.003, 0.03], [bx + 0.04, 0.003, 0.055], 0.0022, horn);
      s.ball([0.009, 0.003, 0.007], [bx - 0.026, 0.003, 0.0275], horn, 10);
    }

    if (a.lid === 'wood' || a.lid === 'stone') {
      const material = a.lid === 'stone' ? body : s.material('#b48b50');
      const x = -reach - 0.045, z = -reach * 0.3;
      s.lathe([[0, 0], [reach * 0.72, 0], [reach * 0.78, 0.008], [reach * 0.7, 0.014], [0.008, 0.02], [0, 0.02]], material, [x, 0, z]);
      s.ball([0.011, 0.009, 0.011], [x, 0.025, z], material, 14);
    }
    if (a.lid === 'cloth') {
      const linen = s.material('#dfd6bc');
      for (let i = 0; i < 3; i++) { const fold = s.box([0.072 - i * 0.003, 0.003, 0.06], [-reach - 0.045, 0.0015 + i * 0.003, -0.015], linen); fold.rotation.y = i * 0.035; }
      for (let i = 0; i < 7; i++) s.box([0.001, 0.001, 0.058], [-reach - 0.071 + i * 0.008, 0.01, -0.015], s.material('#7a9595'));
    }
    const toolX = 0.02, toolZ = -reach - 0.075, steel = s.material('#b4b8b9', { metalness: 0.7, roughness: 0.35 });
    if (a.transfer === 'sieve') {
      s.lathe([[0, 0.004], [0.024, 0.004], [0.031, 0.018], [0.029, 0.02], [0.023, 0.006], [0, 0.006]], steel, [toolX, 0, toolZ]);
      for (let i = -3; i <= 3; i++) { const r = Math.sqrt(0.023 ** 2 - (i * 0.006) ** 2); s.rod([toolX - r, 0.007, toolZ + i * 0.006], [toolX + r, 0.007, toolZ + i * 0.006], 0.0004, s.material('#4e5758')); s.rod([toolX + i * 0.006, 0.007, toolZ - r], [toolX + i * 0.006, 0.007, toolZ + r], 0.0004, s.material('#4e5758')); }
      s.rod([toolX + 0.026, 0.016, toolZ], [toolX + 0.074, 0.006, toolZ], 0.003, steel);
    }
    if (a.transfer === 'funnel') {
      s.lathe([[0.003, 0], [0.003, 0.024], [0.026, 0.052], [0.025, 0.054], [0.002, 0.026], [0.002, 0]], steel, [toolX, 0, toolZ]);
      const stand = s.ring(0.027, 0.002, [toolX, 0.05, toolZ], steel); stand.rotation.x = Math.PI / 2;
      for (let i = 0; i < 3; i++) { const angle = i * Math.PI * 2 / 3; s.rod([toolX + Math.cos(angle) * 0.027, 0.05, toolZ + Math.sin(angle) * 0.027], [toolX + Math.cos(angle) * 0.035, 0.001, toolZ + Math.sin(angle) * 0.035], 0.0015, steel); }
    }
    if (a.transfer === 'spatula') { s.rod([toolX - 0.04, 0.004, toolZ], [toolX + 0.024, 0.004, toolZ], 0.002, steel); s.box([0.028, 0.002, 0.011], [toolX + 0.035, 0.003, toolZ], steel); }

    if (bits.length) {
      const mesh = new THREE.InstancedMesh(geometry, s.material('#ffffff', { roughness: stuff.shape === 'chunk' && a.contents !== 'charcoal' ? 0.35 : 0.8 }), bits.length);
      const matrix = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
      bits.forEach((bit, i) => {
        q.setFromEuler(e.set(...bit.turn));
        matrix.compose(new THREE.Vector3(...bit.at), q, new THREE.Vector3(...bit.scale));
        mesh.setMatrixAt(i, matrix);
        mesh.setColorAt(i, new THREE.Color(bit.color ?? stuff.mound));
      });
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.castShadow = mesh.receiveShadow = true;
      s.root.add(mesh);
    }
    if (a.station !== 'bare') {
      s.root.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(s.root), extent = bounds.getSize(new THREE.Vector3()), centre = bounds.getCenter(new THREE.Vector3());
      const w = extent.x + 0.025, d = extent.z + 0.025, h = a.station === 'pad' ? 0.005 : 0.009;
      for (const object of s.root.children) object.position.y += h;
      const base = s.material(a.station === 'pad' ? '#697e73' : '#a17a4b');
      s.box([w, h, d], [centre.x, h / 2, centre.z], base);
      if (a.station === 'tray') for (const side of [-1, 1]) { s.box([w, 0.016, 0.006], [centre.x, h + 0.008, centre.z + side * d / 2], base); s.box([0.006, 0.016, d], [centre.x + side * w / 2, h + 0.008, centre.z], base); }
      if (a.station === 'board') for (const side of [-1, 1]) s.tube([[centre.x + side * w / 2, h / 2, centre.z - 0.025], [centre.x + side * (w / 2 + 0.022), h / 2, centre.z - 0.023], [centre.x + side * (w / 2 + 0.022), h / 2, centre.z + 0.023], [centre.x + side * w / 2, h / 2, centre.z + 0.025]], 0.004, base);
      if (a.station === 'pad') for (let i = 0; i < 16; i++) for (const side of [-1, 1]) s.box([0.006, 0.0007, 0.001], [centre.x - w * 0.45 + i * w * 0.9 / 15, h + 0.0004, centre.z + side * (d / 2 - 0.006)], s.material('#d3c6a2'));
    }
    return s.finish();
  },
});
