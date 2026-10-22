import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';
import { drawGlyph } from './glyphs';

const GLAZES = {
  calico: 'White with orange and black calico patches, the classic and luckiest.',
  gold: 'Solid shining gold, for money above all.',
  black: 'Glossy black with yellow eyes, to ward off evil.',
  pink: 'Pastel pink, for love.',
  red: 'Lacquer red, for health.',
  stone: 'Unglazed grey stone, carved long ago and left outdoors.',
} as const;
const GLAZE: Record<keyof typeof GLAZES, { body: string; ink: string; inner: string }> = {
  calico: { body: '#f6f2e8', ink: '#1d1917', inner: '#e8554a' },
  gold: { body: '#e2b23a', ink: '#4a2c0c', inner: '#c8322a' },
  black: { body: '#232124', ink: '#f2f0ea', inner: '#e8554a' },
  pink: { body: '#f6b9cc', ink: '#3a2026', inner: '#ffffff' },
  red: { body: '#c8322a', ink: '#1d1917', inner: '#f6f2e8' },
  stone: { body: '#9c9a92', ink: '#55534d', inner: '#8a8880' },
};

export default defineThing({
  questions: {
    glaze: choice('What colour is the cat?', GLAZES),
    paw: choice('Which paw is raised?', {
      left: 'The left paw, beckoning customers and friends.',
      right: 'The right paw, beckoning money.',
      both: 'Both paws up, greedy for everything, or surrendering.',
    }),
    size: score('How big is it?', ['A thumb-sized charm', 'Sits on a shelf by the till', 'Knee high by the door', 'A shopfront giant taller than a person']),
    eyes: choice('What are its eyes like?', {
      smiling: 'Closed into two happy upturned arcs.',
      wide: 'Wide round staring pupils, slightly unnerving.',
      wink: 'One open, one winking.',
      sleepy: 'Half-lidded flat lines, bored of waiting.',
    }),
    holds: choice('What does it hold against its belly?', {
      coin: 'A gold oval koban coin with a painted character.',
      fish: 'A fat red sea bream, for celebration.',
      nothing: 'Nothing, the lower paw just rests.',
    }),
    bib: choice('What does it wear at the neck?', {
      green: 'A red collar, a gold bell and a scalloped green bib.',
      red: 'A red collar and bell with a red bib.',
      purple: 'A purple bib tied over the collar, a temple offering.',
      bare: 'Only the collar and bell.',
    }),
    stands: choice('What does it sit on, and what has been left for it?', {
      bare: 'Straight on the surface, nothing around it.',
      cushion: 'A plump red cushion with gold corner tassels.',
      offerings: 'A scatter of offered coins at its feet and a small cup of sake.',
      solar: 'A white plastic base with a little solar cell: the nodding dashboard kind.',
      crate: 'An upturned wooden box, improvised.',
    }),
    damage: choice('What has it been through?', {
      whole: 'Nothing, it is whole.',
      chipped: 'One ear is chipped off, showing raw clay.',
      mended: 'Cracked and mended with gold seams.',
      lostpaw: 'The raised paw has snapped off and lies at its feet.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const tone = GLAZE[a.glaze];
    const stone = a.glaze === 'stone';
    const gloss = stone ? { roughness: 0.95 } : a.glaze === 'gold' ? { metalness: 0.75, roughness: 0.3 } : { roughness: 0.28 };
    const body = s.material(tone.body, gloss);
    const red = s.material(stone ? '#8f8d86' : a.glaze === 'red' ? '#f6f2e8' : '#cf2f27', { roughness: stone ? 0.95 : 0.4 });
    const gold = s.material(stone ? '#a3a199' : '#e8b93a', stone ? { roughness: 0.95 } : { metalness: 0.8, roughness: 0.28, emissive: '#6a4a08', emissiveIntensity: mix(0.1, 0.5, mood.cheer) });
    const clay = s.material('#b5764e', { roughness: 0.95 });
    const dark = s.material('#1d1917', { roughness: 0.5 });
    const height = mix(0.09, 1.9, a.size ** 1.7);

    // Pedestal first, then the cat stands at `lift` (all in cat units: the cat is 1.45 tall).
    let lift = 0;
    if (a.stands === 'cushion') {
      s.ball([0.66, 0.11, 0.6], [0, 0.1, 0], s.material('#c02a26', { roughness: 0.8 }), 20);
      for (const x of [-1, 1]) for (const z of [-1, 1]) s.cylinder(0.02, 0.05, 0.12, [x * 0.5, 0.06, z * 0.45], gold, 8);
      lift = 0.17;
    } else if (a.stands === 'solar') {
      s.box([1.0, 0.22, 0.85], [0, 0.11, 0], s.material('#f1efe8', { roughness: 0.4 }));
      s.box([0.5, 0.01, 0.16], [0, 0.224, 0.32], s.material('#1c2444', { metalness: 0.5, roughness: 0.2 }));
      lift = 0.22;
    } else if (a.stands === 'crate') {
      const plank = s.material('#a8845a', { roughness: 0.85 });
      s.box([1.1, 0.3, 0.95], [0, 0.15, 0], plank);
      for (let i = 0; i < 4; i++) s.box([1.12, 0.012, 0.012], [0, 0.06 + i * 0.07, 0.476], s.material('#6f5536'));
      lift = 0.3;
    }
    const cat = new Sculpture(context);
    cat.root.position.y = lift;
    s.root.add(cat.root);

    cat.lathe([[0, 0], [0.3, 0], [0.4, 0.05], [0.46, 0.2], [0.44, 0.42], [0.36, 0.6], [0.26, 0.74], [0, 0.8]], body);
    for (const side of [-1, 1]) {
      cat.ball([0.17, 0.2, 0.22], [side * 0.36, 0.2, 0.1], body, 14);
      cat.ball([0.11, 0.075, 0.15], [side * 0.2, 0.075, 0.42], body, 12);
    }
    cat.ball([0.1, 0.1, 0.1], [0.12, 0.16, -0.44], body, 10);

    // Head with a painted face. Canvas x = 128 is the front of the sphere.
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 256;
    const g = canvas.getContext('2d')!;
    g.fillStyle = tone.body; g.fillRect(0, 0, 512, 256);
    if (a.glaze === 'calico') {
      g.fillStyle = '#e88a2c'; g.beginPath(); g.ellipse(70 + random() * 20, 40, 62, 46, 0.3, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#26211f'; g.beginPath(); g.ellipse(196 - random() * 20, 36, 50, 38, -0.3, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#e88a2c'; g.beginPath(); g.ellipse(380, 120, 70, 50, 0, 0, Math.PI * 2); g.fill();
    }
    g.strokeStyle = tone.ink; g.fillStyle = tone.ink; g.lineCap = 'round'; g.lineWidth = stone ? 4 : 5;
    const eye = (cx: number, style: string) => {
      if (style === 'smiling') { g.beginPath(); g.arc(cx, 124, 15, Math.PI * 1.12, Math.PI * 1.88); g.stroke(); }
      else if (style === 'sleepy') { g.beginPath(); g.moveTo(cx - 14, 116); g.lineTo(cx + 14, 116); g.stroke(); g.beginPath(); g.arc(cx, 116, 9, 0, Math.PI); g.fill(); }
      else {
        g.fillStyle = a.glaze === 'black' ? '#f2d23a' : stone ? '#b8b6ae' : '#fbfaf5'; g.beginPath(); g.ellipse(cx, 116, 15, 17, 0, 0, Math.PI * 2); g.fill(); g.stroke();
        g.fillStyle = a.glaze === 'black' ? '#1d1917' : tone.ink; g.beginPath(); g.ellipse(cx, 117, 8, 12, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = tone.ink;
      }
    };
    eye(128 - 38, a.eyes === 'wink' ? 'wide' : a.eyes);
    eye(128 + 38, a.eyes === 'wink' ? 'smiling' : a.eyes);
    g.fillStyle = stone ? tone.ink : '#e8707a'; g.beginPath(); g.moveTo(121, 138); g.lineTo(135, 138); g.lineTo(128, 147); g.fill();
    g.lineWidth = 4; g.beginPath(); g.arc(119, 149, 9, 0.1, Math.PI * 0.95); g.stroke(); g.beginPath(); g.arc(137, 149, 9, 0.05, Math.PI * 0.9); g.stroke();
    g.lineWidth = 2.5;
    for (const side of [-1, 1]) for (const tilt of [-0.18, 0, 0.18]) { g.beginPath(); g.moveTo(128 + side * 50, 144 + tilt * 30); g.lineTo(128 + side * 92, 144 + tilt * 110); g.stroke(); }
    if (!stone && a.glaze !== 'gold') { g.fillStyle = 'rgba(240,120,130,0.4)'; for (const side of [-1, 1]) { g.beginPath(); g.ellipse(128 + side * 62, 140, 12, 8, 0, 0, Math.PI * 2); g.fill(); } }
    if (a.damage === 'mended') { g.strokeStyle = '#e8b93a'; g.lineWidth = 4; g.beginPath(); g.moveTo(150, 0); g.lineTo(170, 50); g.lineTo(158, 90); g.lineTo(196, 150); g.lineTo(186, 256); g.stroke(); }
    for (let i = 0; i < mood.wear * 18; i++) { g.fillStyle = `rgba(70,60,45,${0.05 + random() * 0.1})`; g.beginPath(); g.ellipse(random() * 512, random() * 256, 8 + random() * 26, 6 + random() * 18, random() * 3, 0, Math.PI * 2); g.fill(); }
    const face = new THREE.CanvasTexture(canvas);
    face.colorSpace = THREE.SRGBColorSpace;
    const head = cat.ball([0.42, 0.36, 0.38], [0, 1.02, 0.04], new THREE.MeshStandardMaterial({ map: face, ...gloss, roughness: (gloss.roughness ?? 0.3) + mood.wear * 0.3 }), 28);
    head.rotation.z = (random() - 0.5) * 0.06;
    for (const side of [-1, 1]) {
      const chipped = a.damage === 'chipped' && side === 1;
      const ear = cat.cylinder(chipped ? 0.07 : 0.004, 0.14, chipped ? 0.1 : 0.22, [side * 0.25, chipped ? 1.3 : 1.36, 0.02], body, 14);
      ear.rotation.z = -side * 0.25;
      if (chipped) cat.cylinder(0.068, 0.068, 0.012, [side * 0.264, 1.352, 0.02], clay, 12).rotation.z = -side * 0.25;
      else { const inner = cat.cylinder(0.003, 0.085, 0.15, [side * 0.245, 1.34, 0.055], s.material(tone.inner, { roughness: 0.5 }), 10); inner.rotation.z = -side * 0.25; }
    }

    // Collar, bell and bib.
    cat.ring(0.27, 0.042, [0, 0.76, 0.02], red).rotation.x = Math.PI / 2;
    cat.ball([0.075, 0.075, 0.075], [0, 0.7, 0.3], gold, 14);
    cat.box([0.012, 0.05, 0.03], [0, 0.675, 0.365], dark);
    if (a.bib !== 'bare') {
      const cloth = s.material(stone ? '#7c8a74' : { green: '#3f8f52', red: '#cf2f27', purple: '#7a3f9a' }[a.bib], { roughness: 0.8 });
      for (let i = -2; i <= 2; i++) cat.ball([0.085, 0.1, 0.03], [i * 0.085, 0.6 - Math.abs(i) * 0.012, 0.345 - Math.abs(i) * 0.03], cloth, 10).rotation.y = i * 0.25;
      if (!stone) for (let i = -2; i <= 2; i++) cat.ball([0.018, 0.018, 0.01], [i * 0.085, 0.57, 0.378 - Math.abs(i) * 0.03], gold, 6);
    }

    // Paws. A raised arm pivots at the shoulder and beckons.
    const arms: THREE.Group[] = [];
    const armGeometry = new THREE.CapsuleGeometry(0.095, 0.3, 4, 12);
    for (const side of [-1, 1]) {
      const raised = a.paw === 'both' || (a.paw === 'left' ? side === 1 : side === -1); // the cat's left is our right
      const pivot = new THREE.Group();
      pivot.position.set(side * 0.33, raised ? 0.7 : 0.66, 0.12);
      const arm = new THREE.Mesh(armGeometry, body);
      arm.castShadow = true;
      if (raised) {
        const lost = a.damage === 'lostpaw' && (a.paw !== 'both' || side === 1);
        arm.position.y = lost ? 0.1 : 0.22;
        if (lost) arm.scale.y = 0.5;
        pivot.add(arm);
        if (lost) {
          const stump = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.09, 0.02, 12), clay); stump.position.y = 0.26; pivot.add(stump);
          const fallen = new THREE.Mesh(new THREE.SphereGeometry(0.12, 14, 10), body); fallen.scale.set(1, 0.85, 1.25); fallen.rotation.y = random() * 3; fallen.position.set(side * 0.42, 0.1 - lift, 0.62); fallen.castShadow = true; cat.root.add(fallen);
          const shard = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.1, 10), clay); shard.rotation.set(Math.PI / 2, 0, 0.4); shard.position.set(side * 0.42 - Math.sin(fallen.rotation.y) * 0.1, 0.09 - lift, 0.62 - Math.cos(fallen.rotation.y) * 0.1); cat.root.add(shard);
        } else {
          const paw = new THREE.Mesh(new THREE.SphereGeometry(0.12, 14, 10), body); paw.position.set(0, 0.47, 0.06); paw.scale.set(1, 0.9, 1.1); paw.castShadow = true; pivot.add(paw);
          const pad = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), s.material(stone ? '#8a8880' : '#f08a98')); pad.position.set(0, 0.45, 0.16); pad.scale.z = 0.5; pivot.add(pad);
          arms.push(pivot);
        }
        pivot.rotation.z = -side * 0.12;
        pivot.rotation.x = 0.25;
      } else {
        arm.scale.set(1, 0.72, 1);
        arm.position.set(-side * 0.05, -0.16, 0.14);
        arm.rotation.set(0.75, 0, side * 0.5);
        pivot.add(arm);
        const paw = new THREE.Mesh(new THREE.SphereGeometry(0.105, 14, 10), body); paw.position.set(-side * 0.15, -0.3, 0.27); paw.castShadow = true; pivot.add(paw);
      }
      cat.root.add(pivot);
    }
    if (a.holds === 'coin') {
      const coinMap = (() => {
        const c = document.createElement('canvas'); c.width = 128; c.height = 192;
        const k = c.getContext('2d')!; k.fillStyle = stone ? '#a3a199' : '#eabf44'; k.fillRect(0, 0, 128, 192);
        k.strokeStyle = stone ? '#6c6a64' : '#7a4c10'; k.lineWidth = 3; for (let i = 0; i < 8; i++) { k.beginPath(); k.moveTo(24, 16 + i * 5); k.lineTo(104, 16 + i * 5); k.stroke(); k.beginPath(); k.moveTo(24, 142 + i * 5); k.lineTo(104, 142 + i * 5); k.stroke(); }
        drawGlyph(k, random() > 0.5 ? '千' : '大', 30, 58, 68, stone ? '#55534d' : '#2a1808', 0.13);
        const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
      })();
      const tilt = (random() - 0.5) * 0.3;
      const coin = cat.cylinder(0.5, 0.5, 0.04, [0.02, 0.36, 0.47], gold, 28);
      coin.scale.set(0.32, 1, 0.5); coin.rotation.set(Math.PI / 2 - 0.12, 0, tilt);
      const front = cat.mesh(new THREE.CircleGeometry(0.5, 28), new THREE.MeshStandardMaterial({ map: coinMap, metalness: stone ? 0 : 0.5, roughness: stone ? 0.95 : 0.4 }), [0.02, 0.363, 0.492]);
      front.scale.set(0.3, 0.47, 1); front.rotation.set(-0.12, 0, tilt);
    } else if (a.holds === 'fish') {
      const scale = s.material(stone ? '#8f8d86' : '#e0503c', { roughness: 0.4 });
      const fish = new Sculpture(context);
      fish.ball([0.2, 0.12, 0.06], [0, 0, 0], scale, 14);
      fish.cylinder(0.11, 0.01, 0.12, [0.24, 0, 0], scale, 4).rotation.z = Math.PI / 2;
      fish.ball([0.022, 0.022, 0.015], [-0.12, 0.03, 0.05], s.material('#fbfaf5'), 8);
      fish.ball([0.01, 0.01, 0.01], [-0.12, 0.03, 0.062], dark, 6);
      fish.box([0.14, 0.05, 0.012], [0.02, 0.12, 0], scale).rotation.z = -0.15;
      fish.root.position.set(0, 0.4, 0.5); fish.root.rotation.z = 0.5;
      cat.root.add(fish.root);
    }
    if (a.damage === 'mended') {
      const seam = new THREE.MeshStandardMaterial({ color: '#e8b93a', metalness: 0.8, roughness: 0.3, emissive: '#6a4a08', emissiveIntensity: 0.4 });
      cat.tube([[0.3, 0.72, 0.2], [0.4, 0.55, 0.2], [0.36, 0.4, 0.29], [0.45, 0.25, 0.14], [0.4, 0.06, 0.12]], 0.012, seam);
      cat.tube([[0.36, 0.4, 0.29], [0.22, 0.34, 0.4], [0.2, 0.2, 0.42]], 0.01, seam);
    }
    if (a.stands === 'offerings') {
      const coins = 7 + Math.floor(random() * 8 + mood.density * 8);
      for (let i = 0; i < coins; i++) {
        const angle = (random() - 0.5) * 2.6, reach = 0.6 + random() * 0.3;
        s.cylinder(0.045, 0.045, 0.008, [Math.sin(angle) * reach, 0.004 + (random() > 0.8 ? 0.008 : 0), Math.cos(angle) * reach], random() > 0.4 ? gold : s.material('#c9cdd0', { metalness: 0.8, roughness: 0.3 }), 12);
      }
      const cup = s.material('#f3f1ea', { roughness: 0.3 });
      s.lathe([[0, 0], [0.05, 0], [0.06, 0.02], [0.1, 0.11], [0.09, 0.11], [0.05, 0.025]], cup, [-0.55, 0, 0.5]);
      s.cylinder(0.085, 0.085, 0.004, [-0.55, 0.09, 0.5], s.material('#dfe8ea', { roughness: 0.05 }), 14);
    }
    if (stone) for (let i = 0; i < 4 + mood.wear * 8; i++) { const angle = random() * Math.PI * 2; cat.ball([0.07 + random() * 0.06, 0.03, 0.07 + random() * 0.06], [Math.sin(angle) * 0.4, random() * 0.2, Math.cos(angle) * 0.4], s.material('#6f8a4a', { roughness: 1 }), 8); }

    s.root.scale.setScalar(height / 1.45);
    const speed = mix(0.6, 3.2, mood.energy);
    return s.finish({
      update: (_dt, time) => arms.forEach((arm, index) => { arm.rotation.x = 0.25 + (0.5 + 0.5 * Math.sin(time * speed + index * 0.6)) * 0.55; }),
    });
  },
});
