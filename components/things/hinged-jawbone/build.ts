import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';
import { fuse, painted, placed, spring, strut, sweep } from './form';
import { HUMAN_LOWER, HUMAN_UPPER, UNIT, archAt, boneTexture, humanRamus, mandible, toothRow, type Arch, type Tooth } from './bones';

const grown = (row: readonly Tooth[], by: number): Tooth[] => row.map((tooth) => ({ ...tooth, w: tooth.w * by, h: tooth.h * by }));
const DONKEY: Tooth[] = [
  { kind: 'incisor', w: 0.062, h: 0.13 }, { kind: 'incisor', w: 0.062, h: 0.13 }, { kind: 'incisor', w: 0.062, h: 0.12 },
  { kind: 'gap', w: 0.78, h: 0 },
  ...Array.from({ length: 6 }, (): Tooth => ({ kind: 'molar', w: 0.17, h: 0.12 })),
];
const WHO = {
  human: { arch: { a: 0.42, flare: 0.1, L: 0.9 }, taper: 0.9, chinH: 0.28, thickness: 0.13, joint: -0.53, chin: 1, fang: 1, size: 1, widen: 1, lower: [...HUMAN_LOWER], upper: [...HUMAN_UPPER], front: 3 },
  ape: { arch: { a: 0.45, flare: 0.1, L: 1.3 }, taper: 1.05, chinH: 0.36, thickness: 0.17, joint: -0.48, chin: 0, fang: 1.9, size: 1.12, widen: 1.3, lower: grown(HUMAN_LOWER, 1.28), upper: grown(HUMAN_UPPER, 1.28), front: 3 },
  donkey: { arch: { a: 0.2, flare: 0.25, L: 2.3 }, taper: 2, chinH: 0.2, thickness: 0.12, joint: -0.18, chin: 0, fang: 1, size: 1.45, widen: 1.7, lower: DONKEY, upper: DONKEY, front: 3 },
} as const;

