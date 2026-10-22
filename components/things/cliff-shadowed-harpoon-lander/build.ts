import * as THREE from 'three';
import { choice, defineThing, mix, noul, score } from '@conjure/kit';
import { canvasTexture, displace, grounded, instances, mat, mesh, noise, paint, range, smooth, type Spot, terrainDisc, type V3 } from './lib';

const CELLS = {
  blue: { say: 'Deep blue silicon cells ruled with fine silver lines.', cell: '#1d2f6b', line: '#9aa6b8' },
  black: { say: 'Near-black glossy cells, almost invisible in shadow.', cell: '#14161d', line: '#59606c' },
  violet: { say: 'Violet-blue cells that flash purple where the light catches them.', cell: '#3a2c78', line: '#a69bd0' },
} as const;
const FOILS = {
  gold: { say: 'Crinkled gold foil blanket.', base: '#c99a3c', light: '#f0d283', dark: '#7a5518' },
  silver: { say: 'Silvery crumpled foil.', base: '#b8bcc0', light: '#eef1f4', dark: '#6c7176' },
  black: { say: 'Black thermal blanket, matte and stitched.', base: '#26272a', light: '#4c4e53', dark: '#111214' },
} as const;

function cellTexture(random: () => number, cell: string, line: string) {
  return canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#c9ced3';
    ctx.fillRect(0, 0, w, h);
    const cols = 6, rows = 7, pad = 10, gap = 3;
    const cw = (w - pad * 2 - gap * (cols - 1)) / cols, ch = (h - pad * 2 - gap * (rows - 1)) / rows;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const tone = new THREE.Color(cell).offsetHSL(0, 0, (random() - 0.5) * 0.05);
      ctx.fillStyle = `#${tone.getHexString()}`;
      const x = pad + c * (cw + gap), y = pad + r * (ch + gap);
      ctx.fillRect(x, y, cw, ch);
      ctx.strokeStyle = line;
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = 1;
      for (let k = 1; k < 4; k++) { ctx.beginPath(); ctx.moveTo(x, y + (ch * k) / 4); ctx.lineTo(x + cw, y + (ch * k) / 4); ctx.stroke(); }
      ctx.globalAlpha = 1;
    }
  });
}

function foilTexture(random: () => number, base: string, light: string, dark: string) {
  return canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 260; i++) {
      ctx.fillStyle = random() < 0.5 ? light : dark;
      ctx.globalAlpha = range(random, 0.15, 0.55);
      const x = random() * w, y = random() * h, s = range(random, 6, 30);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + range(random, -s, s), y + range(random, -s, s));
      ctx.lineTo(x + range(random, -s, s), y + range(random, -s, s));
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  });
}

