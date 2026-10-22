import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { choice, defineThing, disposeTree, mix, score, visibleBounds } from '@conjure/kit';
import { displace, instances, mat, mesh, noise, paint, range, rod, tube, type Spot, type V3 } from './lib';

const LIVERY = {
  yellow: ['#f2c21a', '#8f979b', '#1c2a33'],
  orange: ['#f0701c', '#2c3238', '#ffffff'],
  navy: ['#e9e7e0', '#c62a22', '#1b2f6b'],
  black: ['#2b2e33', '#3a3d42', '#c9c9c4'],
  retro: ['#e6dcc0', '#3f8f8a', '#b2402a'],
  red: ['#d4281e', '#d9d9d4', '#ffffff'],
} as const;
const NAMES = { nereid: 'NEREID', abyss: 'ABYSS-1', sisyphus: 'SISYPHUS', seven: 'ROV 07', orpheus: 'ORPHEUS', blank: '' } as const;

export default defineThing({
  questions: {
    kind: choice('What class of vehicle is it?', {
      work: 'A big work-class machine, the size of a small car, bristling with gear.',
      science: 'A research vehicle with a sample basket and racks of core tubes.',
      eyeball: 'A small inspection "eyeball": a compact box with one big camera.',
    }),
    livery: choice('What livery does it wear?', {
      yellow: 'Classic safety yellow foam on a bare aluminium frame.',
      orange: 'Offshore-industry orange on a black frame.',
      navy: 'White with red frame and blue markings, naval or coastguard.',
      black: 'Matte black, anonymous, not supposed to be here.',
      retro: 'Cream and teal, a 1970s oceanographic institute.',
      red: 'Fire-engine red rescue colours.',
    }),
    name: choice('What is stencilled on its side?', {
      nereid: 'NEREID', abyss: 'ABYSS-1', sisyphus: 'SISYPHUS', seven: 'ROV 07', orpheus: 'ORPHEUS', blank: 'Nothing; the name has been painted out.',
    }),
    holds: choice('What is the manipulator arm holding?', {
      nothing: 'Nothing; the claw hangs open.',
      rock: 'A chunk of sulphide rock broken from a chimney.',
      worm: 'A single tube worm, red plume still out.',
      core: 'A clear push-core tube full of grey sediment.',
      bottle: 'An old green glass bottle from the surface world.',
      bell: 'A corroded brass ship\'s bell.',
    }),
    lamps: choice('What state are its lamps in?', {
      blazing: 'All blazing, throwing hard white cones into the water.',
      single: 'Only one lamp still working.',
      amber: 'Dim amber emergency glow, battery nearly gone.',
      dead: 'Dark. No power at all.',
    }),
    tether: choice('What about its tether?', {
      taut: 'Rising straight up and out of sight, intact.',
      slack: 'Looping slack across the seabed behind it.',
      cut: 'Cut: a short frayed stump trails from the back.',
      tangled: 'Wrapped round its own frame in a snarl.',
      none: 'It has none; it runs free on batteries.',
    }),
    state: choice('What is it doing?', {
      hovering: 'Hovering just off the bottom, at work.',
      landed: 'Settled on its skids on the seabed.',
      wrecked: 'Wrecked: nose down in the silt, tilted, one thruster torn loose.',
    }),
    silt: score('How much silt has it stirred up or gathered?', ['Spotless', 'Dusted', 'Drifted with silt and marine snow']),
  },

  build(a, context) {
    const { mood, random } = context;
    const root = new THREE.Group(), body = new THREE.Group();
    root.add(body);
    const n = noise(random);
    const k = a.kind === 'eyeball' ? 0.42 : a.kind === 'science' ? 0.9 : 1;
    const W = 1.5 * k, L = (a.kind === 'eyeball' ? 1.7 : 2.4) * k, H = 1.55 * k;
    const [foamC, frameC, markC] = LIVERY[a.livery];
    const wrecked = a.state === 'wrecked';
    const grime = new THREE.Color('#6d6a5c'), dirt = mood.wear * 0.4 + (wrecked ? 0.25 : 0);
    const tone = (c: string, extra = 0) => new THREE.Color(c).lerp(grime, Math.min(0.8, dirt + extra));
    const foam = mat(tone(foamC), { roughness: 0.6 });
    const frame = mat(tone(frameC), { roughness: 0.45, metalness: frameC === '#8f979b' ? 0.6 : 0.2 });
    const dark = mat('#1b1e22', { roughness: 0.6 });
    const steel = mat(tone('#aab2b6'), { roughness: 0.35, metalness: 0.7 });
    const rubber = mat('#2a2c2e', { roughness: 0.9 });
    const tube1 = 0.035 * Math.sqrt(k) + 0.008;
    const foamH = H * 0.36, foamY = H - foamH / 2;
    const hx = W / 2 - tube1, hz = L / 2 - tube1;

    // Buoyancy block with thruster tunnels and lifting bail.
    mesh(body, new RoundedBoxGeometry(W, foamH, L, 3, foamH * 0.22), foam, [0, foamY, 0]);
    mesh(body, new THREE.BoxGeometry(W * 1.005, foamH * 0.12, L * 0.9), mat(tone(markC), { roughness: 0.6 }), [0, foamY - foamH * 0.22, 0]);
    const tunnels: V3[] = a.kind === 'eyeball' ? [[0, H, 0]] : [[-W * 0.22, H, -L * 0.22], [W * 0.22, H, L * 0.12]];
    const props: THREE.Object3D[] = [];
    const propeller = (parent: THREE.Object3D, r: number) => {
      const g = new THREE.Group();
      mesh(g, new THREE.CylinderGeometry(r * 0.22, r * 0.22, r * 0.5, 10), steel, [0, 0, 0], 1, [Math.PI / 2, 0, 0]);
      for (let b = 0; b < 4; b++) mesh(g, new THREE.BoxGeometry(r * 0.85, r * 0.3, r * 0.05), steel, [Math.cos(b * 1.5708) * r * 0.5, Math.sin(b * 1.5708) * r * 0.5, 0], 1, [0.5, 0, b * 1.5708]);
      parent.add(g); props.push(g);
      return g;
    };
    for (const t of tunnels) {
      const r = W * 0.15;
      mesh(body, new THREE.CylinderGeometry(r, r, 0.02, 20), dark, [t[0], t[1] + 0.004, t[2]]);
      mesh(body, new THREE.TorusGeometry(r, r * 0.1, 6, 20), frame, [t[0], t[1] + 0.01, t[2]], 1, [Math.PI / 2, 0, 0]);
      const holder = new THREE.Group(); holder.position.set(t[0], t[1] + 0.02, t[2]); holder.rotation.x = Math.PI / 2; body.add(holder);
      propeller(holder, r * 0.9);
    }
    mesh(body, new THREE.TorusGeometry(W * 0.13, tube1 * 0.8, 6, 16, Math.PI), steel, [0, H, -L * 0.02], 1, [0, Math.PI / 2, 0]);

    // Name on both flanks and the brow.
    const text = NAMES[a.name];
    if (text) {
      const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 128;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = `#${tone(foamC).getHexString()}`; ctx.fillRect(0, 0, 512, 128);
      ctx.fillStyle = markC === '#ffffff' && a.livery !== 'orange' && a.livery !== 'red' ? '#1c2a33' : markC;
      ctx.font = 'bold 84px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 256, 68, 480);
      if (mood.wear > 0.4) { ctx.globalAlpha = mood.wear * 0.6; ctx.fillStyle = `#${tone(foamC).getHexString()}`; for (let i = 0; i < 60; i++) ctx.fillRect(random() * 512, random() * 128, random() * 40, random() * 6); }
      const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
      const label = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.6 });
      const lw = L * 0.84, lh = lw / 4;
      for (const side of [-1, 1]) mesh(body, new THREE.PlaneGeometry(lw, Math.min(lh, foamH * 0.5)), label, [side * (W / 2 + 0.004), foamY + foamH * 0.13, 0], 1, [0, side * Math.PI / 2, 0]);
    }

    // Open frame: posts, rails and skids.
    const y0 = H * 0.09, y1 = H - foamH;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) rod(body, [sx * hx, y0, sz * hz], [sx * hx, y1 + 0.02, sz * hz], tube1, frame);
    for (const y of [y0, (y0 + y1) / 2]) {
      for (const sx of [-1, 1]) rod(body, [sx * hx, y, -hz], [sx * hx, y, hz], tube1, frame);
      for (const sz of [-1, 1]) rod(body, [-hx, y, sz * hz], [hx, y, sz * hz], tube1, frame);
    }
    for (const sx of [-1, 1]) {
      rod(body, [sx * hx, y0, -hz], [sx * hx, (y0 + y1) / 2, -hz * 0.3], tube1 * 0.8, frame);
      tube(body, [[sx * hx, tube1, -hz * 1.02], [sx * hx, tube1, hz * 0.9], [sx * hx, tube1 * 1.6, hz * 1.08], [sx * hx, y0 * 1.6, hz * 1.16]], tube1 * 1.15, frame, 8);
      for (const z of [-hz * 0.7, hz * 0.6]) rod(body, [sx * hx, tube1, z], [sx * hx, y0, z], tube1 * 0.8, frame);
    }
    mesh(body, new THREE.BoxGeometry(W - tube1 * 3, 0.012, L - tube1 * 3), mat(tone('#4a5055'), { roughness: 0.8 }), [0, y0, 0]);

    // Guts: pressure bottles, a compensator, a junction box.
    const span = y1 - y0;
    mesh(body, new THREE.CylinderGeometry(span * 0.2, span * 0.2, L * 0.62, 16), steel, [-W * 0.2, y0 + span * 0.62, -L * 0.08], 1, [Math.PI / 2, 0, 0]);
    mesh(body, new THREE.CylinderGeometry(span * 0.15, span * 0.15, L * 0.5, 14), mat(tone('#d9d4c4'), { roughness: 0.5 }), [W * 0.2, y0 + span * 0.66, -L * 0.12], 1, [Math.PI / 2, 0, 0]);
    mesh(body, new THREE.BoxGeometry(W * 0.4, span * 0.34, L * 0.3), mat(tone('#3a4046'), { roughness: 0.6 }), [W * 0.1, y0 + span * 0.2, -L * 0.2]);
    if (a.kind !== 'eyeball') mesh(body, new THREE.CylinderGeometry(span * 0.11, span * 0.11, span * 0.5, 12), mat(tone('#e07a1c'), { roughness: 0.5 }), [-W * 0.26, y0 + span * 0.27, L * 0.1]);

    // Horizontal thrusters, vectored at the corners.
    const lost = wrecked ? Math.floor(random() * 4) : -1;
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz], i) => {
      if (a.kind === 'eyeball' && sz > 0) return;
      const r = H * 0.105;
      const g = new THREE.Group();
      mesh(g, new THREE.CylinderGeometry(r, r * 0.92, r * 1.1, 18, 1, true), mat(tone(frameC === '#8f979b' ? '#2c3238' : frameC), { roughness: 0.5, side: THREE.DoubleSide }), [0, 0, 0], 1, [Math.PI / 2, 0, 0]);
      mesh(g, new THREE.CylinderGeometry(r * 0.3, r * 0.22, r * 1.5, 10), dark, [0, 0, -r * 0.3], 1, [Math.PI / 2, 0, 0]);
      const p = propeller(g, r * 0.88);
      if (i === lost) {
        props.pop(); void p;
        g.position.set(sx * (W * 0.5 + r * 2.6), -H * 0.3, sz * L * 0.3 + r); g.rotation.set(1.2, random() * 6, 0.5);
        root.add(g);
      } else {
        g.position.set(sx * (hx + (a.kind === 'eyeball' ? r * 1.25 : -r * 0.2)), y0 + span * 0.45, sz * (hz - r * (a.kind === 'eyeball' ? 1.2 : 1.4)));
        g.rotation.y = a.kind === 'eyeball' ? 0 : sx * sz * -0.7;
        body.add(g);
      }
      g.traverse((node) => { if ((node as THREE.Mesh).isMesh) node.castShadow = true; });
    });

    // Lamps and the camera eye.
    const lampCount = a.kind === 'eyeball' ? 2 : 4;
    const lampY = y1 - tube1 * 0.5, lampZ = L / 2 + 0.02;
    const power = a.lamps === 'blazing' ? 1 : a.lamps === 'single' ? 1 : a.lamps === 'amber' ? 0.35 : 0;
    const lampColour = a.lamps === 'amber' ? '#ffb040' : new THREE.Color().setHSL(0.14 + (1 - mood.warmth) * 0.42, 0.5, 0.92).getStyle();
    const lit = mat(lampColour, { emissive: lampColour, emissiveIntensity: 2.6 * power, roughness: 0.3 });
    const unlit = mat('#555a5c', { roughness: 0.2, metalness: 0.3 });
    const beam = new THREE.MeshBasicMaterial({ color: lampColour, transparent: true, opacity: 0.11, depthWrite: false, side: THREE.DoubleSide });
    const survivor = Math.floor(random() * lampCount);
    const lenses: THREE.Mesh[] = [];
    rod(body, [-hx, lampY, lampZ - 0.03], [hx, lampY, lampZ - 0.03], tube1 * 0.8, frame);
    for (let i = 0; i < lampCount; i++) {
      const x = (i / (lampCount - 1) - 0.5) * W * 0.82, r = H * 0.062, on = power > 0 && (a.lamps !== 'single' || i === survivor);
      const g = new THREE.Group(); g.position.set(x, lampY, lampZ); g.rotation.set(0.3, x / W * 0.5, 0); body.add(g);
      mesh(g, new THREE.CylinderGeometry(r, r * 0.7, r * 1.5, 14), dark, [0, 0, 0], 1, [Math.PI / 2, 0, 0]);
      const lens = mesh(g, new THREE.CylinderGeometry(r * 0.86, r * 0.86, r * 0.2, 14), on ? lit : unlit, [0, 0, r * 0.75], 1, [Math.PI / 2, 0, 0]);
      if (on) {
        lenses.push(lens);
        if (a.lamps !== 'amber') { const cone = new THREE.Mesh(new THREE.ConeGeometry(H * 0.55, H * 2.2, 20, 1, true), beam); cone.position.set(0, 0, H * 1.1 + r); cone.rotation.x = -Math.PI / 2; g.add(cone); }
      }
    }
    const eyeR = a.kind === 'eyeball' ? H * 0.2 : H * 0.11;
    const eyeY = a.kind === 'eyeball' ? y0 + span * 0.5 : y0 + span * 0.72;
    mesh(body, new THREE.CylinderGeometry(eyeR, eyeR, eyeR * 2, 18), steel, [0, eyeY, L / 2 - eyeR * 0.6], 1, [Math.PI / 2, 0, 0]);
    mesh(body, new THREE.SphereGeometry(eyeR * 0.92, 20, 14), mat('#0c1418', { roughness: 0.08, metalness: 0.4 }), [0, eyeY, L / 2 + eyeR * 0.35]);
    mesh(body, new THREE.SphereGeometry(eyeR * 0.3, 10, 8), mat('#3fd0ff', { emissive: '#1a9fd0', emissiveIntensity: power > 0 ? 1.2 : 0 }), [eyeR * 0.25, eyeY + eyeR * 0.3, L / 2 + eyeR * 1.02]);

    // Manipulator arm and what it holds.
    if (a.kind !== 'eyeball' || a.holds !== 'nothing') {
      const s = a.kind === 'eyeball' ? 0.6 : 1, r = 0.04 * k * s + 0.008;
      const shoulder: V3 = [-W * 0.3, y0 + span * 0.25, L / 2 - 0.02];
      const stow = wrecked;
      const elbow: V3 = stow ? [-W * 0.3, y0 + span * 0.7, L / 2 + H * 0.12] : [-W * 0.32, y0 + span * 0.85, L / 2 + H * 0.3 * s];
      const wrist: V3 = stow ? [-W * 0.2, y0 + span * 0.15, L / 2 + H * 0.3] : [-W * 0.12, y0 + span * 0.42, L / 2 + H * 0.62 * s];
      const yellow = mat(tone(a.livery === 'yellow' ? '#2c3238' : '#d9a514'), { roughness: 0.5 });
      rod(body, shoulder, elbow, r * 1.25, yellow, r * 1.1);
      rod(body, elbow, wrist, r * 1.05, yellow, r * 0.85);
      for (const j of [shoulder, elbow, wrist]) mesh(body, new THREE.SphereGeometry(r * 1.55, 12, 10), steel, j);
      rod(body, [shoulder[0] + r, shoulder[1] + r * 2, shoulder[2]], [elbow[0] + r, elbow[1] - r * 3, elbow[2] - r], r * 0.35, rubber);
      const hand = new THREE.Group(); hand.position.set(...wrist); hand.rotation.set(stow ? 1.3 : 0.9, 0.25, 0); body.add(hand);
      mesh(hand, new THREE.CylinderGeometry(r * 0.9, r * 0.9, r * 3, 10), steel, [0, 0, r * 1.5], 1, [Math.PI / 2, 0, 0]);
      const open = a.holds === 'nothing' ? 0.55 : 0.28;
      for (const side of [-1, 1]) {
        const f = mesh(hand, new THREE.BoxGeometry(r * 0.6, r * 0.9, r * 4.4), steel, [side * r * (0.9 + open * 2.2), 0, r * 4.8], 1, [0, side * open, 0]);
        mesh(hand, new THREE.BoxGeometry(r * 0.6, r * 0.9, r * 1.4), steel, [side * r * (0.9 + open * 3.4 - 0.5), 0, r * 7.3], 1, [0, -side * 0.5, 0]);
        void f;
      }
      const grip: V3 = [0, 0, r * 6.6];
      const u = r * 4.2;
      if (a.holds === 'rock') {
        const rock = displace(new THREE.IcosahedronGeometry(u * 0.75, 2), (p) => n(p.x, p.y, p.z, 2 / u) * u * 0.22);
        paint(rock, (p, c) => { c.set('#2e2c30').lerp(new THREE.Color('#c9a53a'), Math.max(0, n(p.x, p.y, p.z, 3 / u)) * 0.9); });
        mesh(hand, rock, mat('#ffffff', { vertexColors: true, roughness: 0.9 }), grip);
      } else if (a.holds === 'worm') {
        mesh(hand, new THREE.CylinderGeometry(u * 0.14, u * 0.16, u * 2.6, 8), mat('#f0ece0', { roughness: 0.5 }), [0, u * 0.2, grip[2]], 1, [-0.9, 0, 0.1]);
        mesh(hand, new THREE.SphereGeometry(1, 10, 8), mat('#c81822', { emissive: '#7a0810', emissiveIntensity: 0.5 }), [0, u * 1.15, grip[2] - u * 1.2], [u * 0.2, u * 0.5, u * 0.2], [-0.9, 0, 0.1]);
      } else if (a.holds === 'core') {
        mesh(hand, new THREE.CylinderGeometry(u * 0.2, u * 0.2, u * 2.2, 12), new THREE.MeshStandardMaterial({ color: '#dff0f4', transparent: true, opacity: 0.45, roughness: 0.1 }), [0, -u * 0.2, grip[2]], 1, [-0.9, 0, 0]);
        mesh(hand, new THREE.CylinderGeometry(u * 0.17, u * 0.17, u * 1.3, 12), mat('#7d7f80', { roughness: 1 }), [0, -u * 0.55, grip[2] + u * 0.45], 1, [-0.9, 0, 0]);
        mesh(hand, new THREE.BoxGeometry(u * 0.9, u * 0.14, u * 0.14), mat('#e23a1c'), [0, u * 0.55, grip[2] - u * 0.9], 1, [-0.9, 0, 0]);
      } else if (a.holds === 'bottle') {
        const glass = new THREE.MeshStandardMaterial({ color: '#3f8a4a', roughness: 0.15, transparent: true, opacity: 0.8 });
        mesh(hand, new THREE.LatheGeometry([[0, 0], [0.3, 0], [0.32, 0.1], [0.32, 1.1], [0.14, 1.5], [0.12, 2], [0.16, 2.05], [0.1, 2.1]].map(([x, y]) => new THREE.Vector2(x * u, y * u * 0.9)), 14), glass, [0, -u * 0.5, grip[2] + u * 0.5], 1, [-0.9, 0, 0]);
      } else if (a.holds === 'bell') {
        mesh(hand, new THREE.LatheGeometry([[0.9, 0], [0.82, 0.08], [0.6, 0.5], [0.5, 0.95], [0.3, 1.2], [0.08, 1.28], [0.08, 1.45], [0.22, 1.5], [0.08, 1.56]].map(([x, y]) => new THREE.Vector2(x * u * 0.8, y * u * 0.9)), 18), mat('#7a8a55', { roughness: 0.6, metalness: 0.5, side: THREE.DoubleSide }), [0, -u * 1.5, grip[2]], 1, [0.5, 0, 0]);
      }
      if (a.kind === 'work') {
        // A second, simpler grabber folded on the other side.
        const s2: V3 = [W * 0.3, y0 + span * 0.25, L / 2 - 0.02], e2: V3 = [W * 0.34, y0 + span * 0.8, L / 2 + H * 0.12], w2: V3 = [W * 0.3, y0 + span * 0.3, L / 2 + H * 0.26];
        rod(body, s2, e2, r * 1.2, steel); rod(body, e2, w2, r, steel);
        for (const j of [s2, e2]) mesh(body, new THREE.SphereGeometry(r * 1.5, 12, 10), dark, j);
        for (const side of [-1, 1]) mesh(body, new THREE.BoxGeometry(r * 0.5, r * 3.4, r * 0.8), steel, [w2[0] + side * r * 1.1, w2[1] - r * 1.6, w2[2]], 1, [0, 0, side * 0.3]);
      }
    }
    if (a.kind === 'science') {
      // Sample basket with core tubes and a bio box.
      const bw = W * 0.8, bz = L / 2 + H * 0.18;
      mesh(body, new THREE.BoxGeometry(bw, 0.02, H * 0.34), frame, [0, y0, bz]);
      for (const sx of [-1, 1]) mesh(body, new THREE.BoxGeometry(0.02, H * 0.1, H * 0.34), frame, [sx * bw / 2, y0 + H * 0.05, bz]);
      mesh(body, new THREE.BoxGeometry(bw, H * 0.1, 0.02), frame, [0, y0 + H * 0.05, bz + H * 0.17]);
      const cores: Spot[] = [];
      for (let i = 0; i < 6; i++) if (random() < 0.8) cores.push({ at: [W * (0.06 + (i % 3) * 0.11), y0 + H * 0.12, bz - H * 0.06 + Math.floor(i / 3) * H * 0.13], scale: [H * 0.032, H * 0.22, H * 0.032], color: random() < 0.5 ? '#e23a1c' : '#f2c21a' });
      instances(body, new THREE.CylinderGeometry(1, 1, 1, 10), mat('#ffffff', { roughness: 0.4 }), cores);
      mesh(body, new THREE.BoxGeometry(W * 0.26, H * 0.14, H * 0.2), mat('#e9e7e0', { roughness: 0.5 }), [-W * 0.22, y0 + H * 0.08, bz + H * 0.02]);
    }

    // Pose the vehicle.
    const hover = a.state === 'hovering' ? Math.min(0.28, H * 0.3) : 0;
    if (wrecked) { body.rotation.set(0.24, range(random, -0.1, 0.1), range(random, -0.2, 0.2)); body.position.y = -H * 0.14; }
    else body.position.y = hover;
    body.updateMatrixWorld(true);

    // Tether.
    const cable = mat(a.livery === 'yellow' ? '#e86a1c' : '#f2c21a', { roughness: 0.6 });
    const tr = tube1 * 0.75, anchor = body.localToWorld(new THREE.Vector3(0, H, -L * 0.36));
    const A: V3 = [anchor.x, anchor.y, anchor.z];
    if (a.tether !== 'none') { const boot = mesh(root, new THREE.CylinderGeometry(tr * 1.6, tr * 2.4, tr * 6, 10), rubber, [A[0], A[1] + tr * 2, A[2]]); boot.rotation.copy(body.rotation); }
    if (a.tether === 'taut') tube(root, [A, [A[0], A[1] + H * 0.5, A[2] - H * 0.08], [A[0] + range(random, -0.1, 0.1) * H, A[1] + H * 1.1, A[2] - H * 0.35], [A[0], A[1] + H * 1.6, A[2] - H * 0.8]], tr, cable, 7, 30);
    else if (a.tether === 'slack') {
      const side = random() < 0.5 ? -1 : 1;
      tube(root, [A, [A[0], A[1] + H * 0.3, A[2] - H * 0.2], [A[0] + side * H * 0.1, H * 0.5, -L / 2 - H * 0.5], [side * H * 0.4, tr, -L / 2 - H * 0.9], [side * H * 0.9, tr, -L / 2 - H * 0.5], [side * H * 0.7, tr, -L / 2 - H * 1.3], [-side * H * 0.1, tr, -L / 2 - H * 1.7]], tr, cable, 7, 60);
    } else if (a.tether === 'cut') {
      const end: V3 = [A[0] + range(random, -0.3, 0.3) * H, A[1] + H * 0.25, A[2] - H * 0.75];
      tube(root, [A, [A[0], A[1] + H * 0.35, A[2] - H * 0.15], [(A[0] + end[0]) / 2, A[1] + H * 0.45, A[2] - H * 0.5], end], tr, cable, 7, 30);
      const copper = mat('#d98a4a', { metalness: 0.6, roughness: 0.4 });
      for (let i = 0; i < 6; i++) rod(root, end, [end[0] + range(random, -1, 1) * tr * 5, end[1] + range(random, -1, 1) * tr * 5, end[2] - tr * range(random, 3, 8)], tr * 0.2, copper);
    } else if (a.tether === 'tangled') {
      const loop: V3[] = [A];
      for (let i = 1; i <= 14; i++) { const ang = i * 1.15 + random() * 0.4, rr = Math.hypot(W, L) * 0.5 * range(random, 0.85, 1.12); loop.push([Math.cos(ang) * rr * (W / L + 0.25), body.position.y + H * (0.95 - i * 0.055) + range(random, -0.1, 0.1) * H, Math.sin(ang) * rr * 0.92]); }
      loop.push([W * 0.9, tr, -L * 0.7]);
      tube(root, loop, tr, cable, 7, 110);
    }

    // Silt: a drift round a wreck, a dusting on top.
    if (wrecked || a.silt > 0.55) {
      const drift = displace(new THREE.SphereGeometry(1, 26, 10, 0, 6.2832, 0, Math.PI / 2), (p) => n(p.x, p.y, p.z, 2.5) * 0.12);
      mesh(root, drift, mat('#8f9295', { roughness: 1 }), [0, -0.01, wrecked ? L * 0.25 : 0], [W * (wrecked ? 1.0 : 0.85), H * (wrecked ? 0.16 : 0.04) * (0.5 + a.silt), L * (wrecked ? 0.7 : 0.75)]);
    }
    const flecks: Spot[] = [];
    for (let i = 0; i < Math.round(a.silt * 30 + mood.wear * 10); i++) {
      const p = body.localToWorld(new THREE.Vector3(range(random, -0.46, 0.46) * W, H + 0.005, range(random, -0.46, 0.46) * L)), s = H * range(random, 0.012, 0.035);
      flecks.push({ at: [p.x, p.y, p.z], scale: [s, s * 0.12, s * range(random, 0.5, 1)], rot: [body.rotation.x, random() * 3, body.rotation.z], color: random() < 0.3 ? '#c9c9c2' : '#8f9295' });
    }
    if (flecks.length) instances(root, new THREE.SphereGeometry(1, 8, 5), mat('#ffffff', { roughness: 1 }), flecks);
    if (wrecked && mood.wear > 0.3) {
      const stalks: Spot[] = [], crowns: Spot[] = [];
      for (let i = 0; i < 3 + mood.wear * 6; i++) { const p = body.localToWorld(new THREE.Vector3(range(random, -0.4, 0.4) * W, H, range(random, -0.4, 0.4) * L)), s = H * range(random, 0.03, 0.05); stalks.push({ at: [p.x, p.y + s, p.z], scale: [s, s * 2.4, s] }); crowns.push({ at: [p.x, p.y + s * 2.5, p.z], scale: [s * 2, s * 0.8, s * 2] }); }
      instances(root, new THREE.CylinderGeometry(0.8, 1, 1, 8), mat('#f3efe6', { roughness: 0.6 }), stalks);
      instances(root, new THREE.ConeGeometry(1, 1, 10, 1, true).rotateX(Math.PI), mat('#fff6ee', { roughness: 0.6, side: THREE.DoubleSide }), crowns);
    }

    const all = visibleBounds(root), mid = all.getCenter(new THREE.Vector3());
    root.position.set(-mid.x, wrecked ? 0 : -Math.min(all.min.y, hover) + hover, -mid.z);
    const energy = mix(0.3, 1.6, mood.energy), running = power > 0 && !wrecked;
    const baseY = body.position.y;
    return {
      object: root,
      footprint: Math.hypot(W, L) * 0.55,
      update(dt, time) {
        if (running) for (const p of props) p.rotation.z += dt * 9 * energy;
        if (a.state === 'hovering') body.position.y = baseY + Math.sin(time * 0.8 * energy) * 0.025;
        if (a.lamps === 'single' || a.lamps === 'amber') lit.emissiveIntensity = 2.6 * power * (Math.sin(time * 17) * Math.sin(time * 5.3) > 0.55 ? 0.25 : 1);
        void lenses;
      },
      dispose: () => disposeTree(root),
    };
  },
});
