import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

const LABELS = {
  latin: 'HOMVNCVLVS',
  number: 'No. VII',
  warning: 'DO NOT OPEN',
  son: 'FILIVS MEVS',
  name: 'Anselm',
  query: '?',
  failed: 'FAILED',
} as const;
const LABEL_MEANING: Record<keyof typeof LABELS, string> = {
  latin: 'HOMVNCVLVS in formal Latin capitals, a scholar\'s plain specimen label.',
  number: 'No. VII: one of a numbered series, the seventh attempt.',
  warning: 'DO NOT OPEN, a blunt warning to whoever finds it.',
  son: 'FILIVS MEVS, "my son", written with pride or grief.',
  name: 'A given name, Anselm, in a fond looping hand.',
  query: 'A single question mark: even its maker is not sure what it is.',
  failed: 'FAILED, scrawled across a scorched and stained label.',
};

function labelTexture(random: () => number, text: string, wear: number, scrawl: boolean) {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 160;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#e9dcba';
  ctx.fillRect(0, 0, 256, 160);
  for (let i = 0; i < 6 + wear * 30; i++) {
    ctx.fillStyle = `rgba(120,84,40,${0.05 + random() * 0.12})`;
    ctx.beginPath(); ctx.arc(random() * 256, random() * 160, 8 + random() * 40, 0, 7); ctx.fill();
  }
  ctx.strokeStyle = '#4a3320'; ctx.lineWidth = 3; ctx.strokeRect(9, 9, 238, 142);
  ctx.fillStyle = '#2a1c12'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const size = Math.min(84, 330 / Math.max(text.length, 2));
  ctx.font = `${scrawl ? 'italic ' : 'bold '}${size}px Georgia, serif`;
  ctx.save(); ctx.translate(128, 70); ctx.rotate((random() - 0.5) * 0.08); ctx.fillText(text, 0, 0, 220); ctx.restore();
  ctx.lineWidth = 2; ctx.beginPath();
  for (let x = 40; x < 216; x += 6) ctx.lineTo(x, 122 + Math.sin(x * 0.4 + random()) * 4);
  ctx.stroke();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default defineThing({
  questions: {
    occupant: choice('What is in the jar?', {
      infant: 'A small curled figure like an unborn child, knees drawn up, hands at its face.',
      shadow: 'Only a dark suggestive shape in the murk; you cannot be sure it is anything.',
      winged: 'A curled figure with two folded membranous wings, an imp or a failed angel.',
      mandrake: 'A forked root with the hint of limbs and a face, leaves still on its crown.',
      many: 'A curled figure with too many arms.',
      empty: 'Nothing but cloudy liquid and a little sediment: it never took, or it got out.',
    }),
    liquid: choice('What is the liquid like?', {
      amber: 'Murky amber, like old spirit or urine.',
      milk: 'Milky white and opaque.',
      green: 'Cloudy pond green.',
      pink: 'Blood-tinted pink.',
      blue: 'A faintly luminous blue.',
      dark: 'Nearly black, like strong tea.',
    }),
    state: choice('What is the occupant doing?', {
      asleep: 'Floating asleep, perfectly still.',
      reaching: 'Awake: one small hand stretched out toward the glass.',
      watching: 'Turned to face outward with two open, shining eyes.',
      sunk: 'Dead, sunk to the bottom and gone grey.',
      drained: 'The jar is cracked and nearly drained; it lies slumped in the last of the liquid.',
    }),
    jar: choice('What shape is the jar?', {
      cylinder: 'A tall straight specimen cylinder.',
      shouldered: 'An apothecary jar with rounded shoulders and a wide neck.',
      globe: 'A fat round globe with a short neck.',
      square: 'A square case bottle with flat sides.',
    }),
    seal: choice('How is it sealed?', {
      wax: 'A cork buried under a dome of red sealing wax that has run down the sides.',
      lead: 'A grey lead cap, banded and padlocked.',
      cloth: 'Waxed cloth tied down over the mouth with twine.',
      broken: 'The seal is broken and the lid sits askew.',
    }),
    label: choice('What does the label say?', LABEL_MEANING),
    rest: choice('What does the jar stand on?', {
      bare: 'Nothing, just the surface.',
      books: 'A short stack of old books.',
      cushion: 'A velvet cushion, as if it were precious.',
      warmer: 'An iron trivet over a single candle, keeping it at blood heat.',
    }),
    cord: noul('Is there a cord or tube running from the occupant up to the lid?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const tint = { amber: '#c89a3a', milk: '#e6e0d0', green: '#6f9a4a', pink: '#d98a8a', blue: '#5aa8e0', dark: '#3a2a20' }[a.liquid];
    const glowing = a.liquid === 'blue' ? 0.6 : mix(0.05, 0.3, mood.cheer * mood.warmth);
    const glass = new THREE.MeshPhysicalMaterial({ color: new THREE.Color('#e6f0ea').lerp(new THREE.Color('#9a9580'), mood.wear * 0.6), transparent: true, opacity: mix(0.22, 0.4, mood.wear), roughness: mix(0.05, 0.4, mood.wear), side: THREE.DoubleSide });
    const murk = a.occupant === 'shadow' ? 0.6 : a.liquid === 'milk' || a.liquid === 'dark' ? 0.5 : 0.38;
    const liquid = new THREE.MeshStandardMaterial({ color: tint, emissive: tint, emissiveIntensity: glowing, transparent: true, opacity: murk, roughness: 0.3, depthWrite: false });

    // What it rests on.
    let y0 = 0;
    if (a.rest === 'books') {
      const n = 2 + Math.floor(random() * 2);
      for (let i = 0; i < n; i++) {
        const w = 0.34 - random() * 0.06, d = 0.26 - random() * 0.04, h = 0.035 + random() * 0.03, turn = (random() - 0.5) * 0.5;
        const cover = s.box([w, h, d], [0, y0 + h / 2, 0], s.material(['#5a2a22', '#2f3f33', '#3a3048', '#6a5630'][Math.floor(random() * 4)], { roughness: 0.8 }));
        const pages = s.box([w - 0.012, h - 0.012, d - 0.006], [0.008, y0 + h / 2, 0.006], s.material('#d9cba6'));
        cover.rotation.y = pages.rotation.y = turn;
        y0 += h;
      }
    } else if (a.rest === 'cushion') {
      const velvet = s.material(mood.cheer > 0.5 ? '#8a2038' : '#3a2a4a', { roughness: 1 });
      s.ball([0.2, 0.05, 0.2], [0, 0.045, 0], velvet, 20);
      for (const [x, z] of [[1, 1], [1, -1], [-1, 1], [-1, -1]] as const) s.ball([0.02, 0.02, 0.02], [x * 0.16, 0.035, z * 0.16], s.material('#c9a23a', { metalness: 0.5 }), 8);
      y0 = 0.075;
    } else if (a.rest === 'warmer') {
      const iron = s.material('#27262a', { metalness: 0.5 });
      for (let i = 0; i < 3; i++) { const g = i * 2.094 + 0.5; s.rod([Math.sin(g) * 0.15, 0, Math.cos(g) * 0.15], [Math.sin(g) * 0.11, 0.13, Math.cos(g) * 0.11], 0.007, iron); }
      s.ring(0.11, 0.007, [0, 0.13, 0], iron).rotation.x = Math.PI / 2;
      s.cylinder(0.105, 0.105, 0.006, [0, 0.135, 0], iron, 18);
      s.cylinder(0.022, 0.024, 0.06, [0, 0.03, 0], s.material('#e8dcb8'), 10);
      const flame = s.ball([0.01, 0.022, 0.01], [0, 0.083, 0], new THREE.MeshStandardMaterial({ color: '#ffb040', emissive: '#ff9020', emissiveIntensity: 1.2 }), 8); flame.castShadow = false;
      y0 = 0.138;
    }

    // Jar.
    type P = readonly (readonly [number, number])[];
    const shapes: Record<typeof a.jar, { profile: P; r: number; h: number; mouth: number; front: number }> = {
      cylinder: { profile: [[0, 0], [0.105, 0.004], [0.11, 0.02], [0.11, 0.36], [0.1, 0.385], [0.1, 0.41], [0.108, 0.415]], r: 0.11, h: 0.36, mouth: 0.1, front: 0.11 },
      shouldered: { profile: [[0, 0], [0.11, 0.004], [0.125, 0.03], [0.13, 0.26], [0.11, 0.33], [0.075, 0.36], [0.075, 0.4], [0.085, 0.405]], r: 0.13, h: 0.32, mouth: 0.075, front: 0.13 },
      globe: { profile: [[0, 0], [0.08, 0.004], [0.14, 0.06], [0.165, 0.15], [0.145, 0.25], [0.085, 0.31], [0.065, 0.33], [0.065, 0.37], [0.075, 0.375]], r: 0.165, h: 0.29, mouth: 0.065, front: 0.163 },
      square: { profile: [[0, 0], [0.14, 0.004], [0.145, 0.02], [0.145, 0.33], [0.12, 0.36], [0.07, 0.37], [0.07, 0.41], [0.08, 0.415]], r: 0.145, h: 0.33, mouth: 0.07, front: 0.145 * Math.SQRT1_2 },
    };
    const shape = shapes[a.jar];
    const segments = a.jar === 'square' ? 4 : 32;
    const latheOf = (profile: P, material: THREE.Material) => {
      const mesh = s.mesh(new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), segments), material, [0, y0, 0]);
      if (a.jar === 'square') mesh.rotation.y = Math.PI / 4;
      return mesh;
    };
    const jar = latheOf(shape.profile, glass);
    jar.renderOrder = 3; jar.castShadow = false;
    const top = y0 + shape.profile[shape.profile.length - 1][1];
    const drained = a.state === 'drained';
    const level = drained ? 0.16 : mix(0.86, 0.96, random());
    const cut = shape.h * level;
    const fill: [number, number][] = [];
    for (const [r, y] of shape.profile) { if (y > cut) break; fill.push([r * 0.94, y + 0.006]); }
    const last = fill[fill.length - 1];
    fill.push([last[0], cut], [0, cut]);
    const body = latheOf(fill, liquid);
    body.renderOrder = 2; body.castShadow = false;
    // A soft shadow caster so the transparent jar still sits on its surface.
    const ghost = latheOf(fill, new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false }));
    ghost.renderOrder = 0;

    // Occupant.
    const fleshBase = new THREE.Color(a.state === 'sunk' ? '#8f8c84' : '#c79a86').lerp(new THREE.Color(tint), 0.1);
    const flesh = new THREE.MeshStandardMaterial({ color: fleshBase, roughness: 0.7 });
    const shade = new THREE.MeshStandardMaterial({ color: new THREE.Color(tint).multiplyScalar(0.07), roughness: 1 });
    const skin = a.occupant === 'shadow' ? shade : a.occupant === 'mandrake' ? new THREE.MeshStandardMaterial({ color: new THREE.Color('#9a7a4e').lerp(new THREE.Color(tint), 0.2), roughness: 0.95 }) : flesh;
    const figure = new THREE.Group();
    const part = (size: [number, number, number], at: [number, number, number], material: THREE.Material = skin) => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), material); m.scale.set(...size); m.position.set(...at); figure.add(m); return m;
    };
    const limb = (from: [number, number, number], to: [number, number, number], r: number, material: THREE.Material = skin) => {
      const A = new THREE.Vector3(...from), B = new THREE.Vector3(...to), d = B.clone().sub(A);
      const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, d.length(), 3, 8), material);
      m.position.copy(A).add(B).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); figure.add(m); return m;
    };
    const eyes: THREE.Mesh[] = [];
    let reach: THREE.Mesh | null = null;
    if (a.occupant === 'mandrake') {
      limb([0, 0.03, 0], [0.005, 0.11, 0], 0.03);
      part([0.036, 0.04, 0.034], [0.008, 0.15, 0]);
      for (const d of [-1, 1]) { limb([0, 0.03, d * 0.012], [0.02 * d, -0.05, d * 0.03], 0.013); limb([0.02 * d, -0.05, d * 0.03], [0.03, -0.085, d * 0.045], 0.006); limb([0.005, 0.1, d * 0.025], [0.05, 0.07, d * 0.06], 0.008); }
      const leaf = new THREE.MeshStandardMaterial({ color: '#4f7a3a', roughness: 0.8, side: THREE.DoubleSide });
      for (let i = 0; i < 5; i++) { const l = part([0.012, 0.045, 0.004], [0.008 + Math.cos(i * 1.3) * 0.02, 0.2, Math.sin(i * 1.3) * 0.02], leaf); l.rotation.set(Math.sin(i * 1.3) * 0.6, 0, -Math.cos(i * 1.3) * 0.6); }
      for (const d of [-1, 1]) eyes.push(part([0.006, 0.008, 0.006], [0.04, 0.155, d * 0.014], shade));
    } else if (a.occupant !== 'empty') {
      const blob = a.occupant === 'shadow';
      part([0.05, 0.052, 0.046], [0.022, 0.15, 0]); // head, tucked forward
      part([0.04, 0.045, 0.04], [-0.008, 0.095, 0]);
      part([0.042, 0.042, 0.042], [-0.004, 0.05, 0]);
      part([0.036, 0.034, 0.038], [0.006, 0.012, 0]);
      for (const d of [-1, 1]) {
        limb([0.008, 0.012, d * 0.026], [0.062, 0.062, d * 0.03], 0.016);
        limb([0.062, 0.062, d * 0.03], [0.05, -0.01, d * 0.026], 0.012);
        part([0.022, 0.01, 0.012], [0.062, -0.028, d * 0.026]);
        limb([0, 0.105, d * 0.04], [0.045, 0.07, d * 0.042], 0.011);
        const fore = limb([0.045, 0.07, d * 0.042], [0.06, 0.125, d * 0.03], 0.009);
        if (d > 0) reach = fore;
      }
      if (!blob) for (const d of [-1, 1]) eyes.push(part([0.007, 0.004, 0.009], [0.066, 0.15, d * 0.018], shade));
      if (a.occupant === 'winged') {
        const membrane = new THREE.MeshStandardMaterial({ color: fleshBase.clone().multiplyScalar(0.7), roughness: 0.8, side: THREE.DoubleSide });
        for (const d of [-1, 1]) {
          const wing = new THREE.Shape(); wing.moveTo(0, 0); wing.lineTo(-0.02, 0.1); wing.lineTo(-0.05, 0.03); wing.lineTo(-0.075, 0.06); wing.lineTo(-0.07, -0.03); wing.lineTo(-0.09, -0.06); wing.lineTo(-0.02, -0.07); wing.lineTo(0, 0);
          const m = new THREE.Mesh(new THREE.ShapeGeometry(wing), membrane); m.position.set(-0.04, 0.1, d * 0.03); m.rotation.y = d * 0.9; figure.add(m);
        }
      }
      if (a.occupant === 'many') for (const d of [-1, 1]) for (const y of [0.075, 0.045]) { limb([-0.005, y, d * 0.04], [0.05, y - 0.035, d * 0.055], 0.009); limb([0.05, y - 0.035, d * 0.055], [0.075, y + 0.01, d * 0.045], 0.007); }
    }
    const scale = Math.min(1, shape.r / 0.125) * (a.jar === 'square' ? 0.9 : 1) * mix(0.9, 1.1, random());
    figure.scale.setScalar(scale);
    const hasFigure = a.occupant !== 'empty';
    let floatY = y0 + shape.h * 0.5 - 0.07 * scale;
    if (a.state === 'sunk') { floatY = y0 + 0.05 * scale + 0.01; figure.rotation.z = -1.35; figure.position.x = -0.03; }
    if (drained) { floatY = y0 + 0.045 * scale + 0.01; figure.rotation.z = -1.5; figure.position.x = -0.04; }
    figure.position.y = floatY;
    figure.rotation.y = a.state === 'watching' ? -Math.PI / 2 : mix(-0.5, 0.5, random());
    if (a.state === 'watching' && hasFigure) {
      const shine = new THREE.MeshStandardMaterial({ color: '#fff6c0', emissive: mood.cheer > 0.5 ? '#ffe9a0' : '#ff4a2a', emissiveIntensity: 1.6 });
      for (const eye of eyes) { eye.material = shine; eye.scale.multiplyScalar(1.5); }
    }
    if (a.state === 'reaching' && reach && a.occupant !== 'shadow') {
      // One arm unfolded toward the viewer, a small palm against the glass.
      const tipZ = (shape.front - 0.012) / scale;
      limb([0.02, 0.1, 0.04], [0.03, 0.11, tipZ - 0.012], 0.009);
      part([0.016, 0.02, 0.007], [0.03, 0.115, tipZ]);
      (reach as THREE.Mesh).visible = false;
    }
    figure.traverse((node) => {
      const mesh = node as THREE.Mesh;
      if (!mesh.isMesh) return;
      // Drawn after the liquid and before the glass, so the murk veils it without erasing it.
      mesh.renderOrder = 2.5;
      const material = mesh.material as THREE.MeshStandardMaterial;
      material.transparent = true;
      material.opacity = a.occupant === 'shadow' ? 0.72 : 0.9;
    });
    if (hasFigure) s.root.add(figure);

    // Cord, sediment and rising specks.
    if (a.cord && hasFigure && !drained) {
      const from = figure.position.clone().add(new THREE.Vector3(0.03 * scale, 0.05 * scale, 0));
      const cordMat = new THREE.MeshStandardMaterial({ color: a.occupant === 'mandrake' ? '#6a5a3a' : '#a85a5a', roughness: 0.6 });
      const cord = s.tube([[from.x, from.y, from.z], [0.07 * scale, from.y + 0.02, 0.03], [0.06 * scale, y0 + shape.h * 0.75, -0.03], [0.01, y0 + shape.h * 0.9, 0.01], [0, top - 0.01, 0]], 0.005, cordMat);
      cord.renderOrder = 1; cord.castShadow = false;
    }
    const specks = [];
    for (let i = 0; i < Math.round(mix(8, 40, mood.density)); i++) { const g = random() * 6.28, r = Math.sqrt(random()) * shape.r * 0.6; specks.push({ at: [Math.cos(g) * r, y0 + 0.012 + random() * 0.012, Math.sin(g) * r] as const, size: 0.003 + random() * 0.004 }); }
    const sediment = s.scatter(new THREE.SphereGeometry(1, 5, 4), new THREE.MeshStandardMaterial({ color: new THREE.Color(tint).multiplyScalar(0.35), roughness: 1 }), specks);
    sediment.renderOrder = 1; sediment.castShadow = false;

    // Seal.
    const m = shape.mouth;
    const lid = new THREE.Group(); lid.position.y = top; s.root.add(lid);
    const put = <T extends THREE.Object3D>(node: T) => { lid.attach(node); return node; };
    if (a.seal === 'wax' || a.seal === 'broken') {
      const wax = s.material(mood.cheer > 0.6 ? '#b3261e' : '#7a1a1c', { roughness: 0.4 });
      put(s.cylinder(m * 0.9, m * 0.8, 0.04, [0, top, 0], s.material('#a8845a', { roughness: 1 }), 18));
      put(s.lathe([[m + 0.012, -0.02], [m + 0.014, 0], [m * 0.9, 0.03], [m * 0.4, 0.045], [0, 0.048]], wax, [0, top, 0]));
      const drips = 4 + Math.floor(random() * 4);
      for (let i = 0; i < drips; i++) { const g = random() * 6.28, len = 0.03 + random() * 0.07; put(s.ball([0.011, len, 0.009], [Math.cos(g) * (m + 0.012), top - 0.015 - len * 0.6, Math.sin(g) * (m + 0.012)], wax, 8)); }
      if (a.seal === 'broken') { lid.rotation.set(0.32, random() * 6, 0.28); lid.position.set(0.03, top + 0.012, 0.015); }
    } else if (a.seal === 'lead') {
      const lead = s.material('#7c8084', { metalness: 0.6, roughness: 0.55 });
      put(s.lathe([[m + 0.016, -0.035], [m + 0.018, 0.005], [m * 0.6, 0.02], [0, 0.022]], lead, [0, top, 0]));
      put(s.ring(m + 0.019, 0.006, [0, top - 0.025, 0], s.material('#3a3a3c', { metalness: 0.6 }))).rotation.x = Math.PI / 2;
      put(s.box([0.035, 0.04, 0.016], [0, top - 0.05, m + 0.03], s.material('#3a3a3c', { metalness: 0.6 })));
      put(s.ring(0.014, 0.004, [0, top - 0.027, m + 0.03], s.material('#3a3a3c', { metalness: 0.6 }), Math.PI));
    } else {
      const cloth = s.material('#cbb98a', { roughness: 1, side: THREE.DoubleSide });
      const pts: [number, number][] = [[0, 0.012], [m * 0.8, 0.01], [m + 0.01, 0], [m + 0.012, -0.03]];
      for (let i = 0; i < 5; i++) pts.push([m + 0.016 + i * 0.008 + random() * 0.004, -0.035 - i * 0.008]);
      put(s.lathe(pts, cloth, [0, top, 0]));
      put(s.ring(m + 0.013, 0.004, [0, top - 0.028, 0], s.material('#7a6238'))).rotation.x = Math.PI / 2;
    }

    // Label, curved to the glass.
    const scorched = a.label === 'failed' || mood.wear > 0.85;
    const map = labelTexture(random, LABELS[a.label], mood.wear + (scorched ? 0.5 : 0), a.label === 'name' || a.label === 'son' || a.label === 'query');
    const paper = new THREE.MeshStandardMaterial({ map, roughness: 0.9, side: THREE.DoubleSide });
    const lw = 0.13, lh = 0.08, ly = y0 + (a.jar === 'globe' ? 0.14 : 0.09);
    let tag: THREE.Mesh;
    if (a.jar === 'square') tag = s.mesh(new THREE.PlaneGeometry(lw, lh), paper, [0, ly, shape.front + 0.002]);
    else { const arc = lw / shape.front; tag = s.mesh(new THREE.CylinderGeometry(shape.front + 0.002, shape.front + 0.002, lh, 12, 1, true, -arc / 2, arc), paper, [0, ly, 0]); }
    tag.rotation.z = (random() - 0.5) * 0.08; tag.renderOrder = 4; tag.castShadow = false;

    // Crack and spill for the drained jar.
    if (drained) {
      const crack = s.tube([[0.03, y0 + 0.2, shape.front + 0.001], [0.05, y0 + 0.13, shape.front + 0.001], [0.035, y0 + 0.08, shape.front + 0.001], [0.06, y0 + 0.02, shape.front + 0.001]], 0.0025, new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 0.4 }));
      crack.renderOrder = 4;
      if (a.rest === 'bare') { const puddle = s.cylinder(0.2, 0.2, 0.004, [0.09, 0.002, 0.12], new THREE.MeshStandardMaterial({ color: tint, roughness: 0.2, transparent: true, opacity: 0.75 }), 20); puddle.scale.z = 0.7; puddle.castShadow = false; }
    }

    const bob = a.state === 'asleep' || a.state === 'reaching' || a.state === 'watching';
    const speed = mix(0.3, 1.6, mood.energy);
    const turn0 = figure.rotation.y;
    return s.finish({
      update: (_dt, time) => {
        if (!bob) return;
        figure.position.y = floatY + Math.sin(time * speed) * 0.006;
        if (a.state === 'asleep') figure.rotation.y = turn0 + Math.sin(time * speed * 0.4) * 0.25;
      },
    });
  },
});
