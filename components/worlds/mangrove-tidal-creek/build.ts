import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { type Placeable, choice, defineWorld, disposeTree, mix } from '@conjure/kit';

/** A round tube that narrows along a curve, painted one colour so many can be merged. */
function taper(points: readonly THREE.Vector3[], from: number, to: number, colour: THREE.Color, segments = 10, sides = 5) {
  const curve = new THREE.CatmullRomCurve3(points as THREE.Vector3[]);
  const position: number[] = [], tint: number[] = [], index: number[] = [];
  const n = new THREE.Vector3(1, 0, 0);
  for (let i = 0; i <= segments; i++) {
    const u = i / segments;
    const p = curve.getPoint(u), t = curve.getTangent(u).normalize();
    n.addScaledVector(t, -n.dot(t));
    if (n.lengthSq() < 1e-6) n.set(0, 0, 1).addScaledVector(t, -t.z);
    n.normalize();
    const b = new THREE.Vector3().crossVectors(t, n);
    const r = mix(from, to, u);
    for (let j = 0; j <= sides; j++) {
      const angle = (j / sides) * Math.PI * 2;
      position.push(p.x + (n.x * Math.cos(angle) + b.x * Math.sin(angle)) * r, p.y + (n.y * Math.cos(angle) + b.y * Math.sin(angle)) * r, p.z + (n.z * Math.cos(angle) + b.z * Math.sin(angle)) * r);
      tint.push(colour.r, colour.g, colour.b);
    }
  }
  const ring = sides + 1;
  for (let i = 0; i < segments; i++)
    for (let j = 0; j < sides; j++) {
      const a = i * ring + j;
      index.push(a, a + 1, a + ring, a + 1, a + ring + 1, a + ring);
    }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(tint, 3));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return geometry;
}

