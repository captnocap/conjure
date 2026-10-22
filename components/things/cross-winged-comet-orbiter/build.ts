import * as THREE from 'three';
import { choice, defineThing, mix, noul } from '@conjure/kit';
import { canvasTexture, grounded, mat, mesh, range, type V3 } from './lib';

const CELLS = {
  blue: { say: 'Deep blue cells ruled with silver.', cell: '#1c2f6e', line: '#9eabbf' },
  black: { say: 'Near-black glossy cells.', cell: '#121520', line: '#4f5866' },
  violet: { say: 'Violet-blue cells flashing purple at the edges.', cell: '#3b2d80', line: '#a99fd6' },
} as const;
const FOILS = {
  gold: { say: 'Crinkled gold foil.', base: '#c99a3c', light: '#f0d283', dark: '#7a5518' },
  silver: { say: 'Silvery crumpled foil.', base: '#b8bcc0', light: '#eef1f4', dark: '#6c7176' },
  black: { say: 'Black thermal blanket.', base: '#26272a', light: '#4c4e53', dark: '#111214' },
} as const;

function cellTexture(random: () => number, cell: string, line: string) {
  return canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#b9bfc6';
    ctx.fillRect(0, 0, w, h);
    const cols = 8, rows = 10, pad = 6, gap = 2;
    const cw = (w - pad * 2 - gap * (cols - 1)) / cols, ch = (h - pad * 2 - gap * (rows - 1)) / rows;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const tone = new THREE.Color(cell).offsetHSL(0, 0, (random() - 0.5) * 0.05);
      ctx.fillStyle = `#${tone.getHexString()}`;
      ctx.fillRect(pad + c * (cw + gap), pad + r * (ch + gap), cw, ch);
    }
    ctx.strokeStyle = line;
    ctx.globalAlpha = 0.4;
    for (let x = pad; x < w; x += 6) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    ctx.globalAlpha = 1;
  });
}

function foilTexture(random: () => number, base: string, light: string, dark: string) {
  return canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 240; i++) {
      ctx.fillStyle = random() < 0.5 ? light : dark;
      ctx.globalAlpha = 0.15 + random() * 0.4;
      const x = random() * w, y = random() * h, s = 6 + random() * 24;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (random() - 0.5) * 2 * s, y + (random() - 0.5) * 2 * s);
      ctx.lineTo(x + (random() - 0.5) * 2 * s, y + (random() - 0.5) * 2 * s);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  });
}

