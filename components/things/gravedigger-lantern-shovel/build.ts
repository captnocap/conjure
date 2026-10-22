import * as THREE from 'three';
import { choice, defineThing, disposeTree, mix } from '@conjure/kit';
import { type Bit, clods, grass, limb, many, mottled, mound, paint, put, shade } from './grave';

export default defineThing({
  questions: {
    left: choice('What did the gravedigger leave behind with the shovel?', {
      hat: 'A battered hat hung on the shovel handle.',
      coat: 'A heavy coat draped over the shovel handle, sleeves hanging.',
      boot: 'A single boot stuck upright in the mud, the foot pulled clean out of it.',
      lunch: 'A tin lunch pail with the lid off and a half-eaten sandwich.',
      flask: 'A hip flask and a clay pipe set on an upturned bucket.',
      everything: 'All of it: hat, coat, boot, pail and flask. Nobody stopped to pack.',
    }),
    lantern: choice('What state is the hurricane lantern in?', {
      burning: 'Standing upright and burning bright.',
      low: 'Standing, turned down to a small blue-yellow flame.',
      kicked: 'Kicked over on its side, glass cracked, gone out.',
      hung: 'Hanging from the shovel grip, still lit and swaying.',
    }),
    hole: choice('How deep is the grave beside it?', {
      scrape: 'Barely started: turf lifted and a shallow brown scrape.',
      knee: 'Knee deep, the sides cut square.',
      six: 'The full six feet, black at the bottom, with a ladder sticking out.',
      filled: 'Already filled in: a fresh long mound, so why is the kit still here?',
    }),
    signs: choice('What signs are there of what happened?', {
      nothing: 'Nothing odd at all: it just looks like someone stepped away.',
      drag: 'Two heel-furrows dragged through the grass toward the hole.',
      claws: 'Raking claw marks in the turf at the lip of the grave.',
      fled: 'Deep boot prints sprinting away, further and further apart.',
      climbed: 'Soil pushed up and out from inside, and bare muddy footprints walking off.',
    }),
    tool: choice('What is the shovel like?', {
      new: 'A new square spade with a bright steel blade and varnished grip.',
      worn: 'A worn round-point shovel, handle polished grey by hands.',
      ancient: 'An ancient rusted spade with a split handle bound in twine.',
      pick: 'A worn shovel with a pickaxe leaning against the heap as well.',
    }),
    marker: choice('Is there anything to say whose grave it is?', {
      none: 'Nothing yet.',
      stake: 'A numbered wooden stake.',
      cross: 'A temporary plank cross.',
      wreath: 'A funeral wreath waiting on its stand.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const root = new THREE.Group();
    const wear = mood.wear;
    const has = (thing: string) => a.left === thing || a.left === 'everything';
    const hex = (c: THREE.Color) => `#${c.getHexString()}`;

    const soilTone = shade('#5d4332', mood.warmth > 0.5 ? '#80502e' : '#403b3a', Math.abs(mood.warmth - 0.5) * 0.9);
    const soilMap = mottled(random, '#ffffff', [{ color: '#000000', count: 70, size: 0.03, alpha: 0.22 }, { color: '#ffffff', count: 24, size: 0.012, alpha: 0.3 }]);
    const soil = paint(soilTone, { roughness: 1, map: soilMap });
    const soils = [hex(soilTone), hex(shade(soilTone, '#1c1512', 0.4)), hex(shade(soilTone, '#a08060', 0.3))];
    const greens = mood.cheer > 0.5 ? ['#5f8f3c', '#7aa648', '#4c7a34'] : ['#566b3a', '#6d7343', '#4a5a36'];
    const turf = paint(shade(greens[0], '#6f6a3c', wear * 0.5), { roughness: 1 });
    const darkSoil = paint(soils[1], { roughness: 1 });
    const mark = paint(shade(soils[1], '#000000', 0.3), { roughness: 1 });

    // Ground patch.
    put(root, new THREE.CylinderGeometry(1.0, 1.03, 0.05, 40), turf, [0, -0.021, 0], [0, 0, 0], [1, 1, 0.85]);

    // The grave itself, running across the back.
    const HX = 0.1, HZ = -0.42, HW = 1.25, HD = 0.6;
    const inHole = (x: number, z: number) => Math.abs(x - HX) < HW / 2 + 0.1 && Math.abs(z - HZ) < HD / 2 + 0.1;
    if (a.hole === 'filled') {
      const heap = mound(root, random, HW / 2, 0.24, HD / 2, soil, [HX, 0, HZ], 0.12);
      heap.geometry.scale(1, 1, 1);
      for (let i = 0; i < 5; i++) put(root, new THREE.BoxGeometry(0.2, 0.012, 0.16), paint(hex(shade(soilTone, '#2a1c12', 0.3)), { roughness: 1 }), [HX - 0.44 + i * 0.22, 0.2 + Math.sin(i * 2.1) * 0.012, HZ + 0.12], [-0.5, 0, (random() - 0.5) * 0.2]);
    } else {
      const depth = { scrape: 0.25, knee: 0.6, six: 1 }[a.hole];
      const canvas = document.createElement('canvas');
      canvas.width = 256; canvas.height = 100;
      const ctx = canvas.getContext('2d')!;
      const wall = shade(soilTone, '#000000', 0.25 + depth * 0.3), floor = shade(soilTone, '#000000', 0.2 + depth * 0.8);
      ctx.fillStyle = hex(wall);
      ctx.fillRect(0, 0, 256, 100);
      // Strata on the far wall, then the floor falling into shadow.
      const lip = 10 + depth * 34;
      for (let y = 0; y < lip; y += 3) { ctx.fillStyle = hex(shade(wall, y % 9 < 3 ? '#8a6a48' : '#000000', 0.12 + (y / lip) * depth * 0.5)); ctx.fillRect(0, y, 256, 3); }
      const g = ctx.createLinearGradient(0, lip, 0, 100);
      g.addColorStop(0, hex(floor)); g.addColorStop(1, hex(shade(floor, '#000000', depth * 0.6)));
      ctx.fillStyle = g;
      ctx.fillRect(lip * 0.4, lip, 256 - lip * 0.8, 100 - lip);
      const pit = new THREE.CanvasTexture(canvas);
      pit.colorSpace = THREE.SRGBColorSpace;
      put(root, new THREE.PlaneGeometry(HW, HD), new THREE.MeshStandardMaterial({ map: pit, roughness: 1 }), [HX, 0.008, HZ], [-Math.PI / 2, 0, 0]).castShadow = false;
      // Cut turf lip and boards along the working edge.
      for (const [x, z, w, d] of [[HX, HZ - HD / 2 - 0.03, HW + 0.12, 0.07], [HX - HW / 2 - 0.03, HZ, 0.07, HD], [HX + HW / 2 + 0.03, HZ, 0.07, HD]] as const) put(root, new THREE.BoxGeometry(w, 0.04, d), darkSoil, [x, 0.012, z], [0, 0, 0]);
      const board = paint(shade('#b89a68', '#6a5a44', wear * 0.6));
      put(root, new THREE.BoxGeometry(HW + 0.3, 0.03, 0.2), board, [HX + (random() - 0.5) * 0.1, 0.02, HZ + HD / 2 + 0.1], [0, (random() - 0.5) * 0.06, 0]);
      if (a.hole === 'six') {
        const wood = paint(shade('#a8854f', '#5a4a38', wear * 0.6));
        const ladder = new THREE.Group();
        ladder.position.set(HX + 0.32, 0, HZ + 0.05);
        ladder.rotation.set(-0.32, 0.2, 0.06);
        root.add(ladder);
        for (const x of [-0.17, 0.17]) put(ladder, new THREE.BoxGeometry(0.045, 0.8, 0.03), wood, [x, 0.4, 0]);
        for (let i = 0; i < 3; i++) put(ladder, new THREE.CylinderGeometry(0.016, 0.016, 0.34, 6), wood, [0, 0.14 + i * 0.27, 0], [0, 0, Math.PI / 2]);
      }
    }

    // Spoil heap with the shovel in it.
    const heapAt = [-0.36, 0, 0.28] as const;
    mound(root, random, 0.48, mix(0.24, 0.32, random()), 0.38, soil, heapAt, 0.2);
    clods(root, random, Math.round(mix(40, 130, mood.density)), 0.2, 0.6, 0.028, soils, [heapAt[0], 0.006, heapAt[2]]);
    grass(root, random, Math.round(mix(160, 420, mood.density)), 0.97, 0.06, greens, (x, z) => !inHole(x, z * 0.85) && Math.hypot((x - heapAt[0]) / 0.52, (z * 0.85 - heapAt[2]) / 0.42) > 1, [0, 0.004, 0]).scale.set(1, 1, 0.85);

    const rust = wear * 0.5 + (a.tool === 'ancient' ? 0.5 : a.tool === 'new' ? -0.3 : 0.1);
    const steel = paint(shade('#b9c0c4', '#7a4a2a', rust), { metalness: mix(0.85, 0.3, Math.max(0, rust)), roughness: mix(0.25, 0.85, Math.max(0, rust)) });
    const handleWood = paint(a.tool === 'new' ? '#c9964a' : shade('#a89474', '#6a6258', wear * 0.5), { roughness: a.tool === 'new' ? 0.35 : 0.7 });
    const shovel = new THREE.Group();
    shovel.position.set(heapAt[0] + 0.05, 0.2, heapAt[2] + 0.05);
    shovel.rotation.set(-0.12 + random() * 0.1, random() * 0.8 - 0.4, 0.1 + random() * 0.12);
    root.add(shovel);
    const HL = 0.95;
    limb(shovel, [0, 0.2, 0], [0, 0.2 + HL, 0], 0.026, 0.023, handleWood, 8);
    // Blade, mostly sunk in the heap.
    const blade = new THREE.Shape();
    if (a.tool === 'new' || a.tool === 'ancient') { blade.moveTo(-0.1, 0.3); blade.lineTo(0.1, 0.3); blade.lineTo(0.095, 0.02); blade.lineTo(-0.095, 0.02); }
    else { blade.moveTo(-0.11, 0.3); blade.lineTo(0.11, 0.3); blade.quadraticCurveTo(0.12, 0.08, 0, -0.04); blade.quadraticCurveTo(-0.12, 0.08, -0.11, 0.3); }
    blade.closePath();
    put(shovel, new THREE.ExtrudeGeometry(blade, { depth: 0.008, bevelEnabled: false }), steel, [0, -0.08, -0.004]);
    limb(shovel, [0, 0.15, 0], [0, 0.3, 0], 0.03, 0.022, steel, 8);
    // D grip.
    const gripY = 0.2 + HL;
    put(shovel, new THREE.TorusGeometry(0.055, 0.013, 6, 18, Math.PI), handleWood, [0, gripY + 0.02, 0], [0, 0, 0]);
    limb(shovel, [-0.055, gripY + 0.02, 0], [0.055, gripY + 0.02, 0], 0.013, 0.013, handleWood, 8);
    put(shovel, new THREE.CylinderGeometry(0.024, 0.02, 0.05, 8), steel, [0, gripY - 0.01, 0]);
    if (a.tool === 'ancient') {
      for (let i = 0; i < 6; i++) put(shovel, new THREE.TorusGeometry(0.022, 0.006, 5, 10), paint('#c8b078'), [0, 0.62 + i * 0.013, 0], [Math.PI / 2 + (random() - 0.5) * 0.3, 0, 0]);
      limb(shovel, [0.02, 0.63, 0], [0.06, 0.52, 0.02], 0.004, 0.004, paint('#c8b078'), 4);
    }
    if (a.tool === 'pick') {
      const pick = new THREE.Group();
      pick.position.set(heapAt[0] + 0.3, 0, heapAt[2] + 0.3);
      pick.rotation.set(0.1, 0.5, 0.75);
      root.add(pick);
      limb(pick, [0, 0, 0], [0, 0.9, 0], 0.022, 0.026, handleWood, 8);
      const head = new THREE.CatmullRomCurve3([new THREE.Vector3(-0.3, 0.8, 0), new THREE.Vector3(-0.15, 0.88, 0), new THREE.Vector3(0, 0.9, 0), new THREE.Vector3(0.15, 0.88, 0), new THREE.Vector3(0.3, 0.8, 0)]);
      put(pick, new THREE.TubeGeometry(head, 16, 0.02, 6), steel);
      for (const s of [-1, 1]) put(pick, new THREE.ConeGeometry(0.02, 0.09, 6), steel, [s * 0.335, 0.775, 0], [0, 0, s * (Math.PI / 2 + 0.55)]);
    }

    // Things hung on the handle.
    const cloth = paint(shade('#3a3a33', '#5a4a38', wear * 0.5), { roughness: 1, side: THREE.DoubleSide });
    if (has('coat')) {
      const coat = new THREE.Group();
      coat.position.set(0, gripY - 0.03, 0);
      shovel.add(coat);
      const g = new THREE.CylinderGeometry(0.07, 0.24, 0.68, 14, 6, true);
      const pos = g.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i), t = (0.34 - y) / 0.68, ang = Math.atan2(pos.getZ(i), pos.getX(i));
        const fold = 1 + Math.sin(ang * 5 + t * 2) * 0.16 * t;
        pos.setXYZ(i, pos.getX(i) * fold, y - Math.abs(Math.sin(ang * 2.5)) * 0.06 * t, pos.getZ(i) * fold * 0.7);
      }
      g.computeVertexNormals();
      put(coat, g, cloth, [0, -0.33, 0]);
      put(coat, new THREE.SphereGeometry(1, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), cloth, [0, 0, 0], [0, 0, 0], [0.085, 0.06, 0.06]);
      for (const s of [-1, 1]) {
        limb(coat, [s * 0.07, -0.02, 0], [s * 0.2, -0.3, 0.04], 0.05, 0.04, cloth, 8);
        limb(coat, [s * 0.2, -0.3, 0.04], [s * 0.21, -0.55, 0.06], 0.04, 0.045, cloth, 8);
      }
      for (let i = 0; i < 3; i++) put(coat, new THREE.SphereGeometry(0.012, 6, 5), paint('#8a7a4a', { metalness: 0.6, roughness: 0.4 }), [0.02, -0.18 - i * 0.12, 0.085 + i * 0.022]);
    }
    if (has('hat')) {
      const felt = paint(shade(mood.cheer > 0.6 ? '#5a4a34' : '#2a2826', '#5a5048', wear * 0.5), { roughness: 1 });
      const hat = new THREE.Group();
      hat.position.set(0, gripY + 0.075, 0);
      hat.rotation.set(0.25, random() * 3, 0.3);
      shovel.add(hat);
      const brim = new THREE.CylinderGeometry(0.17, 0.17, 0.008, 22);
      const pos = brim.attributes.position;
      for (let i = 0; i < pos.count; i++) { const r = Math.hypot(pos.getX(i), pos.getZ(i)); if (r > 0.1) pos.setY(i, pos.getY(i) + Math.sin(Math.atan2(pos.getZ(i), pos.getX(i)) * 2) * 0.03 - wear * 0.02); }
      brim.computeVertexNormals();
      put(hat, brim, felt);
      put(hat, new THREE.SphereGeometry(1, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), felt, [0, 0, 0], [0, 0, 0], [0.095, 0.11, 0.105]);
      put(hat, new THREE.CylinderGeometry(0.098, 0.1, 0.025, 18), paint(mood.cheer > 0.6 ? '#8a2a2a' : '#15141a'), [0, 0.016, 0], [0, 0, 0], [1, 1, 1.1]);
    }

    // Hurricane lantern.
    const lantern = new THREE.Group();
    const tin = paint(shade(mood.cheer > 0.5 ? '#b23a2e' : '#3a5a72', '#6a4a30', wear * 0.6), { metalness: 0.55, roughness: 0.5 });
    const lit = a.lantern !== 'kicked';
    const flameColour = a.lantern === 'low' ? '#ffd88a' : '#ffb436';
    const flamePower = (a.lantern === 'low' ? 1.2 : 3) * mix(0.8, 1.2, mood.energy);
    const flame = new THREE.MeshStandardMaterial({ color: flameColour, emissive: mix(0, 1, mood.warmth) > 0.2 ? '#ff9a20' : '#ffe0a0', emissiveIntensity: flamePower });
    {
      put(lantern, new THREE.CylinderGeometry(0.075, 0.085, 0.06, 18), tin, [0, 0.03, 0]);
      put(lantern, new THREE.CylinderGeometry(0.045, 0.07, 0.03, 18), tin, [0, 0.075, 0]);
      put(lantern, new THREE.CylinderGeometry(0.012, 0.012, 0.03, 8), paint('#c8a444', { metalness: 0.8, roughness: 0.3 }), [0.07, 0.085, 0], [0, 0, Math.PI / 2]);
      const profile = [[0.04, 0], [0.068, 0.04], [0.074, 0.075], [0.06, 0.12], [0.038, 0.145]].map(([x, y]) => new THREE.Vector2(x, y));
      put(lantern, new THREE.LatheGeometry(profile, 18), new THREE.MeshStandardMaterial({ color: lit ? '#ffe9b0' : '#cfd8d8', emissive: lit ? '#ffb040' : '#000000', emissiveIntensity: lit ? flamePower * 0.22 : 0, transparent: true, opacity: 0.32, depthWrite: false, roughness: 0.1, side: THREE.DoubleSide }), [0, 0.09, 0]).castShadow = false;
      if (lit) put(lantern, new THREE.SphereGeometry(1, 10, 8), flame, [0, a.lantern === 'low' ? 0.125 : 0.145, 0], [0, 0, 0], a.lantern === 'low' ? [0.012, 0.02, 0.012] : [0.024, 0.048, 0.024]).castShadow = false;
      put(lantern, new THREE.CylinderGeometry(0.048, 0.04, 0.03, 16), tin, [0, 0.25, 0]);
      put(lantern, new THREE.CylinderGeometry(0.03, 0.05, 0.035, 16), tin, [0, 0.282, 0]);
      put(lantern, new THREE.CylinderGeometry(0.036, 0.036, 0.008, 16), tin, [0, 0.305, 0]);
      for (const s of [-1, 1]) {
        const tube = new THREE.CatmullRomCurve3([new THREE.Vector3(s * 0.07, 0.05, 0), new THREE.Vector3(s * 0.1, 0.12, 0), new THREE.Vector3(s * 0.1, 0.22, 0), new THREE.Vector3(s * 0.045, 0.265, 0)]);
        put(lantern, new THREE.TubeGeometry(tube, 12, 0.011, 6), tin);
      }
      const wire = paint('#8a8a86', { metalness: 0.8, roughness: 0.4 });
      for (const y of [0.13, 0.19]) put(lantern, new THREE.TorusGeometry(0.078, 0.003, 4, 20), wire, [0, y, 0], [Math.PI / 2, 0, 0]);
      for (const t of [0.8, 2.35, 3.95, 5.5]) limb(lantern, [Math.cos(t) * 0.078, 0.1, Math.sin(t) * 0.078], [Math.cos(t) * 0.07, 0.235, Math.sin(t) * 0.07], 0.003, 0.003, wire, 4);
      put(lantern, new THREE.TorusGeometry(0.105, 0.004, 4, 20, Math.PI), wire, [0, 0.27, 0], [a.lantern === 'hung' ? 0 : 0.9, 0, 0]);
    }
    const lanternScale = 1.6;
    lantern.scale.setScalar(lanternScale);
    const pendulum = new THREE.Group();
    if (a.lantern === 'hung') {
      pendulum.position.set(0.058, gripY + 0.02, 0);
      shovel.add(pendulum);
      lantern.position.set(0, -0.375 * lanternScale, 0);
      pendulum.add(lantern);
      pendulum.rotation.z = -shovel.rotation.z;
    } else if (a.lantern === 'kicked') {
      lantern.position.set(0.3, 0.1 * lanternScale, 0.5);
      lantern.rotation.set(0.2, random() * 3, Math.PI / 2 - 0.08);
      root.add(lantern);
      // Spilt oil and broken glass.
      put(root, new THREE.CylinderGeometry(0.16, 0.16, 0.004, 16), paint('#1a1612', { roughness: 0.2 }), [0.46, 0.008, 0.44], [0, 0, 0], [1, 1, 0.6]);
      const shards: Bit[] = [];
      for (let i = 0; i < 9; i++) shards.push({ p: [0.5 + (random() - 0.5) * 0.3, 0.016, 0.46 + (random() - 0.5) * 0.24], r: [random() * 0.5, random() * 3, random() * 0.5], s: [0.02 + random() * 0.02, 0.003, 0.012] });
      many(root, new THREE.TetrahedronGeometry(1), paint('#dff0ee', { roughness: 0.1, metalness: 0.3 }), shards);
    } else {
      lantern.position.set(0.3, 0, 0.48);
      lantern.rotation.y = random() * 3;
      root.add(lantern);
    }

    // Boot stuck in the mud.
    if (has('boot')) {
      const leather = paint(shade('#4a3424', '#3a342c', wear * 0.6), { roughness: 0.8 });
      const boot = new THREE.Group();
      boot.position.set(-0.05, 0, 0.68);
      boot.scale.setScalar(1.2);
      boot.rotation.set(-0.12, 0.6 + random(), 0.14);
      root.add(boot);
      put(boot, new THREE.SphereGeometry(1, 14, 10), leather, [0, 0.05, 0.07], [0, 0, 0], [0.058, 0.055, 0.13]);
      put(boot, new THREE.BoxGeometry(0.11, 0.02, 0.27), paint('#1c1814'), [0, 0.01, 0.06]);
      put(boot, new THREE.CylinderGeometry(0.062, 0.055, 0.26, 12, 1, true), leather, [0, 0.2, -0.02]).material = paint(shade('#4a3424', '#3a342c', wear * 0.6), { roughness: 0.8, side: THREE.DoubleSide });
      put(boot, new THREE.TorusGeometry(0.061, 0.008, 5, 14), leather, [0, 0.33, -0.02], [Math.PI / 2, 0, 0]);
      put(boot, new THREE.CircleGeometry(0.055, 12), paint('#120e0c'), [0, 0.325, -0.02], [-Math.PI / 2, 0, 0]);
      for (let i = 0; i < 4; i++) limb(boot, [-0.02, 0.1 + i * 0.05, 0.04], [0.02, 0.12 + i * 0.05, 0.04], 0.004, 0.004, paint('#c8b078'), 4);
      put(root, new THREE.TorusGeometry(0.13, 0.045, 6, 16), darkSoil, [-0.05, 0.0, 0.7], [Math.PI / 2, 0, 0], [1.1, 1.3, 0.6]);
    }
    if (has('lunch')) {
      const pail = paint(shade('#aeb4b6', '#7a5a3a', wear * 0.5), { metalness: 0.7, roughness: 0.45 });
      const at = [0.76, 0, 0.2] as const;
      put(root, new THREE.CylinderGeometry(0.1, 0.09, 0.17, 18), pail, [at[0], 0.085, at[2]]);
      put(root, new THREE.TorusGeometry(0.1, 0.005, 4, 18, Math.PI), pail, [at[0], 0.16, at[2]], [0.5, 0.4, 0]);
      put(root, new THREE.CylinderGeometry(0.105, 0.105, 0.025, 18), pail, [at[0] + 0.03, 0.0125, at[2] + 0.23]);
      put(root, new THREE.BoxGeometry(0.12, 0.035, 0.11), paint('#e8d8a8'), [at[0] - 0.02, 0.185, at[2]], [0.1, 0.5, 0.15]);
      put(root, new THREE.BoxGeometry(0.11, 0.012, 0.1), paint('#c85a4a'), [at[0] - 0.02, 0.19, at[2]], [0.1, 0.5, 0.15], [1.04, 1, 1.04]);
      put(root, new THREE.SphereGeometry(0.04, 10, 8), paint(mood.cheer > 0.5 ? '#c8382a' : '#8a9a3a'), [at[0] + 0.0, 0.062, at[2] + 0.24]);
    }
    if (has('flask')) {
      const bucket = paint(shade('#8a8f92', '#6a4a30', wear * 0.6), { metalness: 0.6, roughness: 0.5 });
      const at = has('lunch') ? [0.5, 0, 0.7] as const : [0.76, 0, 0.2] as const;
      put(root, new THREE.CylinderGeometry(0.11, 0.14, 0.24, 18), bucket, [at[0], 0.12, at[2]]);
      const silver = paint('#d5d8da', { metalness: 0.9, roughness: 0.2 });
      put(root, new THREE.CylinderGeometry(0.045, 0.045, 0.11, 14), silver, [at[0] - 0.02, 0.3, at[2]], [0, 0.3, 0], [1, 1, 0.45]);
      put(root, new THREE.CylinderGeometry(0.013, 0.013, 0.03, 8), paint('#2a2a2a'), [at[0] - 0.02, 0.37, at[2]]);
      limb(root, [at[0] + 0.03, 0.247, at[2] + 0.06], [at[0] + 0.1, 0.25, at[2] - 0.02], 0.005, 0.005, paint('#e8e2d0'), 5);
      put(root, new THREE.CylinderGeometry(0.014, 0.01, 0.025, 8), paint('#e8e2d0'), [at[0] + 0.1, 0.258, at[2] - 0.02]);
    }

    // What is left to say what happened.
    const lipZ = HZ + HD / 2;
    if (a.signs === 'drag') {
      for (const s of [-1, 1]) {
        const path = new THREE.CatmullRomCurve3([new THREE.Vector3(0.52 + s * 0.09, 0.012, 0.78), new THREE.Vector3(0.58 + s * 0.09, 0.012, 0.5), new THREE.Vector3(0.48 + s * 0.09, 0.012, 0.15), new THREE.Vector3(0.54 + s * 0.08, 0.012, lipZ + 0.02)]);
        put(root, new THREE.TubeGeometry(path, 24, 0.035, 5), mark, [0, 0, 0], [0, 0, 0], [1, 0.25, 1]).castShadow = false;
      }
      put(root, new THREE.SphereGeometry(1, 10, 8), paint('#b8a070'), [0.72, 0.02, 0.62], [0, 0.6, 0], [0.07, 0.014, 0.1]);
      for (let i = 0; i < 4; i++) limb(root, [0.7 + i * 0.02, 0.02, 0.54], [0.67 + i * 0.03, 0.02, 0.46], 0.011, 0.009, paint('#b8a070'), 5);
    } else if (a.signs === 'claws') {
      for (const cx of [-0.04, 0.44]) for (let i = 0; i < 4; i++) {
        const x = cx + i * 0.075, len = 0.24 + random() * 0.12;
        put(root, new THREE.ConeGeometry(0.022, len, 4), mark, [x + (i - 1.5) * 0.02, 0.012, lipZ + 0.32 + len / 2 - 0.1], [Math.PI / 2, 0, (i - 1.5) * 0.06], [1, 1, 0.3]).castShadow = false;
        put(root, new THREE.IcosahedronGeometry(0.02, 0), darkSoil, [x + (i - 1.5) * 0.03, 0.02, lipZ + 0.32 + len - 0.08]);
      }
    } else if (a.signs === 'fled' || a.signs === 'climbed') {
      const bare = a.signs === 'climbed';
      let x = 0.52, z = lipZ + 0.2;
      const heading = bare ? 0.2 : 0.28;
      for (let i = 0; i < (bare ? 6 : 5); i++) {
        const side = i % 2 ? 1 : -1;
        const px = x + side * 0.07 * Math.cos(heading), pz = z - side * 0.07 * Math.sin(heading);
        if (Math.hypot(px, pz / 0.85) < 0.95) {
          put(root, new THREE.SphereGeometry(1, 10, 6), mark, [px, 0.011, pz], [0, heading, 0], bare ? [0.04, 0.006, 0.085] : [0.05, 0.008, 0.1]).castShadow = false;
          if (bare) for (let t = 0; t < 4; t++) put(root, new THREE.SphereGeometry(0.012 - t * 0.0015, 6, 4), mark, [px + Math.sin(heading) * 0.1 + Math.cos(heading) * (t - 1.5) * 0.02, 0.011, pz + Math.cos(heading) * 0.1 - Math.sin(heading) * (t - 1.5) * 0.02], [0, 0, 0], [1, 0.4, 1]).castShadow = false;
          else put(root, new THREE.SphereGeometry(1, 8, 6), mark, [px - Math.sin(heading) * 0.12, 0.011, pz - Math.cos(heading) * 0.12], [0, heading, 0], [0.04, 0.008, 0.04]).castShadow = false;
        }
        const stride = bare ? 0.16 : 0.12 + i * 0.06;
        x += Math.sin(heading) * stride; z += Math.cos(heading) * stride;
      }
      if (bare && a.hole !== 'filled') {
        mound(root, random, 0.34, 0.16, 0.26, soil, [HX - 0.25, 0.005, HZ + 0.02], 0.3);
        clods(root, random, 50, 0.15, 0.6, 0.035, soils, [HX - 0.25, 0, HZ + 0.2]);
      }
      if (bare && a.hole === 'filled') {
        put(root, new THREE.CylinderGeometry(0.22, 0.26, 0.05, 14), paint('#120e0c', { roughness: 1 }), [HX - 0.25, 0.225, HZ + 0.02], [0, 0, 0], [1, 1, 0.8]);
        clods(root, random, 50, 0.2, 0.6, 0.035, soils, [HX - 0.25, 0.1, HZ + 0.1]);
      }
    }

    // A marker for the grave.
    const head = [HX - HW / 2 - 0.17, 0, HZ] as const;
    const plank = paint(shade('#c8ae7c', '#6a5a48', wear * 0.6));
    if (a.marker === 'stake') {
      put(root, new THREE.BoxGeometry(0.07, 0.5, 0.03), plank, [head[0], 0.25, head[2]], [0, Math.PI / 2 - 0.4, 0.08]);
      const no = put(root, new THREE.PlaneGeometry(0.06, 0.1), paint('#ffffff', { map: numeral(String(100 + Math.floor(random() * 800))) }), [head[0] + 0.012, 0.4, head[2] + 0.01], [0, Math.PI / 2 - 0.4, 0.08]);
      no.castShadow = false;
    } else if (a.marker === 'cross') {
      const cross = new THREE.Group();
      cross.position.set(head[0], 0, head[2]);
      cross.rotation.set(0, Math.PI / 2 - 0.5, 0.1 + wear * 0.2);
      root.add(cross);
      put(cross, new THREE.BoxGeometry(0.07, 0.75, 0.025), plank, [0, 0.375, 0]);
      put(cross, new THREE.BoxGeometry(0.42, 0.07, 0.025), plank, [0, 0.55, 0.02]);
    } else if (a.marker === 'wreath') {
      const stand = paint('#3a3a3a', { metalness: 0.6, roughness: 0.5 });
      const at = [head[0] + 0.05, 0, head[2] + 0.1] as const;
      for (const [dx, dz] of [[-0.14, 0.1], [0.14, 0.1], [0, -0.16]] as const) limb(root, [at[0] + dx, 0, at[2] + dz], [at[0], 0.75, at[2]], 0.008, 0.008, stand, 5);
      const wreath = new THREE.Group();
      wreath.position.set(at[0], 0.62, at[2] + 0.07);
      wreath.rotation.set(-0.25, 0.5, 0);
      root.add(wreath);
      put(wreath, new THREE.TorusGeometry(0.19, 0.05, 8, 24), paint('#2f5a34', { roughness: 1 }));
      const blooms: Bit[] = [];
      const petals = mood.cheer > 0.5 ? ['#f4f0e4', '#f0c8d8', '#f2d24a'] : ['#f4f0e4', '#d8d4e8', '#8a2a3a'];
      for (let i = 0; i < 16; i++) { const t = i / 16 * Math.PI * 2; blooms.push({ p: [Math.cos(t) * 0.19, Math.sin(t) * 0.19, 0.045], s: 0.032 + random() * 0.014, c: petals[i % 3] }); }
      many(wreath, new THREE.IcosahedronGeometry(1, 0), paint('#ffffff', { roughness: 0.8, flatShading: true }), blooms);
      put(wreath, new THREE.BoxGeometry(0.07, 0.3, 0.004), paint('#f4f0e4'), [0.03, -0.25, 0.06], [0, 0, 0.2]);
    }

    // Clutter with density: rope, bucket of lime, a spare plank.
    if (mood.density > 0.55) {
      const rope = paint('#c8b078');
      for (let i = 0; i < 3; i++) put(root, new THREE.TorusGeometry(0.13 - i * 0.012, 0.016, 5, 18), rope, [-0.8, 0.02 + i * 0.03, -0.1], [Math.PI / 2, 0, 0]);
    }
    if (mood.density > 0.8) put(root, new THREE.BoxGeometry(0.16, 0.025, 0.8), paint(shade('#b89a68', '#6a5a44', wear * 0.6)), [-0.9, 0.02, 0.35], [0, 0.4, 0]);

    function numeral(text: string) {
      const canvas = document.createElement('canvas');
      canvas.width = 64; canvas.height = 100;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#c8ae7c'; ctx.fillRect(0, 0, 64, 100);
      ctx.fillStyle = '#1c1814'; ctx.font = 'bold 26px monospace'; ctx.textAlign = 'center';
      [...text].forEach((ch, i) => ctx.fillText(ch, 32, 30 + i * 28));
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      return texture;
    }

    const energy = mood.energy;
    const hung = a.lantern === 'hung';
    const restZ = pendulum.rotation.z;
    return {
      object: root,
      footprint: 1.0,
      update(_dt, time) {
        if (lit) flame.emissiveIntensity = flamePower * (0.8 + 0.2 * Math.sin(time * (6 + energy * 12)) * Math.sin(time * 2.1 + 0.7));
        if (hung) pendulum.rotation.z = restZ + Math.sin(time * (1.2 + energy * 2)) * (0.04 + energy * 0.2);
      },
      dispose: () => disposeTree(root),
    };
  },
});
// compacted layout
