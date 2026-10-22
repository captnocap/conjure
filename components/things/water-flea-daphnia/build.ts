import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

export default defineThing({
  questions: {
    brood: choice('What is in the brood pouch on its back?', {
      empty: 'Nothing; the pouch is empty and clear.',
      few: 'Two or three pale round eggs.',
      full: 'Packed with eggs, a back full of pearls.',
      embryos: 'Nearly ready young, each with its own tiny dark eye, looking out through their mother.',
      saddle: 'A dark armoured saddle holding two winter eggs, made when times turn bad.',
    }),
    gut: choice('What colour is it inside?', {
      green: 'A bright green gut full of algae.',
      brown: 'A muddy brown gut full of detritus.',
      starved: 'An empty thread of a gut, hungry and pale.',
      flushed: 'Flushed red-pink all through with haemoglobin, from living in stale water.',
    }),
    head: choice('What shape is its head?', {
      round: 'A plain round head with a short beak.',
      helmet: 'A tall pointed helmet, grown because predators are near.',
      spiked: 'A crown of small neck-teeth behind the head, armed and wary.',
    }),
    stroke: choice('Where are the antennae in their stroke?', {
      raised: 'Flung up high above the head, the top of a hop.',
      wide: 'Spread wide like open arms, hanging in the water.',
      down: 'Swept down along the body, just after the kick.',
    }),
    spine: score('How long is the tail spine?', ['A blunt nub', 'A neat spike', 'A long needle as long as the body']),
    fate: choice('What has become of it?', {
      alive: 'Alive and hopping, everything working in plain view.',
      overgrown: 'Alive but overgrown: green fuzz and little stalked bells have settled on its shell.',
      moult: 'Only the shed shell remains: an empty ghost of clear armour, eye and all gone.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const ghost = a.fate === 'moult';
    const flushed = a.gut === 'flushed';
    const tint = new THREE.Color(flushed ? '#e8a79a' : '#cfe0d2');
    tint.offsetHSL((mood.warmth - 0.5) * 0.05, (mood.cheer - 0.5) * 0.15, -mood.wear * 0.08);
    // The carapace is etched with a faint rhombic mesh.
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = 'rgba(50,80,80,0.5)'; ctx.lineWidth = 1.5;
    for (let i = -16; i < 32; i++) { ctx.beginPath(); ctx.moveTo(i * 16, 0); ctx.lineTo(i * 16 + 128, 256); ctx.moveTo(i * 16 + 128, 0); ctx.lineTo(i * 16, 256); ctx.stroke(); }
    const mesh = new THREE.CanvasTexture(canvas);
    mesh.colorSpace = THREE.SRGBColorSpace;
    const shell = new THREE.MeshPhysicalMaterial({ color: tint, map: mesh, transparent: true, opacity: ghost ? 0.3 : 0.4, roughness: 0.2, clearcoat: 0.7 });
    const rimMat = new THREE.MeshBasicMaterial({ color: tint.clone().multiplyScalar(0.4), side: THREE.BackSide, transparent: true, opacity: ghost ? 0.4 : 0.6, depthWrite: false });
    const limb = new THREE.MeshStandardMaterial({ color: tint.clone().multiplyScalar(ghost ? 0.8 : 0.58), roughness: 0.4, transparent: ghost, opacity: ghost ? 0.6 : 1 });
    const solid = (colour: string, glow = 0.2) => new THREE.MeshStandardMaterial({ color: colour, roughness: 0.45, emissive: colour, emissiveIntensity: glow });
    const black = new THREE.MeshStandardMaterial({ color: '#111214', roughness: 0.3 });
    const unit = new THREE.SphereGeometry(1, 20, 14);
    const body = new THREE.Group();
    const add = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, at: [number, number, number], scale: [number, number, number] = [1, 1, 1]) => {
      const part = new THREE.Mesh(geometry, material);
      part.position.set(...at);
      part.scale.set(...scale);
      part.castShadow = true;
      parent.add(part);
      return part;
    };
    const glassy = (at: [number, number, number], scale: [number, number, number]) => {
      const part = add(body, unit, shell, at, scale);
      part.renderOrder = 2;
      const outline = add(body, unit, rimMat, at, [scale[0] * 1.05, scale[1] * 1.04, scale[2] * 1.05]);
      outline.castShadow = false;
      return part;
    };

    // Shell, head and beak. Head up, belly toward +x, back toward -x.
    glassy([0, 0.88, 0], [0.6, 0.86, 0.36]);
    glassy([0.2, 1.74, 0], [0.36, 0.38, 0.27]);
    const beak = add(body, new THREE.ConeGeometry(0.13, 0.42, 10), shell, [0.47, 1.5, 0]);
    beak.rotation.z = Math.PI + 0.55;
    if (a.head === 'helmet') { const helm = add(body, new THREE.ConeGeometry(0.3, 0.85, 14), shell, [0.12, 2.3, 0], [1, 1, 0.7]); helm.rotation.z = 0.12; helm.renderOrder = 2; }
    if (a.head === 'spiked') for (let i = 0; i < 4; i++) add(body, new THREE.ConeGeometry(0.035, 0.2, 5), limb, [-0.14 - i * 0.05, 1.78 - i * 0.1, 0]).rotation.z = 1.0 + i * 0.12;
    const spineLength = mix(0.12, 1.5, a.spine);
    const spine = add(body, new THREE.ConeGeometry(0.06, spineLength, 8), limb, [-0.12 - spineLength * 0.12, 0.1 - spineLength * 0.45, 0]);
    spine.rotation.z = Math.PI - 0.25;

    const hearts: THREE.Object3D[] = [];
    if (!ghost) {
      // The single compound eye, ringed with lens bumps, and the little ocellus below it.
      const eye = add(body, unit, black, [0.3, 1.77, 0], [0.12, 0.12, 0.12]);
      for (let i = 0; i < 10; i++) { const angle = (i / 10) * Math.PI * 2; add(eye, unit, solid('#3a4a5a', 0.1), [Math.cos(angle) * 0.95, Math.sin(angle) * 0.95, (i % 2 ? 0.4 : -0.4)], [0.28, 0.28, 0.28]); }
      add(body, unit, black, [0.4, 1.58, 0], [0.03, 0.03, 0.03]);
      // Gut: one curved tube from mouth to tail.
      const gutColour = { green: '#4f9a2c', brown: '#7a5a34', starved: '#c9c6a0', flushed: '#8a3a2a' }[a.gut];
      const gutPath = new THREE.CatmullRomCurve3([[0.3, 1.52], [0.05, 1.5], [-0.12, 1.2], [-0.08, 0.75], [0.1, 0.42], [0.3, 0.3]].map(([x, y]) => new THREE.Vector3(x, y, 0)));
      add(body, new THREE.TubeGeometry(gutPath, 30, a.gut === 'starved' ? 0.03 : 0.085, 8), solid(gutColour, 0.3), [0, 0, 0]);
      const claw = add(body, new THREE.ConeGeometry(0.035, 0.28, 6), black, [0.4, 0.2, 0]);
      claw.rotation.z = -1.9;
      // Heart, high on the back.
      hearts.push(add(body, unit, solid(flushed ? '#d8455a' : '#f0c4c0', 0.35), [-0.25, 1.42, 0], [0.11, 0.09, 0.09]));
      // Five pairs of filtering legs, beating inside the shell.
      for (let i = 0; i < 5; i++) for (const side of [-1, 1]) {
        const leaf = add(body, unit, limb, [0.3 - i * 0.02, 1.2 - i * 0.16, side * 0.12], [0.2, 0.05, 0.035]);
        leaf.rotation.z = -0.5 - i * 0.08;
        hearts.push(leaf);
      }
      // Brood pouch.
      const eggMat = solid(a.gut === 'flushed' ? '#f0b8a8' : '#f2e6b8', 0.3);
      const eggs = { empty: 0, few: 3, full: Math.round(mix(9, 18, mood.density)), embryos: 5, saddle: 2 }[a.brood];
      if (a.brood === 'saddle') add(body, unit, new THREE.MeshStandardMaterial({ color: '#3a2c20', roughness: 0.6 }), [-0.3, 0.92, 0], [0.26, 0.42, 0.3]).rotation.z = -0.1;
      for (let i = 0; i < eggs; i++) {
        const u = eggs === 1 ? 0.5 : i / (eggs - 1), saddle = a.brood === 'saddle';
        const r = a.brood === 'embryos' ? 0.12 : saddle ? 0.1 : mix(0.075, 0.1, random());
        const x = saddle ? -0.36 : -0.32 - (i % 2) * 0.1 + (random() - 0.5) * 0.05, y = saddle ? 0.78 + i * 0.28 : mix(0.5, 1.22, eggs > 8 ? ((i * 0.37) % 1) : u), z = saddle ? 0.2 : ((i % 3) - 1) * 0.11;
        const egg = add(body, unit, saddle ? solid('#c9a060', 0.3) : eggMat, [x, y, z], [r, r * (a.brood === 'embryos' ? 1.25 : 1), r]);
        if (a.brood === 'embryos') add(egg, unit, black, [0.5, 0.45, 0.6], [0.3, 0.24, 0.3]);
      }
    }
    if (a.fate === 'overgrown') {
      const fuzz: { at: [number, number, number]; size: number; color: string }[] = [];
      for (let i = 0; i < 160; i++) {
        const angle = random() * Math.PI * 2, y = mix(-0.75, 0.75, random()), r = Math.sqrt(Math.max(0, 1 - y * y));
        if (Math.cos(angle) > 0.3) continue;
        fuzz.push({ at: [Math.cos(angle) * r * 0.6, 0.88 + y * 0.86, Math.sin(angle) * r * 0.36], size: mix(0.02, 0.05, random()), color: ['#3f8a2c', '#6aa838', '#2f6b34'][i % 3] });
      }
      const moss = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ roughness: 0.9 }), fuzz.length);
      const m = new THREE.Matrix4();
      fuzz.forEach((f, i) => { moss.setMatrixAt(i, m.makeScale(f.size, f.size, f.size).setPosition(...f.at)); moss.setColorAt(i, new THREE.Color(f.color)); });
      body.add(moss);
      // Stalked bells (vorticella) hitching a ride on the back.
      const bellMat = solid('#e8e2c8', 0.15);
      for (let i = 0; i < 7; i++) {
        const y = mix(0.4, 1.4, random()), z = (random() - 0.5) * 0.4, reach = mix(0.25, 0.5, random());
        const x0 = -0.6 * Math.sqrt(Math.max(0.05, 1 - ((y - 0.88) / 0.86) ** 2));
        const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, reach, 4), bellMat);
        stalk.position.set(x0 - reach / 2, y + 0.04, z);
        stalk.rotation.z = Math.PI / 2 - 0.15;
        body.add(stalk);
        const bell = add(body, new THREE.ConeGeometry(0.07, 0.12, 10, 1, true), bellMat, [x0 - reach - 0.04, y + 0.09, z]);
        bell.rotation.z = -Math.PI / 2 - 0.15;
      }
    }

    // The swimming antennae: a stout trunk forking into two jointed branches fringed with bristles.
    const oars: THREE.Group[] = [];
    const bristle = new THREE.ConeGeometry(0.012, 0.42, 4);
    bristle.translate(0, 0.21, 0);
    const rest = { raised: 0.45, wide: 1.25, down: 1.8 }[a.stroke];
    for (const side of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(0.02, 1.55, side * 0.2);
      add(pivot, new THREE.CylinderGeometry(0.06, 0.085, 0.6, 8), limb, [0, 0.3, 0]);
      for (const fork of [-1, 1]) {
        const branch = new THREE.Group();
        branch.position.set(0, 0.6, 0);
        branch.rotation.z = fork * 0.42;
        for (let seg = 0; seg < 3; seg++) {
          add(branch, new THREE.CylinderGeometry(0.03, 0.042, 0.26, 6), limb, [0, 0.13 + seg * 0.27, 0]);
          const hair = add(branch, bristle, limb, [0, 0.26 + seg * 0.27, 0]);
          hair.rotation.z = fork * (0.9 - seg * 0.25);
          const hair2 = add(branch, bristle, limb, [0, 0.26 + seg * 0.27, 0]);
          hair2.rotation.set(side * 0.7, 0, fork * 0.3);
        }
        add(branch, bristle, limb, [0, 0.8, 0]);
        pivot.add(branch);
      }
      pivot.scale.setScalar(1.25);
      pivot.rotation.x = side * rest;
      pivot.rotation.z = 0.25;
      body.add(pivot);
      oars.push(pivot);
    }

    body.rotation.z = ghost ? -1.2 : -0.22 + (random() - 0.5) * 0.15;
    body.rotation.y = (random() - 0.5) * 0.4;
    if (ghost) body.rotation.x = 0.3;
    s.root.add(body);
    s.root.scale.setScalar(0.14);
    const rate = ghost ? 0 : mix(0.5, 2.6, mood.energy);
    return s.finish({
      update: (_dt, time) => {
        const phase = (time * rate) % 1, kick = phase < 0.25 ? Math.sin((phase / 0.25) * Math.PI) : 0;
        oars.forEach((oar, i) => { oar.rotation.x = (i ? 1 : -1) * (rest + kick * 0.9 * (rest < 2 ? 1 : -1)); });
        body.position.y = (phase < 0.25 ? phase / 0.25 : 1 - (phase - 0.25) / 0.75) * 0.18 * Math.min(1, rate);
        const beat = 1 + 0.25 * Math.sin(time * rate * 14);
        hearts.forEach((part, i) => { if (i === 0) part.scale.set(0.11 * beat, 0.09 * beat, 0.09 * beat); else part.rotation.z = -0.5 - Math.floor((i - 1) / 2) * 0.08 + Math.sin(time * rate * 9 + i) * 0.25; });
      },
    });
  },
});
