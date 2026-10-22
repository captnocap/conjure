import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

type Rand = () => number;
type P3 = [number, number, number];

const S = 640, SPAN = 2.7;
const px = (x: number) => (x / SPAN + 0.5) * S;
const py = (y: number) => (0.5 - y / SPAN) * S;

interface Hide { ties: THREE.Vector2[]; shape: THREE.Shape }

/** A flayed hide pulled out to its tie points: four legs, a neck and a tail, edges scalloped inward by the tension. */
function hideOutline(random: Rand, slack: number): Hide {
  const count = 16;
  const ties: THREE.Vector2[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + Math.PI / count;
    const legs = Math.pow(Math.max(0, Math.cos(2 * (angle - Math.PI / 4))) , 2) * (Math.sin(angle) > 0 ? 0.2 : 0.26);
    const neck = Math.pow(Math.max(0, Math.sin(angle)), 10) * 0.2;
    const tail = Math.pow(Math.max(0, -Math.sin(angle)), 14) * 0.14;
    const r = (0.84 + legs + neck + tail) * (0.95 + random() * 0.1);
    ties.push(new THREE.Vector2(Math.cos(angle) * r * 0.86, Math.sin(angle) * r * 1.08));
  }
  const shape = new THREE.Shape();
  shape.moveTo(ties[0].x, ties[0].y);
  for (let i = 1; i <= count; i++) {
    const a = ties[i - 1], b = ties[i % count];
    const pull = mix(0.8, 0.9, random()) + slack * 0.06;
    shape.quadraticCurveTo(((a.x + b.x) / 2) * pull, ((a.y + b.y) / 2) * pull, b.x, b.y);
  }
  return { ties, shape };
}

const ANIMALS = {
  calf: 'Calf: large, pale and fine, the best vellum.',
  sheep: 'Sheep: yellowish and greasy, everyday parchment.',
  goat: 'Goat: grey and grainy with a dark ridge down the spine.',
  deer: 'Deer: tawny, thin, an odd scarred hide.',
  piebald: 'A brown-and-white calf with patches of hair still clinging.',
} as const;

