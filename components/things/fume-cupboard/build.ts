import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

const GLOWS = {
  none: 'No glow: just what the room light shows.',
  green: 'A sickly radioactive green.',
  amber: 'A warm amber, like a pilot light or a heating element.',
  violet: 'A cold violet, ultraviolet tubes left on.',
  red: 'A dull emergency red.',
  blue: 'A clean electric blue.',
} as const;
const GLOW: Record<keyof typeof GLOWS, string> = { none: '#000000', green: '#6dff3a', amber: '#ffab2e', violet: '#a45cff', red: '#ff3324', blue: '#3aa8ff' };

function sticker(kind: 'triangle' | 'diamond' | 'note' | 'skull' | 'tape', text = '') {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  g.lineJoin = 'round';
  if (kind === 'triangle' || kind === 'skull') {
    g.fillStyle = '#f6c915'; g.strokeStyle = '#161616'; g.lineWidth = 10;
    g.beginPath(); g.moveTo(64, 10); g.lineTo(120, 114); g.lineTo(8, 114); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#161616';
    if (kind === 'triangle') { g.fillRect(57, 42, 14, 40); g.beginPath(); g.arc(64, 97, 8, 0, 7); g.fill(); }
    else { g.beginPath(); g.arc(64, 70, 17, 0, 7); g.fill(); g.fillRect(54, 80, 20, 16); g.fillStyle = '#f6c915'; g.beginPath(); g.arc(57, 69, 5, 0, 7); g.arc(71, 69, 5, 0, 7); g.fill(); }
  } else if (kind === 'diamond') {
    g.translate(64, 64); g.rotate(Math.PI / 4);
    g.fillStyle = '#fff'; g.fillRect(-42, -42, 84, 84);
    g.fillStyle = '#d8262c'; g.fillRect(-42, -42, 84, 42);
    g.strokeStyle = '#161616'; g.lineWidth = 6; g.strokeRect(-42, -42, 84, 84);
    g.rotate(-Math.PI / 4); g.fillStyle = '#161616';
    g.beginPath(); g.moveTo(0, -30); g.quadraticCurveTo(22, 0, 0, 14); g.quadraticCurveTo(-22, 0, 0, -30); g.fill();
  } else if (kind === 'note') {
    g.fillStyle = '#f7f2a6'; g.fillRect(0, 0, 128, 128);
    g.fillStyle = '#c0202a'; g.font = 'bold 30px sans-serif'; g.textAlign = 'center';
    text.split('|').forEach((line, i) => g.fillText(line, 64, 44 + i * 34, 118));
  } else {
    g.fillStyle = '#f6c915'; g.fillRect(0, 0, 128, 128);
    g.fillStyle = '#161616';
    for (let i = -4; i < 8; i++) { g.beginPath(); g.moveTo(i * 32, 0); g.lineTo(i * 32 + 16, 0); g.lineTo(i * 32 + 16 + 128, 128); g.lineTo(i * 32 + 128, 128); g.closePath(); g.fill(); }
  }
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ map: texture, transparent: kind !== 'note' && kind !== 'tape', alphaTest: 0.5, roughness: 0.7 });
}

