import * as THREE from 'three';
import { Sculpture, choice, clamp01, defineThing, mix, score } from '@conjure/kit';

type P3 = [number, number, number];

export default defineThing({
  questions: {
    state: choice('What condition is it in?', {
      fresh: 'Fresh: the foil still bright, the pads only just scorched, the crew gone an hour ago.',
      dusted: 'Decades later: every surface greyed under a soft coat of settled dust.',
      tattered: 'Centuries on: foil peeled and hanging in strips, panels missing, the dark frame showing.',
      tipped: 'Tipped over on a snapped leg, one corner of the body resting on the ground.',
    }),
    foil: choice('What is it wrapped in?', {
      gold: 'Crinkled gold foil, the classic moon-lander look.',
      copper: 'Deep orange-copper thermal blanket.',
      silver: 'Bright silver mylar, mirror-like and cold.',
      patchwork: 'A patchwork of gold and matte black panels.',
      white: 'Painted white panels with red trim, blunt and institutional.',
    }),
    body: choice('What shape is the body?', {
      octagon: 'A flat eight-sided box, wide and squat.',
      drum: 'A round drum with many narrow panels.',
      cross: 'A cross of four boxy equipment bays around a core.',
      tanks: 'An open truss cradling four spherical fuel tanks.',
    }),
    splay: score('How far do the legs splay?', ['Tucked in, upright and tall', 'A steady stance', 'Spread wide and low like a crab']),
    ladder: choice('How did the crew get down?', {
      ladder: 'A ladder down the front leg from a small porch.',
      bent: 'A ladder whose bottom rungs are bent and hanging loose.',
      none: 'No ladder: it was a robot, nobody ever climbed down.',
    }),
    deck: choice('What is on top of it?', {
      bare: 'An empty scorched deck where the upper stage lifted away.',
      cabin: 'The crew cabin, still attached: nobody ever left.',
      instruments: 'A dish antenna, a mast camera and a fan of solar panels still pointing at home.',
      cargo: 'Strapped-down cargo crates that were never unloaded.',
    }),
    marking: choice('What is painted on its side?', {
      blank: 'Nothing: anonymous hardware.',
      number: 'A stencilled vehicle number.',
      stripes: 'A small striped flag decal.',
      star: 'A single red star.',
      name: 'A hand-lettered ship name.',
    }),
    ground: choice('What is the ground around it like?', {
      clean: 'Undisturbed.',
      blast: 'A radial scar of dust blown outward by the engine.',
      drift: 'Dust drifted up against the footpads.',
      trampled: 'Trampled with bootprints around the foot of the ladder.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const L = new Sculpture(context);
    s.root.add(L.root);
    const { mood, random } = context;
    const dust = Math.min(0.62, { fresh: 0.02, dusted: 0.5, tattered: 0.36, tipped: 0.26 }[a.state] + mood.wear * 0.16);
    const tatter = a.state === 'tattered' ? mix(0.5, 0.9, mood.wear) : a.state === 'tipped' ? 0.25 : mood.wear * 0.2;
    const regolith = new THREE.Color('#8a867f');
    const dusted = (hex: string, keep = 1) => new THREE.Color(hex).lerp(regolith, dust * keep);
    const mat = (hex: string, metalness = 0, roughness = 0.6) =>
      new THREE.MeshStandardMaterial({ color: dusted(hex), metalness: metalness * (1 - dust * 0.85), roughness: mix(roughness, 0.96, dust) });

    // Crinkled foil: a patch map of lighter and darker facets, also used as a bump.
    const foilMaterial = (hex: string, metalness: number) => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 256;
      const ctx = canvas.getContext('2d')!;
      const base = dusted(hex);
      ctx.fillStyle = `#${base.getHexString()}`;
      ctx.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 260; i++) {
        const x = random() * 256, y = random() * 256, r = 8 + random() * 30;
        const shade = base.clone().offsetHSL(0, 0, (random() - 0.5) * 0.3);
        ctx.fillStyle = `rgba(${Math.round(shade.r * 255)},${Math.round(shade.g * 255)},${Math.round(shade.b * 255)},0.55)`;
        ctx.beginPath();
        ctx.moveTo(x + (random() - 0.5) * r, y + (random() - 0.5) * r);
        for (let k = 0; k < 3; k++) ctx.lineTo(x + (random() - 0.5) * r * 2, y + (random() - 0.5) * r * 2);
        ctx.fill();
      }
      ctx.strokeStyle = 'rgba(30,22,10,0.35)';
      ctx.lineWidth = 2;
      for (const at of [4, 128, 252]) { ctx.beginPath(); ctx.moveTo(0, at); ctx.lineTo(256, at); ctx.stroke(); ctx.beginPath(); ctx.moveTo(at, 0); ctx.lineTo(at, 256); ctx.stroke(); }
      const map = new THREE.CanvasTexture(canvas);
      map.colorSpace = THREE.SRGBColorSpace;
      return new THREE.MeshStandardMaterial({ map, bumpMap: map, bumpScale: 1.5, metalness: metalness * (1 - dust * 0.85), roughness: mix(0.42, 0.95, dust) });
    };
    const warmShift = (hex: string) => `#${new THREE.Color(hex).offsetHSL((mood.warmth - 0.5) * -0.03, (mood.cheer - 0.5) * 0.2, 0).getHexString()}`;
    const foilHex = { gold: '#d6a53a', copper: '#c96a2a', silver: '#cfd4d8', patchwork: '#d6a53a', white: '#ecebe4' }[a.foil];
    const foil = foilMaterial(warmShift(foilHex), a.foil === 'white' ? 0.05 : 0.7);
    const altFoil = a.foil === 'patchwork' ? mat('#1d1d20', 0.1, 0.8) : a.foil === 'white' ? mat('#b3282a', 0, 0.6) : foilMaterial(warmShift(a.foil === 'silver' ? '#9aa2aa' : '#b9862c'), 0.7);
    const frame = mat('#3a3c40', 0.5, 0.55);
    const strut = mat(a.foil === 'white' ? '#d8d8d2' : '#c9a84a', 0.55, 0.45);
    const dark = mat('#17181a', 0.2, 0.8);
    const soot = new THREE.MeshStandardMaterial({ color: '#141312', roughness: 1 });
    const steel = mat('#aeb4b8', 0.75, 0.35);

    const deckY = 2.05, floorY = 1.05, midY = (deckY + floorY) / 2, bodyH = deckY - floorY;
    const bodyR = 1.55;

    // --- Body ------------------------------------------------------------------------------
    const skin = (index: number) => (a.foil === 'patchwork' || a.foil === 'white' ? (index % 2 ? altFoil : foil) : index % 3 === 2 ? altFoil : foil);
    const hangStrip = (x: number, y: number, z: number, angle: number) => {
      const length = mix(0.25, 0.8, random());
      const strip = L.box([mix(0.1, 0.3, random()), length, 0.008], [x, y - length / 2, z], foil);
      strip.rotation.set((random() - 0.5) * 0.5, angle, (random() - 0.5) * 0.4);
    };
    if (a.body === 'octagon' || a.body === 'drum') {
      const sides = a.body === 'octagon' ? 8 : 14;
      const core = L.cylinder(bodyR * 0.96, bodyR * 0.96, bodyH * 0.96, [0, midY, 0], frame, sides);
      core.rotation.y = Math.PI / sides;
      const apothem = bodyR * Math.cos(Math.PI / sides), faceW = 2 * bodyR * Math.sin(Math.PI / sides);
      for (let i = 0; i < sides; i++) {
        const angle = (i * Math.PI * 2) / sides;
        const missing = random() < tatter * 0.5 && i !== 1;
        if (missing) {
          // An open bay: cross-bracing and a tank behind where the blanket has gone.
          const bay = new THREE.Group();
          bay.position.set(Math.sin(angle) * apothem, midY, Math.cos(angle) * apothem);
          bay.rotation.y = angle;
          L.root.add(bay);
          const brace = (from: P3, to: P3) => { const rod = L.rod(from, to, 0.02, strut); bay.add(rod); };
          brace([-faceW / 2, -bodyH / 2, 0.01], [faceW / 2, bodyH / 2, 0.01]);
          brace([faceW / 2, -bodyH / 2, 0.01], [-faceW / 2, bodyH / 2, 0.01]);
          const hole = L.box([faceW * 0.9, bodyH * 0.86, 0.02], [0, 0, -0.005], dark); bay.add(hole);
          if (random() < 0.8) hangStrip(Math.sin(angle) * (apothem + 0.03), floorY + 0.1, Math.cos(angle) * (apothem + 0.03), angle);
          continue;
        }
        const panel = L.box([faceW * 0.97, bodyH, 0.05], [Math.sin(angle) * apothem, midY, Math.cos(angle) * apothem], skin(i));
        panel.rotation.y = angle;
        if (random() < tatter) hangStrip(Math.sin(angle) * (apothem + 0.04), floorY + 0.05, Math.cos(angle) * (apothem + 0.04), angle);
      }
      L.cylinder(bodyR * 0.99, bodyR * 0.99, 0.05, [0, deckY, 0], skin(2), sides).rotation.y = Math.PI / sides;
    } else if (a.body === 'cross') {
      L.box([1.5, bodyH, 1.5], [0, midY, 0], frame);
      for (let i = 0; i < 4; i++) {
        const angle = (i * Math.PI) / 2;
        const bay = L.box([1.3, bodyH * 0.94, 0.85], [Math.sin(angle) * 1.12, midY, Math.cos(angle) * 1.12], skin(i));
        bay.rotation.y = angle;
        const corner = angle + Math.PI / 4;
        const tank = L.ball([0.42, 0.42, 0.42], [Math.sin(corner) * 1.15, midY - 0.05, Math.cos(corner) * 1.15], steel, 16);
        tank.castShadow = true;
        if (random() < tatter) hangStrip(Math.sin(angle) * 1.56, floorY + 0.05, Math.cos(angle) * 1.56, angle);
      }
      L.box([1.52, 0.05, 1.52], [0, deckY, 0], skin(2));
    } else {
      // Open truss with spherical tanks.
      L.cylinder(0.6, 0.6, bodyH, [0, midY, 0], foil, 16);
      for (const y of [floorY, deckY]) {
        const hoop = L.ring(bodyR * 0.97, 0.035, [0, y, 0], strut);
        hoop.rotation.x = Math.PI / 2;
      }
      for (let i = 0; i < 4; i++) {
        const angle = (i * Math.PI) / 2 + Math.PI / 4;
        L.ball([0.5, 0.5, 0.5], [Math.sin(angle) * 1.02, midY, Math.cos(angle) * 1.02], i % 2 ? altFoil : foil, 18);
      }
      for (let i = 0; i < 8; i++) {
        const from = (i * Math.PI) / 4, to = from + Math.PI / 4;
        const r = bodyR * 0.97;
        L.rod([Math.sin(from) * r, floorY, Math.cos(from) * r], [Math.sin(to) * r, deckY, Math.cos(to) * r], 0.022, strut);
        L.rod([Math.sin(from) * r, floorY, Math.cos(from) * r], [Math.sin(from) * r, deckY, Math.cos(from) * r], 0.028, strut);
      }
      L.cylinder(0.9, 0.9, 0.05, [0, deckY, 0], frame, 16);
    }

    // Engine bell, scorched inside.
    L.lathe([[0.26, 0], [0.3, -0.12], [0.42, -0.34], [0.62, -0.6], [0.66, -0.62], [0.6, -0.6], [0.4, -0.33], [0.26, -0.1]], mat('#55504a', 0.6, 0.5), [0, floorY, 0]);
    L.cylinder(0.3, 0.34, 0.14, [0, floorY - 0.02, 0], frame, 16);
    const bellGlow = a.state === 'fresh' ? new THREE.MeshStandardMaterial({ color: '#2a1408', emissive: '#ff5a1a', emissiveIntensity: mix(0.3, 1.4, mood.energy), roughness: 1 }) : soot;
    L.cylinder(0.58, 0.58, 0.02, [0, floorY - 0.585, 0], bellGlow, 20);

    // --- Legs -----------------------------------------------------------------------------
    const padR = mix(2.15, 3.3, a.splay), padY = 0.11, shoulderY = mix(deckY - 0.08, deckY - 0.3, a.splay);
    const broken = a.state === 'tipped' ? 1 : -1;
    let stubEnd: THREE.Vector3 | null = null;
    for (let k = 0; k < 4; k++) {
      const angle = (k * Math.PI) / 2, sx = Math.sin(angle), sz = Math.cos(angle);
      const at = (radius: number, y: number, side = 0): P3 => [sx * radius + sz * side, y, sz * radius - sx * side];
      const top = new THREE.Vector3(...at(bodyR + 0.28, shoulderY)), foot = new THREE.Vector3(...at(padR, padY + 0.06));
      const along = (t: number) => top.clone().lerp(foot, t).toArray() as P3;
      // Outrigger truss from the body to the shoulder.
      for (const side of [-0.55, 0.55]) {
        L.rod(at(bodyR - 0.1, deckY - 0.04, side), top.toArray() as P3, 0.035, strut);
        L.rod(at(bodyR - 0.1, floorY + 0.25, side), top.toArray() as P3, 0.03, strut);
      }
      const snap = k === broken ? 0.58 : 1;
      L.rod(top.toArray() as P3, along(snap * 0.55), 0.085, foil);
      if (snap === 1) L.rod(along(0.5), along(1), 0.058, steel);
      else stubEnd = new THREE.Vector3(...along(snap * 0.55));
      // Secondary struts brace the leg from the lower body.
      const knee = along(snap === 1 ? 0.56 : 0.3);
      for (const side of [-0.7, 0.7]) L.rod(at(bodyR - 0.12, floorY + 0.06, side), knee, 0.028, strut);
      // Footpad: a shallow dish, scorched, with a contact probe.
      const padHost = k === broken ? s : L;
      const padAt: P3 = k === broken ? [sx * (padR + 0.35), 0, sz * (padR + 0.35) + 0.5] : at(padR, 0);
      const pad = padHost.lathe([[0, 0.04], [0.3, 0.03], [0.44, 0.1], [0.47, 0.16], [0.43, 0.16], [0.3, 0.09], [0, 0.1]], foil, padAt);
      const scorch = padHost.cylinder(0.3, 0.3, 0.012, [padAt[0], padAt[1] + 0.105, padAt[2]], soot, 16);
      if (k === broken) {
        // The snapped lower leg lies beside its pad.
        const lower = s.rod([padAt[0], 0.2, padAt[2]], [padAt[0] - sx * 1.1 + 0.3, 0.07, padAt[2] - 0.9], 0.058, steel);
        lower.castShadow = true;
        pad.rotation.z = 0.2; scorch.rotation.z = 0.2;
      } else if (a.ground === 'drift') {
        const drift = s.ball([mix(0.5, 0.8, random()), mix(0.05, 0.13, dust), mix(0.5, 0.8, random())], [padAt[0] + (random() - 0.5) * 0.2, 0, padAt[2] + (random() - 0.5) * 0.2], new THREE.MeshStandardMaterial({ color: '#8d8982', roughness: 1 }), 14);
        drift.castShadow = false;
      }
      // Ladder and porch on the front leg.
      if (k === 0 && a.ladder !== 'none') {
        L.box([0.9, 0.04, 0.75], at(bodyR + 0.32, deckY - 0.02), frame);
        for (const side of [-0.42, 0.42]) L.rod(at(bodyR + 0.66, deckY, side), at(bodyR + 0.66, deckY + 0.42, side), 0.018, steel);
        L.rod(at(bodyR + 0.66, deckY + 0.42, -0.42), at(bodyR - 0.1, deckY + 0.42, -0.42), 0.018, steel);
        L.rod(at(bodyR + 0.66, deckY + 0.42, 0.42), at(bodyR - 0.1, deckY + 0.42, 0.42), 0.018, steel);
        const rungs = 9, lift = 0.12;
        const railEnd = a.ladder === 'bent' ? 0.62 : 0.86;
        for (const side of [-0.24, 0.24]) {
          const from = along(0.02), to = along(railEnd);
          L.rod([from[0] + side, from[1] + lift, from[2] + 0.06], [to[0] + side, to[1] + lift, to[2] + 0.06], 0.022, steel);
        }
        for (let r = 0; r < rungs; r++) {
          const t = 0.06 + (r / (rungs - 1)) * 0.78, p = along(t);
          const rung = L.rod([p[0] - 0.24, p[1] + lift, p[2] + 0.06], [p[0] + 0.24, p[1] + lift, p[2] + 0.06], 0.02, steel);
          if (a.ladder === 'bent' && t > 0.6) {
            rung.rotation.z += (random() - 0.5) * 1.4;
            rung.position.y -= random() * 0.25;
            rung.position.x += (random() - 0.5) * 0.3;
          }
        }
        // Plaque on the ladder leg.
        const plaque = L.box([0.3, 0.2, 0.02], [along(0.3)[0], along(0.3)[1] + 0.02, along(0.3)[2] + 0.12], steel);
        plaque.rotation.x = -0.6;
      }
    }

    // --- Marking ----------------------------------------------------------------------------
    if (a.marking !== 'blank' && a.body !== 'tanks') {
      const canvas = document.createElement('canvas');
      canvas.width = 256; canvas.height = 128;
      const ctx = canvas.getContext('2d')!;
      const paper = dusted('#f2efe6');
      ctx.fillStyle = `#${paper.getHexString()}`;
      ctx.fillRect(0, 0, 256, 128);
      const ink = (hex: string) => `#${dusted(hex, 0.7).getHexString()}`;
      if (a.marking === 'stripes') {
        const bars = [['#c8102e', '#f2efe6', '#1f3a93'], ['#f2a900', '#1c1c1c', '#f2a900'], ['#0b6e4f', '#f2efe6', '#c8102e']][Math.floor(random() * 3)];
        bars.forEach((bar, i) => { ctx.fillStyle = ink(bar); ctx.fillRect(8, 8 + i * 37.3, 240, 37.3); });
      } else if (a.marking === 'star') {
        ctx.fillStyle = ink('#c8102e');
        ctx.beginPath();
        for (let i = 0; i < 10; i++) { const r = i % 2 ? 22 : 54, t = (i * Math.PI) / 5 - Math.PI / 2; ctx.lineTo(128 + Math.cos(t) * r, 66 + Math.sin(t) * r); }
        ctx.fill();
      } else {
        const names = ['HERON', 'PILGRIM', 'LANTERN', 'ANTARES', 'KESTREL', 'FAR HOME'];
        const text = a.marking === 'number' ? `LV-${1 + Math.floor(random() * 19)}` : names[Math.floor(random() * names.length)];
        ctx.fillStyle = ink('#1c1c1c');
        ctx.font = `${a.marking === 'name' ? 'italic ' : ''}bold ${a.marking === 'number' ? 76 : 50}px ${a.marking === 'name' ? 'serif' : 'monospace'}`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(text, 128, 68, 236);
      }
      const map = new THREE.CanvasTexture(canvas);
      map.colorSpace = THREE.SRGBColorSpace;
      const angle = a.body === 'cross' ? 0 : a.body === 'octagon' ? Math.PI / 4 : (Math.PI * 2) / 14;
      const reach = a.body === 'cross' ? 1.555 : bodyR * Math.cos(Math.PI / (a.body === 'octagon' ? 8 : 14)) + 0.03;
      const decal = L.mesh(new THREE.PlaneGeometry(a.body === 'drum' ? 0.56 : 0.8, a.body === 'drum' ? 0.28 : 0.4), new THREE.MeshStandardMaterial({ map, roughness: 0.9 }), [Math.sin(angle) * reach, midY + 0.1, Math.cos(angle) * reach]);
      decal.rotation.y = angle;
      decal.castShadow = false;
    }

    // --- Deck -------------------------------------------------------------------------------
    let beacon: THREE.MeshStandardMaterial | null = null;
    const top = deckY + 0.03;
    if (a.deck === 'bare') {
      L.cylinder(0.75, 0.75, 0.02, [0, top, 0], soot, 24);
      const collar = L.ring(0.5, 0.05, [0, top + 0.04, 0], steel);
      collar.rotation.x = Math.PI / 2;
      for (let i = 0; i < 4; i++) { const t = (i * Math.PI) / 2 + Math.PI / 4; L.box([0.14, 0.14, 0.14], [Math.sin(t) * 0.82, top + 0.06, Math.cos(t) * 0.82], frame); }
      // Scorch streaks radiating from where the ascent engine fired.
      for (let i = 0; i < 9; i++) { const t = random() * Math.PI * 2, len = mix(0.3, 0.7, random()); const streak = L.box([0.07, 0.012, len], [Math.sin(t) * (0.75 + len / 2), top, Math.cos(t) * (0.75 + len / 2)], soot); streak.rotation.y = t; streak.castShadow = false; }
    } else if (a.deck === 'cabin') {
      const cabinSkin = a.foil === 'white' ? foil : mat('#b9bcbc', 0.6, 0.4);
      const cabin = L.mesh(new THREE.IcosahedronGeometry(1, 1), cabinSkin, [0, top + 0.95, 0.1]);
      cabin.scale.set(1.15, 0.95, 1.0);
      (cabin.material as THREE.MeshStandardMaterial).flatShading = true;
      L.cylinder(0.8, 0.95, 0.3, [0, top + 0.15, 0], altFoil, 8);
      for (const side of [-1, 1]) {
        const window = L.mesh(new THREE.CircleGeometry(0.2, 3), dark, [side * 0.42, top + 1.3, 0.93]);
        window.rotation.set(-0.35, side * 0.45, side * 0.5);
        window.castShadow = false;
        // Thruster quads on outriggers.
        L.rod([side * 1.0, top + 1.05, 0.1], [side * 1.5, top + 1.2, 0.1], 0.03, strut);
        for (const d of [[0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]] as const)
          L.rod([side * 1.5, top + 1.2, 0.1], [side * 1.5 + d[0] * 0.16, top + 1.2 + d[1] * 0.16, 0.1 + d[2] * 0.16], 0.03, frame, 0.055);
      }
      L.box([0.62, 0.62, 0.06], [0, top + 0.62, 1.02], frame).rotation.x = -0.12;
      L.rod([0.5, top + 1.75, -0.2], [0.5, top + 2.3, -0.2], 0.018, steel);
      const dish = L.lathe([[0, 0], [0.18, 0.03], [0.3, 0.1], [0.28, 0.1], [0.17, 0.045], [0, 0.02]], steel, [0.5, top + 2.3, -0.2]);
      dish.rotation.set(0.7, 0.4, 0);
      beacon = new THREE.MeshStandardMaterial({ color: '#40110c', emissive: '#ff3b2a', emissiveIntensity: 1.2 });
      L.ball([0.05, 0.05, 0.05], [-0.4, top + 1.9, 0], beacon, 10);
    } else if (a.deck === 'instruments') {
      L.rod([0.5, top, -0.3], [0.5, top + 1.2, -0.3], 0.03, steel);
      const dish = L.lathe([[0, 0], [0.3, 0.05], [0.55, 0.2], [0.52, 0.2], [0.29, 0.075], [0, 0.03]], mat('#e6e3da', 0.2, 0.5), [0.5, top + 1.2, -0.3]);
      dish.rotation.set(0.9, 0.5 + random(), 0);
      L.rod([-0.7, top, 0.5], [-0.7, top + 0.85, 0.5], 0.022, steel);
      L.box([0.2, 0.14, 0.24], [-0.7, top + 0.9, 0.5], frame).rotation.y = random() * 3;
      const blue = mat('#1f3f8f', 0.5, 0.3);
      for (let i = 0; i < 5; i++) {
        const t = -0.9 + i * 0.45;
        const petal = L.box([0.34, 0.015, 0.95], [-0.2 + Math.sin(t) * 0.6, top + 0.5, -0.5 - Math.cos(t) * 0.6], blue);
        petal.rotation.set(-0.5, -t, 0, 'YXZ');
      }
      L.rod([-0.2, top, -0.5], [-0.2, top + 0.35, -0.5], 0.03, steel);
    } else {
      const tarp = mat(mood.cheer > 0.5 ? '#c7772e' : '#5d6b58', 0, 0.9), crate = mat('#c9c5b8', 0.3, 0.6), strap = mat('#1e1e1e', 0, 0.8);
      const stack = 3 + Math.round(mood.density * 4);
      for (let i = 0; i < stack; i++) {
        const w = mix(0.45, 0.9, random()), h = mix(0.3, 0.6, random()), d = mix(0.45, 0.8, random());
        const x = (random() - 0.5) * 1.3, z = (random() - 0.5) * 1.3;
        const box = L.box([w, h, d], [x, top + h / 2 + (i > 3 ? 0.5 : 0), z], i % 3 === 0 ? tarp : crate);
        box.rotation.y = random() * 0.6;
        const band = L.box([w + 0.02, h + 0.02, 0.06], [x, top + h / 2 + (i > 3 ? 0.5 : 0), z], strap);
        band.rotation.y = box.rotation.y;
      }
    }

    // Dust settled on top, when it has had time to.
    if (dust > 0.4) {
      const pile = new THREE.MeshStandardMaterial({ color: '#8d8982', roughness: 1 });
      for (let i = 0; i < 6; i++) {
        const t = random() * Math.PI * 2, r = random() * bodyR * 0.8;
        L.ball([mix(0.25, 0.55, random()), 0.04 * dust + 0.02, mix(0.25, 0.5, random())], [Math.sin(t) * r, top, Math.cos(t) * r], pile, 10).castShadow = false;
      }
    }

    // --- Tipped: rest on the snapped stub ----------------------------------------------------
    if (stubEnd) {
      const tilt = Math.atan2(stubEnd.y - padY, Math.hypot(stubEnd.x, stubEnd.z)) * mix(0.98, 1.08, random());
      L.root.rotation.z = -tilt;
      L.root.rotation.y = (random() - 0.5) * 0.15;
      L.root.updateMatrixWorld(true);
      L.root.position.y -= new THREE.Box3().setFromObject(L.root).min.y;
    }

    // --- Ground -----------------------------------------------------------------------------
    if (a.ground === 'blast') {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 512;
      const ctx = canvas.getContext('2d')!;
      const glow = ctx.createRadialGradient(256, 256, 20, 256, 256, 256);
      glow.addColorStop(0, '#c9c6bd'); glow.addColorStop(0.35, '#b3afa6'); glow.addColorStop(1, '#8f8b83');
      ctx.fillStyle = glow; ctx.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 150; i++) {
        const t = random() * Math.PI * 2, from = mix(30, 120, random()), to = from + mix(40, 150, random());
        ctx.strokeStyle = random() < 0.5 ? 'rgba(235,232,224,0.5)' : 'rgba(70,66,60,0.4)';
        ctx.lineWidth = mix(1, 6, random());
        ctx.beginPath(); ctx.moveTo(256 + Math.cos(t) * from, 256 + Math.sin(t) * from); ctx.lineTo(256 + Math.cos(t) * to, 256 + Math.sin(t) * to); ctx.stroke();
      }
      const map = new THREE.CanvasTexture(canvas);
      map.colorSpace = THREE.SRGBColorSpace;
      const scar = s.mesh(new THREE.CylinderGeometry(padR + 0.7, padR + 0.8, 0.03, 40), new THREE.MeshStandardMaterial({ map, roughness: 1 }), [0, 0.015, 0]);
      scar.castShadow = false;
    } else if (a.ground === 'trampled') {
      // Walked paths fanning out from the foot of the ladder, left and right feet alternating.
      const prints: { at: P3; size: number }[] = [];
      const headings: number[] = [];
      for (let path = 0, paths = 3 + Math.round(mood.density * 3); path < paths; path++) {
        let x = (random() - 0.5) * 0.5, z = padR + 0.35, heading = (random() - 0.5) * 2.6;
        for (let step = 0, steps = 5 + Math.floor(random() * 6); step < steps; step++) {
          const side = step % 2 ? 0.11 : -0.11;
          prints.push({ at: [x + Math.cos(heading) * side, 0.004, z - Math.sin(heading) * side], size: 1 });
          headings.push(heading);
          heading += (random() - 0.5) * 0.5;
          x += Math.sin(heading) * 0.36; z += Math.cos(heading) * 0.36;
        }
      }
      const tread = s.scatter(new THREE.BoxGeometry(0.11, 0.012, 0.27), new THREE.MeshStandardMaterial({ color: '#4d4a46', roughness: 1 }), prints);
      const turn = new THREE.Matrix4(), spot = new THREE.Vector3();
      prints.forEach((print, i) => { turn.makeRotationY(headings[i]).setPosition(spot.set(...print.at)); tread.setMatrixAt(i, turn); });
      tread.castShadow = false;
    }

    return s.finish({
      footprint: padR + 0.3,
      update: (_dt, time) => { if (beacon) beacon.emissiveIntensity = Math.sin(time * mix(1.5, 6, mood.energy)) > 0.6 ? 2.2 : 0.15; },
    });
  },
});
