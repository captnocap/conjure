import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

const POSES = {
  working: 'Hunched over a job, both hands forward on a tool, legs trailing: routine labour.',
  waving: 'Turned to the camera with one arm raised high in a wave.',
  limp: 'Drifting limp and curled, arms floating loose, head down: asleep, unconscious or worse.',
  reaching: 'Stretched out full length, one glove straining for something just out of reach.',
  saluting: 'Upright and formal, one glove at the visor in a salute.',
  spread: 'Arms and legs flung wide like a starfish, tumbling free and delighted or terrified.',
} as const;
const SUITS = {
  station: 'Modern bulky white suit with a big square life-support backpack and red stripes.',
  orlan: 'Cream suit with blue stripes and a rounded hatch-back pack, Russian style.',
  silver: 'A slim silver 1960s pressure suit with a small chest pack and no backpack.',
  future: 'A sleeker near-future suit, white with orange panels and dark joints.',
} as const;
const TETHERS = {
  coiled: 'A neat springy coil, like an old telephone cord.',
  taut: 'Pulled straight and tight at full stretch.',
  tangled: 'Loose loops drifting everywhere, half wrapped around a leg.',
  snapped: 'Snapped: a short frayed end trails from the waist and nothing holds them.',
} as const;
const VISORS = {
  planet: 'Gold visor down, reflecting the blue curve of the planet.',
  sunrise: 'Gold visor blazing with a reflected sunrise.',
  clear: 'Sun visor raised: a dim face visible behind clear glass.',
  fogged: 'Fogged white from the inside.',
  cracked: 'Gold visor with a spider-web crack across it.',
} as const;
const ITEMS = {
  nothing: 'Nothing: empty gloves.',
  drill: 'A chunky pistol-grip power tool.',
  camera: 'A camera in a white thermal cover.',
  wrench: 'A long ratchet wrench.',
  flag: 'A small stiff flag on a rod.',
  photo: 'A single photograph.',
} as const;