export default defineThing({
  questions: {
    resting: choice('How did it come to rest?', {
      tipped: 'Tipped on its side against the rock, one leg kicking at the sky.',
      wedged: 'Wedged down into a crack, half swallowed, only its roof and two legs showing.',
      sunk: 'Almost upright but sunk in soft dust up to its belly.',
      upturned: 'Flipped nearly onto its back, legs splayed in the air like a dead insect.',
    }),
    against: choice('What is it lying against?', {
      cliff: 'A dark cliff wall with an overhang leaning out over it.',
      boulder: 'A huge pale ice boulder.',
      ledge: 'Under a thin shelf of crust jutting out overhead.',
      open: 'Nothing: alone on open rubble with no shelter.',
    }),
    now: choice('What is it doing now?', {
      waiting: 'Still waiting: a tiny green status light blinking on its roof.',
      silent: 'Silent and dark, its shaded panel furred with frost.',
      woken: 'Woken briefly: one panel catching a thin sliver of sun, the antenna glinting.',
      found: 'Found: a bright red marker beacon set beside it by whoever came looking.',
    }),
    harpoons: choice('What became of its harpoons?', {
      unfired: 'Unfired, still sheathed in their tubes under its belly.',
      dangling: 'One fired: a single tether trailing loose across the ground.',
      both: 'Both fired into nothing, two slack tethers lying in the dust.',
    }),
    cells: choice('What do its solar cells look like?', Object.fromEntries(Object.entries(CELLS).map(([k, v]) => [k, v.say])) as Record<keyof typeof CELLS, string>),
    foil: choice('What is it wrapped in?', Object.fromEntries(Object.entries(FOILS).map(([k, v]) => [k, v.say])) as Record<keyof typeof FOILS, string>),
    shade: score('How far does the shadow of the rock swallow it?', ['Out in the open', 'Half in shadow', 'Almost lost in the dark']),
    mast: noul('Is a thin antenna mast still sticking up from it?'),
  },

  build(a, context) {
    const { mood, random } = context;
    const root = new THREE.Group();
    const n = noise(random);
    const cells = CELLS[a.cells], foil = FOILS[a.foil];
    const tilt = range(random, -1, 1);

    // ================= The lander, built upright, feet on y = 0 =================
    const lander = new THREE.Group();
    const W = 1.0, D = 0.86, H = 0.62, base = 0.62, roof = 0.2;
    const panelMap = cellTexture(random, cells.cell, cells.line);
    const panel = new THREE.MeshStandardMaterial({ map: panelMap, roughness: 0.32, metalness: 0.35 });
    const dusted = new THREE.MeshStandardMaterial({ map: panelMap, color: new THREE.Color('#ffffff').lerp(new THREE.Color('#9e958a'), 0.3 + mood.wear * 0.5), roughness: 0.75, metalness: 0.1 });
    const frosted = new THREE.MeshStandardMaterial({ map: panelMap, color: '#e4ecf0', emissive: '#9fb2bd', emissiveIntensity: 0.15, roughness: 0.6 });
    const foilMat = new THREE.MeshStandardMaterial({ map: foilTexture(random, foil.base, foil.light, foil.dark), roughness: a.foil === 'black' ? 0.85 : 0.35, metalness: a.foil === 'black' ? 0 : 0.65 });
    const frame = mat('#c4c8cc', { metalness: 0.6, roughness: 0.4 });
    const darkMetal = mat('#3b3e43', { metalness: 0.5, roughness: 0.5 });
    // Core body in foil, under its skin of panels.
    mesh(lander, new THREE.BoxGeometry(W - 0.04, H, D - 0.04), foilMat, [0, base + H / 2, 0]);
    mesh(lander, new THREE.BoxGeometry(W + 0.02, 0.04, D + 0.02), frame, [0, base, 0]);
    // Solar panels on four walls; the one facing the rock (-x) is the one that never sees the sun.
    const shadedPanel = a.now === 'silent' ? frosted : dusted;
    const sidePanel = (w: number, at: V3, ry: number, material: THREE.Material) => mesh(lander, new THREE.PlaneGeometry(w, H * 0.9), material, at, 1, [0, ry, 0]);
    sidePanel(W * 0.92, [0, base + H / 2, D / 2 + 0.001], 0, panel);
    sidePanel(W * 0.92, [0, base + H / 2, -D / 2 - 0.001], Math.PI, panel);
    sidePanel(D * 0.92, [W / 2 + 0.001, base + H / 2, 0], Math.PI / 2, panel);
    sidePanel(D * 0.92, [-W / 2 - 0.001, base + H / 2, 0], -Math.PI / 2, shadedPanel);
    // A shallow ridged roof, also cells, the shaded half dusted over.
    const slope = Math.atan2(roof, W / 2);
    const roofLen = Math.hypot(W / 2, roof);
    for (const side of [-1, 1]) {
      const plate = mesh(lander, new THREE.BoxGeometry(roofLen, 0.025, D * 0.98), side < 0 ? shadedPanel : panel, [side * W / 4, base + H + roof / 2, 0], 1, [0, 0, -side * slope]);
      plate.castShadow = true;
    }
    mesh(lander, new THREE.BoxGeometry(0.04, 0.04, D), frame, [0, base + H + roof, 0]);
    // Roof gables in foil.
    const gable = new THREE.Shape([new THREE.Vector2(-W / 2, 0), new THREE.Vector2(W / 2, 0), new THREE.Vector2(0, roof)]);
    for (const z of [D / 2 - 0.01, -D / 2 + 0.01]) mesh(lander, new THREE.ShapeGeometry(gable), foilMat, [0, base + H, z], 1, [0, z > 0 ? 0 : Math.PI, 0]);
    // Balcony on the front: an open bay with the drill tower and instruments.
    mesh(lander, new THREE.BoxGeometry(0.5, 0.03, 0.22), frame, [0.12, base + 0.12, D / 2 + 0.11]);
    mesh(lander, new THREE.BoxGeometry(0.5, 0.03, 0.22), frame, [0.12, base + H - 0.05, D / 2 + 0.11]);
    mesh(lander, new THREE.CylinderGeometry(0.045, 0.045, H + 0.25, 12), frame, [0.28, base + H / 2 - 0.1, D / 2 + 0.12]);
    mesh(lander, new THREE.CylinderGeometry(0.012, 0.012, 0.22, 6), darkMetal, [0.28, base - 0.21, D / 2 + 0.12]);
    mesh(lander, new THREE.BoxGeometry(0.16, 0.14, 0.14), foilMat, [-0.04, base + 0.24, D / 2 + 0.1]);
    mesh(lander, new THREE.CylinderGeometry(0.035, 0.03, 0.06, 12), darkMetal, [-0.04, base + 0.24, D / 2 + 0.19], 1, [Math.PI / 2, 0, 0]);
    // The hammer boom folded along one side.
    mesh(lander, new THREE.BoxGeometry(0.03, 0.03, D * 0.9), frame, [W / 2 + 0.03, base + 0.08, 0]);
    // Cameras peeking from the roof corners.
    for (const [x, z] of [[0.38, 0.32], [-0.38, -0.32], [0.38, -0.32]] as const) mesh(lander, new THREE.BoxGeometry(0.05, 0.05, 0.05), darkMetal, [x, base + H + 0.06, z]);
    // Landing gear: a hub under the belly and three folding legs with twin-pad feet.
    mesh(lander, new THREE.CylinderGeometry(0.12, 0.15, 0.12, 16), frame, [0, base - 0.06, 0]);
    const legAngles = [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3].map((angle) => angle + 0.2);
    const tube = (from: V3, to: V3, radius: number) => {
      const a3 = new THREE.Vector3(...from), b3 = new THREE.Vector3(...to);
      const direction = b3.clone().sub(a3);
      const rod = mesh(lander, new THREE.CylinderGeometry(radius, radius, direction.length(), 8), frame, a3.add(b3).multiplyScalar(0.5).toArray() as V3);
      rod.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
      return rod;
    };
    const feet: THREE.Vector3[] = [];
    for (const angle of legAngles) {
      const c = Math.cos(angle), s = Math.sin(angle);
      const hub: V3 = [c * 0.12, base - 0.1, s * 0.12], knee: V3 = [c * 0.55, base - 0.02, s * 0.55], foot: V3 = [c * 0.82, 0.06, s * 0.82];
      tube(hub, knee, 0.022);
      tube(knee, foot, 0.022);
      tube([c * 0.18, base - 0.04, s * 0.18], [c * 0.62, 0.22, s * 0.62], 0.012);
      // Two pads per foot and an ice screw between them.
      for (const k of [-1, 1]) mesh(lander, new THREE.CylinderGeometry(0.075, 0.075, 0.02, 14), darkMetal, [foot[0] - s * 0.06 * k, 0.02, foot[2] + c * 0.06 * k]);
      mesh(lander, new THREE.ConeGeometry(0.018, 0.1, 6), frame, [foot[0], -0.03, foot[2]], 1, [Math.PI, 0, 0]);
      feet.push(new THREE.Vector3(...foot));
    }
    // Harpoon tubes under the belly.
    const harpoonTips: THREE.Vector3[] = [];
    for (const side of [-1, 1]) {
      const at: V3 = [side * 0.22, base - 0.12, -0.12];
      mesh(lander, new THREE.CylinderGeometry(0.035, 0.035, 0.2, 10), darkMetal, at);
      harpoonTips.push(new THREE.Vector3(at[0], at[1] - 0.1, at[2]));
      const fired = (a.harpoons === 'dangling' && side > 0) || a.harpoons === 'both';
      if (!fired) mesh(lander, new THREE.ConeGeometry(0.03, 0.08, 8), frame, [at[0], at[1] - 0.13, at[2]], 1, [Math.PI, 0, 0]);
    }
    // Antenna mast and the status light.
    if (a.mast) {
      mesh(lander, new THREE.CylinderGeometry(0.008, 0.01, 0.75, 6), frame, [-0.3, base + H + roof + 0.3, 0.25], 1, [0.15, 0, 0.25]);
      mesh(lander, new THREE.SphereGeometry(0.025, 8, 6), a.now === 'woken' ? mat('#fff6dc', { emissive: '#fff0c8', emissiveIntensity: 2 }) : frame, [-0.39, base + H + roof + 0.66, 0.3]);
    }
    const beacon = new THREE.MeshStandardMaterial({ color: '#7dff9a', emissive: '#3cff6a', emissiveIntensity: a.now === 'waiting' ? 2.2 : 0 });
    if (a.now === 'waiting') mesh(lander, new THREE.SphereGeometry(0.03, 10, 8), beacon, [0.18, base + H + roof * 0.7, D / 2 - 0.08]);
    if (a.now === 'woken') {
      // A sliver of sun across the far panel: a bright stripe on the cells.
      mesh(lander, new THREE.PlaneGeometry(W * 0.92, 0.07), new THREE.MeshStandardMaterial({ color: '#fff3d0', emissive: '#ffe7a8', emissiveIntensity: 1.6, transparent: true, opacity: 0.85, depthWrite: false }), [0, base + H * 0.78, D / 2 + 0.004], 1, [0, 0, 0.12], false);
    }

    // ================= Pose it =================
    const pose = new THREE.Group();
    pose.add(lander);
    root.add(pose);
    const angle = { tipped: 0.98, wedged: 0.42, sunk: 0.14, upturned: 2.55 }[a.resting] + range(random, -0.08, 0.08);
    pose.rotation.set(range(random, -0.12, 0.12), 0, angle);
    lander.rotation.y = range(random, -0.25, 0.25);
    pose.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(pose);
    const sink = { tipped: 0.04, wedged: 0.55, sunk: 0.42, upturned: 0.06 }[a.resting];
    pose.position.y = -box.min.y - sink;
    pose.updateMatrixWorld(true);
    box.setFromObject(pose);
    const wallX = box.min.x;

    // ================= The rubble it lies on =================
    const R = 1.9;
    const crack = a.resting === 'wedged';
    const heightAt = (x: number, z: number, t: number) => {
      let h = 0.06 + n(x, 0, z, 0.9) * 0.05 + n(z, x, 0, 3) * 0.015;
      if (a.resting === 'sunk') h += 0.22 * Math.exp(-((Math.hypot(x, z) - 0.95) ** 2) / 0.12) * (1 - smooth(0.5, 1, t));
      if (crack) h -= 0.06 * Math.exp(-(z * z) / 0.08);
      return h * (1 - smooth(0.8, 1, t)) - smooth(0.92, 1, t) * 0.03;
    };
    const ground = terrainDisc(22, 64, (angle) => R * (1 + n(Math.cos(angle), 0, Math.sin(angle), 0.8) * 0.15), heightAt);
    const regolith = new THREE.Color('#34302c').lerp(new THREE.Color('#4b443d'), mood.wear);
    paint(ground, (p, c) => {
      c.copy(regolith).lerp(new THREE.Color('#5c554c'), Math.max(0, n(p.x, p.z, 0, 1.5)) * 0.5);
      if (crack) c.lerp(new THREE.Color('#0c0b0a'), Math.exp(-(p.z * p.z) / 0.04) * 0.9);
      if (a.resting === 'sunk') c.lerp(new THREE.Color('#6d655a'), Math.exp(-((Math.hypot(p.x, p.z) - 0.95) ** 2) / 0.1) * 0.6);
    });
    const floor = mesh(root, ground, mat('#ffffff', { vertexColors: true, roughness: 1, flatShading: true }));
    const pebbles: Spot[] = Array.from({ length: 90 }, () => {
      const r = Math.sqrt(random()) * R * 0.85, t = random() * Math.PI * 2, s = range(random, 0.025, 0.12) * (random() < 0.08 ? 2.5 : 1);
      return { at: [Math.cos(t) * r, heightAt(Math.cos(t) * r, Math.sin(t) * r, r / R) + s * 0.3, Math.sin(t) * r], scale: s, rot: [random() * 3, random() * 3, random() * 3] };
    });
    instances(root, new THREE.DodecahedronGeometry(1, 0), mat('#4f4943', { flatShading: true }), pebbles);

    // ================= What it leans against =================
    const rockColour = (p: THREE.Vector3, c: THREE.Color) => {
      const band = Math.sin(p.y * 6 + n(p.x, p.y, p.z, 0.7) * 1.4);
      c.set('#2b2724').lerp(new THREE.Color('#4f463e'), smooth(0.2, 0.8, band) * 0.7).lerp(new THREE.Color('#9a9792'), smooth(0.88, 1, band) * 0.6);
      c.lerp(new THREE.Color('#5f574e'), smooth(0.6, 1, p.y / 3) * 0.3);
    };
    const rockMat = mat('#ffffff', { vertexColors: true, roughness: 0.95, flatShading: true });
    /** A lumpy rock mass: a displaced ellipsoid. */
    const rock = (size: [number, number, number], at: V3, roughness: number, rotation: V3 = [0, 0, 0]) => {
      const g = new THREE.SphereGeometry(1, 36, 26);
      g.scale(size[0], size[1], size[2]);
      displace(g, (p) => n(p.x, p.y, p.z, 0.9) * roughness + n(p.y, p.z, p.x, 3) * roughness * 0.3 + Math.abs(n(p.z, p.x, p.y, 1.8)) * roughness * 0.4);
      g.translate(at[0], at[1], at[2]);
      paint(g, rockColour);
      g.translate(-at[0], -at[1], -at[2]);
      return mesh(root, g, rockMat, at, 1, rotation);
    };
    const reach = mix(0.15, 0.75, a.shade);
    if (a.against === 'cliff' || a.against === 'ledge') {
      const tall = a.against === 'cliff' ? range(random, 2.2, 2.7) : range(random, 1.3, 1.6);
      // The wall: a heavy mass behind and to the left, its face leaning toward the machine.
      rock([0.75, tall * 0.62, 1.5], [wallX - 0.62, tall * 0.42, -0.35], 0.22, [0, 0, -0.08]);
      // The overhang: a second mass stacked high and pushed out over the machine, kept to the back so it can still be seen.
      const lipY = Math.max(box.max.y + (a.against === 'cliff' ? 0.45 : 0.22), tall * 0.8);
      const lipW = 0.6 + reach;
      rock([lipW, a.against === 'cliff' ? 0.36 : 0.16, 1.0], [wallX - 0.35 + lipW * 0.55, lipY, -0.75], 0.12, [0, 0.15, -0.12]);
      if (a.against === 'cliff') rock([0.5, tall * 0.35, 0.8], [wallX - 0.75, tall * 0.95, -1.0], 0.15);
    } else if (a.against === 'boulder') {
      const size = range(random, 1.05, 1.3);
      const g = displace(new THREE.IcosahedronGeometry(size, 4), (p) => n(p.x, p.y, p.z, 1.1) * size * 0.2 + Math.abs(n(p.y, p.x, p.z, 2.5)) * size * 0.06);
      paint(g, (p, c) => {
        c.set('#c7cfd2').lerp(new THREE.Color('#5d5852'), smooth(0.1, -0.7, p.y / size) * 0.85).lerp(new THREE.Color('#4a443e'), smooth(0.05, 0.5, n(p.x, p.z, p.y, 1.6)) * 0.75);
      });
      mesh(root, g, mat('#ffffff', { vertexColors: true, roughness: 0.7, flatShading: true }), [wallX - size * 0.85, size * 0.55, -0.3], [1.05, 0.8, 1.15], [0.3, random() * 3, 0.2]);
    }

    // ================= Tethers and the beacon =================
    const tetherMat = mat('#d8d4c6', { roughness: 0.8 });
    const fired = a.harpoons === 'both' ? [0, 1] : a.harpoons === 'dangling' ? [1] : [];
    for (const index of fired) {
      const tip = harpoonTips[index].clone().applyMatrix4(pose.matrixWorld);
      const dir = index === 0 ? -1 : 1;
      const end = new THREE.Vector3(tip.x + dir * range(random, 0.6, 1.2) + 0.8, 0.07, tip.z + range(random, 0.5, 1.2));
      const mid1 = tip.clone().lerp(end, 0.33).setY(Math.max(0.08, tip.y * 0.4));
      const mid2 = tip.clone().lerp(end, 0.66).setY(0.08);
      mid2.z += range(random, -0.3, 0.3);
      const path = new THREE.CatmullRomCurve3([tip, mid1, mid2, end]);
      mesh(root, new THREE.TubeGeometry(path, 40, 0.008, 5), tetherMat);
      mesh(root, new THREE.ConeGeometry(0.03, 0.1, 8), frame, end.toArray() as V3, 1, [Math.PI / 2, 0, -dir]);
    }
    const blinkers: THREE.MeshStandardMaterial[] = [];
    if (a.now === 'waiting') blinkers.push(beacon);
    if (a.now === 'found') {
      const flag = mat('#e5332a', { emissive: '#ff3b2a', emissiveIntensity: 0.9 });
      const x = box.max.x + 0.6, z = 0.9;
      mesh(root, new THREE.CylinderGeometry(0.012, 0.012, 0.9, 6), frame, [x, 0.45, z]);
      mesh(root, new THREE.BoxGeometry(0.06, 0.08, 0.06), flag, [x, 0.92, z]);
      mesh(root, new THREE.CylinderGeometry(0.12, 0.16, 0.06, 10), darkMetal, [x, 0.06, z]);
      blinkers.push(flag);
    }

    // The tipped machine is solid; measure the scene but stand on the patch.
    lander.traverse((node) => { const m = node as THREE.Mesh; if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
    const pace = mix(0.4, 2.5, mood.energy);
    const update = (_dt: number, time: number) => {
      for (const blink of blinkers) blink.emissiveIntensity = Math.sin(time * pace * 2) > 0.6 ? 2.4 : 0.15;
    };
    void tilt;
    return grounded(root, { measure: floor, update, footprint: 1.9 });
  },
});