export default defineThing({
  questions: {
    contents: choice('What is inside the fume cupboard?', {
      flask: 'A flask of coloured liquid bubbling on a hotplate, unattended.',
      still: 'A distillation rig: a round flask over a burner, a slanting condenser, a receiver slowly filling.',
      bottles: 'A crowd of reagent bottles pushed in for storage, brown glass and peeling labels.',
      jar: 'One large sealed specimen jar with something dark suspended in it.',
      smoke: 'A tipped beaker pouring out heavy brown fumes that fill the chamber.',
      lunch: 'Nothing dangerous: a mug of tea and a sandwich somebody hid from the class.',
      empty: 'Nothing at all, scrubbed and waiting.',
    }),
    sash: score('How high is the glass sash raised?', ['Shut tight to the sill', 'A hand-width gap', 'Half way up', 'Thrown wide open']),
    glow: choice('Is there a glow from inside, and of what colour?', GLOWS),
    warnings: choice('What warnings are stuck on it?', {
      none: 'None: bare glass and enamel.',
      one: 'A single neat yellow hazard triangle.',
      plastered: 'Plastered with them: triangles, skulls, red diamonds, layered over years.',
      note: 'A handwritten yellow note taped to the glass saying DO NOT TOUCH.',
      condemned: 'Hazard tape crossed over the front and an OUT OF USE notice.',
    }),
    escaping: choice('Is anything getting out?', {
      sealed: 'No. It is doing its job, calm and contained.',
      wisps: 'Pale vapour is creeping out under the sash and rising up the front.',
      drip: 'Something coloured has run over the sill and down the base into a puddle.',
      cracked: 'The glass is cracked from the inside in a star.',
      alarm: 'A red warning beacon on top is flashing: airflow failure.',
    }),
    style: choice('What kind of cabinet is it?', {
      enamel: 'Cream enamelled steel with rounded 1960s corners on a varnished wood base.',
      modern: 'Crisp white with blue trim and a digital airflow panel.',
      steel: 'Grey industrial sheet steel, riveted, built for a works laboratory.',
      wood: 'A dark mahogany glazed cabinet from a Victorian school, brass fittings.',
    }),
    base: choice('What is the base unit underneath?', {
      doors: 'Plain cupboard doors.',
      flammables: 'A bright yellow flammables cabinet with a red flame diamond.',
      cylinder: 'An open recess holding a chained gas cylinder.',
    }),
    duct: choice('How does it vent?', {
      round: 'A fat round duct rising from the top.',
      box: 'A square extractor box with a louvred fan grille.',
      none: 'No visible duct; it vents out through the wall behind.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const W = 1.3, D = 0.78, B = 0.9, C = 2.12, F = 2.38;
    const shell = { enamel: '#e8dfc2', modern: '#f1f2f0', steel: '#8d9698', wood: '#5a2f1d' }[a.style];
    const trim = { enamel: '#8a5a34', modern: '#2a6fc0', steel: '#4d5558', wood: '#3a1d12' }[a.style];
    const shellMat = s.material(shell, { roughness: a.style === 'steel' ? 0.45 : 0.5, metalness: a.style === 'steel' ? 0.6 : 0.05 });
    const trimMat = s.material(trim, { roughness: 0.55 });
    const dark = s.material('#24272a', { roughness: 0.7 });
    const metal = s.material(a.style === 'wood' ? '#b08a3c' : '#c9cfd0', { metalness: 0.85, roughness: 0.3 });
    const white = s.material('#f2f0e8', { roughness: 0.4 });
    const glass = new THREE.MeshPhysicalMaterial({ color: '#d5ecef', transparent: true, opacity: 0.16, roughness: 0.03, depthWrite: false, side: THREE.DoubleSide });
    const jarGlass = new THREE.MeshPhysicalMaterial({ color: '#dff1f2', transparent: true, opacity: 0.3, roughness: 0.05, depthWrite: false, side: THREE.DoubleSide });
    const glowing = a.glow !== 'none';
    const glow = new THREE.Color(GLOW[a.glow]);
    const strength = glowing ? mix(0.9, 1.8, 1 - Math.abs(mood.daylight - 0.5) * 0) : 0;
    const lit = (colour: THREE.ColorRepresentation, own = 0.25) => {
      const c = new THREE.Color(colour);
      return new THREE.MeshStandardMaterial({ color: c, roughness: 0.3, emissive: glowing ? glow : c, emissiveIntensity: glowing ? strength : own });
    };
    const pulses: THREE.MeshStandardMaterial[] = [];

    // Base unit.
    s.box([W, 0.08, D - 0.08], [0, 0.04, -0.03], dark);
    const baseMat = a.style === 'enamel' || a.style === 'wood' ? trimMat : shellMat;
    const bh = B - 0.13;
    if (a.base === 'cylinder') {
      s.box([W, bh, 0.04], [0, 0.08 + bh / 2, -D / 2 + 0.02], baseMat);
      for (const k of [-1, 1]) s.box([0.04, bh, D], [k * (W / 2 - 0.02), 0.08 + bh / 2, 0], baseMat);
      s.box([W * 0.45, bh, D], [-W * 0.275, 0.08 + bh / 2, 0], baseMat);
      const cx = 0.3;
      const tank = s.material(['#7a2a2a', '#2a5a8a', '#3d3f42', '#d8d2c0'][Math.floor(random() * 4)], { metalness: 0.4, roughness: 0.4 });
      s.cylinder(0.11, 0.11, 0.55, [cx, 0.36, 0.1], tank, 20);
      s.ball([0.11, 0.07, 0.11], [cx, 0.635, 0.1], tank, 16);
      s.cylinder(0.03, 0.035, 0.08, [cx, 0.72, 0.1], metal, 12);
      s.rod([cx, 0.74, 0.1], [cx + 0.09, 0.74, 0.1], 0.012, metal);
      s.box([0.5, 0.012, 0.012], [cx, 0.5, 0.215], metal);
      s.box([0.24, 0.3, 0.012], [-W * 0.275, 0.45, D / 2 + 0.006], s.material(new THREE.Color(baseMat.color).multiplyScalar(0.85)));
    } else {
      const yellow = a.base === 'flammables';
      const m = yellow ? s.material('#f2c318', { roughness: 0.45 }) : baseMat;
      s.box([W, bh, D], [0, 0.08 + bh / 2, 0], m);
      const panel = s.material(new THREE.Color(m.color).multiplyScalar(0.88), { roughness: 0.5 });
      for (const k of [-1, 1]) {
        s.box([W / 2 - 0.04, bh - 0.06, 0.012], [k * W / 4, 0.08 + bh / 2, D / 2 + 0.006], panel);
        s.box([0.016, 0.16, 0.022], [k * 0.05, 0.6, D / 2 + 0.02], metal);
      }
      if (yellow) {
        s.mesh(new THREE.PlaneGeometry(0.26, 0.26), sticker('diamond'), [-W / 4, 0.48, D / 2 + 0.014]);
        s.label('FLAMMABLE', 0.44, 0.08, [W / 4, 0.62, D / 2 + 0.014], '#c0202a', '#f2c318');
        for (let i = 0; i < 4; i++) s.box([0.2, 0.008, 0.004], [W / 4, 0.2 + i * 0.03, D / 2 + 0.014], dark);
      }
    }
    // Worktop, service taps on the sill.
    s.box([W + 0.02, 0.05, D + 0.03], [0, B - 0.025, 0.005], s.material('#2a2c2e', { roughness: 0.5 }));
    const knobs = ['#f2c318', '#2a6fc0', '#d8262c', '#3fa55a'];
    for (let i = 0; i < 4; i++) {
      const x = W / 2 - 0.1 - i * 0.09;
      const k = s.cylinder(0.022, 0.022, 0.02, [x, B - 0.1, D / 2 + 0.022], s.material(knobs[i]), 12);
      k.rotation.x = Math.PI / 2;
      if (a.base === 'cylinder') k.visible = i > 1;
    }

    // Chamber.
    const inner = s.material(glowing ? new THREE.Color('#d9d9d0').lerp(glow, 0.35) : '#cfcfc6', { roughness: 0.9, emissive: glowing ? glow : '#000000', emissiveIntensity: glowing ? 0.45 : 0 });
    if (glowing) pulses.push(inner);
    s.box([W, C - B, 0.04], [0, (B + C) / 2, -D / 2 + 0.02], shellMat);
    s.box([W - 0.1, C - B, 0.01], [0, (B + C) / 2, -D / 2 + 0.046], inner);
    for (const k of [-1, 1]) {
      s.box([0.06, C - B, D], [k * (W / 2 - 0.03), (B + C) / 2, 0], shellMat);
      s.box([0.01, C - B - 0.02, D - 0.12], [k * (W / 2 - 0.066), (B + C) / 2, 0], inner);
      s.box([0.08, C - B, 0.07], [k * (W / 2 - 0.04), (B + C) / 2, D / 2 - 0.035], a.style === 'wood' ? trimMat : shellMat);
    }
    // Slotted baffle at the back.
    for (let i = 0; i < 3; i++) s.box([W - 0.3, 0.03, 0.012], [0, B + 0.25 + i * 0.36, -D / 2 + 0.056], dark);
    // Fascia with its panel.
    s.box([W, F - C, D], [0, (C + F) / 2, 0], shellMat);
    s.box([W + 0.02, 0.03, D + 0.02], [0, F + 0.015, 0], trimMat);
    s.box([W, 0.025, 0.02], [0, C + 0.012, D / 2 + 0.01], trimMat);
    const alarm = a.escaping === 'alarm';
    const pz = D / 2 + 0.006;
    if (a.style === 'modern') {
      s.label(alarm ? 'LOW FLOW' : '0.52 m/s', 0.3, 0.1, [W / 2 - 0.22, (C + F) / 2, pz], alarm ? '#ff5040' : '#7dffa0', '#14201a');
    } else {
      s.box([0.2, 0.14, 0.012], [W / 2 - 0.18, (C + F) / 2, pz], white);
      const needle = s.box([0.006, 0.08, 0.006], [W / 2 - 0.18, (C + F) / 2 - 0.01, pz + 0.01], s.material('#c0202a'));
      needle.rotation.z = alarm ? 1 : -0.5 + random() * 0.3;
    }
    const lampColour = alarm ? '#ff2a1c' : '#4dff6a';
    const lamp = new THREE.MeshStandardMaterial({ color: lampColour, emissive: lampColour, emissiveIntensity: 1.5 });
    s.ball([0.025, 0.025, 0.02], [-W / 2 + 0.14, (C + F) / 2, pz], lamp, 12);
    for (let i = 0; i < 2; i++) s.box([0.03, 0.05, 0.02], [-W / 2 + 0.26 + i * 0.07, (C + F) / 2, pz], dark);
    s.label('FUME CUPBOARD', 0.42, 0.06, [-0.02, (C + F) / 2 + 0.04, pz], a.style === 'wood' ? '#e8d9a8' : '#2c3438', shell);

    // Duct.
    if (a.duct === 'round') {
      s.cylinder(0.19, 0.19, 0.5, [0, F + 0.27, -0.08], metal, 24);
      for (let i = 0; i < 3; i++) s.ring(0.195, 0.012, [0, F + 0.1 + i * 0.17, -0.08], metal).rotation.x = Math.PI / 2;
    } else if (a.duct === 'box') {
      s.box([0.7, 0.36, 0.5], [0, F + 0.21, -0.08], shellMat);
      for (let i = 0; i < 6; i++) s.box([0.56, 0.018, 0.02], [0, F + 0.09 + i * 0.045, 0.18], dark).rotation.x = 0.5;
    }
    let beacon: THREE.MeshStandardMaterial | null = null;
    if (alarm) {
      beacon = new THREE.MeshStandardMaterial({ color: '#ff2a1c', emissive: '#ff2a1c', emissiveIntensity: 2.5 });
      s.cylinder(0.06, 0.07, 0.03, [W / 2 - 0.15, F + 0.045, D / 2 - 0.15], dark, 14);
      s.cylinder(0.045, 0.05, 0.09, [W / 2 - 0.15, F + 0.105, D / 2 - 0.15], beacon, 14).castShadow = false;
    }

    // Sash.
    const open = mix(0.02, 0.86, a.sash);
    const sy = B + open, sashW = W - 0.16, sz = D / 2 - 0.05;
    const frame = a.style === 'wood' ? trimMat : metal;
    s.box([sashW, 0.06, 0.035], [0, sy + 0.03, sz], frame);
    s.box([sashW * 0.4, 0.02, 0.03], [0, sy + 0.03, sz + 0.03], dark);
    if (C - sy - 0.06 > 0.04) {
      s.box([sashW, C - sy - 0.06, 0.008], [0, (C + sy + 0.06) / 2, sz], glass);
      for (const k of [-1, 1]) s.box([0.03, C - sy - 0.06, 0.03], [k * (sashW / 2 - 0.015), (C + sy + 0.06) / 2, sz], frame);
      if (a.style === 'wood' && C - sy > 0.5) s.box([0.025, C - sy - 0.06, 0.025], [0, (C + sy + 0.06) / 2, sz], frame);
    }
    const front = sz + 0.012, glassMid = (C + sy + 0.06) / 2, glassH = C - sy - 0.06;

    // Contents.
    const y0 = B, liquidColours = ['#3fbf4a', '#d94a2a', '#2f7fe0', '#e0b92a', '#8a3fc8'];
    const liquid = lit(glowing ? glow : liquidColours[Math.floor(random() * liquidColours.length)]);
    pulses.push(liquid);
    const bubbles: THREE.Mesh[] = [];
    let bubbleAt: [number, number, number] | null = null;
    if (a.contents === 'flask') {
      const x = (random() - 0.5) * 0.3;
      s.box([0.3, 0.09, 0.3], [x, y0 + 0.045, 0], white);
      s.cylinder(0.12, 0.12, 0.012, [x, y0 + 0.096, 0], dark, 20);
      s.cylinder(0.022, 0.022, 0.02, [x + 0.08, y0 + 0.05, 0.155], dark, 10).rotation.x = Math.PI / 2;
      s.lathe([[0, 0], [0.13, 0], [0.14, 0.02], [0.04, 0.27], [0.04, 0.37], [0.052, 0.38]], jarGlass, [x, y0 + 0.103, 0]);
      s.lathe([[0, 0.005], [0.128, 0.005], [0.136, 0.02], [0.085, 0.16], [0, 0.16]], liquid, [x, y0 + 0.103, 0]);
      s.ring(0.048, 0.007, [x, y0 + 0.483, 0], white).rotation.x = Math.PI / 2;
      bubbleAt = [x, y0 + 0.27, 0];
    } else if (a.contents === 'still') {
      s.box([0.2, 0.014, 0.14], [-0.34, y0 + 0.007, -0.1], dark);
      s.cylinder(0.008, 0.008, 0.8, [-0.4, y0 + 0.4, -0.1], metal, 10);
      s.cylinder(0.035, 0.05, 0.016, [-0.28, y0 + 0.008, 0.02], dark, 16);
      s.cylinder(0.012, 0.014, 0.14, [-0.28, y0 + 0.08, 0.02], metal, 12);
      const flame = new THREE.MeshStandardMaterial({ color: '#3a8cff', emissive: '#3a8cff', emissiveIntensity: 2 });
      s.mesh(new THREE.ConeGeometry(0.022, 0.09, 12), flame, [-0.28, y0 + 0.195, 0.02]).castShadow = false;
      s.ball([0.11, 0.11, 0.11], [-0.28, y0 + 0.36, 0.02], jarGlass, 20);
      const half = s.mesh(new THREE.SphereGeometry(0.1, 20, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), liquid, [-0.28, y0 + 0.36, 0.02]);
      half.castShadow = true;
      s.cylinder(0.1, 0.1, 0.004, [-0.28, y0 + 0.36, 0.02], liquid, 20);
      s.cylinder(0.028, 0.028, 0.16, [-0.28, y0 + 0.53, 0.02], jarGlass, 12);
      s.rod([-0.4, y0 + 0.52, -0.1], [-0.28, y0 + 0.52, 0.02], 0.007, metal);
      s.rod([-0.28, y0 + 0.6, 0.02], [-0.2, y0 + 0.62, 0.02], 0.02, white);
      s.rod([-0.2, y0 + 0.62, 0.02], [0.3, y0 + 0.3, 0.02], 0.035, white);
      s.rod([-0.22, y0 + 0.64, 0.02], [0.34, y0 + 0.28, 0.02], 0.012, liquid);
      s.tube([[-0.1, y0 + 0.59, 0.05], [-0.12, y0 + 0.7, 0.1], [-0.2, y0 + 0.75, -0.2]], 0.01, s.material('#c8502c'));
      s.tube([[0.22, y0 + 0.31, 0.05], [0.3, y0 + 0.15, 0.12], [0.45, y0 + 0.02, -0.1]], 0.01, s.material('#c8502c'));
      s.lathe([[0, 0], [0.08, 0], [0.085, 0.012], [0.03, 0.17], [0.03, 0.24]], jarGlass, [0.36, y0, 0.02]);
      const fill = 0.03 + random() * 0.09;
      s.lathe([[0, 0.004], [0.078, 0.004], [0.082, 0.012], [0.082 - fill * 0.33, fill], [0, fill]], liquid, [0.36, y0, 0.02]);
      bubbleAt = [-0.28, y0 + 0.38, 0.02];
    } else if (a.contents === 'bottles') {
      const n = Math.round(mix(5, 13, mood.density));
      const amber = s.material('#6b4320', { roughness: 0.25 }), clear = s.material('#c9dcd8', { roughness: 0.15 }), blue = s.material('#2c4f8a', { roughness: 0.25 });
      for (let i = 0; i < n; i++) {
        const row = i % 2, x = -0.45 + (Math.floor(i / 2) + row * 0.5) * (0.9 / Math.ceil(n / 2)) + (random() - 0.5) * 0.03, z = row ? 0.08 : -0.14;
        const h = 0.16 + random() * 0.14, r = 0.045 + random() * 0.025;
        const m = [amber, amber, clear, blue][Math.floor(random() * 4)];
        s.cylinder(r, r, h, [x, y0 + h / 2, z], m, 16);
        s.cylinder(r * 0.4, r, 0.05, [x, y0 + h + 0.025, z], m, 14);
        s.cylinder(r * 0.45, r * 0.4, 0.04, [x, y0 + h + 0.07, z], random() < 0.3 ? s.material('#c0202a') : dark, 12);
        const label = s.mesh(new THREE.CylinderGeometry(r + 0.002, r + 0.002, h * 0.5, 14, 1, true, -0.9, 1.8), s.material(random() < 0.2 ? '#f2c318' : '#efe9d6', { side: THREE.DoubleSide }), [x, y0 + h * 0.45, z]);
        label.rotation.y = (random() - 0.5) * 1.2;
      }
    } else if (a.contents === 'jar') {
      const x = (random() - 0.5) * 0.2;
      s.cylinder(0.2, 0.2, 0.62, [x, y0 + 0.31, -0.02], jarGlass, 28);
      const fluid = new THREE.MeshStandardMaterial({ color: glowing ? glow : '#c9c47a', transparent: true, opacity: 0.5, depthWrite: false, emissive: glowing ? glow : '#6a6a30', emissiveIntensity: glowing ? 0.8 : 0.2 });
      s.cylinder(0.19, 0.19, 0.54, [x, y0 + 0.28, -0.02], fluid, 28).castShadow = false;
      s.cylinder(0.21, 0.21, 0.05, [x, y0 + 0.645, -0.02], dark, 28);
      s.cylinder(0.2, 0.21, 0.03, [x, y0 + 0.015, -0.02], dark, 28);
      const thing = s.material('#1b1a1f', { roughness: 0.6 });
      s.ball([0.1, 0.13, 0.09], [x, y0 + 0.36, -0.02], thing, 16);
      for (let i = 0; i < 5; i++) {
        const t = i / 5 * Math.PI * 2 + random();
        s.tube([[x + Math.cos(t) * 0.05, y0 + 0.28, -0.02 + Math.sin(t) * 0.05], [x + Math.cos(t) * 0.12, y0 + 0.2, -0.02 + Math.sin(t) * 0.1], [x + Math.cos(t + 0.6) * 0.13, y0 + 0.07 + random() * 0.05, -0.02 + Math.sin(t + 0.6) * 0.12]], 0.014, thing);
      }
      s.ball([0.022, 0.022, 0.022], [x + 0.03, y0 + 0.4, 0.06], lit('#f2efe0', 0.6), 10);
      s.label('No. ' + (10 + Math.floor(random() * 89)), 0.14, 0.06, [x, y0 + 0.1, 0.185], '#2a2a2a', '#efe9d6');
      bubbleAt = [x, y0 + 0.3, -0.02];
    } else if (a.contents === 'smoke') {
      const b = s.cylinder(0.07, 0.07, 0.15, [-0.1, y0 + 0.07, 0], white, 18);
      b.rotation.z = Math.PI / 2 - 0.15;
      s.cylinder(0.2, 0.24, 0.006, [0.12, y0 + 0.003, 0.02], liquid, 20).scale.z = 0.6;
      const fume = s.material(glowing ? new THREE.Color('#8a5a2a').lerp(glow, 0.4) : '#8a5a2a', { roughness: 1, emissive: glowing ? glow : '#000000', emissiveIntensity: glowing ? 0.5 : 0 });
      const pts = Array.from({ length: 46 }, () => {
        const h = random();
        return { at: [(random() - 0.5) * (W - 0.35), y0 + 0.06 + h * (C - B - 0.2), -0.2 + random() * 0.32] as const, size: mix(0.14, 0.07, h) * (0.7 + random() * 0.6) };
      });
      s.scatter(new THREE.SphereGeometry(1, 10, 8), fume, pts);
    } else if (a.contents === 'lunch') {
      s.cylinder(0.05, 0.045, 0.1, [-0.15, y0 + 0.05, 0.02], s.material(['#c0392b', '#2a6fc0', '#f2c318'][Math.floor(random() * 3)]), 16);
      s.ring(0.03, 0.008, [-0.21, y0 + 0.05, 0.02], white);
      s.cylinder(0.044, 0.044, 0.005, [-0.15, y0 + 0.095, 0.02], s.material('#7a4a22'), 14);
      s.cylinder(0.13, 0.1, 0.014, [0.15, y0 + 0.007, 0], white, 22);
      for (let i = 0; i < 2; i++) {
        const w = s.mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.022, 3), s.material(i ? '#e9d9a8' : '#e2cf98'), [0.15 + i * 0.012, y0 + 0.03 + i * 0.03, 0]);
        w.rotation.y = 0.4 + i * 0.2;
        s.mesh(new THREE.CylinderGeometry(0.088, 0.088, 0.008, 3), s.material(i ? '#7fb24a' : '#d96a5a'), [0.15 + i * 0.012, y0 + 0.045 + i * 0.03, 0]).rotation.y = 0.4 + i * 0.2;
      }
      const paper = s.label('GAZETTE', 0.3, 0.2, [-0.35, y0 + 0.004, -0.12], '#333', '#e6e2d4');
      paper.rotation.x = -Math.PI / 2;
      paper.rotation.z = 0.3;
    }
    if (bubbleAt) {
      const bm = lit('#ffffff', 0.4);
      for (let i = 0; i < 6; i++) {
        const m = s.ball([0.014, 0.014, 0.014], bubbleAt, bm, 8);
        m.castShadow = false;
        bubbles.push(m);
      }
    }
    if (glowing) {
      const pool = new THREE.MeshStandardMaterial({ color: glow, emissive: glow, emissiveIntensity: 1.2, roughness: 1 });
      pulses.push(pool);
      s.box([W - 0.2, 0.004, D - 0.22], [0, y0 + 0.002, -0.03], pool).castShadow = false;
    }

    // Warnings.
    const stick = (kind: Parameters<typeof sticker>[0], size: number, x: number, y: number, z: number, text = '') => {
      const m = s.mesh(new THREE.PlaneGeometry(size, size), sticker(kind, text), [x, y, z]);
      m.rotation.z = (random() - 0.5) * 0.35;
      m.castShadow = false;
      return m;
    };
    const sideY = (B + C) / 2;
    if (a.warnings === 'one') stick('triangle', 0.2, -W / 2 + 0.2, Math.max(glassMid, sy + 0.2), front);
    else if (a.warnings === 'plastered') {
      const kinds = ['triangle', 'skull', 'diamond', 'triangle', 'skull'] as const;
      for (let i = 0; i < 9; i++) {
        const onGlass = glassH > 0.3 && i < 5;
        if (onGlass) stick(kinds[i % 5], 0.14 + random() * 0.1, (random() - 0.5) * (sashW - 0.3), glassMid + (random() - 0.5) * (glassH - 0.25), front + i * 0.001);
        else stick(kinds[i % 5], 0.12 + random() * 0.06, (random() - 0.5) * (W - 0.5), C + 0.06 + random() * 0.1, pz + 0.008 + i * 0.001);
      }
      for (let i = 0; i < 3; i++) stick(kinds[i], 0.18, (i - 1) * 0.36, 0.3 + random() * 0.4, D / 2 + 0.03);
    } else if (a.warnings === 'note') {
      if (glassH > 0.3) stick('note', 0.26, (random() - 0.5) * 0.3, glassMid, front, 'DO NOT|TOUCH');
      else stick('note', 0.24, 0.1, 0.5, D / 2 + 0.03, 'DO NOT|TOUCH');
    } else if (a.warnings === 'condemned') {
      const tape = sticker('tape');
      tape.map!.wrapS = THREE.RepeatWrapping; tape.map!.repeat.set(10, 1);
      for (const k of [-1, 1]) {
        const band = s.mesh(new THREE.PlaneGeometry(1.75, 0.08), tape, [0, sideY, D / 2 + 0.012 + (k > 0 ? 0.002 : 0)]);
        band.rotation.z = k * 0.72;
      }
      stick('note', 0.3, 0, sideY, D / 2 + 0.018, 'OUT OF|USE');
    }

    // What is getting out.
    const wisps: THREE.Mesh[] = [];
    const spill = glowing ? glow : new THREE.Color(liquid.color);
    if (a.escaping === 'wisps') {
      const vapour = new THREE.MeshStandardMaterial({ color: new THREE.Color('#f4f4ee').lerp(spill, 0.25), transparent: true, opacity: 0.55, depthWrite: false, roughness: 1, emissive: glowing ? glow : '#000000', emissiveIntensity: glowing ? 0.4 : 0 });
      for (let i = 0; i < 14; i++) {
        const m = s.ball([0.07, 0.07, 0.07], [(random() - 0.5) * (sashW - 0.2), sy + random() * 0.9, D / 2 + 0.05 + random() * 0.08], vapour, 10);
        m.castShadow = false;
        m.userData.x = m.position.x; m.userData.phase = random();
        wisps.push(m);
      }
    } else if (a.escaping === 'drip') {
      const run = lit(spill, 0.35);
      pulses.push(run);
      const x = (random() - 0.5) * 0.5;
      s.box([0.34, 0.008, 0.2], [x, B + 0.004, D / 2 - 0.08], run);
      for (let i = 0; i < 4; i++) {
        const dx = x - 0.14 + i * 0.09 + random() * 0.03, len = 0.25 + random() * (B - 0.3);
        s.box([0.03 + random() * 0.03, len, 0.006], [dx, B - len / 2, D / 2 + 0.024], run);
        s.ball([0.026, 0.03, 0.01], [dx, B - len, D / 2 + 0.024], run, 10);
      }
      s.cylinder(0.26, 0.3, 0.006, [x, 0.003, D / 2 + 0.2], run, 24).scale.z = 0.6;
    } else if (a.escaping === 'cracked' && glassH > 0.25) {
      const crack = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 0.5 });
      const cx = (random() - 0.5) * 0.4, cy = glassMid + (random() - 0.5) * 0.1;
      for (let i = 0; i < 9; i++) {
        const t = i / 9 * Math.PI * 2 + random() * 0.4, len = 0.12 + random() * Math.min(0.3, glassH * 0.4);
        const mid: [number, number, number] = [cx + Math.cos(t) * len * 0.5 + (random() - 0.5) * 0.04, cy + Math.sin(t) * len * 0.5, front];
        s.rod([cx, cy, front], mid, 0.004, crack).castShadow = false;
        s.rod(mid, [cx + Math.cos(t + 0.2) * len, Math.min(C - 0.03, Math.max(sy + 0.08, cy + Math.sin(t + 0.2) * len)), front], 0.003, crack).castShadow = false;
      }
      s.ring(0.05, 0.003, [cx, cy, front], crack).castShadow = false;
    }

    // Grime where hands and years have been.
    if (mood.wear > 0.4) {
      const grime = s.material('#4a3f30', { transparent: true, opacity: 0.35 * mood.wear, depthWrite: false });
      for (let i = 0; i < 6; i++) s.box([0.1 + random() * 0.25, 0.1 + random() * 0.3, 0.002], [(random() - 0.5) * (W - 0.3), 0.15 + random() * 0.6, D / 2 + 0.015], grime).castShadow = false;
    }

    const speed = mix(0.2, 1.4, mood.energy);
    return s.finish({
      update(_dt, time) {
        const pulse = 1 + Math.sin(time * speed * 3) * 0.18;
        if (glowing) pulses.forEach((m) => { m.emissiveIntensity = (m === inner ? 0.45 : strength) * pulse; });
        if (beacon) beacon.emissiveIntensity = Math.sin(time * 7) > 0 ? 3 : 0.3;
        bubbles.forEach((b, i) => {
          const t = (time * speed + i / bubbles.length) % 1;
          b.position.set(bubbleAt![0] + Math.sin(i * 2.4) * 0.05, bubbleAt![1] - 0.12 + t * 0.14, bubbleAt![2] + Math.cos(i * 1.7) * 0.04);
          b.scale.setScalar(0.008 + t * 0.012);
        });
        wisps.forEach((w) => {
          const t = (time * speed * 0.25 + w.userData.phase) % 1;
          w.position.y = sy + t * 1.1;
          w.position.x = w.userData.x + Math.sin(t * 6 + w.userData.phase * 9) * 0.05;
          w.scale.setScalar(0.04 + t * 0.07);
        });
      },
    });
  },
});
