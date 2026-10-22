import * as THREE from 'three';
import { Sculpture, choice, defineThing, disposeTree, mix, score } from '@conjure/kit';

type P = [number, number, number];

export default defineThing({
  questions: {
    mirror: choice('What state is the gold mirror in?', {
      pristine: 'Pristine: eighteen flawless gold hexagons acting as one.',
      dark: 'One segment has gone dark, a missing tooth in the honeycomb.',
      pitted: 'Pitted by micrometeorites, small black pocks scattered over the gold.',
      unphased: 'Not yet aligned: every segment tipped a slightly different way, each seeing its own sky.',
      frosted: 'Dulled and pale, as if frost or dust had settled on it.',
    }),
    deployed: choice('How far has it unfolded?', {
      full: 'Fully deployed, wings locked and shield stretched tight.',
      wings: 'Mirror wings still folded back, the honeycomb only three columns wide.',
      packed: 'Half-folded for launch: wings back, the secondary boom stowed, the shield still bundled on its pallets.',
    }),
    shield: choice('What condition is the sunshield in?', {
      taut: 'Taut and clean, five crisp layers.',
      slack: 'Slack: the layers sag and sit askew from one another.',
      torn: 'Torn: a corner of the top layers has ripped away and a flap hangs loose.',
      patched: 'Patched with squares of mismatched foil and tape.',
    }),
    target: choice('What is in the patch of sky it is pointed at?', {
      void: 'Nothing yet: an empty black square.',
      smudge: 'One faint red smudge, right at the limit.',
      field: 'A crowd of tiny galaxies of every colour, the deep field resolved.',
      arcs: 'Thin arcs of light smeared around a cluster, a gravitational lens.',
      spoiled: 'A foreground star with six glaring spikes spoiling the frame.',
    }),
    exposure: score('How long has it been staring at that patch?', ['A single quick frame', 'A few frames', 'Weeks: a thick stack of exposures']),
    aim: choice('Where is it aimed?', {
      level: 'Level, straight out toward the horizon.',
      raised: 'Raised, looking up and away.',
      steep: 'Tipped steeply back, staring almost overhead.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const wear = mood.wear;
    const gold = new THREE.Color('#d9961f').lerp(new THREE.Color('#e8a83a'), mood.warmth * 0.3);
    if (a.mirror === 'frosted') gold.lerp(new THREE.Color('#d9d2bd'), 0.6);
    const goldPaint = new THREE.MeshStandardMaterial({ color: gold, metalness: a.mirror === 'frosted' ? 0.3 : 0.85, roughness: a.mirror === 'frosted' ? 0.7 : 0.22, emissive: gold, emissiveIntensity: mix(0.1, 0.2, mood.cheer) });
    const deadPaint = new THREE.MeshStandardMaterial({ color: '#2b2622', roughness: 0.8 });
    const black = s.material('#22242a', { roughness: 0.7 });
    const frame = s.material('#3a3d45', { roughness: 0.6, metalness: 0.4 });
    const foil = s.material('#d9b45a', { metalness: 0.6, roughness: 0.45 });

    // ---- Sunshield: five kite-shaped membranes, long axis fore and aft (z). ----
    const packed = a.deployed === 'packed';
    const shieldY = 1.25;
    const kite = (grow: number, notch: boolean) => {
      const w = (packed ? 0.9 : 2.7) * grow, l = 4.3 * grow;
      const shape = new THREE.Shape();
      const pts: [number, number][] = [[0, -l], [w, -l * 0.28], [w * 0.92, l * 0.3], [0, l], [-w * 0.92, l * 0.3], [-w, -l * 0.28]];
      if (notch) pts.splice(1, 1, [w * 0.45, -l * 0.66], [w * 0.5, -l * 0.3], [w * 0.95, -l * 0.1]);
      pts.forEach(([x, y], i) => (i ? shape.lineTo(x, y) : shape.moveTo(x, y)));
      shape.closePath();
      const geometry = new THREE.ShapeGeometry(shape);
      geometry.rotateX(Math.PI / 2);
      return geometry;
    };
    for (let i = 0; i < 5; i++) {
      const tone = new THREE.Color('#d8d3e2').lerp(new THREE.Color('#b9789c'), i / 4).lerp(new THREE.Color('#8c8478'), wear * 0.35);
      const layer = new THREE.Mesh(kite(1 + i * 0.035, a.shield === 'torn' && i < 2), new THREE.MeshStandardMaterial({ color: tone, metalness: 0.45, roughness: 0.38, side: THREE.DoubleSide, emissive: tone, emissiveIntensity: 0.12 }));
      layer.position.y = shieldY - i * (packed ? 0.05 : 0.12);
      if (a.shield === 'slack') { layer.rotation.set((random() - 0.5) * 0.09, (random() - 0.5) * 0.08, (random() - 0.5) * 0.12); layer.position.y -= random() * 0.12; }
      layer.castShadow = layer.receiveShadow = true;
      s.root.add(layer);
    }
    if (a.shield === 'torn') {
      const flap = new THREE.Shape();
      flap.moveTo(0, 0); flap.lineTo(1.5, 0.2); flap.lineTo(0.5, 1.5); flap.closePath();
      const rag = new THREE.Mesh(new THREE.ShapeGeometry(flap), new THREE.MeshStandardMaterial({ color: '#d8d3e2', metalness: 0.4, roughness: 0.4, side: THREE.DoubleSide }));
      rag.position.set(packed ? 0.5 : 1.4, shieldY - 0.1, 2.3);
      rag.rotation.set(0.5, 0.4, -0.5);
      rag.castShadow = true;
      s.root.add(rag);
    }
    if (a.shield === 'patched') for (let i = 0; i < 6; i++) {
      const patch = s.box([0.5 + random() * 0.5, 0.012, 0.4 + random() * 0.5], [(random() - 0.5) * (packed ? 1 : 3.4), shieldY + 0.012, (random() < 0.5 ? -1 : 1) * (1.5 + random() * 1.6)], i % 2 ? foil : s.material(i % 3 ? '#8f9aa8' : '#c7694a', { metalness: 0.3 }));
      patch.rotation.y = random() * 3;
    }
    // Spreader booms and the pallets the shield unrolled from.
    const boomReach = packed ? 0.9 : 2.75;
    s.rod([-boomReach, shieldY - 0.3, 1.2], [boomReach, shieldY - 0.3, 1.2], 0.045, frame);
    s.box([0.7, 0.2, 3.6], [0, shieldY - 0.72, -2.4], frame);
    s.box([0.7, 0.2, 3.6], [0, shieldY - 0.72, 2.4], frame);
    if (packed) for (const z of [-2.4, 2.4]) for (const x of [-0.55, 0.55]) s.cylinder(0.28, 0.28, 3.3, [x, shieldY - 0.45, z], s.material('#cfc7da', { metalness: 0.4, roughness: 0.4 }), 14).rotation.x = Math.PI / 2;

    // ---- Spacecraft bus under the shield, with a solar wing and a dish. ----
    s.box([1.5, 1.0, 1.5], [0, 0.5, 0], foil);
    s.box([1.2, 0.08, 1.2], [0, 1.04, 0], frame);
    const wing = s.box([0.06, 0.95, 2.6], [-0.95, 0.5, 1.5], s.material('#1f2f5c', { metalness: 0.5, roughness: 0.35 }));
    wing.rotation.z = 0.3;
    for (let i = 0; i < 4; i++) { const seam = s.box([0.07, 0.95, 0.03], [-0.95, 0.5, 0.45 + i * 0.7], frame); seam.rotation.z = 0.3; }
    const dish = s.lathe([[0, 0], [0.25, 0.03], [0.45, 0.12], [0.55, 0.22]], s.material('#e9e6dc', { roughness: 0.4, side: THREE.DoubleSide }), [0.95, 0.42, 0.7]);
    dish.rotation.set(Math.PI / 2 + 0.5, 0, -0.6);
    s.rod([0.75, 0.5, 0.5], [0.95, 0.42, 0.7], 0.03, frame);

    // ---- The telescope: honeycomb primary, secondary on a tripod, instrument box behind. ----
    const R = 0.46;
    const scope = new THREE.Group();
    const elevation = { level: 0.08, raised: 0.4, steep: 0.72 }[a.aim];
    const centreY = shieldY + 0.55 + R * 4.4;
    scope.position.set(0, centreY, -0.4);
    scope.rotation.x = -elevation;
    s.root.add(scope);
    const hex = new THREE.CylinderGeometry(R * 0.96, R * 0.96, 0.08, 6);
    hex.rotateX(Math.PI / 2);
    const wings = { left: new THREE.Group(), right: new THREE.Group() };
    const hingeX = Math.sqrt(3) * R * 1.5;
    wings.left.position.x = -hingeX; wings.right.position.x = hingeX;
    scope.add(wings.left, wings.right);
    const cells: [number, number][] = [];
    for (let q = -2; q <= 2; q++) for (let r = -2; r <= 2; r++) if (Math.abs(q + r) <= 2 && (q || r)) cells.push([q, r]);
    const deadIndex = Math.floor(random() * cells.length);
    const pocks: { at: P; size: number }[] = [];
    cells.forEach(([q, r], index) => {
      const x = Math.sqrt(3) * R * (q + r / 2), y = 1.5 * R * r;
      const segment = new THREE.Mesh(hex, a.mirror === 'dark' && index === deadIndex ? deadPaint : goldPaint);
      segment.castShadow = true;
      const side = x < -hingeX + 0.01 ? wings.left : x > hingeX - 0.01 ? wings.right : scope;
      segment.position.set(x - side.position.x, y, 0);
      if (a.mirror === 'unphased') segment.rotation.set((random() - 0.5) * 0.36, (random() - 0.5) * 0.36, 0);
      side.add(segment);
      const backing = new THREE.Mesh(hex, black);
      backing.position.set(x - side.position.x, y, -0.1);
      backing.scale.set(1.04, 1.04, 1.2);
      side.add(backing);
      const count = a.mirror === 'pitted' ? 2 + Math.floor(random() * 4) : wear > 0.6 && random() < 0.4 ? 1 : 0;
      if (side === scope) for (let k = 0; k < count; k++) pocks.push({ at: [x + (random() - 0.5) * R, y + (random() - 0.5) * R, 0.045], size: 0.025 + random() * 0.05 });
    });
    if (pocks.length) scope.add(s.scatter(new THREE.CylinderGeometry(1, 1, 0.3, 8).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#17140f' }), pocks));
    const fold = { full: 0, wings: 1.9, packed: 2.1 }[a.deployed];
    wings.left.rotation.y = fold; wings.right.rotation.y = -fold;
    // Backplane, instrument module and the dark central baffle.
    const back = new THREE.Mesh(new THREE.BoxGeometry(R * 5.4, R * 7, 0.5), black);
    back.position.z = -0.42; back.castShadow = true; scope.add(back);
    const module = new THREE.Mesh(new THREE.BoxGeometry(R * 3.6, R * 4.2, 0.9), frame);
    module.position.z = -1.05; module.castShadow = true; scope.add(module);
    const baffle = new THREE.Mesh(new THREE.ConeGeometry(R * 0.55, 0.9, 6, 1, true), black);
    baffle.rotation.x = -Math.PI / 2; baffle.position.z = 0.4; scope.add(baffle);
    // Secondary mirror on three booms.
    const tip = new THREE.Vector3(0, 0, packed ? 0.9 : R * 7.4);
    const boom = (from: THREE.Vector3) => {
      const dir = tip.clone().sub(from), rod = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, dir.length(), 8), black);
      rod.position.copy(from).add(tip).multiplyScalar(0.5);
      rod.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
      rod.castShadow = true; scope.add(rod);
    };
    boom(new THREE.Vector3(-R * 1.8, -R * 3.2, 0)); boom(new THREE.Vector3(R * 1.8, -R * 3.2, 0)); boom(new THREE.Vector3(0, R * 3.2, 0));
    const secondary = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.5, R * 0.5, 0.07, 20).rotateX(Math.PI / 2), goldPaint);
    secondary.position.copy(tip); scope.add(secondary);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.56, R * 0.56, 0.1, 20).rotateX(Math.PI / 2), black);
    cap.position.copy(tip).z += 0.07; scope.add(cap);
    // Pedestal joining telescope to the bus through the shield.
    s.box([0.9, centreY - shieldY - R * 2.4, 0.7], [0, (centreY + shieldY) / 2 - R * 1.2, -0.75], frame);

    // ---- The patch of sky: a small dark plate held out along the line of sight. ----
    const plate = (seedTurn: number) => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 256;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#0d1020'; ctx.fillRect(0, 0, 256, 256);
      const dot = (x: number, y: number, r: number, colour: string, squash = 1, turn = 0) => {
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
        g.addColorStop(0, colour); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.save(); ctx.translate(x, y); ctx.rotate(turn); ctx.scale(1, squash); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.3); ctx.fill(); ctx.restore();
      };
      const hues = ['#ffd9a0', '#ff9a6a', '#a8c8ff', '#ffffff', '#ff6a5a', '#ffe7c8'];
      for (let i = 0; i < 26; i++) dot(random() * 256, random() * 256, 1.5 + random() * 1.5, 'rgba(160,170,200,0.6)');
      if (a.target === 'smudge') dot(128 + seedTurn * 6, 132, 26, '#e0503a', 0.6, 0.6);
      if (a.target === 'field') for (let i = 0; i < 90; i++) dot(random() * 256, random() * 256, 4 + random() ** 3 * 22, hues[i % hues.length], 0.3 + random() * 0.7, random() * 3);
      if (a.target === 'arcs') {
        for (let i = 0; i < 9; i++) dot(128 + (random() - 0.5) * 50, 128 + (random() - 0.5) * 50, 10 + random() * 10, '#ffe7c8', 0.8, random() * 3);
        ctx.lineCap = 'round';
        for (let i = 0; i < 7; i++) { const r = 60 + random() * 50, t = random() * 6.28; ctx.strokeStyle = hues[i % 3 + 1]; ctx.lineWidth = 3 + random() * 4; ctx.beginPath(); ctx.arc(128, 128, r, t, t + 0.4 + random() * 0.7); ctx.stroke(); }
      }
      if (a.target === 'spoiled') {
        for (let i = 0; i < 20; i++) dot(random() * 256, random() * 256, 3 + random() * 6, hues[i % hues.length], 0.5, random() * 3);
        ctx.strokeStyle = '#ffffff'; ctx.lineCap = 'round';
        for (let i = 0; i < 3; i++) { ctx.lineWidth = i === 1 ? 4 : 7; ctx.beginPath(); const t = i * Math.PI / 3 + Math.PI / 6; ctx.moveTo(128 - Math.cos(t) * 130, 128 - Math.sin(t) * 130); ctx.lineTo(128 + Math.cos(t) * 130, 128 + Math.sin(t) * 130); ctx.stroke(); }
        dot(128, 128, 44, '#ffffff');
      }
      ctx.strokeStyle = '#e9e4d2'; ctx.lineWidth = 10; ctx.strokeRect(5, 5, 246, 246);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      return texture;
    };
    const sight = new THREE.Vector3(0, Math.sin(elevation), Math.cos(elevation));
    const eye = new THREE.Vector3(0, centreY, -0.4).addScaledVector(sight, tip.z);
    const far = eye.clone().addScaledVector(sight, 3.0);
    const frames = Math.round(mix(1, 9, a.exposure));
    const image = plate(random());
    for (let i = 0; i < frames; i++) {
      const card = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.5, 0.03), [black, black, black, black, new THREE.MeshStandardMaterial({ map: image, roughness: 0.6, emissive: '#ffffff', emissiveMap: image, emissiveIntensity: 0.35 }), new THREE.MeshStandardMaterial({ map: image, roughness: 0.6 })]);
      card.position.copy(far).addScaledVector(sight, i * 0.14);
      card.position.x += i * 0.07; card.position.y += i * 0.03;
      card.lookAt(card.position.clone().sub(sight));
      card.rotateY(Math.PI);
      card.rotation.z += (random() - 0.5) * 0.06 * Math.min(i, 1);
      card.castShadow = true;
      s.root.add(card);
    }
    // A dotted sight line from the secondary to the plate.
    const beads = Array.from({ length: 9 }, (_u, i) => ({ at: eye.clone().lerp(far, (i + 1) / 10).toArray() as P, size: 0.035, color: '#6f8fc8' }));
    s.scatter(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffffff' }), beads);

    // Turned three-quarters, so the mirror and the patch it watches are both in view.
    s.root.rotation.y = (random() < 0.5 ? -1 : 1) * mix(0.75, 1.0, random());
    const built = s.finish();
    const energy = mood.energy;
    return {
      object: built.object,
      update(_dt, time) {
        // It holds very still; only the slightest pointing jitter, and the dish hunting for home.
        scope.rotation.x = -elevation + Math.sin(time * mix(0.2, 2.2, energy)) * mix(0.001, 0.012, energy);
        dish.rotation.z = -0.6 + Math.sin(time * mix(0.1, 0.9, energy)) * 0.25;
      },
      dispose: () => { image.dispose(); disposeTree(built.object); },
    };
  },
});