function paintHide(random: Rand, hide: Hide, animal: keyof typeof ANIMALS, stage: string, wear: number, warmth: number) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = S;
  const g = canvas.getContext('2d')!;
  const base = { calf: '#eadfc4', sheep: '#e6d49a', goat: '#cfc8b6', deer: '#dcc193', piebald: '#eadcc0' }[animal];
  const tone = new THREE.Color(base);
  if (stage === 'fresh') tone.lerp(new THREE.Color('#c79f93'), 0.55);
  else if (stage === 'finished' || stage === 'cut') tone.lerp(new THREE.Color('#f6f2e6'), 0.6);
  tone.offsetHSL((warmth - 0.5) * 0.02, 0, -wear * 0.05);
  g.fillStyle = '#' + tone.getHexString();
  g.fillRect(0, 0, S, S);
  // Uneven thickness: cloudy patches, thin near the flanks.
  for (let i = 0; i < 70; i++) {
    g.fillStyle = `rgba(${random() < 0.5 ? '150,110,70' : '255,250,235'},${0.04 + random() * 0.07})`;
    g.beginPath();
    g.ellipse(random() * S, random() * S, 20 + random() * 90, 14 + random() * 60, random() * 3, 0, 7);
    g.fill();
  }
  // The spine and the kidney shadows.
  const spine = g.createLinearGradient(S / 2 - 46, 0, S / 2 + 46, 0);
  const dark = animal === 'goat' ? '70,60,50' : '120,84,50';
  spine.addColorStop(0, `rgba(${dark},0)`);
  spine.addColorStop(0.5, `rgba(${dark},${animal === 'goat' ? 0.5 : 0.28})`);
  spine.addColorStop(1, `rgba(${dark},0)`);
  g.fillStyle = spine;
  g.fillRect(S / 2 - 46, py(0.95), 92, py(-0.95) - py(0.95));
  for (const side of [-1, 1]) { g.fillStyle = `rgba(${dark},0.16)`; g.beginPath(); g.ellipse(S / 2 + side * 62, py(-0.2), 30, 54, side * 0.2, 0, 7); g.fill(); }
  // Veins.
  g.strokeStyle = 'rgba(120,70,60,0.22)';
  g.lineWidth = 1.6;
  for (let i = 0; i < 9; i++) {
    let x = S / 2 + (random() - 0.5) * 60, y = py(0.8) + random() * (py(-0.8) - py(0.8));
    const dir = random() < 0.5 ? -1 : 1;
    g.beginPath(); g.moveTo(x, y);
    for (let k = 0; k < 9; k++) { x += dir * (14 + random() * 14); y += (random() - 0.5) * 30; g.lineTo(x, y); }
    g.stroke();
  }
  // Tension lines running in from every tie.
  g.strokeStyle = 'rgba(110,80,50,0.2)';
  for (const tie of hide.ties) for (let k = -1; k <= 1; k++) {
    g.lineWidth = 1 + random();
    g.beginPath(); g.moveTo(px(tie.x), py(tie.y)); g.lineTo(px(tie.x * 0.45) + k * 22, py(tie.y * 0.45) + k * 14); g.stroke();
  }
  if (animal === 'piebald' || stage === 'fresh') {
    // Hair the scraper has not reached.
    const patches = animal === 'piebald' ? 7 : 4;
    for (let i = 0; i < patches; i++) {
      const tie = hide.ties[Math.floor(random() * hide.ties.length)];
      const cx = px(tie.x * (0.5 + random() * 0.4)), cy = py(tie.y * (0.5 + random() * 0.4)), r = 26 + random() * 46;
      g.strokeStyle = animal === 'piebald' ? (random() < 0.7 ? '#5a3a24' : '#2a1d16') : '#7a6a58';
      g.lineWidth = 2.2;
      for (let k = 0; k < 260; k++) {
        const angle = random() * 6.28, d = Math.sqrt(random()) * r;
        const x = cx + Math.cos(angle) * d * 1.3, y = cy + Math.sin(angle) * d;
        g.beginPath(); g.moveTo(x, y); g.lineTo(x + 3 + random() * 3, y + 7 + random() * 5); g.stroke();
      }
    }
  }
  if (stage === 'scraping') {
    // The left half is done; the right is still rough, yellow and fatty, with fresh crescent strokes at the boundary.
    const edgeX = S * mix(0.42, 0.6, random());
    g.fillStyle = 'rgba(190,150,80,0.42)';
    g.beginPath(); g.moveTo(edgeX, 0);
    for (let y = 0; y <= S; y += 32) g.lineTo(edgeX + Math.sin(y * 0.05) * 22 + (random() - 0.5) * 16, y);
    g.lineTo(S, S); g.lineTo(S, 0); g.fill();
    g.strokeStyle = 'rgba(255,252,240,0.75)';
    for (let i = 0; i < 22; i++) {
      g.lineWidth = 5 + random() * 7;
      const y = 60 + random() * (S - 120), x = edgeX - 40 + random() * 90;
      g.beginPath(); g.arc(x - 60, y, 70 + random() * 30, -0.5, 0.5); g.stroke();
    }
  }
  if (stage === 'finished' || stage === 'cut') {
    // Sheets marked out in plummet for the knife.
    g.strokeStyle = 'rgba(70,60,50,0.75)';
    g.lineWidth = 2.2;
    for (const [x0, y0, x1, y1] of SHEETS) g.strokeRect(px(x0), py(y1), px(x1) - px(x0), py(y0) - py(y1));
  }
  // The edge is thicker, darker and curled where the cords bite.
  const outline = hide.shape.getPoints(8);
  for (const [width, alpha] of [[34, 0.16], [14, 0.4]] as const) {
    g.strokeStyle = `rgba(120,84,50,${alpha})`;
    g.lineWidth = width;
    g.beginPath();
    outline.forEach((point, i) => (i ? g.lineTo(px(point.x), py(point.y)) : g.moveTo(px(point.x), py(point.y))));
    g.closePath();
    g.stroke();
  }
  for (let i = 0; i < Math.floor(wear * 6); i++) {
    g.fillStyle = 'rgba(90,70,50,0.25)';
    g.beginPath(); g.ellipse(random() * S, random() * S, 10 + random() * 40, 8 + random() * 24, random() * 3, 0, 7); g.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/** The sheets a parchmenter gets out of one hide: two big bifolia and two smaller offcuts. */
const SHEETS: readonly (readonly [number, number, number, number])[] = [
  [-0.5, 0.04, -0.03, 0.66], [0.03, 0.04, 0.5, 0.66], [-0.5, -0.62, -0.03, -0.02], [0.03, -0.62, 0.5, -0.02],
];

export default defineThing({
  questions: {
    frame: choice('What kind of frame holds the skin?', {
      hoop: 'A great bent-wood hoop standing on a trestle foot, the skin a pale disc inside it.',
      herse: 'A heavy rectangular frame studded with turning pegs, leaning on a prop.',
      poles: 'Rough poles lashed into a tall A with rope, set up outdoors.',
    }),
    animal: choice('Whose skin is it?', ANIMALS),
    stage: choice('How far along is the making?', {
      fresh: 'Just out of the lime: wet, pinkish, hair still on in places, dripping into a tub.',
      scraping: 'Half scraped: one side clean and pale, the other rough and yellow, shavings on the ground.',
      drying: 'Scraped and drying: taut as a drum, cream-coloured, glowing where the light comes through.',
      finished: 'Finished and chalked white, with sheets marked out for cutting.',
      cut: 'Already harvested: rectangular windows cut out of it, only the ragged surround left on the frame.',
    }),
    knife: choice('Where is the crescent knife?', {
      hung: 'Hung on a peg at the side of the frame.',
      working: 'Left leaning against the skin mid-stroke.',
      ground: 'Dropped on the ground below.',
      gone: 'Nowhere to be seen.',
    }),
    flaws: noul('Does the skin have flaws: stretched oval holes and a stitched scar?'),
    tension: score('How tight is it laced?', ['Slack and sagging', 'Evenly taut', 'Drum-tight, cords straining']),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const woodTone = new THREE.Color('#8b6a42').lerp(new THREE.Color('#514033'), mood.wear * 0.7).lerp(new THREE.Color('#8f8a7c'), a.frame === 'poles' ? 0.25 : 0);
    const wood = (shift = 0) => s.material(woodTone.clone().offsetHSL(0, 0, shift), { roughness: 0.85 });
    const cord = s.material('#c9b98f', { roughness: 0.9 });
    const steel = s.material('#c1c5c9', { metalness: 0.85, roughness: 0.25 });

    const lean = new Sculpture(context);
    const tilt = a.frame === 'hoop' ? -0.06 : -0.2;
    lean.root.rotation.x = tilt;
    s.root.add(lean.root);

    const skinR = (a.animal === 'calf' || a.animal === 'piebald' ? 0.56 : a.animal === 'sheep' ? 0.48 : 0.5) * (a.frame === 'poles' ? 1 : 1.24);
    let cy: number;
    let anchorFor: (tie: THREE.Vector2) => THREE.Vector2;
    let hangAt: P3;
    let frameHalfW: number;

    if (a.frame === 'hoop') {
      const R = 0.86;
      cy = R + 0.2;
      frameHalfW = R;
      lean.ring(R, 0.032, [0, cy, 0], wood());
      // The scarf joint of the bent hoop, bound with cord.
      lean.ring(R, 0.037, [0, cy, 0], cord, 0.16).rotation.z = 2.2;
      anchorFor = (tie) => tie.clone().normalize().multiplyScalar(R - 0.02);
      for (const side of [-1, 1]) {
        s.box([0.09, 0.07, 0.7], [side * 0.42, 0.035, -0.04], wood(-0.04));
        s.rod([side * 0.42, 0.06, 0.18], [side * 0.36, cy - R * 0.84, 0.04], 0.03, wood(-0.02));
        s.rod([side * 0.42, 0.06, -0.3], [side * 0.36, cy - R * 0.84, -0.02], 0.03, wood(-0.02));
      }
      s.box([0.9, 0.06, 0.08], [0, 0.2, 0.0], wood(-0.03));
      hangAt = [R * 0.92, cy + R * 0.5, 0.04];
    } else if (a.frame === 'herse') {
      const HW = 0.82, HH = 0.98;
      cy = HH + 0.1;
      frameHalfW = HW;
      for (const side of [-1, 1]) {
        lean.box([0.08, HH * 2 + 0.24, 0.06], [side * HW, cy, 0], wood());
        lean.box([HW * 2 + 0.3, 0.08, 0.055], [0, cy + side * HH, 0.01], wood(-0.03));
      }
      anchorFor = (tie) => {
        const k = Math.min((HW - 0.0) / Math.abs(tie.x || 1e-6), (HH - 0.0) / Math.abs(tie.y || 1e-6));
        return new THREE.Vector2(tie.x * k, tie.y * k);
      };
      hangAt = [HW + 0.1, cy + 0.42, 0.05];
      s.rod([-HW * 0.7, 0, -0.75], [-HW * 0.7, (cy + HH * 0.5) * Math.cos(tilt), (cy + HH * 0.5) * Math.sin(tilt) - 0.03], 0.03, wood(-0.04));
      s.rod([HW * 0.7, 0, -0.75], [HW * 0.7, (cy + HH * 0.5) * Math.cos(tilt), (cy + HH * 0.5) * Math.sin(tilt) - 0.03], 0.03, wood(-0.04));
    } else {
      const top = 2.05, spread = 1.0;
      cy = 0.95;
      frameHalfW = spread;
      const edgeX = (y: number) => spread * (1 - y / (top + 0.25)) + 0.02;
      for (const side of [-1, 1]) lean.rod([side * spread, 0, 0], [-side * 0.1, top, side * 0.02], 0.04, wood(side * 0.02), 0.028);
      const barLow = 0.2, barHigh = cy + 0.72;
      lean.rod([-edgeX(barLow) - 0.12, barLow, 0.045], [edgeX(barLow) + 0.12, barLow, 0.045], 0.032, wood(-0.03));
      lean.rod([-edgeX(barHigh) - 0.12, barHigh, 0.045], [edgeX(barHigh) + 0.12, barHigh, 0.045], 0.03, wood(-0.03));
      for (const [x, y] of [[edgeX(barLow), barLow], [-edgeX(barLow), barLow], [edgeX(barHigh), barHigh], [-edgeX(barHigh), barHigh], [0, top - 0.24]] as const)
        lean.ball([0.06, 0.055, 0.07], [x, y, 0.02], cord, 10);
      anchorFor = (tie) => {
        const dir = tie.clone().normalize();
        let t = 0.3;
        // March outward until the ray leaves the trapezoid between the poles and bars.
        while (t < 2 && Math.abs(dir.x * t) < edgeX(cy + dir.y * t) - 0.02 && cy + dir.y * t > barLow && cy + dir.y * t < barHigh) t += 0.02;
        return dir.multiplyScalar(t);
      };
      hangAt = [edgeX(cy + 0.5) + 0.03, cy + 0.5, 0.06];
      s.rod([0, 0, -0.95], [0, (top - 0.3) * Math.cos(tilt), (top - 0.3) * Math.sin(tilt) - 0.02], 0.035, wood(-0.05), 0.026);
    }

    // ---- the skin ----
    const hide = hideOutline(random, 1 - a.tension);
    const cut = a.stage === 'cut';
    if (cut) for (const [x0, y0, x1, y1] of SHEETS) if (random() < 0.85) hide.shape.holes.push(new THREE.Path([new THREE.Vector2(x0, y0), new THREE.Vector2(x0, y1), new THREE.Vector2(x1, y1), new THREE.Vector2(x1, y0)]));
    const flawSpots: THREE.Vector2[] = [];
    if (a.flaws) for (let i = 0; i < 3; i++) {
      const spot = new THREE.Vector2((random() < 0.5 ? -1 : 1) * (0.56 + random() * 0.14), -0.6 + i * 0.55 + random() * 0.15);
      flawSpots.push(spot);
      const hole = new THREE.Path();
      hole.absellipse(spot.x, spot.y, 0.03 + random() * 0.03, 0.05 + random() * 0.05, 0, Math.PI * 2, true, random());
      hide.shape.holes.push(hole);
    }
    const geometry = new THREE.ShapeGeometry(hide.shape, 6);
    const pos = geometry.attributes.position, uv = geometry.attributes.uv;
    const sag = (1 - a.tension) * 0.07;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i);
      uv.setXY(i, x / SPAN + 0.5, y / SPAN + 0.5);
      pos.setZ(i, -sag * Math.max(0, 1 - (x * x + y * y)) + Math.sin(x * 9 + y * 5) * sag * 0.2);
    }
    geometry.computeVertexNormals();
    const backlit = a.stage === 'drying' ? 0.34 : a.stage === 'fresh' ? 0.05 : 0.16;
    const glow = new THREE.Color().setHSL(mix(0.11, 0.07, mood.warmth), 0.6, 0.6);
    const skin = lean.mesh(geometry, new THREE.MeshStandardMaterial({
      map: paintHide(random, hide, a.animal, a.stage, mood.wear, mood.warmth), side: THREE.DoubleSide,
      roughness: a.stage === 'fresh' ? 0.25 : 0.7, emissive: glow, emissiveIntensity: backlit * mix(0.6, 1.2, mood.daylight > 0.5 ? 1 - mood.daylight : mood.daylight),
    }), [0, cy, 0.03]);
    skin.scale.setScalar(skinR);

    // Cords: each tie is a pebble wrapped in the skin's edge, pulled out to a peg.
    const pegMaterial = wood(-0.08);
    hide.ties.forEach((tie) => {
      const at: P3 = [tie.x * skinR, cy + tie.y * skinR, 0.03];
      const out = anchorFor(tie);
      const to: P3 = [out.x, cy + out.y, a.frame === 'hoop' ? 0.03 : 0.05];
      lean.ball([0.02, 0.02, 0.016], at, s.material('#d8cba6'), 8);
      lean.rod(at, to, 0.0045, cord);
      if (a.frame === 'herse') {
        const peg = lean.cylinder(0.014, 0.011, 0.11, [to[0], to[1], 0.06], pegMaterial, 8);
        peg.rotation.x = Math.PI / 2;
        lean.box([0.012, 0.045, 0.014], [to[0], to[1], 0.115], pegMaterial).rotation.z = random() * 3;
      } else lean.ball([0.022, 0.022, 0.03], [to[0], to[1], 0.02], cord, 8);
    });
    if (a.flaws) {
      // A cut made at flaying, sewn up before stretching.
      const x0 = -0.2 + random() * 0.15, y0 = 0.25 + random() * 0.2;
      for (let i = 0; i < 7; i++) lean.rod([(x0 + i * 0.03) * skinR - 0.012, cy + (y0 + i * 0.045) * skinR - 0.01, 0.034], [(x0 + i * 0.03) * skinR + 0.014, cy + (y0 + i * 0.045) * skinR + 0.004, 0.034], 0.003, s.material('#5b4632'));
      lean.rod([x0 * skinR, cy + y0 * skinR - 0.01, 0.033], [(x0 + 0.18) * skinR, cy + (y0 + 0.27) * skinR, 0.033], 0.0025, s.material('#8a6f52'));
    }

    // ---- the lunellum ----
    const knife = new Sculpture(context);
    const blade = new THREE.Shape();
    blade.absarc(0, 0, 0.15, Math.PI, Math.PI * 2, false);
    blade.absarc(0, 0.035, 0.115, Math.PI * 2 - 0.3, Math.PI + 0.3, true);
    const bladeMesh = knife.mesh(new THREE.ExtrudeGeometry(blade, { depth: 0.004, bevelEnabled: false }), steel, [0, 0, -0.002]);
    void bladeMesh;
    knife.rod([0, -0.085, 0], [0, 0.11, 0], 0.014, s.material('#4a3324', { roughness: 0.6 }), 0.016);
    knife.ball([0.022, 0.022, 0.022], [0, 0.12, 0], s.material('#4a3324', { roughness: 0.6 }), 10);
    let swing: THREE.Object3D | null = null;
    if (a.knife === 'hung') {
      const hook = new THREE.Group();
      hook.position.set(...hangAt);
      knife.root.position.y = -0.3;
      hook.add(knife.root);
      const loop = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.17, 6), cord);
      loop.position.y = -0.09;
      hook.add(loop);
      lean.root.add(hook);
      const peg = lean.cylinder(0.012, 0.012, 0.09, [hangAt[0], hangAt[1], hangAt[2] - 0.01], pegMaterial, 8);
      peg.rotation.x = Math.PI / 2;
      hook.rotation.z = (random() - 0.5) * 0.2;
      swing = hook;
    } else if (a.knife === 'working') {
      knife.root.position.set(0.08 + random() * 0.15, cy + (random() - 0.3) * 0.3, 0.13);
      knife.root.rotation.set(Math.PI / 2 - 0.5, 0, -Math.PI / 2 + 0.4);
      lean.root.add(knife.root);
    } else if (a.knife === 'ground') {
      knife.root.position.set(0.3 + random() * 0.2, 0.012, 0.42 + random() * 0.15);
      knife.root.rotation.set(-Math.PI / 2, 0, random() * 3);
      s.root.add(knife.root);
    }

    // ---- what lies around it ----
    if (a.stage === 'scraping' || (a.stage !== 'fresh' && mood.density > 0.6)) {
      const curl = s.material('#eee6cf', { roughness: 0.9, side: THREE.DoubleSide });
      const count = 14 + Math.floor(mood.density * 22);
      for (let i = 0; i < count; i++) {
        const shaving = s.mesh(new THREE.TorusGeometry(0.012 + random() * 0.02, 0.004, 4, 10, Math.PI * (0.6 + random())), curl, [(random() - 0.5) * 0.9, 0.012 + random() * 0.012, 0.22 + random() * 0.4]);
        shaving.rotation.set(random() * 3, random() * 3, random() * 3);
      }
    }
    if (a.stage === 'fresh' || mood.density > 0.72) {
      // The lime tub.
      const tx = -(frameHalfW + 0.32), tz = 0.28;
      s.cylinder(0.3, 0.26, 0.38, [tx, 0.19, tz], wood(-0.05), 14);
      for (const y of [0.08, 0.3]) s.ring(0.292 - (0.3 - y) * 0.1 + 0.012, 0.01, [tx, y, tz], s.material('#3a3532', { metalness: 0.4 })).rotation.x = Math.PI / 2;
      s.cylinder(0.27, 0.27, 0.01, [tx, 0.375, tz], s.material('#d9dccf', { roughness: 0.15 }), 18);
      const soaking = s.ball([0.2, 0.03, 0.15], [tx + 0.03, 0.375, tz], s.material('#c9a79a', { roughness: 0.3 }), 12);
      soaking.rotation.y = random() * 3;
      if (a.stage === 'fresh') for (let i = 0; i < 6; i++) s.cylinder(0.02 + random() * 0.04, 0.02, 0.003, [(random() - 0.5) * 0.9, 0.002, 0.08 + random() * 0.2], s.material('#9fa39a', { roughness: 0.15, transparent: true, opacity: 0.6, depthWrite: false }), 12);
    }
    if (a.stage === 'finished' || a.stage === 'cut' || mood.density > 0.85) {
      // The harvest: cut sheets stacked flat, and a couple of finished skins rolled.
      const sx = frameHalfW + 0.3, sz = 0.3;
      const sheets = 3 + Math.floor(random() * 5);
      for (let i = 0; i < sheets; i++) s.box([0.34, 0.006, 0.26], [sx + (random() - 0.5) * 0.02, 0.003 + i * 0.006, sz + (random() - 0.5) * 0.02], s.material(i % 2 ? '#efe7d0' : '#e6dcc0')).rotation.y = (random() - 0.5) * 0.2;
      for (let i = 0; i < 2; i++) s.cylinder(0.045, 0.045, 0.5, [sx + 0.02, 0.045, sz - 0.25 - i * 0.1], s.material('#e9dfc4'), 14).rotation.z = Math.PI / 2;
      s.ball([0.05, 0.03, 0.04], [sx - 0.2, 0.03, sz + 0.14], s.material('#f4f1e8', { roughness: 1 }), 8);
    }

    const sway = mix(0.01, 0.12, mood.energy);
    const rest = swing ? swing.rotation.z : 0;
    return s.finish({
      footprint: frameHalfW + 0.15,
      update: (_dt, time) => { if (swing) swing.rotation.z = rest + Math.sin(time * 1.7) * sway; },
    });
  },
});