function visorTexture(kind: keyof typeof VISORS, random: () => number) {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 128;
  const c = canvas.getContext('2d')!;
  if (kind === 'fogged') {
    c.fillStyle = '#dfe6ea'; c.fillRect(0, 0, 256, 128);
    for (let i = 0; i < 40; i++) { c.fillStyle = `rgba(255,255,255,${0.2 + random() * 0.3})`; c.beginPath(); c.arc(random() * 256, random() * 128, 6 + random() * 16, 0, 7); c.fill(); }
  } else if (kind === 'clear') {
    c.fillStyle = '#1a2230'; c.fillRect(0, 0, 256, 128);
    for (const x of [64, 192]) {
      c.fillStyle = '#b98d6f'; c.beginPath(); c.ellipse(x, 70, 30, 40, 0, 0, 7); c.fill();
      c.fillStyle = '#e9e6dc'; c.fillRect(x - 34, 22, 68, 22);
      c.fillStyle = '#1b1b1f'; c.fillRect(x - 17, 62, 9, 5); c.fillRect(x + 8, 62, 9, 5);
    }
  } else {
    const sunrise = kind === 'sunrise';
    c.fillStyle = sunrise ? '#3a1a05' : '#0b0d16'; c.fillRect(0, 0, 256, 128);
    for (const x of [64, 192]) {
      const planet = c.createRadialGradient(x, 210, 80, x, 210, 150);
      planet.addColorStop(0, '#2c6fd0'); planet.addColorStop(0.9, '#3f9be8'); planet.addColorStop(0.97, '#bfe6ff'); planet.addColorStop(1, 'rgba(120,190,255,0)');
      c.fillStyle = planet; c.beginPath(); c.arc(x, 210, 150, 0, 7); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.85)';
      for (let i = 0; i < 9; i++) { c.beginPath(); c.ellipse(x - 50 + random() * 100, 84 + random() * 40, 8 + random() * 16, 3 + random() * 4, random() - 0.5, 0, 7); c.fill(); }
      if (sunrise) {
        const flare = c.createRadialGradient(x + 22, 58, 2, x + 22, 58, 62);
        flare.addColorStop(0, '#ffffff'); flare.addColorStop(0.25, '#ffe9a0'); flare.addColorStop(1, 'rgba(255,150,40,0)');
        c.fillStyle = flare; c.fillRect(x - 64, 0, 128, 128);
      }
      if (kind === 'cracked') {
        c.strokeStyle = '#f4f1e6'; c.lineWidth = 2;
        const cx = x + 10, cy = 60;
        for (let i = 0; i < 9; i++) {
          const angle = i * 0.7 + random() * 0.4;
          c.beginPath(); c.moveTo(cx, cy);
          c.lineTo(cx + Math.cos(angle) * 22 + random() * 6, cy + Math.sin(angle) * 20);
          c.lineTo(cx + Math.cos(angle + 0.2) * (36 + random() * 20), cy + Math.sin(angle + 0.2) * 42);
          c.stroke();
        }
        c.beginPath(); c.arc(cx, cy, 12, 0, 7); c.stroke();
      }
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default defineThing({
  questions: {
    pose: choice('What is the spacewalker doing?', POSES),
    suit: choice('What kind of suit is it?', SUITS),
    tether: choice('What state is the safety tether in?', TETHERS),
    visor: choice('What does the visor show?', VISORS),
    item: choice('What is in their glove, or drifting just out of reach?', ITEMS),
    anchor: noul('Is the far end of the tether clipped to a visible piece of station handrail?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const add = <T extends THREE.Object3D>(parent: THREE.Object3D, child: T) => { parent.add(child); return child; };
    const jitter = (amount: number) => (random() - 0.5) * amount;

    const cloth = { station: '#f1efe8', orlan: '#e6dcc0', silver: '#b9bec4', future: '#f4f4f1' }[a.suit];
    const trimTint = { station: '#c8362c', orlan: '#2f5fb5', silver: '#3a3d44', future: '#f07a1c' }[a.suit];
    const fabric = s.material(cloth, { roughness: a.suit === 'silver' ? 0.35 : 0.92, metalness: a.suit === 'silver' ? 0.75 : 0 });
    const trim = s.material(trimTint, { roughness: 0.7 });
    const grey = s.material(a.suit === 'future' ? '#2c3038' : '#8d9096', { roughness: 0.8 });
    const dark = s.material('#24272c', { roughness: 0.6 });
    const metal = s.material('#c9ccd0', { metalness: 0.85, roughness: 0.3 });
    const gold = a.visor === 'planet' || a.visor === 'sunrise' || a.visor === 'cracked';
    const visorPaint = new THREE.MeshStandardMaterial({
      map: visorTexture(a.visor, random),
      color: gold ? '#f6c860' : '#ffffff',
      metalness: gold ? 0.55 : 0.1,
      roughness: gold ? 0.22 : 0.5,
      emissive: gold ? '#f0a020' : '#000000',
      emissiveIntensity: a.visor === 'sunrise' ? 0.55 : gold ? 0.22 : 0,
    });
    visorPaint.map!.wrapS = THREE.RepeatWrapping;

    const bulk = a.suit === 'silver' ? 0.8 : a.suit === 'future' ? 0.9 : 1;
    const body = add(s.root, new THREE.Group());

    // Torso, pelvis, helmet.
    add(body, s.mesh(new RoundedBoxGeometry(0.52 * bulk, 0.56, 0.36 * bulk, 4, 0.1), fabric, [0, 0.36, 0]));
    add(body, s.ball([0.25 * bulk, 0.19, 0.2 * bulk], [0, 0.03, 0], fabric, 16));
    add(body, s.cylinder(0.27 * bulk, 0.27 * bulk, 0.04, [0, 0.12, 0], metal, 24));
    add(body, s.cylinder(0.17, 0.2, 0.07, [0, 0.66, 0.01], metal, 24));
    add(body, s.ball([0.2, 0.2, 0.2], [0, 0.82, 0], fabric, 28));
    const visor = add(body, s.mesh(new THREE.SphereGeometry(0.172, 32, 20), visorPaint, [0, 0.82, 0.05]));
    visor.scale.set(1, 0.92, 1);
    if (a.suit !== 'silver') {
      // Sun-visor housing, lamps and camera on the helmet.
      const brow = add(body, s.mesh(new THREE.SphereGeometry(0.21, 24, 10, 0, Math.PI * 2, 0, 0.95), fabric, [0, 0.83, 0]));
      brow.rotation.x = -0.35;
      const lampGlow = new THREE.MeshStandardMaterial({ color: '#fff7dc', emissive: '#fff0c0', emissiveIntensity: mix(0.3, 2.2, mood.cheer) });
      for (const side of [-1, 1]) {
        add(body, s.box([0.07, 0.07, 0.1], [side * 0.22, 0.86, 0.06], grey));
        add(body, s.cylinder(0.028, 0.028, 0.02, [side * 0.22, 0.86, 0.115], lampGlow, 12)).rotation.x = Math.PI / 2;
      }
    }

    // Life support: a backpack, or for the 1960s suit just a chest pack and an oxygen hose.
    if (a.suit === 'station' || a.suit === 'future') {
      add(body, s.mesh(new RoundedBoxGeometry(0.58 * bulk, 0.82, 0.24, 3, 0.05), fabric, [0, 0.42, -0.29 * bulk]));
      add(body, s.box([0.4 * bulk, 0.3, 0.1], [0, 0.0, -0.3 * bulk], fabric));
      add(body, s.box([0.3, 0.08, 0.02], [0, 0.7, -0.415 * bulk], trim));
      for (const side of [-1, 1]) add(body, s.cylinder(0.035, 0.035, 0.12, [side * 0.2 * bulk, 0.86, -0.3 * bulk], metal, 10));
    } else if (a.suit === 'orlan') {
      add(body, s.mesh(new RoundedBoxGeometry(0.56, 0.9, 0.3, 4, 0.13), fabric, [0, 0.4, -0.28]));
      add(body, s.ring(0.2, 0.02, [0, 0.45, -0.435], metal));
      add(body, s.box([0.1, 0.14, 0.05], [0.33, 0.2, -0.2], grey));
    } else {
      add(body, s.tube([[0.1, 0.3, 0.2], [0.3, 0.1, 0.25], [0.35, -0.15, 0.0], [0.2, -0.2, -0.2]], 0.03, s.material('#d3a534', { metalness: 0.7, roughness: 0.35 })));
    }
    // Chest controls.
    add(body, s.box([0.3 * bulk, 0.2, 0.11], [0, 0.36, 0.2 * bulk + 0.03], a.suit === 'silver' ? grey : fabric));
    for (let i = 0; i < 3; i++) add(body, s.cylinder(0.022, 0.022, 0.03, [(i - 1) * 0.08 * bulk, 0.4, 0.2 * bulk + 0.1], [trim, dark, metal][i], 10)).rotation.x = Math.PI / 2;
    add(body, s.box([0.12, 0.04, 0.012], [0, 0.31, 0.2 * bulk + 0.09], dark));
    // Flag patch on the left shoulder.
    const patchTints = [['#c8362c', '#f1efe8', '#2f5fb5'], ['#f1efe8', '#2f5fb5', '#c8362c'], ['#2f8f4e', '#f1efe8', '#e0762b'], ['#f1efe8', '#c8362c', '#f1efe8']][Math.floor(random() * 4)];

    // Limbs: an upper segment, a joint that bends, a lower segment and an end piece.
    const limb = (root: [number, number, number], radius: number, upper: number, lower: number, stripe: boolean) => {
      const shoulder = add(body, new THREE.Group());
      shoulder.position.set(...root);
      add(shoulder, s.ball([radius * 1.25, radius * 1.25, radius * 1.25], [0, 0, 0], fabric, 12));
      add(shoulder, s.mesh(new THREE.CapsuleGeometry(radius, upper - radius, 4, 12), fabric, [0, -upper / 2, 0]));
      if (stripe) add(shoulder, s.cylinder(radius * 1.06, radius * 1.06, 0.06, [0, -upper * 0.55, 0], trim, 14));
      const joint = add(shoulder, new THREE.Group());
      joint.position.y = -upper;
      add(joint, s.ball([radius * 1.12, radius * 1.12, radius * 1.12], [0, 0, 0], a.suit === 'future' ? grey : fabric, 12));
      add(joint, s.mesh(new THREE.CapsuleGeometry(radius * 0.9, lower - radius, 4, 12), fabric, [0, -lower / 2, 0]));
      const end = add(joint, new THREE.Group());
      end.position.y = -lower;
      return { shoulder, joint, end };
    };
    const arms = [-1, 1].map((side) => {
      const arm = limb([side * 0.31 * bulk, 0.55, 0], 0.085 * bulk, 0.3, 0.27, a.suit !== 'silver');
      add(arm.end, s.cylinder(0.075 * bulk, 0.075 * bulk, 0.03, [0, 0.02, 0], metal, 12));
      add(arm.end, s.ball([0.07, 0.09, 0.06], [0, -0.07, 0], grey, 12));
      add(arm.end, s.ball([0.025, 0.045, 0.03], [0, -0.05, 0.06], grey, 8));
      return arm;
    });
    patchTints.forEach((tint, i) => add(arms[0].shoulder, s.box([0.012, 0.03, 0.1], [-0.088 * bulk, -0.1 - i * 0.03, 0], s.material(tint))));
    const legs = [-1, 1].map((side) => {
      const leg = limb([side * 0.14 * bulk, -0.06, 0], 0.105 * bulk, 0.4, 0.4, a.suit === 'station' || a.suit === 'orlan');
      add(leg.end, s.mesh(new RoundedBoxGeometry(0.16 * bulk, 0.13, 0.31, 2, 0.04), grey, [0, -0.04, 0.05]));
      add(leg.end, s.box([0.165 * bulk, 0.03, 0.32], [0, -0.115, 0.05], dark));
      return leg;
    });
    const [left, right] = arms;
    const [legL, legR] = legs;
    // Arm angles: x negative swings forward, z swings out sideways (mirrored per side).
    const setArm = (arm: typeof left, side: number, forward: number, out: number, bend: number) => {
      arm.shoulder.rotation.set(forward + jitter(0.12), 0, side * out + jitter(0.08));
      arm.joint.rotation.x = bend + jitter(0.12);
    };
    const setLeg = (leg: typeof legL, side: number, forward: number, out: number, bend: number) => {
      leg.shoulder.rotation.set(forward + jitter(0.12), 0, side * out + jitter(0.05));
      leg.joint.rotation.x = bend + jitter(0.12);
    };
    let reach: THREE.Vector3 | null = null;
    switch (a.pose) {
      case 'working':
        setArm(left, -1, -1.0, -0.25, -0.9); setArm(right, 1, -1.0, -0.25, -0.9);
        setLeg(legL, -1, 0.25, 0.12, 0.7); setLeg(legR, 1, -0.1, 0.12, 0.9);
        body.rotation.set(0.35, 0.5 + jitter(0.3), jitter(0.2));
        break;
      case 'waving':
        setArm(left, -1, -0.2, 0.3, -0.5); setArm(right, 1, 0, 2.5, 0);
        right.joint.rotation.set(0, 0, 0.5);
        setLeg(legL, -1, -0.15, 0.14, 0.35); setLeg(legR, 1, 0.1, 0.18, 0.5);
        body.rotation.set(-0.1, 0.35 + jitter(0.2), -0.12 + jitter(0.1));
        break;
      case 'limp':
        setArm(left, -1, -0.9, 0.45, -0.7); setArm(right, 1, -0.6, 0.6, -0.9);
        setLeg(legL, -1, -0.7, 0.2, 1.0); setLeg(legR, 1, -0.45, 0.25, 0.8);
        body.rotation.set(0.9, 0.4 + jitter(0.5), 0.9 + jitter(0.4));
        break;
      case 'reaching':
        setArm(left, -1, 0.5, 0.35, -0.3); setArm(right, 1, -2.2, 0.1, 0);
        right.joint.rotation.x = -0.05;
        setLeg(legL, -1, 0.35, 0.15, 0.2); setLeg(legR, 1, 0.1, 0.2, 0.45);
        body.rotation.set(0.8, 0.55 + jitter(0.2), -0.3 + jitter(0.1));
        break;
      case 'saluting':
        setArm(left, -1, 0, 0.12, -0.1); setArm(right, 1, -0.3, 1.5, 0);
        right.joint.rotation.set(-0.6, 0, 2.1);
        setLeg(legL, -1, 0, 0.05, 0.05); setLeg(legR, 1, 0, 0.05, 0.05);
        body.rotation.set(0, 0.4 + jitter(0.2), jitter(0.06));
        break;
      default:
        setArm(left, -1, -0.2, 1.9, -0.2); setArm(right, 1, -0.3, 2.1, -0.15);
        setLeg(legL, -1, -0.1, 0.6, 0.2); setLeg(legR, 1, 0.1, 0.7, 0.3);
        body.rotation.set(0.25 + jitter(0.3), 0.3 + jitter(0.4), 0.5 + jitter(0.6));
    }

    // Whatever is held: in the right glove, or for the reaching pose floating beyond the fingertips.
    const item = new THREE.Group();
    const put = (mesh: THREE.Mesh) => add(item, mesh);
    const reachItem = a.pose === 'reaching' && a.item === 'nothing' ? 'wrench' : a.item;
    if (reachItem === 'drill') {
      put(s.box([0.07, 0.16, 0.07], [0, -0.02, 0], dark));
      put(s.box([0.09, 0.1, 0.24], [0, 0.1, 0.04], s.material('#d9d6cc')));
      put(s.cylinder(0.02, 0.025, 0.12, [0, 0.1, 0.22], metal, 10)).rotation.x = Math.PI / 2;
    } else if (reachItem === 'camera') {
      put(s.mesh(new RoundedBoxGeometry(0.2, 0.14, 0.12, 2, 0.02), s.material('#eeece4')));
      put(s.cylinder(0.05, 0.055, 0.14, [0, 0, 0.12], dark, 14)).rotation.x = Math.PI / 2;
    } else if (reachItem === 'wrench') {
      put(s.box([0.035, 0.34, 0.02], [0, 0.1, 0], metal));
      put(s.cylinder(0.045, 0.045, 0.035, [0, 0.29, 0], metal, 12)).rotation.x = Math.PI / 2;
      put(s.box([0.04, 0.1, 0.03], [0, -0.05, 0], trim));
    } else if (reachItem === 'flag') {
      put(s.rod([0, -0.1, 0], [0, 0.5, 0], 0.01, metal));
      patchTints.forEach((tint, i) => put(s.box([0.3, 0.065, 0.008], [0.16, 0.46 - i * 0.065, 0], s.material(tint, { side: THREE.DoubleSide }))));
    } else if (reachItem === 'photo') {
      put(s.box([0.16, 0.2, 0.006], [0, 0.06, 0], s.material('#f6f2e6')));
      put(s.box([0.13, 0.13, 0.008], [0, 0.08, 0], s.material('#5f93c4')));
      put(s.ball([0.03, 0.03, 0.006], [0, 0.07, 0.004], s.material('#e3b392'), 8));
    }
    if (a.pose === 'reaching') {
      s.root.updateMatrixWorld(true);
      const tip = right.end.localToWorld(new THREE.Vector3(0, -0.16, 0));
      const from = right.joint.getWorldPosition(new THREE.Vector3());
      reach = tip.clone().add(tip.clone().sub(from).normalize().multiplyScalar(0.32 + random() * 0.2));
      item.position.copy(reach);
      item.rotation.set(random() * 3, random() * 3, random() * 3);
      s.root.add(item);
    } else if (reachItem !== 'nothing') {
      item.position.set(0, -0.1, 0.05);
      item.rotation.x = a.pose === 'working' ? 0.3 : -0.6;
      right.end.add(item);
    }

    // The tether: from a waist ring out to its clip, drawn as one tube.
    s.root.updateMatrixWorld(true);
    const waist = body.localToWorld(new THREE.Vector3(-0.27 * bulk, 0.1, 0.06));
    add(body, s.ring(0.035, 0.008, [-0.28 * bulk, 0.1, 0.06], metal)).rotation.y = Math.PI / 2;
    const far = new THREE.Vector3(-1.25 + jitter(0.3), -0.75 + jitter(0.2), -0.5 + jitter(0.4));
    if (a.tether === 'taut') far.multiplyScalar(1.3);
    const cord = s.material(a.suit === 'silver' ? '#d3a534' : '#e9e4d4', { roughness: 0.8, metalness: a.suit === 'silver' ? 0.6 : 0 });
    const span = far.clone().sub(waist);
    const sideways = new THREE.Vector3(0, 1, 0).cross(span).normalize();
    const upward = span.clone().cross(sideways).normalize();
    const points: [number, number, number][] = [];
    const steps = 140;
    const length = a.tether === 'snapped' ? 0.42 : 1;
    const loops = a.tether === 'coiled' ? 13 : a.tether === 'tangled' ? 4.3 : 0;
    const wander = [random() * 6, random() * 6, random() * 6];
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * length;
      const point = waist.clone().addScaledVector(span, t);
      const envelope = Math.sin(Math.PI * Math.min(1, t / length));
      if (a.tether === 'coiled') {
        const coil = Math.min(1, Math.min(t, 1 - t) * 8) * 0.07;
        point.addScaledVector(sideways, Math.cos(t * loops * Math.PI * 2) * coil).addScaledVector(upward, Math.sin(t * loops * Math.PI * 2) * coil);
        point.y -= envelope * 0.12;
      } else if (a.tether === 'tangled') {
        point.addScaledVector(sideways, Math.sin(t * loops * Math.PI * 2 + wander[0]) * 0.3 * envelope + Math.sin(t * 17 + wander[1]) * 0.08 * envelope);
        point.addScaledVector(upward, Math.cos(t * loops * Math.PI * 2.6 + wander[2]) * 0.26 * envelope);
      } else if (a.tether === 'snapped') {
        point.addScaledVector(sideways, Math.sin(t * 9 + wander[0]) * 0.22 * (t / length)).addScaledVector(upward, Math.sin(t * 6 + wander[1]) * 0.25 * (t / length));
      }
      points.push(point.toArray() as [number, number, number]);
    }
    s.tube(points, 0.014, cord);
    const tail = new THREE.Vector3(...points[points.length - 1]);
    if (a.tether === 'snapped') {
      for (let i = 0; i < 5; i++) s.rod(tail.toArray() as [number, number, number], [tail.x + jitter(0.14), tail.y + jitter(0.14), tail.z + jitter(0.14)], 0.005, cord);
    } else {
      // A locking hook, and optionally the bit of station it is clipped to.
      const hook = s.ring(0.05, 0.012, tail.toArray() as [number, number, number], metal);
      hook.rotation.set(random(), random(), 0);
      s.box([0.03, 0.08, 0.03], [tail.x, tail.y + 0.03, tail.z], trim);
      if (a.anchor) {
        const plate = add(s.root, new THREE.Group());
        plate.position.copy(tail).add(new THREE.Vector3(0, -0.12, 0));
        plate.rotation.set(jitter(0.3), random() * 3, jitter(0.3));
        add(plate, s.mesh(new RoundedBoxGeometry(0.8, 0.07, 0.42, 2, 0.02), s.material('#e4e2da'), [0, -0.035, 0]));
        const rail = s.material('#d3a534', { metalness: 0.8, roughness: 0.3 });
        add(plate, s.rod([-0.28, 0, 0], [-0.28, 0.1, 0], 0.014, rail));
        add(plate, s.rod([0.28, 0, 0], [0.28, 0.1, 0], 0.014, rail));
        add(plate, s.rod([-0.28, 0.1, 0], [0.28, 0.1, 0], 0.016, rail));
        for (const x of [-0.34, 0.34]) for (const z of [-0.16, 0.16]) add(plate, s.cylinder(0.018, 0.018, 0.012, [x, 0.006, z], dark, 8));
      }
    }

    const pace = mix(0.2, 1.6, mood.energy);
    const phase = random() * 6;
    const base = body.rotation.clone();
    const waveBase = right.joint.rotation.z;
    return s.finish({
      update: (_dt, time) => {
        body.rotation.z = base.z + Math.sin(time * 0.4 * pace + phase) * 0.05;
        body.rotation.x = base.x + Math.sin(time * 0.27 * pace + phase * 2) * 0.04;
        if (a.pose === 'waving') right.joint.rotation.z = waveBase + Math.sin(time * 3.2 * pace) * 0.45;
        if (reach) item.rotation.y += 0.004 * pace;
      },
    });
  },
});
