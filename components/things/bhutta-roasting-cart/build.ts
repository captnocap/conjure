import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix, noul } from '@conjure/kit';
import { Batch, canvasTexture, night as nightOf } from './parts';

type V3 = [number, number, number];

export default defineThing({
  questions: {
    umbrella: choice('What shelters the cart?', {
      black: 'A big old black umbrella, patched and faded, tied to the cart.',
      'blue-tarp': 'A sagging blue plastic tarp roped to a bamboo frame.',
      rainbow: 'A huge rainbow-panelled beach umbrella.',
      'striped-red': 'A red-and-white striped umbrella like a market stall.',
    }),
    state: choice('What is the cart doing right now?', {
      busy: 'Busy: coals roaring red, smoke curling up, sparks flying as the corn chars.',
      covered: 'Cold and covered for the night under a roped tarp, the umbrella furled.',
      soaked: 'Soaked in a downpour, rain streaming off the umbrella, the coals hissing.',
    }),
    extra: choice('What else is sold?', {
      corn: 'Just corn, nothing else.',
      peanuts: 'Roasted peanuts too, heaped in a basket with twists of newspaper cones.',
      chai: 'A dented aluminium chai kettle and a rack of small glasses.',
    }),
    seller: noul('Is the seller there, squatting by the coals and fanning them?'),
    ears: choice('How much corn is on the grill?', {
      few: 'Two or three ears, slow trade.',
      full: 'A full grill of ears turning and blackening.',
      charred: 'Ears left too long, half of them burnt black.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const night = nightOf(mood.daylight);
    const wet = a.state === 'soaked';
    const covered = a.state === 'covered';
    const wood = s.material(new THREE.Color('#8a5a32').multiplyScalar(wet ? 0.7 : 1), { roughness: wet ? 0.35 : 0.85 });
    const iron = s.material('#2b2a2c', { roughness: 0.6, metalness: 0.5 });
    const rubber = s.material('#161616', { roughness: 0.8 });
    const steel = s.material('#b8bcc0', { roughness: 0.35, metalness: 0.8 });
    const cornMap = canvasTexture(128, 64, (c) => {
      c.fillStyle = '#ffffff'; c.fillRect(0, 0, 128, 64);
      for (let x = 0; x < 128; x += 6) for (let y = 0; y < 64; y += 6) { c.fillStyle = `rgba(150,100,20,${0.25 + random() * 0.2})`; c.beginPath(); c.arc(x + 3, y + 3, 2.4, 0, 7); c.fill(); }
    });
    const charMap = canvasTexture(128, 64, (c) => {
      c.fillStyle = '#ffffff'; c.fillRect(0, 0, 128, 64);
      for (let x = 0; x < 128; x += 6) for (let y = 0; y < 64; y += 6) { c.fillStyle = `rgba(120,80,20,0.3)`; c.beginPath(); c.arc(x + 3, y + 3, 2.4, 0, 7); c.fill(); }
      for (let i = 0; i < 40; i++) { c.fillStyle = `rgba(25,15,8,${0.5 + random() * 0.5})`; c.beginPath(); c.ellipse(random() * 128, random() * 64, 3 + random() * 9, 2 + random() * 5, 0, 0, 7); c.fill(); }
    });
    const corn = s.material('#f0c234', { map: cornMap, roughness: 0.55 });
    const charred = s.material('#d8a02a', { map: charMap, roughness: 0.7 });
    const burnt = s.material('#3a2a18', { map: charMap, roughness: 0.9 });
    const husk = s.material('#6f9a3a', { roughness: 0.7 });
    const glowBase = covered ? 0 : wet ? 0.6 : 1;
    const coal = new THREE.MeshStandardMaterial({ color: '#5a1a0a', emissive: '#ff3a0a', emissiveIntensity: glowBase * mix(0.8, 2.4, 0.4 + night * 0.6), roughness: 0.9 });

    const b = new Batch();
    // Cart bed with raised rails, handles and prop legs.
    const bedY = 0.74, L = 1.4, D = 0.78;
    b.box(wood, [L, 0.05, D], [0, bedY, 0]);
    for (const sz of [-1, 1]) b.box(wood, [L, 0.1, 0.04], [0, bedY + 0.07, sz * (D / 2 - 0.02)]);
    for (const sx of [-1, 1]) b.box(wood, [0.04, 0.1, D], [sx * (L / 2 - 0.02), bedY + 0.07, 0]);
    for (const sz of [-1, 1]) {
      b.box(wood, [L + 0.9, 0.06, 0.06], [-0.4, bedY - 0.05, sz * 0.3]);
      b.cyl(wood, 0.025, 0.025, 0.16, [-L / 2 - 0.82, bedY - 0.05, sz * 0.3], 6);
      b.rod(wood, [L / 2 - 0.08, bedY - 0.05, sz * 0.32], [L / 2 + 0.02, 0, sz * 0.34], 0.025);
    }
    b.box(wood, [0.06, 0.06, 0.66], [-L / 2 - 0.85, bedY - 0.05, 0]);
    // Two cycle wheels on an axle.
    for (const sz of [-1, 1]) {
      const z = sz * (D / 2 + 0.06);
      b.add(rubber, new THREE.TorusGeometry(0.33, 0.025, 6, 28), [-0.05, 0.34, z]);
      b.add(steel, new THREE.TorusGeometry(0.305, 0.01, 4, 28), [-0.05, 0.34, z]);
      for (let k = 0; k < 12; k++) { const an = k / 12 * Math.PI * 2; b.rod(steel, [-0.05, 0.34, z], [-0.05 + Math.cos(an) * 0.3, 0.34 + Math.sin(an) * 0.3, z], 0.004, 3); }
      b.rod(iron, [-0.05, 0.34, z], [-0.05, bedY - 0.03, sz * (D / 2 - 0.05)], 0.015);
    }
    b.rod(iron, [-0.05, 0.34, -D / 2 - 0.06], [-0.05, 0.34, D / 2 + 0.06], 0.012);
    // The sigri: an iron brazier with a grill over the coals.
    const sx0 = 0.32;
    b.add(iron, new THREE.CylinderGeometry(0.24, 0.18, 0.24, 18, 1, true), [sx0, bedY + 0.15, 0]);
    b.cyl(iron, 0.18, 0.18, 0.02, [sx0, bedY + 0.035, 0], 18);
    b.add(iron, new THREE.TorusGeometry(0.24, 0.012, 4, 24), [sx0, bedY + 0.27, 0], [Math.PI / 2, 0, 0]);
    for (let k = -4; k <= 4; k++) b.rod(iron, [sx0 + k * 0.05, bedY + 0.28, -0.23], [sx0 + k * 0.05, bedY + 0.28, 0.23], 0.004, 3);
    const coals: { at: V3; size: number }[] = [];
    for (let i = 0; i < 28; i++) { const r = Math.sqrt(random()) * 0.19, an = random() * Math.PI * 2; coals.push({ at: [sx0 + Math.cos(an) * r, bedY + 0.2 + random() * 0.04, Math.sin(an) * r], size: 0.025 + random() * 0.02 }); }
    // Ears on the grill.
    const earGeo = () => new THREE.LatheGeometry([0.0001, 0.018, 0.024, 0.026, 0.025, 0.021, 0.014, 0.0001].map((r, i) => new THREE.Vector2(r, (i / 7) * 0.19)), 10);
    const onGrill = covered ? 0 : { few: 3, full: 6, charred: 6 }[a.ears];
    for (let i = 0; i < onGrill; i++) {
      const mat = a.ears === 'charred' && i % 2 === 0 ? burnt : random() < 0.5 ? charred : corn;
      b.add(mat, earGeo(), [sx0 - 0.17 + i * 0.065 + random() * 0.01, bedY + 0.31, -0.095], [Math.PI / 2, (random() - 0.5) * 0.2, 0]);
    }
    // Heap of fresh husked cobs, salt and chilli, limes.
    for (let i = 0; i < 16; i++) {
      const row = Math.floor(i / 6);
      b.add(husk, new THREE.SphereGeometry(1, 8, 6), [-0.45 + (i % 6) * 0.075 + row * 0.03, bedY + 0.06 + row * 0.045, (random() - 0.5) * 0.3], [0, 0.4 + random() * 0.4, 0], [0.032, 0.032, 0.12]);
    }
    for (let i = 0; i < 3; i++) b.add(corn, earGeo(), [-0.22 + i * 0.05, bedY + 0.06, 0.25], [Math.PI / 2, 1.4 + random() * 0.3, 0]);
    b.cyl(s.material('#c8c0b0', { metalness: 0.6, roughness: 0.4 }), 0.045, 0.045, 0.08, [0.05, bedY + 0.065, 0.27], 12);
    b.cyl(s.material('#b8321e', { roughness: 0.9 }), 0.04, 0.04, 0.01, [0.05, bedY + 0.11, 0.27], 12);
    const lime = s.material('#7ab83a'), pith = s.material('#e6efb0');
    for (let i = 0; i < 5; i++) {
      const x = -0.05 + (i % 3) * 0.045, z = 0.18 + Math.floor(i / 3) * 0.045;
      b.add(lime, new THREE.SphereGeometry(0.022, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), [x, bedY + 0.026, z]);
      b.add(pith, new THREE.CircleGeometry(0.021, 10), [x, bedY + 0.027, z], [-Math.PI / 2, 0, 0]);
    }
    // What else is sold.
    if (a.extra === 'peanuts') {
      const cane = s.material('#b8925a', { roughness: 0.9 });
      b.add(cane, new THREE.CylinderGeometry(0.15, 0.11, 0.1, 14, 1, true), [-0.48, bedY + 0.08, -0.22]);
      b.add(s.material('#a86a3a', { roughness: 0.9 }), new THREE.SphereGeometry(0.145, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), [-0.48, bedY + 0.12, -0.22], [0, 0, 0], [1, 0.4, 1]);
      const paper = s.material('#dcd6c4', { roughness: 0.9 });
      for (let i = 0; i < 6; i++) b.add(paper, new THREE.ConeGeometry(0.025, 0.11, 8, 1, true), [-0.28 + i * 0.03, bedY + 0.08, -0.32], [Math.PI, 0, 0]);
    } else if (a.extra === 'chai') {
      const alu = s.material('#c4c6c8', { metalness: 0.7, roughness: 0.45 });
      b.add(alu, new THREE.LatheGeometry([[0.0001, 0], [0.09, 0], [0.1, 0.06], [0.085, 0.13], [0.04, 0.16], [0.0001, 0.165]].map(([x, y]) => new THREE.Vector2(x, y)), 16), [0.32, bedY + 0.3, 0.12]);
      b.rod(alu, [0.4, bedY + 0.34, 0.12], [0.47, bedY + 0.4, 0.12], 0.012);
      b.add(alu, new THREE.TorusGeometry(0.06, 0.008, 4, 12, Math.PI), [0.32, bedY + 0.46, 0.12]);
      const tea = s.material('#c08a50', { transparent: true, opacity: 0.55, roughness: 0.2 });
      for (let i = 0; i < 5; i++) b.cyl(tea, 0.022, 0.018, 0.07, [-0.5 + i * 0.05, bedY + 0.06, -0.28], 10);
    }
    // The fan of woven palm.
    const fanMap = canvasTexture(64, 64, (c) => {
      c.fillStyle = '#d8b878'; c.fillRect(0, 0, 64, 64);
      c.strokeStyle = 'rgba(120,80,30,0.6)'; c.lineWidth = 2;
      for (let i = 0; i < 64; i += 6) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i + 32, 64); c.stroke(); c.beginPath(); c.moveTo(i + 32, 0); c.lineTo(i, 64); c.stroke(); }
    }, false);
    const fanMat = new THREE.MeshStandardMaterial({ map: fanMap, side: THREE.DoubleSide, roughness: 0.9 });
    const fan = new THREE.Group();
    const leaf = new THREE.Mesh(new THREE.CircleGeometry(0.12, 16), fanMat); leaf.position.y = -0.15; leaf.castShadow = true; fan.add(leaf);
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.12, 4), wood); stick.position.y = -0.03; fan.add(stick);

    // The shelter.
    const poleTop = 2.15;
    const cloth: THREE.Mesh[] = [];
    if (a.umbrella === 'blue-tarp') {
      const bamboo = s.material('#c4a066');
      for (const x of [-0.75, 0.75]) for (const z of [-0.45, 0.45]) b.rod(bamboo, [x, bedY, z], [x, poleTop - (z > 0 ? 0.15 : 0), z], 0.018);
      const tarp = s.material('#2d6cc0', { roughness: 0.6, side: THREE.DoubleSide });
      if (!covered) cloth.push(s.drape({ size: [1.9, 1.3], at: [0, poleTop, 0], hang: 'corners', stiffness: 0.6, rumple: 0.6, detail: 20, floor: null }, tarp));
    } else if (!covered) {
      // A big umbrella on a pole lashed to the cart's back corner.
      b.rod(steel, [-0.55, bedY - 0.1, -0.36], [-0.2, poleTop + 0.05, -0.42], 0.014);
      const panels = a.umbrella === 'rainbow' ? ['#e8322a', '#f28a12', '#f6d21a', '#3fa84a', '#2a6fd0', '#7b2fa8', '#e8322a', '#f28a12'] : a.umbrella === 'striped-red' ? ['#c8202a', '#f4f2ec'] : ['#1c1c1e', '#262628'];
      const n = 8;
      for (let k = 0; k < n; k++) {
        const mat = s.material(panels[k % panels.length], { roughness: 0.75, side: THREE.DoubleSide });
        const g = new THREE.ConeGeometry(1.0, 0.42, 3, 1, true, k / n * Math.PI * 2, Math.PI * 2 / n);
        const m = s.mesh(g, mat, [-0.2, poleTop - 0.08, -0.42]);
        m.rotation.set(-0.42, 0, 0.08);
        cloth.push(m);
      }
      if (a.umbrella === 'black') for (let k = 0; k < 3; k++) { const patch = s.mesh(new THREE.PlaneGeometry(0.18, 0.14), s.material('#4a4038', { side: THREE.DoubleSide }), [-0.2 + Math.cos(k * 2.1) * 0.55, poleTop - 0.19 + Math.sin(k * 2.1) * 0.22, -0.42 + Math.sin(k * 2.1) * 0.5]); patch.rotation.set(-Math.PI / 2 + 0.38 * Math.sin(k * 2.1), 0, 0); }
    }
    b.flush(s);
    if (!covered) s.scatter(new THREE.IcosahedronGeometry(1, 0), coal, coals).castShadow = false;
    if (covered) {
      // Furled umbrella and a roped tarp over the cart for the night.
      s.rod([-0.55, bedY - 0.1, -0.3], [-0.45, 1.9, -0.28], 0.05, s.material(a.umbrella === 'rainbow' ? '#3fa84a' : a.umbrella === 'striped-red' ? '#c8202a' : a.umbrella === 'blue-tarp' ? '#c4a066' : '#1c1c1e'), 0.015);
      s.drape({ size: [1.9, 1.3], at: [0, 1.25, 0], over: [{ box: [L, 0.5, D], at: [0, bedY - 0.05 + 0.25, 0] }, { box: [0.5, 0.3, 0.5], at: [sx0, bedY + 0.15, 0] }], floor: 0, stiffness: 0.5, rumple: 0.5, detail: 24 }, s.material('#8a8070', { roughness: 0.9, side: THREE.DoubleSide }));
      s.rod([-0.7, bedY + 0.32, -0.42], [-0.7, bedY + 0.32, 0.42], 0.008, s.material('#d8c8a0'));
      s.rod([0.6, bedY + 0.32, -0.42], [0.6, bedY + 0.32, 0.42], 0.008, s.material('#d8c8a0'));
    }

    // The seller squatting at the coals, fanning.
    const people: ReturnType<typeof figure>[] = [];
    if (a.seller && !covered) {
      const p = figure(s, { height: 1.62, pose: 'crouching', style: 'doll', hair: random() < 0.5 ? 'cap' : 'short', top: ['#e8e2d4', '#c8b48a', '#4a6fa0', '#8a3a2a'][Math.floor(random() * 4)], bottom: '#3a3a3a', skin: ['#8a5a3c', '#6f472f', '#a8714c'][Math.floor(random() * 3)], sleeves: 'short' });
      s.root.add(p.root);
      p.root.position.set(0.85, 0, 0.35);
      p.root.rotation.y = -Math.PI / 2 - 0.5;
      p.hands.right.add(fan);
      p.reach('right', new THREE.Vector3(sx0 + 0.32, bedY + 0.3, 0.12), { space: s.root });
      p.lookAt(new THREE.Vector3(sx0, bedY + 0.3, 0), s.root);
      people.push(p);
    } else if (!covered) {
      fan.position.set(-0.3, bedY + 0.03, -0.25); fan.rotation.set(-Math.PI / 2, 0, 0.6); s.root.add(fan);
    }

    // Smoke, sparks, rain.
    const smoke: THREE.Mesh[] = [];
    const sparks: { m: THREE.InstancedMesh; base: V3[] } | null = a.state === 'busy' ? { m: null as unknown as THREE.InstancedMesh, base: [] } : null;
    if (!covered) {
      const puffMat = new THREE.MeshStandardMaterial({ color: '#d8d6d0', transparent: true, opacity: wet ? 0.22 : 0.3, depthWrite: false, roughness: 1 });
      for (let i = 0; i < (a.state === 'busy' ? 9 : 4); i++) {
        const m = s.mesh(new THREE.IcosahedronGeometry(1, 1), puffMat, [sx0, bedY + 0.4 + i * 0.13, 0]);
        m.castShadow = false; smoke.push(m);
      }
    }
    if (sparks) {
      for (let i = 0; i < 24; i++) sparks.base.push([sx0 + (random() - 0.5) * 0.3, random(), (random() - 0.5) * 0.3]);
      sparks.m = s.scatter(new THREE.SphereGeometry(1, 4, 3), new THREE.MeshBasicMaterial({ color: '#ffb040', transparent: true, opacity: 0.9, depthWrite: false }), sparks.base.map((p) => ({ at: [p[0], bedY + 0.4 + p[1] * 0.6, p[2]] as V3, size: 0.008 })));
      sparks.m.castShadow = false;
    }
    if (wet) {
      const drops: { at: V3; size: number }[] = [];
      for (let i = 0; i < 360; i++) { const r = random(); const an = random() * Math.PI * 2; drops.push({ at: [Math.cos(an) * (0.4 + r * 1.6), random() * 2.4, Math.sin(an) * (0.4 + r * 1.4)], size: 1 }); }
      // Streams pouring off the umbrella rim.
      for (let k = 0; k < 16; k++) { const an = k / 16 * Math.PI * 2; for (let j = 0; j < 4; j++) drops.push({ at: [-0.2 + Math.cos(an) * 0.95, poleTop - 0.4 - j * 0.45 - Math.sin(an) * 0.3, -0.42 + Math.sin(an) * 0.9], size: 1 }); }
      s.scatter(new THREE.BoxGeometry(0.008, 0.3, 0.008), new THREE.MeshBasicMaterial({ color: '#dfe8f0', transparent: true, opacity: 0.55, depthWrite: false }), drops).castShadow = false;
      s.mesh(new THREE.CircleGeometry(1.2, 24), new THREE.MeshStandardMaterial({ color: '#7a8088', transparent: true, opacity: 0.4, roughness: 0.05, metalness: 0.5, depthWrite: false }), [0, 0.003, 0.1]).rotation.x = -Math.PI / 2;
    }

    const energy = mix(0.4, 3, mood.energy);
    return s.finish({
      update: (dt, time) => {
        for (const p of people) p.update(dt, time);
        fan.rotation.x = Math.sin(time * energy * 4) * 0.5;
        coal.emissiveIntensity = glowBase * mix(0.8, 2.4, 0.4 + night * 0.6) * (0.85 + Math.sin(time * energy * 5) * 0.08 + Math.sin(time * energy * 13.7) * 0.07);
        smoke.forEach((m, i) => {
          const t = ((time * 0.25 * (0.5 + mood.energy) + i / smoke.length) % 1);
          m.position.set(sx0 + Math.sin(t * 6 + i) * 0.12 * t - t * 0.2, bedY + 0.35 + t * 1.4, Math.cos(t * 5 + i) * 0.1 * t);
          m.scale.setScalar(0.03 + t * 0.13);
        });
        if (sparks) {
          const mtx = new THREE.Matrix4();
          sparks.base.forEach((p, i) => { const t = (p[1] + time * energy * 0.4) % 1; mtx.makeScale(0.008, 0.008, 0.008).setPosition(p[0] + Math.sin(t * 9 + i) * 0.05, bedY + 0.32 + t * 0.9, p[2]); sparks.m.setMatrixAt(i, mtx); });
          sparks.m.instanceMatrix.needsUpdate = true;
        }
        for (const c of cloth) c.rotation.y = Math.sin(time * 0.7) * 0.02 * energy;
      },
    });
  },
});