export default defineThing({
  questions: {
    whose: choice('Whose jaw is it?', {
      human: 'A human jaw: a rounded horseshoe with a chin.',
      ape: 'An ape\'s: longer and heavier, chinless, with big canines.',
      donkey: 'A donkey\'s, like Samson\'s weapon: long and narrow, a toothless gap, then a row of grinding teeth and a tall blade at the back.',
    }),
    teeth: choice('Which teeth are still in it?', {
      full: 'Every tooth, a complete row.',
      front: 'Only the front teeth; the back sockets are empty.',
      molar: 'A single back tooth, alone in the ridge.',
      none: 'None: a smooth toothless ridge.',
    }),
    state: choice('What state is the bone in?', {
      bleached: 'Bleached chalk white, clean and dry.',
      yellowed: 'Yellowed and greasy with handling and age.',
      dig: 'An earth-stained dig find, brown, with soil still clinging and crumbs around it.',
      fleshed: 'Still fleshed and rotting: dark red gums, scraps of meat and sinew, flies.',
    }),
    action: choice('What is it doing?', {
      resting: 'Lying loose on the surface.',
      stand: 'Propped up on a brass wire stand with a turned wooden foot, a museum mount.',
      snapping: 'Hinged and sprung to a partial upper jaw, snapping open and shut.',
      biting: 'Hinged to a partial upper jaw and clamped down on something.',
    }),
    bitten: choice('If it is biting something, what?', {
      apple: 'A red apple, the teeth sunk into it.',
      pencil: 'A yellow pencil held crosswise.',
      coin: 'A gold coin, tested between the front teeth.',
      bone: 'A long bone, carried like a dog would.',
    }),
    label: choice('How is it labelled?', {
      none: 'Not at all.',
      number: 'A catalogue number inked on a white painted patch on the bone.',
      tag: 'A manila museum tag tied on with string.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const W = WHO[a.whose];
    const jitter = (amount: number) => (random() - 0.5) * 2 * amount;
    const arch: Arch = W.arch;
    const top = -1.24, bottom = top - W.chinH, backBottom = top - W.chinH * W.taper;
    const [rx] = archAt(arch, Math.PI / 2);

    const tone = { bleached: ['#f1eee4', '#c9c0aa'], yellowed: ['#dcc78c', '#8c6631'], dig: ['#9c7b52', '#3d2a19'], fleshed: ['#d2bc97', '#6d2c24'] }[a.state];
    const blotch = { bleached: 0.35, yellowed: 0.7, dig: 1.1, fleshed: 0.9 }[a.state] * mix(0.7, 1.2, mood.wear);
    const bone = new THREE.MeshStandardMaterial({ map: boneTexture(random, tone[0], tone[1], blotch), roughness: a.state === 'yellowed' ? 0.5 : 0.85 });
    const ivory = new THREE.MeshStandardMaterial({ color: a.state === 'dig' ? '#c5b086' : a.state === 'bleached' ? '#fbf9f0' : '#eee2bf', roughness: 0.42 });
    const brass = new THREE.MeshStandardMaterial({ color: '#c79d45', metalness: 0.85, roughness: 0.3 });
    const steel = new THREE.MeshStandardMaterial({ color: '#b6bdc2', metalness: 0.9, roughness: 0.3 });

    const G = new THREE.Group();
    const add = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };

    // Which teeth survive.
    const cheekStart = a.whose === 'donkey' ? 4 : 5;
    const lone = { side: random() < 0.5 ? -1 : 1, index: cheekStart + Math.floor(random() * 2) };
    const keep = (side: number, index: number) =>
      a.teeth === 'full' ? true : a.teeth === 'none' ? false : a.teeth === 'front' ? index < W.front : side === lone.side && index === lone.index;

    const jaw = new THREE.Group();
    G.add(jaw);
    const ramus = humanRamus(top, backBottom, W.joint).map(([z, y]) => [(z - 0.1) * W.widen + 0.1, y] as const);
    add(jaw, mandible({ arch, top, bottom, taper: W.taper, thickness: W.thickness, ramus, chin: W.chin }, bone).geometry, bone);
    const lower = toothRow(arch, W.lower, top - 0.005, 1, random, keep, W.fang * (W.fang > 1 ? 0.8 : 1)).map((tooth) => tooth.geometry);
    if (lower.length) add(jaw, fuse(lower, ivory).geometry, ivory);
    const sideNormal = (theta: number) => {
      const [x, z] = archAt(arch, theta), [x2, z2] = archAt(arch, theta + 0.01);
      const tx = x2 - x, tz = z2 - z, length = Math.hypot(tx, tz);
      let nx = tz / length, nz = -tx / length;
      if (nx * x + nz * (z - arch.L * 0.3) < 0) { nx = -nx; nz = -nz; }
      return { x, z, nx, nz };
    };

    if (a.state === 'fleshed') {
      const flesh = new THREE.MeshStandardMaterial({ color: new THREE.Color('#8a2b27').lerp(new THREE.Color('#4a2a22'), mood.wear * 0.6), roughness: 0.32 });
      const rot = new THREE.MeshStandardMaterial({ color: '#6f7048', roughness: 0.5 });
      const gumLine: THREE.Vector3[] = [];
      for (let k = -1.32; k <= 1.321; k += 0.11) { const [x, z] = archAt(arch, k); gumLine.push(new THREE.Vector3(x, top - 0.03, z)); }
      const parts: THREE.BufferGeometry[] = [sweep(gumLine, (k) => [W.thickness * 0.62, 0.06 + 0.025 * Math.sin(k * 40)], { steps: 60, sides: 8 })];
      const sour: THREE.BufferGeometry[] = [];
      for (let i = 0; i < 9; i++) {
        const side = i % 2 ? 1 : -1;
        const onRamus = i < 5;
        const at: [number, number, number] = onRamus
          ? [side * (rx + 0.03), mix(backBottom + 0.1, W.joint - 0.15, random()), 0.1 + jitter(0.2) * W.widen]
          : (() => { const n = sideNormal(side * (0.3 + random() * 0.9)); return [n.x + n.nx * W.thickness * 0.4, mix(bottom, top, random()), n.z + n.nz * W.thickness * 0.4] as [number, number, number]; })();
        (i % 4 === 3 ? sour : parts).push(placed(new THREE.SphereGeometry(1, 10, 8), at, onRamus ? [0.035 + random() * 0.02, 0.09 + random() * 0.1, 0.08 + random() * 0.08] : [0.05 + random() * 0.03, 0.07 + random() * 0.05, 0.05 + random() * 0.03]));
      }
      for (let i = 0; i < 4; i++) {
        const side = i % 2 ? 1 : -1;
        const from = new THREE.Vector3(side * (rx + 0.02), W.joint - 0.05 - random() * 0.3, -0.05 + jitter(0.1));
        const mid = from.clone().add(new THREE.Vector3(side * 0.12 + jitter(0.05), -0.3, -0.12 + jitter(0.1)));
        const end = mid.clone().add(new THREE.Vector3(side * 0.1 + jitter(0.1), -0.25 - random() * 0.3, -0.1 + jitter(0.15)));
        parts.push(sweep([from, mid, end], (k) => [0.03 * (1 - k * 0.6), 0.03 * (1 - k * 0.6)], { steps: 12, sides: 5, up: new THREE.Vector3(1, 0, 0.3) }));
      }
      add(jaw, fuse(parts, flesh).geometry, flesh);
      if (sour.length) add(jaw, fuse(sour, rot).geometry, rot);
    }
    if (a.state === 'dig') {
      const soil = new THREE.MeshStandardMaterial({ color: '#4a3524', roughness: 1 });
      const clods: THREE.BufferGeometry[] = [];
      for (let i = 0; i < 9; i++) {
        const n = sideNormal(jitter(1.3));
        clods.push(placed(new THREE.IcosahedronGeometry(1, 1), [n.x + n.nx * W.thickness * 0.3 * jitter(1), mix(bottom, top + 0.03, random()), n.z + n.nz * W.thickness * 0.3], [0.06 + random() * 0.07, 0.05 + random() * 0.05, 0.06 + random() * 0.07]));
      }
      add(jaw, fuse(clods, soil).geometry, soil);
    }
    if (a.label === 'number') {
      const text = `${['A', 'M', 'Z', 'K'][Math.floor(random() * 4)]}.${1880 + Math.floor(random() * 90)}.${1 + Math.floor(random() * 60)}`;
      const map = painted(256, 80, (ctx, w, h) => {
        ctx.fillStyle = '#f6f2e6'; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#16151a'; ctx.font = 'bold 46px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(text, w / 2, h / 2 + 2, w - 14);
      });
      const patch = new THREE.MeshStandardMaterial({ map, roughness: 0.6 });
      for (const side of [-1, 1]) {
        const n = sideNormal(side * (a.whose === 'donkey' ? 0.75 : 0.6));
        const plate = add(jaw, new THREE.PlaneGeometry(0.34, 0.105), patch);
        plate.position.set(n.x + n.nx * (W.thickness * 0.5 + 0.004), (top + bottom) / 2 - 0.01, n.z + n.nz * (W.thickness * 0.5 + 0.004));
        plate.rotation.y = Math.atan2(n.nx, n.nz);
        plate.castShadow = false;
      }
    }

    // A partial upper jaw on a brass hinge, sprung to the lower.
    const hinged = a.action === 'snapping' || a.action === 'biting';
    const upper = new THREE.Group();
    const pivot = new THREE.Vector3(0, W.joint - 0.03, -0.1);
    const gapeAt = { apple: 0.5, pencil: 0.2, coin: 0.13, bone: 0.27 }[a.bitten] / Math.max(1, arch.L * 0.75);
    const restGape = a.action === 'biting' ? gapeAt : 0.34 / Math.max(1, arch.L * 0.7);
    if (hinged) {
      upper.position.copy(pivot);
      const inner = new THREE.Group();
      inner.position.copy(pivot).negate();
      upper.add(inner);
      G.add(upper);
      const upperArch: Arch = { a: arch.a + 0.014, flare: arch.flare * 0.9, L: arch.L + 0.022 };
      const outline: THREE.Vector2[] = [];
      for (let k = -1.38; k <= 1.381; k += 0.08) { const [x, z] = archAt({ a: upperArch.a + 0.04, flare: upperArch.flare, L: upperArch.L + 0.04 }, k); outline.push(new THREE.Vector2(x, z)); }
      const palate = new THREE.ExtrudeGeometry(new THREE.Shape(outline), { depth: 0.13, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04, bevelSegments: 3 });
      palate.rotateX(Math.PI / 2);
      palate.translate(0, -0.83, 0);
      add(inner, palate, bone);
      const teeth = toothRow(upperArch, W.upper, -1.0, -1, random, keep, W.fang).map((tooth) => tooth.geometry);
      if (teeth.length) add(inner, fuse(teeth, ivory).geometry, ivory);
      const hardware: THREE.BufferGeometry[] = [];
      const [bx, bz] = archAt(upperArch, 1.3);
      for (const side of [-1, 1]) {
        hardware.push(strut([side * (bx + 0.03), -0.85, bz], [side * (rx + 0.09), pivot.y, pivot.z], 0.035, 0.035, 6));
        hardware.push(placed(new THREE.SphereGeometry(0.06, 10, 8), [side * (rx + 0.09), pivot.y, pivot.z]));
      }
      hardware.push(strut([-(rx + 0.12), pivot.y, pivot.z], [rx + 0.12, pivot.y, pivot.z], 0.028, 0.028, 8));
      add(inner, fuse(hardware, brass).geometry, brass);
      upper.rotation.x = -restGape;
      const coils = [-1, 1].map((side) => {
        const hook = new THREE.Vector3(side * (rx + 0.1), -0.82, bz * 0.8).sub(pivot).applyAxisAngle(new THREE.Vector3(1, 0, 0), -restGape).add(pivot);
        return spring([hook.x, hook.y, hook.z], [side * (rx + 0.1), top - 0.02, bz * 0.75 + 0.05], 0.045, 0.012, 9);
      });
      add(G, fuse(coils, steel).geometry, steel);
    }

    if (a.action === 'biting') {
      const z = arch.L - 0.12, y = -1.115 + Math.sin(restGape) * 0.0;
      const lift = Math.tan(restGape) * (z - pivot.z) * 0.5;
      const held = new THREE.Group();
      held.position.set(0, y + lift, z);
      G.add(held);
      if (a.bitten === 'apple') {
        const skinColour = mood.cheer > 0.45 ? '#c2262e' : '#8ba23a';
        add(held, placed(new THREE.SphereGeometry(1, 24, 16), [0, 0, 0.16], [0.36, 0.33, 0.36]), new THREE.MeshStandardMaterial({ color: skinColour, roughness: 0.3 }));
        add(held, strut([0, 0.28, 0.16], [0.04, 0.42, 0.18], 0.014, 0.012, 5), new THREE.MeshStandardMaterial({ color: '#4a3320', roughness: 0.8 }));
        add(held, placed(new THREE.SphereGeometry(1, 10, 6), [0.1, 0.4, 0.2], [0.1, 0.012, 0.05], [0, 0.4, 0.3]), new THREE.MeshStandardMaterial({ color: '#3f7a32', roughness: 0.6 }));
      } else if (a.bitten === 'pencil') {
        const g = new THREE.Group();
        g.rotation.set(0, jitter(0.25), Math.PI / 2 + jitter(0.12));
        held.add(g);
        add(g, new THREE.CylinderGeometry(0.042, 0.042, 1.7, 6), new THREE.MeshStandardMaterial({ color: '#e9b520', roughness: 0.45 }));
        add(g, placed(new THREE.CylinderGeometry(0.004, 0.042, 0.14, 6), [0, 0.92, 0]), new THREE.MeshStandardMaterial({ color: '#d9b98a', roughness: 0.7 }));
        add(g, placed(new THREE.CylinderGeometry(0.044, 0.044, 0.09, 8), [0, -0.87, 0]), brass);
        add(g, placed(new THREE.CylinderGeometry(0.04, 0.04, 0.1, 8), [0, -0.96, 0]), new THREE.MeshStandardMaterial({ color: '#d7707c', roughness: 0.8 }));
        held.position.z -= 0.1;
      } else if (a.bitten === 'coin') {
        const coin = add(held, new THREE.CylinderGeometry(0.2, 0.2, 0.028, 28), new THREE.MeshStandardMaterial({ color: '#e7b93a', metalness: 0.9, roughness: 0.25, emissive: '#6a4a00', emissiveIntensity: 0.45 }));
        coin.rotation.set(0.15, 0, 0);
        coin.position.z = 0.13;
      } else {
        const g = new THREE.Group();
        g.rotation.set(0, jitter(0.2), Math.PI / 2);
        held.add(g);
        const parts: THREE.BufferGeometry[] = [new THREE.CylinderGeometry(0.055, 0.065, 1.8, 10)];
        for (const end of [-1, 1]) for (const k of [-1, 1]) parts.push(placed(new THREE.SphereGeometry(0.095, 10, 8), [k * 0.05, end * 0.9, 0]));
        add(g, fuse(parts, bone).geometry, new THREE.MeshStandardMaterial({ color: '#e9dfc4', roughness: 0.7 }));
        held.position.z -= 0.08;
      }
    }

    // Lay it down, or mount it.
    G.scale.setScalar(UNIT * W.size);
    s.root.add(G);
    if (a.action === 'stand') {
      jaw.rotation.x = -0.5 - random() * 0.15;
      jaw.rotation.y = jitter(0.1);
      G.updateMatrixWorld(true);
      const low = new THREE.Box3().setFromObject(jaw).min.y / (UNIT * W.size);
      const baseTop = low - 0.42;
      const grips = [-0.75, 0.75].map((theta) => { const [x, z] = archAt(arch, theta); return new THREE.Vector3(x, top - (top - bottom) * 1.02, z).applyEuler(jaw.rotation); });
      grips.push(new THREE.Vector3(0, backBottom - 0.02, 0.0).applyEuler(jaw.rotation));
      const centre = new THREE.Vector3(0, Math.min(...grips.map((p) => p.y)) - 0.16, grips[0].z * 0.6);
      const wires: THREE.BufferGeometry[] = [strut([centre.x, baseTop, centre.z], [centre.x, centre.y, centre.z], 0.03, 0.03, 8)];
      for (const [index, p] of grips.entries()) {
        const ends = index < 2 ? [p] : [p.clone().setX(-rx), p.clone().setX(rx)];
        for (const end of ends) {
          wires.push(strut([centre.x, centre.y, centre.z], [end.x, end.y, end.z], 0.022, 0.022, 6));
          wires.push(strut([end.x, end.y, end.z], [end.x * 1.12, end.y + 0.1, end.z], 0.022, 0.022, 6));
        }
      }
      add(G, fuse(wires, brass).geometry, brass);
      const wood = s.material(mood.warmth > 0.5 ? '#6b4326' : '#3d3028', { roughness: 0.5 });
      const r = Math.max(0.5, rx * 1.1);
      const foot = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [r, 0], [r * 1.02, 0.04], [r * 0.92, 0.08], [r * 0.86, 0.14], [r * 0.6, 0.17], [0.12, 0.2], [0.08, 0.26], [0, 0.26]].map(([x, y]) => new THREE.Vector2(x, y)), 36), wood);
      foot.position.set(centre.x, baseTop - 0.2, centre.z);
      foot.castShadow = foot.receiveShadow = true;
      G.add(foot);
    }
    G.updateMatrixWorld(true);
    const floorLocal = new THREE.Box3().setFromObject(G).min.y / (UNIT * W.size);

    if (a.label === 'tag') {
      const lines = [a.whose === 'donkey' ? 'Equus asinus' : a.whose === 'ape' ? 'Pan sp.' : 'Homo sapiens', `mandible  No ${10 + Math.floor(random() * 980)}`];
      const map = painted(256, 128, (ctx, w, h) => {
        ctx.fillStyle = '#dcc38d'; ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = '#a7332b'; ctx.lineWidth = 4; ctx.strokeRect(8, 8, w - 16, h - 16);
        ctx.fillStyle = '#3a2c1c'; ctx.beginPath(); ctx.arc(26, h / 2, 9, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#1d1a26'; ctx.font = 'italic 30px serif'; ctx.textBaseline = 'middle';
        ctx.fillText(lines[0], 46, 46, w - 60);
        ctx.font = '24px serif'; ctx.fillText(lines[1], 46, 88, w - 60);
      });
      const side = random() < 0.5 ? -1 : 1;
      const tag = add(G, new THREE.PlaneGeometry(0.62, 0.31), new THREE.MeshStandardMaterial({ map, roughness: 0.8, side: THREE.DoubleSide }));
      const at = new THREE.Vector3(side * (rx + 0.55), floorLocal + 0.02, arch.L * 0.55 + 0.25);
      tag.position.copy(at);
      tag.rotation.set(-Math.PI / 2 + 0.06, 0, jitter(0.5) + (side > 0 ? 0 : Math.PI), 'YXZ');
      const hole = new THREE.Vector3(-0.25, 0, 0).applyEuler(tag.rotation).add(at);
      const n = sideNormal(side * 1.05);
      const anchor = new THREE.Vector3(n.x, top - 0.1, n.z).applyEuler(jaw.rotation);
      const string = sweep([hole, hole.clone().lerp(anchor, 0.5).add(new THREE.Vector3(0, 0.02 - (anchor.y - floorLocal) * 0.35, 0)), anchor.clone().add(new THREE.Vector3(side * 0.09, 0.02, 0)), anchor.clone().add(new THREE.Vector3(0, 0.2, 0)), anchor.clone().add(new THREE.Vector3(-side * 0.09, 0, 0))],
        () => [0.012, 0.012], { steps: 30, sides: 5, up: new THREE.Vector3(0.2, 0.1, 1) });
      add(G, string, new THREE.MeshStandardMaterial({ color: '#b9a06c', roughness: 0.9 }));
    }
    if (a.state === 'dig') {
      const count = Math.round(mix(14, 60, mood.density));
      const crumbs = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, flatShading: true }), count);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), colour = new THREE.Color();
      for (let i = 0; i < count; i++) {
        const angle = random() * Math.PI * 2, reach = Math.sqrt(random());
        const size = 0.02 + random() ** 2 * 0.07;
        q.setFromEuler(new THREE.Euler(random() * 3, random() * 3, random() * 3));
        m.compose(new THREE.Vector3(Math.cos(angle) * reach * (rx + 0.5), floorLocal + size * 0.5, arch.L * 0.5 + Math.sin(angle) * reach * (arch.L * 0.5 + 0.5)), q, new THREE.Vector3(size, size * 0.7, size));
        crumbs.setMatrixAt(i, m);
        crumbs.setColorAt(i, colour.set('#5a4029').multiplyScalar(0.7 + random() * 0.6));
      }
      crumbs.castShadow = crumbs.receiveShadow = true;
      G.add(crumbs);
    }
    let flies: THREE.InstancedMesh | null = null;
    const orbits: { r: number; h: number; phase: number; speed: number }[] = [];
    if (a.state === 'fleshed') {
      const count = Math.round(mix(3, 12, mood.density));
      flies = new THREE.InstancedMesh(new THREE.SphereGeometry(0.03, 6, 4), new THREE.MeshStandardMaterial({ color: '#15151a', roughness: 0.4 }), count);
      for (let i = 0; i < count; i++) orbits.push({ r: 0.3 + random() * 0.6, h: top + 0.25 + random() * 0.7, phase: random() * 6.3, speed: (random() < 0.5 ? -1 : 1) * (0.6 + random()) });
      G.add(flies);
    }
    const m = new THREE.Matrix4();
    const swarm = (time: number) => {
      if (!flies) return;
      orbits.forEach((o, i) => {
        const angle = o.phase + time * o.speed * mix(0.6, 3, mood.energy);
        m.makeTranslation(Math.cos(angle) * o.r, o.h + Math.sin(angle * 2.3 + o.phase) * 0.1, arch.L * 0.45 + Math.sin(angle) * o.r);
        flies!.setMatrixAt(i, m);
      });
      flies.instanceMatrix.needsUpdate = true;
    };
    swarm(0);

    const snap = a.action === 'snapping';
    const rate = mix(1.5, 11, mood.energy);
    return s.finish({
      update: snap || flies ? (_dt, time) => {
        if (snap) upper.rotation.x = -restGape * (0.12 + 0.88 * Math.abs(Math.cos(time * rate)) ** 0.6);
        swarm(time);
      } : undefined,
    });
  },
});