export default defineThing({
  questions: {
    wings: choice('How are its solar wings spread?', {
      pair: 'Two very long wings in one straight line, the classic silhouette.',
      cross: 'Four wings in a cross, like a kite or a crucifix.',
      jammed: 'One wing fully out, the other jammed half-folded.',
      canted: 'Two wings canted at different angles, twisted to chase the sun.',
    }),
    doing: choice('What is it doing now?', {
      watching: 'Watching: its instruments turned down toward the comet.',
      homeward: 'Turned for home: its dish raised toward a distant Earth.',
      hibernating: 'Hibernating: wings feathered edge-on, every light dark.',
      ending: 'Its last descent: tilted nose-down toward the surface, the mission ending.',
    }),
    glint: choice('Where does the sun catch it?', {
      dish: 'One sharp star of light off the dish.',
      wing: 'A bright flare across one wing.',
      body: 'A spark off the foil of the body.',
      none: 'Nowhere: it hangs in shadow, a dark cross on the sky.',
    }),
    cells: choice('What do the solar cells look like?', Object.fromEntries(Object.entries(CELLS).map(([k, v]) => [k, v.say])) as Record<keyof typeof CELLS, string>),
    foil: choice('What is the body wrapped in?', Object.fromEntries(Object.entries(FOILS).map(([k, v]) => [k, v.say])) as Record<keyof typeof FOILS, string>),
    model: noul('Is it a desk model on a thin chrome stand rather than the real thing?'),
  },

  build(a, context) {
    const { mood, random } = context;
    const root = new THREE.Group();
    const craft = new THREE.Group();
    const cells = CELLS[a.cells], foil = FOILS[a.foil];
    const foilMat = new THREE.MeshStandardMaterial({ map: foilTexture(random, foil.base, foil.light, foil.dark), roughness: a.foil === 'black' ? 0.85 : 0.35, metalness: a.foil === 'black' ? 0 : 0.65 });
    const cellMap = cellTexture(random, cells.cell, cells.line);
    const panelMat = new THREE.MeshStandardMaterial({ map: cellMap, roughness: 0.3, metalness: 0.4 });
    const backMat = mat('#d9dcdf', { roughness: 0.6 });
    const frame = mat('#c9ccd0', { metalness: 0.6, roughness: 0.35 });
    const white = mat('#eceeef', { roughness: 0.5 });
    const dark = mat('#2a2c30', { metalness: 0.4, roughness: 0.5 });

    // ---- Bus: a foil box with radiators, an instrument deck and thrusters ----
    const B: V3 = [2.8, 2.1, 2.0];
    mesh(craft, new THREE.BoxGeometry(...B), foilMat);
    mesh(craft, new THREE.BoxGeometry(B[0] * 0.9, 0.04, B[2] * 0.9), white, [0, B[1] / 2 + 0.02, 0]);
    for (let i = 0; i < 6; i++) mesh(craft, new THREE.BoxGeometry(0.02, B[1] * 0.7, 0.08), white, [-B[0] * 0.35 + i * 0.22, 0, -B[2] / 2 - 0.04]);
    // Instrument deck facing down (toward the comet), with camera barrels.
    mesh(craft, new THREE.BoxGeometry(B[0] * 0.8, 0.12, B[2] * 0.7), dark, [0, -B[1] / 2 - 0.06, 0]);
    for (const [x, z, r, l] of [[-0.7, 0.2, 0.18, 0.5], [0.3, -0.25, 0.12, 0.4], [0.75, 0.3, 0.1, 0.3]] as const) {
      mesh(craft, new THREE.CylinderGeometry(r, r, l, 16), dark, [x, -B[1] / 2 - 0.12 - l / 2, z]);
      mesh(craft, new THREE.CircleGeometry(r * 0.8, 16), mat('#0e1626', { metalness: 0.9, roughness: 0.1 }), [x, -B[1] / 2 - 0.13 - l, z], 1, [Math.PI / 2, 0, 0]);
    }
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) mesh(craft, new THREE.ConeGeometry(0.06, 0.16, 8), frame, [sx * B[0] * 0.45, B[1] / 2 + 0.08, sz * B[2] * 0.42]);

    // ---- Wings: a yoke and a row of panels, able to turn about their long axis ----
    const wingGroups: THREE.Group[] = [];
    const panelW = 2.25, panelH = 2.7, panels = 5;
    const wing = (direction: THREE.Vector3, folded: boolean, twist: number) => {
      const holder = new THREE.Group();
      const start = direction.clone().multiply(new THREE.Vector3(B[0] / 2, B[1] / 2, B[2] / 2));
      holder.position.copy(start);
      holder.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), direction);
      craft.add(holder);
      const turn = new THREE.Group();
      turn.rotation.x = twist;
      holder.add(turn);
      const yoke = 1.0;
      mesh(turn, new THREE.CylinderGeometry(0.05, 0.05, yoke, 8), frame, [yoke / 2, 0, 0], 1, [0, 0, Math.PI / 2]);
      for (let i = 0; i < panels; i++) {
        const centre = yoke + panelW / 2 + i * (panelW + 0.06);
        const leaf = new THREE.Group();
        // A jammed wing: the outer panels hang folded back like a broken fan.
        if (folded && i >= 2) {
          leaf.position.set(yoke + 2 * (panelW + 0.06), 0, 0);
          leaf.rotation.y = (i % 2 ? -1 : 1) * range(random, 1.9, 2.6) * (i === 2 ? 0.55 : 1);
          leaf.rotation.x = range(random, -0.3, 0.3);
          const local = centre - (yoke + 2 * (panelW + 0.06));
          mesh(leaf, new THREE.BoxGeometry(panelW, 0.04, panelH), backMat, [local, -0.025, 0]);
          mesh(leaf, new THREE.PlaneGeometry(panelW * 0.97, panelH * 0.97), panelMat, [local, 0.001, 0], 1, [-Math.PI / 2, 0, 0]);
          turn.add(leaf);
        } else {
          mesh(turn, new THREE.BoxGeometry(panelW, 0.04, panelH), backMat, [centre, -0.025, 0]);
          mesh(turn, new THREE.PlaneGeometry(panelW * 0.97, panelH * 0.97), panelMat, [centre, 0.001, 0], 1, [-Math.PI / 2, 0, 0]);
        }
      }
      wingGroups.push(turn);
      return turn;
    };
    const feather = a.doing === 'hibernating' ? Math.PI / 2 - 0.08 : 0;
    const sunTwist = feather + range(random, -0.25, 0.25);
    if (a.wings === 'cross') {
      // Four shorter wings in a cross: left, right, up the back and down the front.
      wing(new THREE.Vector3(1, 0, 0), false, sunTwist);
      wing(new THREE.Vector3(-1, 0, 0), false, sunTwist);
      wing(new THREE.Vector3(0, 0, 1), false, sunTwist + 0.2);
      wing(new THREE.Vector3(0, 0, -1), false, sunTwist - 0.2);
    } else {
      wing(new THREE.Vector3(1, 0, 0), false, a.wings === 'canted' ? sunTwist + 0.55 : sunTwist);
      wing(new THREE.Vector3(-1, 0, 0), a.wings === 'jammed', a.wings === 'canted' ? sunTwist - 0.4 : sunTwist);
    }

    // ---- The thin dish on its boom ----
    const dishR = 1.1;
    const onTop = a.wings === 'cross';
    const dishPoint: V3 = onTop ? [0.5, B[1] / 2 + 0.5, 0] : [0.3, 0.2, B[2] / 2 + 0.5];
    const dish = new THREE.Group();
    dish.position.set(...dishPoint);
    const raise = a.doing === 'homeward' ? -1.1 : a.doing === 'watching' ? 0.5 : -0.2;
    dish.rotation.set(raise + (onTop ? -Math.PI / 2 + 1.1 : 0), range(random, -0.4, 0.4), 0);
    craft.add(dish);
    const profile = Array.from({ length: 12 }, (_, i) => { const r = (i / 11) * dishR; return new THREE.Vector2(r, (r * r) / (4 * 0.55)); });
    const bowl = new THREE.Mesh(new THREE.LatheGeometry(profile, 40), new THREE.MeshStandardMaterial({ color: '#f1f2f0', roughness: 0.4, metalness: 0.2, side: THREE.DoubleSide }));
    bowl.rotation.x = Math.PI / 2;
    bowl.castShadow = bowl.receiveShadow = true;
    dish.add(bowl);
    for (let i = 0; i < 3; i++) {
      const angle = (i / 3) * Math.PI * 2;
      const from = new THREE.Vector3(Math.cos(angle) * dishR * 0.95, Math.sin(angle) * dishR * 0.95, 0.55);
      const to = new THREE.Vector3(0, 0, 1.0);
      const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, from.distanceTo(to), 5), frame);
      strut.position.copy(from).add(to).multiplyScalar(0.5);
      strut.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize());
      dish.add(strut);
    }
    const feed = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.06, 0.12, 12), frame);
    feed.position.z = 1.0;
    feed.rotation.x = Math.PI / 2;
    dish.add(feed);
    if (onTop) mesh(craft, new THREE.CylinderGeometry(0.06, 0.06, 0.6, 8), frame, [0.5, B[1] / 2 + 0.2, 0]);
    else mesh(craft, new THREE.CylinderGeometry(0.06, 0.06, 0.6, 8), frame, [0.3, 0.2, B[2] / 2 + 0.2], 1, [Math.PI / 2, 0, 0]);
    // A whip antenna and a star tracker on the top deck.
    mesh(craft, new THREE.CylinderGeometry(0.012, 0.012, 1.4, 5), frame, [-1.0, B[1] / 2 + 0.7, -0.6]);
    mesh(craft, new THREE.BoxGeometry(0.25, 0.25, 0.3), dark, [0.9, B[1] / 2 + 0.15, -0.5]);

    // ---- Lights and the glint ----
    const sparks: { mesh: THREE.Object3D; base: number; phase: number }[] = [];
    const glintMat = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#fff6dc', emissiveIntensity: 3, transparent: true, opacity: 0.95, depthWrite: false, side: THREE.DoubleSide });
    const star = (at: THREE.Vector3, size: number, parent: THREE.Object3D) => {
      const g = new THREE.Group();
      g.position.copy(at);
      for (const [rz, k] of [[0, 1], [Math.PI / 2, 1], [Math.PI / 4, 0.45], [-Math.PI / 4, 0.45]] as const) {
        const ray = new THREE.Mesh(new THREE.PlaneGeometry(size * 0.08 * k, size * 2 * k), glintMat);
        ray.rotation.z = rz;
        g.add(ray);
      }
      const core = new THREE.Mesh(new THREE.SphereGeometry(size * 0.12, 10, 8), new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#fffaf0', emissiveIntensity: 3 }));
      g.add(core);
      parent.add(g);
      sparks.push({ mesh: g, base: 1, phase: random() * 6 });
    };
    if (a.glint === 'dish') star(new THREE.Vector3(dishR * 0.4, dishR * 0.35, 0.3), 2.2, dish);
    if (a.glint === 'body') star(new THREE.Vector3(B[0] / 2 + 0.05, B[1] * 0.3, B[2] / 2 + 0.05), 1.8, craft);
    if (a.glint === 'wing') {
      const turn = wingGroups[0];
      star(new THREE.Vector3(1 + panelW * 2.5, 0.1, 0), 3.2, turn);
      const flare = new THREE.Mesh(new THREE.PlaneGeometry(panelW * 2.2, panelH * 0.95), new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#fff1d0', emissiveIntensity: 0.9, transparent: true, opacity: 0.45, depthWrite: false }));
      flare.rotation.x = -Math.PI / 2;
      flare.position.set(1 + panelW * 2.6, 0.01, 0);
      turn.add(flare);
    }
    const blink = new THREE.MeshStandardMaterial({ color: '#ff8a7a', emissive: '#ff3b2a', emissiveIntensity: a.doing === 'hibernating' ? 0 : 1.8 });
    if (a.doing !== 'hibernating') mesh(craft, new THREE.SphereGeometry(0.06, 8, 6), blink, [-1.3, B[1] / 2 + 0.06, 0.9], 1, [0, 0, 0], false);

    // ---- Attitude ----
    craft.rotation.set(range(random, -0.12, 0.12), range(random, -0.5, 0.5), range(random, -0.1, 0.1));
    if (a.doing === 'ending') craft.rotation.set(0.5, range(random, -0.4, 0.4), range(random, 0.25, 0.4) * (random() < 0.5 ? -1 : 1));
    craft.traverse((node) => { const m = node as THREE.Mesh; if (m.isMesh && !(m.material as THREE.Material).transparent) m.castShadow = m.receiveShadow = true; });
    root.add(craft);

    // ---- On a desk: shrunk to a model on a thin chrome stand and a round base ----
    if (a.model) craft.scale.setScalar(0.016);
    craft.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(craft);
    if (a.model) {
      craft.position.y = -bounds.min.y + 0.22;
      const chrome = mat('#dfe3e6', { metalness: 0.9, roughness: 0.15 });
      const top = craft.position.y - B[1] * 0.016 * 0.5;
      mesh(root, new THREE.CylinderGeometry(0.003, 0.003, top, 10), chrome, [0, top / 2, 0]);
      mesh(root, new THREE.CylinderGeometry(0.07, 0.078, 0.016, 40), mat('#1f2124', { roughness: 0.3, metalness: 0.3 }), [0, 0.008, 0]);
      mesh(root, new THREE.BoxGeometry(0.06, 0.002, 0.018), mat('#c9a24c', { metalness: 0.8, roughness: 0.3 }), [0, 0.017, 0.05]);
    } else craft.position.y = -bounds.min.y;
    const restY = craft.position.y;

    // ---- Motion: wings track the sun, the glint pulses, the craft drifts ----
    const pace = mix(0.05, 0.6, mood.energy);
    const twists = wingGroups.map((g) => g.rotation.x);
    const update = (_dt: number, time: number) => {
      wingGroups.forEach((g, i) => { g.rotation.x = twists[i] + Math.sin(time * pace * 0.4) * 0.08; });
      for (const s of sparks) { const k = 0.75 + 0.35 * Math.sin(time * pace * 4 + s.phase) ** 2; s.mesh.scale.setScalar(k); }
      craft.position.y = restY + (1 + Math.sin(time * pace)) * (a.model ? 0 : 0.15);
      if (a.doing !== 'hibernating') blink.emissiveIntensity = Math.sin(time * 2.2) > 0.7 ? 2.4 : 0.1;
    };
    return grounded(root, { update });
  },
});