export default defineWorld({
  questions: {
    channel: choice('What kind of channel is this?', {
      tunnel: 'A tight green tunnel barely wider than a canoe, roots almost touching.',
      creek: 'A winding creek a few boat-widths across.',
      mouth: 'The creek mouth, banks drawing apart toward bright open lagoon.',
    }),
    tide: choice('Where is the tide?', {
      high: 'Slack high water, flooded deep among the roots, no mud to be seen.',
      half: 'Half tide: a few slick mud bars showing along the edges.',
      low: 'Dead low: wide glistening mud banks, the roots standing tall and bare.',
    }),
    canopy: choice('What is overhead?', {
      closed: 'A closed roof of leaves; light only falls through in coins.',
      broken: 'A broken canopy with a ragged strip of bright sky down the middle.',
      ghost: 'A dead stand: bare silver limbs, the leaves long gone, open sky.',
    }),
    air: choice('What is the air like?', {
      dapple: 'Clear and hot, hard shafts of sun slanting through the leaves.',
      mist: 'Morning mist lying on the water, everything soft and pale.',
      rain: 'Warm rain falling straight down, the surface pocked with rings.',
      fireflies: 'Evening, the trees beginning to sparkle with fireflies.',
    }),
    people: choice('What have people left here?', {
      nothing: 'Nothing: no sign anyone has ever come.',
      weir: 'A fish weir, a fence of thin stakes and net run out from one bank.',
      boardwalk: 'A rickety plank walkway on posts threading along the roots.',
      markers: 'Rag flags tied to roots and a painted tide pole marking the channel.',
      floats: 'A line of crab-pot floats bobbing down the middle.',
    }),
    surface: choice('What lies on the water?', {
      glass: 'Nothing: a polished brown mirror.',
      leaves: 'A scatter of fallen yellow leaves turning slowly.',
      foam: 'Lines of tan foam drawn out by the last of the current.',
      weed: 'Green mats of floating weed gathered against the roots.',
    }),
    vantage: choice('Where are we watching from?', {
      waterline: 'Chin just above the surface, like a swimmer or a crocodile.',
      seat: 'Sitting in a canoe.',
      branch: 'Perched up in the roots, looking down the creek.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const root = new THREE.Group();
    const dusk = a.air === 'fireflies';
    const ghost = a.canopy === 'ghost';
    const haze = new THREE.Color({ dapple: '#dcebbc', mist: '#e2e9df', rain: '#c9d4cb', fireflies: '#e6c99c' }[a.air])
      .lerp(new THREE.Color('#f2dcae'), mood.warmth * 0.22)
      .lerp(new THREE.Color('#d6e2ea'), (1 - mood.warmth) * 0.14);
    if (ghost) haze.lerp(new THREE.Color('#eef0ea'), 0.4);
    const hazeStrength = { dapple: 0.78, mist: 1, rain: 0.9, fireflies: 0.8 }[a.air];
    const camZ = 10.5;
    const fade = (colour: THREE.Color, z: number, extra = 0) => colour.clone().lerp(haze, Math.min(0.96, Math.max(0, (camZ - 4 - z) / 44) ** 0.85 * hazeStrength + extra));
    const base = { tunnel: 2.3, creek: 3.0, mouth: 3.1 }[a.channel];
    const halfWidth = (z: number) => base + (a.channel === 'mouth' ? Math.max(0, -6 - z) * 0.6 : 0) + Math.sin(z * 0.23 + 1) * 0.25;
    const bend = (z: number) => Math.sin(z * 0.11) * (a.channel === 'creek' ? 1.3 : 0.5) * Math.min(1, Math.max(0, (2 - z) / 10));
    const sink = { high: 1.15, half: 0.55, low: 0 }[a.tide];
    const endZ = a.channel === 'mouth' ? -24 : -46;

    // Light.
    const dim = dusk ? 0.8 : a.air === 'rain' ? 0.88 : 1;
    root.add(new THREE.HemisphereLight(haze.clone().lerp(new THREE.Color('#ffffff'), 0.4), '#5d5038', 1.25 * dim));
    const key = new THREE.DirectionalLight(new THREE.Color().setHSL(mix(0.2, 0.09, mood.warmth), dusk ? 0.6 : 0.35, 0.86), (ghost ? 2.6 : 2.0) * dim);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.normalBias = 0.04;
    key.shadow.bias = -0.0004;
    root.add(key, key.target);

    // Water: tea-brown, darker under the banks, paler down the middle where it holds the sky.
    const tea = new THREE.Color('#644a28').lerp(new THREE.Color('#7f8f86'), 0.12);
    const waterCanvas = document.createElement('canvas');
    waterCanvas.width = 512; waterCanvas.height = 64;
    const wctx = waterCanvas.getContext('2d')!;
    const css = (c: THREE.Color) => `#${c.getHexString()}`;
    const across = wctx.createLinearGradient(0, 0, 512, 0);
    const shade = tea.clone().lerp(new THREE.Color('#2c3a26'), ghost ? 0.2 : 0.5);
    const sheen = tea.clone().lerp(haze, ghost || a.canopy === 'broken' ? 0.3 : 0.12);
    across.addColorStop(0, css(shade)); across.addColorStop(0.44, css(shade)); across.addColorStop(0.485, css(tea)); across.addColorStop(0.5, css(sheen)); across.addColorStop(0.515, css(tea)); across.addColorStop(0.56, css(shade)); across.addColorStop(1, css(shade));
    wctx.fillStyle = across; wctx.fillRect(0, 0, 512, 64);
    const waterMap = new THREE.CanvasTexture(waterCanvas);
    waterMap.colorSpace = THREE.SRGBColorSpace;
    const water = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), new THREE.MeshStandardMaterial({ map: waterMap, roughness: 0.22, metalness: 0.08 }));
    water.rotation.x = -Math.PI / 2;
    water.position.set(0, 0, -20);
    water.receiveShadow = true;
    root.add(water);
    const far = new THREE.Mesh(new THREE.PlaneGeometry(160, 70), new THREE.MeshBasicMaterial({ color: haze.clone().lerp(new THREE.Color('#ffffff'), 0.25) }));
    far.position.set(0, 20, -62);
    root.add(far);
    if (a.channel === 'mouth') {
      const lagoon = new THREE.Mesh(new THREE.PlaneGeometry(90, 40), new THREE.MeshStandardMaterial({ color: tea.clone().lerp(haze, 0.62), roughness: 0.1, metalness: 0.2 }));
      lagoon.rotation.x = -Math.PI / 2;
      lagoon.position.set(0, 0.006, -44);
      root.add(lagoon);
    }

    // The forest.
    const barkBase = ghost ? new THREE.Color('#a9a498') : new THREE.Color('#6d4a3a').lerp(new THREE.Color('#8e8a82'), mood.wear * 0.35);
    const leafBase = new THREE.Color('#2a6236').lerp(new THREE.Color('#3f8f46'), mood.cheer * 0.35).lerp(new THREE.Color('#5c6a3c'), mood.wear * 0.22).multiplyScalar(dusk ? 0.8 : 1);
    const wood: THREE.BufferGeometry[] = [];
    const lumps: { at: THREE.Vector3; size: THREE.Vector3; colour: THREE.Color }[] = [];
    const leaves: { at: THREE.Vector3; colour: THREE.Color }[] = [];
    const drops: { at: THREE.Vector3; length: number; colour: THREE.Color }[] = [];
    const rootFeet: THREE.Vector3[] = [];
    const lump = (x: number, y: number, z: number, r: number) => {
      const colour = fade(leafBase.clone().multiplyScalar(mix(0.72, 1.12, random())), z);
      lumps.push({ at: new THREE.Vector3(x, y, z), size: new THREE.Vector3(r, r * mix(0.5, 0.68, random()), r), colour });
      if (z > -10) for (let i = 0; i < 40; i++) {
        const theta = random() * 6.283, phi = Math.acos(mix(-0.5, 1, random()));
        leaves.push({ at: new THREE.Vector3(x + Math.sin(phi) * Math.cos(theta) * r, y + Math.cos(phi) * r * 0.6, z + Math.sin(phi) * Math.sin(theta) * r), colour: fade(random() < 0.05 + mood.wear * 0.08 ? new THREE.Color('#d9bb30') : leafBase.clone().multiplyScalar(mix(0.9, 1.5, random())), z) });
      }
    };
    const tree = (x: number, z: number, side: number, detail: number) => {
      const bark = fade(barkBase.clone().multiplyScalar(mix(0.8, 1.1, random())), z);
      const hub = mix(1.5, 2.9, random()) - sink;
      const reachOver = mix(0.8, 2.6, random()) * (a.channel === 'tunnel' ? 1.15 : 1);
      const crown = new THREE.Vector3(x - side * reachOver, mix(5.4, 7.6, random()) - sink * 0.5, z + (random() - 0.5) * 1.5);
      wood.push(taper([new THREE.Vector3(x, hub * 0.2 - 0.3, z), new THREE.Vector3(x + (random() - 0.5) * 0.3, hub, z), new THREE.Vector3(x - side * reachOver * 0.35, hub + 2, z + (random() - 0.5) * 0.6), crown], 0.2, 0.08, bark, 8, 5));
      const count = detail > 1 ? Math.round(mix(7, 11, mood.density)) : 4;
      for (let i = 0; i < count; i++) {
        let angle = random() * Math.PI * 2;
        if (random() < 0.55) angle = Math.PI / 2 + (random() - 0.5) * 2.2;
        const dir = new THREE.Vector3(-side * Math.sin(angle), 0, Math.cos(angle));
        const h = hub * mix(0.5, 1.08, random()) + sink * 0.25, reach = mix(1.0, 2.7, random());
        const start = new THREE.Vector3(x, h, z);
        const foot = start.clone().addScaledVector(dir, reach).setY(-0.7);
        wood.push(taper([start, start.clone().addScaledVector(dir, reach * 0.33).setY(h + 0.2 * reach), start.clone().addScaledVector(dir, reach * 0.74).setY(Math.max(0.1, h * 0.66)), start.clone().addScaledVector(dir, reach * 0.97).setY(h * 0.15), foot], mix(0.1, 0.075, random()), 0.045, bark, detail > 1 ? 10 : 6, detail > 1 ? 5 : 4));
        if (detail > 1) rootFeet.push(foot.clone().setY(0));
      }
      if (ghost) {
        for (let i = 0; i < 3; i++) wood.push(taper([crown.clone().lerp(new THREE.Vector3(x, hub + 2, z), 0.4 * i), crown.clone().add(new THREE.Vector3((random() - 0.5) * 3, random() * 1.6 - 0.2, (random() - 0.5) * 3))], 0.07, 0.02, bark, 3, 4));
        if (random() < 0.2) lump(crown.x, crown.y, crown.z, 0.7);
        return;
      }
      for (let i = 0; i < 4; i++) lump(crown.x + (random() - 0.5) * 3, crown.y + random() * 1.6, crown.z + (random() - 0.5) * 3, mix(1.1, 1.9, random()));
      if (random() < 0.7) drops.push({ at: new THREE.Vector3(crown.x + (random() - 0.5), crown.y - 0.4, crown.z), length: mix(1.4, 4, random()), colour: bark });
    };
    const spacing = mix(3.5, 2.5, mood.density);
    for (const side of [-1, 1]) {
      for (let z = 8.5; z > endZ; z -= spacing * mix(0.75, 1.25, random())) {
        const x = bend(z) + side * (halfWidth(z) + mix(0.5, 1.9, random()));
        tree(x, z, side, z > -16 ? 2 : 1);
        // The dark mass of forest behind the first rank.
        if (!ghost) for (let k = 0; k < 2; k++) lump(bend(z) + side * (halfWidth(z) + mix(3.5, 5, random()) + k * 3.5), mix(1.5, 3.2, random()) + k * 2.6, z + (random() - 0.5) * 2, mix(2.8, 3.8, random()));
        else if (random() < 0.6) tree(x + side * mix(3, 7, random()), z + random(), side, 1);
      }
    }
    // The roof over the channel.
    if (!ghost) for (let z = 6; z > endZ; z -= 2.4) {
      if (a.canopy === 'broken' && random() < 0.72) continue;
      if (a.channel === 'mouth' && z < -12) continue;
      lump(bend(z) + (random() - 0.5) * halfWidth(z) * 1.3, mix(6.8, 8.4, random()) - sink * 0.4, z, mix(1.4, 2.2, random()));
      if (random() < 0.5) drops.push({ at: new THREE.Vector3(bend(z) + (random() - 0.5) * halfWidth(z) * 1.6, 6.4, z), length: mix(1.2, 3.4, random()), colour: fade(barkBase, z) });
    }
    if (a.channel === 'mouth') for (let x = -44; x < 44; x += 3) lump(x, 1.2, -60 + random() * 2, 3);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion();
    const put = <T extends THREE.Object3D>(node: T, shadow = true) => { node.traverse((c) => { c.castShadow = shadow; c.receiveShadow = true; }); root.add(node); return node; };
    put(new THREE.Mesh(mergeGeometries(wood), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, flatShading: true })));
    for (const geometry of wood) geometry.dispose();
    if (lumps.length) {
      const mass = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ roughness: 0.75, flatShading: true }), lumps.length);
      lumps.forEach((l, i) => { mass.setMatrixAt(i, m.compose(l.at, q.setFromEuler(new THREE.Euler(0, i * 1.7, 0)), l.size)); mass.setColorAt(i, l.colour); });
      put(mass, false);
    }
    if (leaves.length) {
      const foliage = new THREE.InstancedMesh(new THREE.OctahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ roughness: 0.3, flatShading: true }), leaves.length);
      leaves.forEach((l, i) => { foliage.setMatrixAt(i, m.compose(l.at, q.setFromEuler(new THREE.Euler(random() * 3, random() * 3, random() * 3)), new THREE.Vector3(0.15, 0.02, 0.33))); foliage.setColorAt(i, l.colour); });
      put(foliage, false);
    }
    if (drops.length) {
      const aerial = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.02, 0.012, 1, 5).translate(0, -0.5, 0), new THREE.MeshStandardMaterial({ roughness: 0.9 }), drops.length);
      drops.forEach((d, i) => { aerial.setMatrixAt(i, m.compose(d.at, q.identity(), new THREE.Vector3(1.3, d.length, 1.3))); aerial.setColorAt(i, d.colour); });
      put(aerial);
    }

    // Mud.
    const mudColour = new THREE.Color('#6c5a48').lerp(new THREE.Color('#80603f'), mood.warmth * 0.5);
    const mudPaint = new THREE.MeshStandardMaterial({ color: mudColour, roughness: mix(0.28, 0.5, mood.wear), metalness: 0.12 });
    const bar = (x: number, z: number, rx: number, rz: number, height: number) => {
      const mound = put(new THREE.Mesh(new THREE.LatheGeometry([[1, -0.05], [0.94, height * 0.3], [0.72, height * 0.8], [0.4, height], [0, height]].map(([px, py]) => new THREE.Vector2(px, py)), 28), mudPaint));
      mound.position.set(x, 0, z);
      mound.scale.set(rx, 1, rz);
      mound.rotation.y = random() * 0.5;
    };
    const lift = a.tide === 'high' ? 0.05 : a.tide === 'half' ? 0.1 : 0.16;
    const slots = [
      { x: 0.15, z: 2.2, lift: 0, maxH: 3.3, maxR: base * 0.52 },
      { x: -(base - 0.85), z: 3.6, lift, maxH: 1.5, maxR: 0.72 },
      { x: base - 0.75, z: 0.6, lift, maxH: 2.1, maxR: 0.95 },
      { x: -0.8, z: -5.2, lift: 0, maxH: 3.3, maxR: 1.5 },
      { x: 1.5, z: -11, lift: 0, maxH: 3.6, maxR: 1.7 },
    ].map((slot) => ({ ...slot, x: slot.x + bend(slot.z) }));
    bar(slots[1].x - 0.25, slots[1].z, 1.35, 1.7, lift);
    bar(slots[2].x + 0.3, slots[2].z, 1.6, 2.0, lift);
    const pegs: THREE.Matrix4[] = [];
    if (a.tide !== 'high') {
      const reach = a.tide === 'low' ? 1.7 : 0.7;
      for (const side of [-1, 1]) for (let z = 7; z > Math.max(endZ, -30); z -= 3.2) {
        if (a.tide === 'half' && random() < 0.5) continue;
        const x = bend(z) + side * (halfWidth(z) + 0.9 - reach * mix(0.4, 1, random()));
        bar(x + side * 1.2, z, mix(1.8, 2.6, random()), mix(2, 3.2, random()), mix(0.08, 0.22, random()) * (a.tide === 'low' ? 1.3 : 0.7));
        for (let i = 0; i < mix(3, 9, mood.density); i++) pegs.push(new THREE.Matrix4().compose(new THREE.Vector3(x + side * mix(0.2, 1.8, random()), 0.1, z + (random() - 0.5) * 3), q.identity(), new THREE.Vector3(1, mix(0.18, 0.42, random()), 1)));
      }
    }
    if (pegs.length) {
      const pencils = new THREE.InstancedMesh(new THREE.ConeGeometry(0.03, 1, 5).translate(0, 0.5, 0), new THREE.MeshStandardMaterial({ color: fade(barkBase, 0), roughness: 0.9 }), pegs.length);
      pegs.forEach((matrix, i) => pencils.setMatrixAt(i, matrix));
      put(pencils);
    }

    // Light on the water: coins of sun, or rings of rain.
    const glowing: THREE.InstancedMesh[] = [];
    const inChannel = (zNear = 8, zFar = -26, spread = 0.92) => { const z = mix(zNear, zFar, random()); return new THREE.Vector3(bend(z) + (random() - 0.5) * 2 * halfWidth(z) * spread, 0, z); };
    const coins = a.air === 'rain' || a.air === 'mist' ? 0 : ghost ? 0 : Math.round((a.canopy === 'broken' ? 46 : 26) * (dusk ? 0.5 : 1));
    if (coins) {
      const sun = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 0.004, 9), new THREE.MeshStandardMaterial({ color: tea.clone().lerp(haze, 0.5), emissive: haze, emissiveIntensity: dusk ? 0.08 : 0.16, roughness: 0.3 }), coins);
      for (let i = 0; i < coins; i++) { const at = inChannel(4.5, -26); const r = mix(0.08, 0.26, random()); sun.setMatrixAt(i, m.compose(at.setY(0.004), q.identity(), new THREE.Vector3(r, 1, r * 1.9))); }
      sun.receiveShadow = false;
      root.add(sun);
      glowing.push(sun);
    }
    if (a.air === 'dapple' && !ghost) {
      const beam = new THREE.MeshBasicMaterial({ color: haze.clone().lerp(new THREE.Color('#ffffff'), 0.5), transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide });
      for (let i = 0; i < 5; i++) {
        const at = inChannel(1, -18, 0.8);
        const shaft = new THREE.Mesh(new THREE.PlaneGeometry(mix(0.7, 1.6, random()), 10), beam);
        shaft.position.set(at.x, 4.6, at.z);
        shaft.rotation.z = (mood.daylight - 0.5) * 0.9 + (random() - 0.5) * 0.1 + 0.2;
        root.add(shaft);
      }
    }
    const ringPaint = new THREE.MeshStandardMaterial({ color: tea.clone().lerp(haze, 0.55), roughness: 0.2 });
    const rings: THREE.Mesh[] = [];
    const ring = (x: number, z: number, r: number) => { const mesh = new THREE.Mesh(new THREE.TorusGeometry(r, 0.012, 4, 20), ringPaint); mesh.rotation.x = Math.PI / 2; mesh.position.set(x, 0.006, z); root.add(mesh); return mesh; };
    let rainFall: THREE.InstancedMesh | null = null;
    if (a.air === 'rain') {
      for (let i = 0; i < 46; i++) { const at = inChannel(8, -14); rings.push(ring(at.x, at.z, mix(0.08, 0.3, random()))); }
      const streaks = 240;
      rainFall = new THREE.InstancedMesh(new THREE.BoxGeometry(0.012, 0.5, 0.012), new THREE.MeshBasicMaterial({ color: haze.clone().lerp(new THREE.Color('#ffffff'), 0.5) }), streaks);
      for (let i = 0; i < streaks; i++) rainFall.setMatrixAt(i, m.makeTranslation((random() - 0.5) * 9, random() * 9, mix(7, -14, random())));
      root.add(rainFall);
    } else {
      for (const foot of rootFeet) if (foot.z > -12 && random() < 0.3) ring(foot.x, foot.z, 0.16);
    }
    if (a.air === 'mist') {
      const veil = new THREE.MeshBasicMaterial({ color: haze, transparent: true, opacity: 0.2, depthWrite: false });
      for (let i = 0; i < 7; i++) {
        const slab = new THREE.Mesh(new THREE.PlaneGeometry(40, mix(0.5, 1.3, random())), veil);
        slab.position.set(0, mix(0.25, 1.0, random()), 3 - i * 4.5);
        root.add(slab);
      }
    }
    let sparks: THREE.InstancedMesh | null = null;
    const sparkAt: THREE.Vector3[] = [];
    if (dusk) {
      const n = Math.round(mix(50, 130, mood.density));
      sparks = new THREE.InstancedMesh(new THREE.SphereGeometry(0.045, 6, 5), new THREE.MeshBasicMaterial({ color: '#f4ff8a' }), n);
      for (let i = 0; i < n; i++) {
        const z = mix(6, -28, random()), side = random() < 0.5 ? -1 : 1;
        const at = new THREE.Vector3(bend(z) + side * (halfWidth(z) * mix(0.55, 1.6, random())), mix(0.5, 6.5, random()), z);
        sparkAt.push(at);
        sparks.setMatrixAt(i, m.makeTranslation(at.x, at.y, at.z));
      }
      root.add(sparks);
    }

    // On the surface.
    if (a.surface !== 'glass') {
      const n = Math.round(mix(40, 110, mood.density));
      const colours = { leaves: ['#e2c22c', '#c98a2a', '#9aa83a'], foam: ['#d9cdb0', '#e6dcc4', '#cbbd9c'], weed: ['#5f8a34', '#7aa23c', '#4a7030'] }[a.surface];
      const flecks = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 0.006, 7), new THREE.MeshStandardMaterial({ roughness: a.surface === 'leaves' ? 0.4 : 0.9 }), n);
      for (let i = 0; i < n; i++) {
        let at = inChannel(6, -24);
        let size = new THREE.Vector3(0.06, 1, 0.13);
        if (a.surface === 'foam') { const lane = Math.floor(random() * 3); const z = mix(5, -24, random()); at = new THREE.Vector3(bend(z) + (lane - 1) * halfWidth(z) * 0.45 + Math.sin(z * 0.6 + lane) * 0.3, 0, z); size = new THREE.Vector3(mix(0.03, 0.08, random()), 1, mix(0.12, 0.4, random())); }
        if (a.surface === 'weed') { const z = mix(3.5, -24, random()), side = random() < 0.5 ? -1 : 1; at = new THREE.Vector3(bend(z) + side * halfWidth(z) * mix(0.62, 1.05, random()), 0, z); size = new THREE.Vector3(mix(0.2, 0.6, random()), 1, mix(0.3, 0.9, random())); }
        flecks.setMatrixAt(i, m.compose(at.setY(0.005), q.setFromEuler(new THREE.Euler(0, a.surface === 'foam' ? 0 : random() * 6, 0)), size));
        flecks.setColorAt(i, fade(new THREE.Color(colours[Math.floor(random() * colours.length)]), at.z));
      }
      flecks.receiveShadow = true;
      root.add(flecks);
    }

    // What people left.
    const bobbing: { node: THREE.Object3D; phase: number }[] = [];
    const stick = (from: THREE.Vector3, to: THREE.Vector3, radius: number, material: THREE.Material) => {
      const span = to.clone().sub(from);
      const mesh = put(new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.8, radius, span.length(), 6), material));
      mesh.position.copy(from).add(to).multiplyScalar(0.5);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), span.normalize());
      return mesh;
    };
    const timber = new THREE.MeshStandardMaterial({ color: fade(new THREE.Color('#8a7458').lerp(new THREE.Color('#8e8a82'), mood.wear * 0.5), -6), roughness: 0.9 });
    if (a.people === 'weir') {
      const z0 = -7.5, x0 = bend(z0) - halfWidth(z0) - 0.3, x1 = bend(z0) + halfWidth(z0) * 0.35;
      const netCanvas = document.createElement('canvas');
      netCanvas.width = netCanvas.height = 64;
      const nctx = netCanvas.getContext('2d')!;
      nctx.strokeStyle = '#3c4a3c'; nctx.lineWidth = 4;
      for (let k = -1; k < 3; k++) { nctx.beginPath(); nctx.moveTo(k * 32, 0); nctx.lineTo(k * 32 + 64, 64); nctx.moveTo(k * 32 + 64, 0); nctx.lineTo(k * 32, 64); nctx.stroke(); }
      const netMap = new THREE.CanvasTexture(netCanvas);
      netMap.wrapS = netMap.wrapT = THREE.RepeatWrapping;
      netMap.repeat.set(20, 4);
      const net = put(new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, 1.1), new THREE.MeshStandardMaterial({ map: netMap, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.9 })), false);
      net.position.set((x0 + x1) / 2, 0.55, z0);
      for (let x = x0; x <= x1 + 0.01; x += 0.42) stick(new THREE.Vector3(x + (random() - 0.5) * 0.1, -0.4, z0 + (random() - 0.5) * 0.1), new THREE.Vector3(x + (random() - 0.5) * 0.25, mix(1.2, 1.9, random()), z0 + (random() - 0.5) * 0.2), 0.03, timber);
      // The trap pocket at the open end.
      for (let i = 0; i < 6; i++) { const angle = (i / 6) * Math.PI * 1.5; stick(new THREE.Vector3(x1 + 0.5 + Math.cos(angle) * 0.5, -0.4, z0 + 0.4 + Math.sin(angle) * 0.5), new THREE.Vector3(x1 + 0.5 + Math.cos(angle) * 0.55, 1.4, z0 + 0.4 + Math.sin(angle) * 0.55), 0.03, timber); }
    } else if (a.people === 'boardwalk') {
      let previous: THREE.Vector3 | null = null;
      for (let z = 5; z > -20; z -= 1.9) {
        const at = new THREE.Vector3(bend(z) + halfWidth(z) + 0.15 + Math.sin(z * 0.5) * 0.2, 1.25 - sink * 0.3 + (random() - 0.5) * 0.12 * (1 + mood.wear), z);
        for (const e of [-0.32, 0.32]) stick(new THREE.Vector3(at.x + e, -0.4, z), new THREE.Vector3(at.x + e + (random() - 0.5) * 0.12, at.y, z), 0.045, timber);
        if (previous && !(mood.wear > 0.6 && random() < 0.25)) {
          for (const e of [-0.2, 0.02, 0.24]) {
            const plank = stick(new THREE.Vector3(previous.x + e, previous.y + 0.03, previous.z + 0.1), new THREE.Vector3(at.x + e, at.y + 0.03, at.z - 0.1), 0.1, timber);
            plank.scale.z = 0.22;
          }
          if (random() < 0.6) { stick(new THREE.Vector3(at.x + 0.36, at.y, z), new THREE.Vector3(at.x + 0.38, at.y + 0.9, z), 0.03, timber); stick(new THREE.Vector3(previous.x + 0.38, previous.y + 0.85, previous.z), new THREE.Vector3(at.x + 0.38, at.y + 0.85, at.z), 0.025, timber); }
        }
        previous = at;
      }
    } else if (a.people === 'markers') {
      const rag = new THREE.MeshStandardMaterial({ color: '#e0352a', emissive: '#a01810', emissiveIntensity: mix(0.2, 0.6, mood.cheer), side: THREE.DoubleSide, roughness: 0.9 });
      const pale = new THREE.MeshStandardMaterial({ color: '#f0ece0', side: THREE.DoubleSide, roughness: 0.9 });
      const near = rootFeet.filter((f) => f.z > -16 && f.z < 4);
      for (let i = 0; i < Math.min(7, near.length); i++) {
        const foot = near[Math.floor(random() * near.length)];
        const flag = put(new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.7, 1, 4), i % 3 ? rag : pale), false);
        flag.position.set(foot.x * 0.94, mix(0.9, 1.6, random()), foot.z);
        flag.rotation.set(0.1, random() * 3, 0.1);
        bobbing.push({ node: flag, phase: random() * 6 });
      }
      const pz = -3.5, px = bend(pz) + halfWidth(pz) * 0.55;
      stick(new THREE.Vector3(px, -0.5, pz), new THREE.Vector3(px + 0.12, 2.6, pz), 0.06, pale);
      for (let i = 0; i < 4; i++) { const band = put(new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.064, 0.22, 7), rag)); band.position.set(px + 0.02 + i * 0.025, 0.5 + i * 0.5, pz); }
      ring(px, pz, 0.2);
    } else if (a.people === 'floats') {
      const paints = ['#f2f0e6', '#f08a2a', '#f2d23a', '#e8443a'].map((c) => new THREE.MeshStandardMaterial({ color: fade(new THREE.Color(c), -4, -0.05), roughness: 0.5 }));
      for (let i = 0; i < 7; i++) {
        const z = 0.5 - i * 2.9, x = bend(z) + Math.sin(i * 1.9) * halfWidth(z) * 0.4 - 0.9;
        const float = put(new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), paints[i % paints.length]));
        float.position.set(x, 0.05, z);
        float.scale.y = 1.25;
        const wand = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.5, 4), timber);
        wand.position.y = 0.3;
        float.add(wand);
        ring(x, z, 0.28);
        bobbing.push({ node: float, phase: i * 1.3 });
      }
    }
    if (mood.wear > 0.6) {
      // Plastic caught in the roots when things are run down.
      const junk = ['#bfe0f0', '#ef4f8a', '#f0f0ea', '#58c6a0'];
      for (let i = 0; i < 8 && i < rootFeet.length; i++) {
        const foot = rootFeet[Math.floor(random() * rootFeet.length)];
        if (foot.z < -14) continue;
        const scrap = put(new THREE.Mesh(new THREE.IcosahedronGeometry(0.1, 0), new THREE.MeshStandardMaterial({ color: junk[i % junk.length], roughness: 0.4, flatShading: true })));
        scrap.position.set(foot.x, 0.1 + random() * 0.3, foot.z);
        scrap.scale.set(1, mix(0.5, 1.4, random()), 0.6);
      }
    }

    const eye = { waterline: 0.5, seat: 1.3, branch: 3.7 }[a.vantage];
    const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 220);
    const place = (items: readonly Placeable[]) => {
      let heroTop = 1.6;
      items.forEach((item, index) => {
        const slot = slots[index % slots.length];
        const natural = Math.max(item.height, item.radius * 2, 0.02);
        const wanted = (1.5 * natural ** 0.4 * (item.hero ? 1.25 : 1)) / natural;
        const scale = Math.min(wanted, slot.maxH / Math.max(item.height, 0.02), slot.maxR / Math.max(item.radius, 0.02));
        item.holder.scale.setScalar(scale);
        item.holder.position.set(slot.x, slot.lift, slot.z);
        item.holder.rotation.y = (random() - 0.5) * 0.5 + (index === 0 ? 0.3 : index % 2 ? 0.5 : -0.4);
        item.holder.updateMatrixWorld(true);
        if (index === 0) heroTop = item.height * scale;
      });
      const hero = slots[0];
      const back = Math.max(0, heroTop - 2.4) * 1.1;
      camera.position.set(hero.x + 0.55, eye, camZ + back);
      camera.lookAt(hero.x * 0.6, a.vantage === 'branch' ? 0.7 : Math.max(0.75, Math.min(heroTop * 0.5, 1.7)) * (a.vantage === 'waterline' ? 1.15 : 1), 0);
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld(true);
      key.target.position.set(0, 0, -3);
      key.position.set(mix(-13, 13, mood.daylight), ghost ? 26 : 22, 12);
      const shadow = key.shadow.camera;
      shadow.left = shadow.bottom = -19;
      shadow.right = shadow.top = 19;
      shadow.near = 1;
      shadow.far = 90;
      shadow.updateProjectionMatrix();
    };

    const energy = mix(0.25, 1.6, mood.energy);
    return {
      object: root,
      camera,
      background: haze,
      capacity: slots.length,
      ground: water,
      keyLight: key,
      place,
      update(_dt, time) {
        rings.forEach((mesh, i) => { const beat = (time * 0.9 * energy + i * 0.37) % 1; mesh.scale.setScalar(0.4 + beat * 1.6); });
        if (rainFall) rainFall.position.y = -((time * 7) % 1.5);
        for (const bob of bobbing) { bob.node.position.y += Math.sin(time * 1.4 * energy + bob.phase) * 0.0006; bob.node.rotation.z = Math.sin(time * 1.1 * energy + bob.phase) * 0.12; }
        if (sparks) {
          sparkAt.forEach((at, i) => { const pulse = 0.4 + 0.6 * Math.max(0, Math.sin(time * 1.8 * energy + i * 2.1)); sparks!.setMatrixAt(i, m.compose(new THREE.Vector3(at.x + Math.sin(time * 0.5 + i) * 0.15, at.y + Math.sin(time * 0.7 + i * 1.7) * 0.12, at.z), q.identity(), new THREE.Vector3(pulse, pulse, pulse))); });
          sparks.instanceMatrix.needsUpdate = true;
        }
      },
      dispose() { key.shadow.map?.dispose(); disposeTree(root); },
    };
  },
});
