import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

const METALS = { brass: 'Polished yellow brass.', iron: 'Black iron.', pewter: 'Dull grey pewter.', gold: 'Bright gold.', copper: 'Rosy copper.' } as const;
const METAL: Record<keyof typeof METALS, string> = { brass: '#c8a04a', iron: '#303236', pewter: '#a4a9ab', gold: '#e6bb38', copper: '#bd7146' };
const HX = 0.33, HY0 = 0.3, HC = 1.5, HTOP = HC + HX;

/** The keyhole outline: a round head over a flaring slot. */
function keyholePath<T extends THREE.Path>(path: T, grow = 0) {
  const r = HX + grow, half = 0.14 + grow, y = HC - Math.sqrt(r * r - half * half), start = Math.atan2(y - HC, half);
  path.moveTo(-0.28 - grow, HY0 - grow);
  path.lineTo(0.28 + grow, HY0 - grow);
  path.lineTo(half, y);
  path.absarc(0, HC, r, start, Math.PI - start, false);
  path.lineTo(-0.28 - grow, HY0 - grow);
  return path;
}

export default defineThing({
  questions: {
    through: choice('What shows through the keyhole?', {
      eye: 'Darkness, and one huge eye looking back.',
      garden: 'A sunlit garden with a path.',
      stairs: 'Pale stairs climbing away into light.',
      night: 'A night sky with a moon.',
      light: 'Blinding light and nothing else.',
      sea: 'An open sea with a tiny ship on the horizon.',
      room: 'A lamplit bedroom, small and far away.',
      open: 'Only the other side: it is just a hole.',
    }),
    key: choice('Where is the key, and does it fit?', {
      lying: 'Lying on the ground in front, whole, waiting to be lifted.',
      leaning: 'Leaning against the plate like a ladder.',
      inserted: 'In the lock, half turned: it fits.',
      broken: 'Snapped in two, the bit jammed in the hole, the bow on the ground.',
      small: 'An ordinary-sized key on the ground, hopelessly too small.',
      lost: 'Lost: only a chalk outline where a key once lay.',
    }),
    plate: choice('What shape is the escutcheon plate?', {
      oval: 'A tall oval.', rectangle: 'A plain rounded rectangle.', shield: 'A scrolled baroque shield.', arch: 'A pointed gothic arch.', disc: 'A great round disc.',
    }),
    metal: choice('What metal is it?', METALS),
    mount: choice('What is it fixed to?', {
      footing: 'Nothing: it stands on its own edge on a metal foot.',
      door: 'A splintered fragment of an enormous door.',
      steps: 'A stone threshold with two steps up to the hole.',
    }),
    cover: noul('Does a swinging cover plate hang beside the hole, pushed aside?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const tint = METAL[a.metal];
    const metal = s.material(tint, { metalness: 0.85, roughness: mix(0.22, 0.5, mood.wear) });
    const deep = s.material(new THREE.Color(tint).multiplyScalar(0.62), { metalness: 0.8, roughness: 0.45 });
    const depth = 0.1, lift = a.mount === 'footing' ? 0.07 : 0;

    // Plate outline.
    const outline: [number, number][] = [];
    const N = 72;
    for (let i = 0; i < N; i++) {
      const t = (i / N) * Math.PI * 2, c = Math.cos(t), sn = Math.sin(t);
      if (a.plate === 'oval') outline.push([c * 0.78, 1.27 + sn * 1.27]);
      else if (a.plate === 'disc') outline.push([c * 1.22, 1.22 + sn * 1.22]);
      else if (a.plate === 'rectangle') { const e = 0.22; outline.push([Math.sign(c) * Math.abs(c) ** e * 0.72, 1.25 + Math.sign(sn) * Math.abs(sn) ** e * 1.25]); }
      else if (a.plate === 'shield') { const wob = 1 + 0.09 * Math.cos(t * 6) + 0.05 * Math.cos(t * 2); outline.push([c * 0.82 * wob, 1.3 + sn * 1.3 * (1 + 0.05 * Math.cos(t * 6))]); }
      else { const up = sn > 0; outline.push(up ? [Math.sign(c) * (0.76 - 0.76 * sn ** 2.2), 1.0 + sn * 1.75] : [Math.sign(c) * Math.abs(c) ** 0.25 * 0.76, 1.0 + Math.sign(sn) * Math.abs(sn) ** 0.25 * 1.0]); }
    }
    const top = Math.max(...outline.map((p) => p[1]));
    const plateShape = new THREE.Shape(outline.map(([x, y]) => new THREE.Vector2(x, y)));
    plateShape.holes.push(keyholePath(new THREE.Path()));
    const plate = s.mesh(new THREE.ExtrudeGeometry(plateShape, { depth, bevelEnabled: true, bevelSize: 0.025, bevelThickness: 0.025, bevelSegments: 2, curveSegments: 24 }), metal, [0, lift, -depth / 2]);
    plate.name = 'plate';
    const front = depth / 2 + 0.025;
    // A raised border, a collar round the hole, and two great screws.
    s.tube(outline.map(([x, y]) => [x * 0.88, lift + 1.25 + (y - 1.25) * 0.93, front] as const), 0.022, deep, true);
    const collar = keyholePath(new THREE.Shape(), 0.07);
    collar.holes.push(keyholePath(new THREE.Path(), 0.005));
    s.mesh(new THREE.ExtrudeGeometry(collar, { depth: 0.035, bevelEnabled: false, curveSegments: 24 }), deep, [0, lift, front - 0.01]);
    for (const y of [0.13, Math.min(top - 0.2, 2.22)]) {
      const head = s.cylinder(0.075, 0.085, 0.035, [0, lift + y, front + 0.012], deep, 20); head.rotation.x = Math.PI / 2;
      s.box([0.13, 0.016, 0.012], [0, lift + y, front + 0.03], s.material('#201c14')).rotation.z = random() * 3;
    }
    // Tarnish.
    const stain = s.material(a.metal === 'iron' ? '#8d5230' : '#5fa58d', { roughness: 1 });
    for (let i = 0; i < Math.round(mood.wear * 14); i++) {
      const [x, y] = outline[Math.floor(random() * N)], k = 0.55 + random() * 0.3;
      const blot = s.cylinder(0.04 + random() * 0.07, 0.04, 0.006, [x * k, lift + 1.25 + (y - 1.25) * k, front + 0.002], stain, 9); blot.rotation.x = Math.PI / 2; blot.scale.z = 0.6 + random() * 0.8;
      if (Math.abs(x * k) < 0.45 && y > 0.2 && y < 1.95) blot.visible = false;
    }

    // What shows through.
    const glowTint = { eye: '#20202a', garden: '#fff2b8', stairs: '#f4f0e0', night: '#8ea4ff', light: '#ffffff', sea: '#bfe6f2', room: '#ffcf8a', open: '#ffffff' }[a.through];
    if (a.through !== 'open') {
      const canvas = document.createElement('canvas');
      canvas.width = 256; canvas.height = 512;
      const ctx = canvas.getContext('2d')!, w = 256, h = 512, cy = 110;
      const grad = (stops: [number, string][]) => { const g = ctx.createLinearGradient(0, 0, 0, h); for (const [t, c] of stops) g.addColorStop(t, c); return g; };
      if (a.through === 'eye') {
        ctx.fillStyle = '#0f0f16'; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#f2efe6'; ctx.beginPath(); ctx.ellipse(128, cy, 104, 62, 0, 0, 7); ctx.fill();
        ctx.fillStyle = mood.warmth > 0.5 ? '#9a5b22' : '#3f7fa6'; ctx.beginPath(); ctx.arc(128 + (random() - 0.5) * 40, cy, 50, 0, 7); ctx.fill();
        ctx.fillStyle = '#0c0c0c'; ctx.beginPath(); ctx.arc(128, cy, 24, 0, 7); ctx.fill();
        ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(146, cy - 18, 9, 0, 7); ctx.fill();
        ctx.fillStyle = '#0f0f16'; ctx.beginPath(); ctx.ellipse(128, cy - 78 + mood.cheer * 14, 130, 46, 0, 0, 7); ctx.fill();
      } else if (a.through === 'garden') {
        ctx.fillStyle = grad([[0, '#79bdea'], [0.5, '#dff1f4']]); ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#fff3ae'; ctx.beginPath(); ctx.arc(170, 80, 30, 0, 7); ctx.fill();
        ctx.fillStyle = '#6fae5c'; ctx.beginPath(); ctx.ellipse(60, 300, 200, 70, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#4f9148'; ctx.fillRect(0, 300, w, h);
        ctx.fillStyle = '#e9dcb4'; ctx.beginPath(); ctx.moveTo(90, h); ctx.lineTo(170, h); ctx.lineTo(138, 300); ctx.lineTo(126, 300); ctx.fill();
        for (let i = 0; i < 40; i++) { ctx.fillStyle = ['#e85d75', '#f4d03f', '#ffffff', '#b07cd8'][i % 4]; ctx.beginPath(); ctx.arc(random() * w, 320 + random() * 190, 5, 0, 7); ctx.fill(); }
        ctx.fillStyle = '#2f6b3a'; ctx.beginPath(); ctx.arc(60, 215, 44, 0, 7); ctx.fill(); ctx.fillStyle = '#6b4a2a'; ctx.fillRect(55, 250, 10, 60);
      } else if (a.through === 'stairs') {
        ctx.fillStyle = '#fbf8ec'; ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 16; i++) { const k = 1 - i / 17, y = h - (1 - k * k) * 400, width = w * (0.2 + 0.9 * k); ctx.fillStyle = i % 2 ? '#cfc8b4' : '#e9e3d0'; ctx.fillRect((w - width) / 2, y - 34 * k, width, 34 * k); ctx.fillStyle = '#a9a18a'; ctx.fillRect((w - width) / 2, y - 3, width, 3); }
      } else if (a.through === 'night') {
        ctx.fillStyle = grad([[0, '#0e1540'], [1, '#3b4f98']]); ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#fff'; for (let i = 0; i < 90; i++) { ctx.beginPath(); ctx.arc(random() * w, random() * h, random() < 0.12 ? 3 : 1.5, 0, 7); ctx.fill(); }
        ctx.fillStyle = '#fff3c4'; ctx.beginPath(); ctx.arc(128, cy, 44, 0, 7); ctx.fill(); ctx.fillStyle = '#131b4c'; ctx.beginPath(); ctx.arc(150, cy - 10, 40, 0, 7); ctx.fill();
      } else if (a.through === 'light') { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h); }
      else if (a.through === 'sea') {
        ctx.fillStyle = grad([[0, '#8fcdea'], [0.45, '#e6f4f2']]); ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = grad([[0.45, '#2f89ab'], [1, '#15506e']]); ctx.fillRect(0, 230, w, h);
        ctx.fillStyle = '#e9f6f6'; for (let i = 0; i < 16; i++) ctx.fillRect(random() * w, 245 + random() * 250, 26 + random() * 40, 3);
        ctx.fillStyle = '#3a2a22'; ctx.fillRect(112, 222, 36, 9); ctx.fillStyle = '#fbf8ec'; ctx.beginPath(); ctx.moveTo(130, 180); ctx.lineTo(130, 220); ctx.lineTo(152, 220); ctx.fill();
      } else {
        for (let i = 0; i < 8; i++) { ctx.fillStyle = i % 2 ? '#c9a57a' : '#b98c66'; ctx.fillRect(i * 32, 0, 32, h); }
        ctx.fillStyle = '#5a3c2a'; ctx.fillRect(0, 400, w, 112);
        ctx.fillStyle = '#1c2450'; ctx.fillRect(80, 60, 96, 110); ctx.strokeStyle = '#f2ead2'; ctx.lineWidth = 8; ctx.strokeRect(80, 60, 96, 110); ctx.beginPath(); ctx.moveTo(128, 60); ctx.lineTo(128, 170); ctx.stroke();
        ctx.fillStyle = '#f2ead2'; ctx.fillRect(40, 340, 180, 50); ctx.fillStyle = '#a23b33'; ctx.fillRect(100, 330, 120, 62); ctx.fillStyle = '#6b4a2a'; ctx.fillRect(30, 300, 14, 110);
        ctx.fillStyle = '#ffe9a0'; ctx.beginPath(); ctx.arc(52, 280, 26, 0, 7); ctx.fill();
      }
      const view = new THREE.CanvasTexture(canvas);
      view.colorSpace = THREE.SRGBColorSpace;
      const height = HTOP - HY0 + 0.02;
      view.repeat.set(1 / (HX * 2 + 0.02), 1 / height);
      view.offset.set(0.5, -(HY0 - 0.01) / height);
      const sheet = s.mesh(new THREE.ShapeGeometry(keyholePath(new THREE.Shape(), 0.01), 24), new THREE.MeshStandardMaterial({ map: view, emissive: '#ffffff', emissiveMap: view, emissiveIntensity: a.through === 'light' ? 1 : a.through === 'eye' ? 0.35 : mix(0.5, 0.8, mood.cheer), roughness: 0.9, side: THREE.DoubleSide }), [0, lift, -0.02]);
      sheet.castShadow = false;
      // A keyhole of light laid out on the ground.
      if (a.through !== 'eye') {
        const pool = s.mesh(new THREE.ShapeGeometry(keyholePath(new THREE.Shape()), 24), new THREE.MeshBasicMaterial({ color: glowTint, transparent: true, opacity: mix(0.3, 0.6, mood.cheer), depthWrite: false, side: THREE.DoubleSide }), [0, 0.012, 0.12]);
        pool.rotation.x = Math.PI / 2; pool.scale.y = 1.25; pool.castShadow = pool.receiveShadow = false;
      }
    }

    // The mount.
    if (a.mount === 'footing') {
      s.box([1.2, 0.07, 0.5], [0, 0.035, 0], deep);
      for (const x of [-0.5, 0.5]) s.rod([x, 0.07, -0.2], [x * 0.7, 0.75, -depth / 2 - 0.02], 0.025, deep);
    } else if (a.mount === 'door') {
      const timber = s.material('#6b4a30', { roughness: 0.9 });
      const jag: THREE.Vector2[] = [new THREE.Vector2(-1.25, 0), new THREE.Vector2(1.3, 0)];
      for (let y = 0.3; y < top + 0.5; y += 0.28) jag.push(new THREE.Vector2(1.0 + random() * 0.45, y));
      jag.push(new THREE.Vector2(0.5, top + 0.35 + random() * 0.3), new THREE.Vector2(-0.3, top + 0.2 + random() * 0.4));
      for (let y = top + 0.3; y > 0.2; y -= 0.28) jag.push(new THREE.Vector2(-1.0 - random() * 0.4, y));
      const slab = new THREE.Shape(jag);
      slab.holes.push(keyholePath(new THREE.Path(), 0.02));
      s.mesh(new THREE.ExtrudeGeometry(slab, { depth: 0.12, bevelEnabled: false }), timber, [0, 0, -depth / 2 - 0.145]);
      const seam = s.material('#3f2b1c');
      for (const x of [-0.95, -0.55, 0.55, 0.95]) s.box([0.02, top * 0.9, 0.01], [x, top * 0.5, -depth / 2 - 0.022], seam);
    } else {
      const stone = s.material('#cfcabd', { roughness: 0.95 });
      s.box([2.2, 0.08, 1.3], [0, 0.04, 0.3], stone);
      s.box([1.3, 0.16, 0.5], [0, 0.16, 0.55], stone);
      s.box([1.0, 0.3, 0.3], [0, 0.23, 0.22], stone);
    }

    // The swinging cover.
    let cover: THREE.Group | null = null;
    const coverRest = 2.1 + random() * 0.5;
    if (a.cover) {
      cover = new THREE.Group();
      cover.position.set(0, lift + HTOP + 0.16, front + 0.05);
      const leaf = new THREE.Shape();
      leaf.absarc(0, 0, 0.1, 0, Math.PI, false); leaf.lineTo(-0.42, -1.62); leaf.absarc(0, -1.62, 0.42, Math.PI, 0, false); leaf.lineTo(0.1, 0);
      const lid = new THREE.Mesh(new THREE.ExtrudeGeometry(leaf, { depth: 0.03, bevelEnabled: false, curveSegments: 16 }), metal);
      const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.08, 14), deep); pin.rotation.x = Math.PI / 2;
      cover.add(lid, pin);
      cover.traverse((node) => { node.castShadow = true; });
      cover.rotation.z = coverRest;
      s.root.add(cover);
    }

    // The key: built along +x from the bow, bit toward +z, lying flat.
    const keyMat = a.key === 'lost' ? new THREE.MeshStandardMaterial({ color: '#f4f2ea', roughness: 1 }) : s.material(a.metal === 'iron' ? '#8a8d90' : tint, { metalness: 0.85, roughness: 0.3 });
    const keyPart = (which: 'bow' | 'bit' | 'both') => {
      const g = new THREE.Group();
      const add = (mesh: THREE.Mesh, x: number, y = 0, z = 0) => { mesh.position.set(x, y, z); mesh.castShadow = true; g.add(mesh); return mesh; };
      const shaft = (from: number, to: number) => { add(new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, to - from, 14), keyMat), (from + to) / 2).rotation.z = Math.PI / 2; };
      if (which !== 'bit') {
        for (const [x, z, r] of [[0.2, 0, 0.2], [0.08, 0.17, 0.09], [0.08, -0.17, 0.09]] as const) add(new THREE.Mesh(new THREE.TorusGeometry(r, 0.04, 8, 28), keyMat), x, 0, z).rotation.x = Math.PI / 2;
        add(new THREE.Mesh(new THREE.SphereGeometry(0.075, 14, 10), keyMat), 0.44);
        add(new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.05, 14), keyMat), 0.56).rotation.z = Math.PI / 2;
        shaft(0.44, which === 'both' ? 1.0 : 0.86);
      }
      if (which !== 'bow') {
        shaft(which === 'both' ? 1.0 : 1.04, 1.55);
        add(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.045, 0.3), keyMat), 1.2, 0, 0.17);
        add(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.045, 0.22), keyMat), 1.31, 0, 0.13);
        add(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.045, 0.3), keyMat), 1.42, 0, 0.17);
        add(new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.045, 0.06), keyMat), 1.31, 0, 0.05);
      }
      s.root.add(g);
      return g;
    };
    const floor = a.mount === 'steps' ? 0.08 : 0;
    if (a.key === 'lying') { const k = keyPart('both'); k.position.set(-0.85, floor + 0.05, 1.05); k.rotation.y = 0.12 + random() * 0.2; }
    else if (a.key === 'leaning') { const k = keyPart('both'); k.position.set(0.95, floor + 0.1, 0.62); k.rotation.set(0, Math.PI / 2 - 0.1, 0); k.rotateZ(1.25); k.rotateX(0.5); }
    else if (a.key === 'inserted') { const k = keyPart('both'); k.position.set(0, lift + HC, 1.25); k.rotation.y = Math.PI / 2; k.rotateX(0.6); }
    else if (a.key === 'broken') {
      const tip = keyPart('bit'); tip.position.set(0, lift + HC, 1.38); tip.rotation.y = Math.PI / 2; tip.rotateX(1.4);
      const bow = keyPart('bow'); bow.position.set(-0.2, floor + 0.05, 0.85); bow.rotation.y = -0.5 + random() * 0.4;
    } else if (a.key === 'small') { const k = keyPart('both'); k.scale.setScalar(0.3); k.position.set(-0.1, floor + 0.016, 0.95); k.rotation.y = 0.5 + random(); }
    else { const k = keyPart('both'); k.scale.set(1, 0.03, 1); k.position.set(-0.85, floor + 0.003, 1.05); k.rotation.y = 0.12 + random() * 0.2; k.traverse((node) => { node.castShadow = false; }); }

    const energy = mood.energy;
    return s.finish({
      footprint: 1.15,
      update: (_dt, time) => { if (cover) cover.rotation.z = coverRest + Math.sin(time * mix(0.5, 1.8, energy)) * mix(0.02, 0.2, energy); },
    });
  },
});
