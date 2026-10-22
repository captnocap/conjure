import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';
import { paintFilm, type Finding, type Patient, type Tint } from './film';

const NAMES = ['BISCUIT', 'MOCHI', 'PICKLE', 'DUKE', 'LUNA', 'GIZMO', 'OLIVE', 'TANK', 'PEANUT', 'SOCKS'];

function texture(canvas: HTMLCanvasElement) {
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  return map;
}

export default defineThing({
  questions: {
    patient: choice('Whose head is on the film?', {
      dog: 'A long dog skull: narrow muzzle, rows of pointed teeth, big canines.',
      pug: 'A short crushed pug skull: domed cranium, almost no muzzle, crowded teeth and an underbite.',
      cat: 'A cat: round skull, huge eye socket, dagger canines.',
      rabbit: 'A rabbit with overgrown teeth: incisors curling past each other, long ears as faint ghosts.',
      parrot: 'A parrot: round thin skull, ringed eye socket, a heavy hooked beak and a string of neck bones.',
      monkey: 'A small monkey: tall rounded braincase, brow ridge, flat molars, unsettlingly like a child.',
    }),
    finding: choice('What does the film show?', {
      clean: 'Nothing wrong. A clean, healthy skull.',
      fracture: 'A fractured jaw: a dark jagged break with a chip displaced below it, ringed in marker.',
      hook: 'A swallowed fish hook, blazing white in the throat, with a trail of line.',
      baby: 'Retained baby teeth: extra slim canines crowded beside the adult ones.',
      shadow: 'A soft pale shadow where there should be none, circled in marker with a question mark.',
    }),
    display: choice('What is it shown on?', {
      lightbox: 'An old steel lightbox: a film clipped under a spring bar in front of glowing white tubes.',
      monitor: 'A clinic monitor on a stand, the image in viewing software with a toolbar.',
      tablet: 'A tablet propped on a folding stand, held at an angle to show an owner.',
    }),
    layout: choice('How many views?', {
      single: 'One film.',
      triple: 'A row of three: the side view, the opposite side, and a close-up of the teeth.',
    }),
    tint: choice('What does the image look like?', {
      blue: 'Classic blue-black film with cold white bone.',
      amber: 'An old yellowed film, bone gone warm and brown at the edges.',
      green: 'Green-tinged, like an older digital system.',
      inverted: 'Inverted: dark bones on a white ground.',
    }),
    label: choice('What does the clip-on label say?', {
      none: 'There is no label.',
      young: 'A pet name and an age in months: a youngster.',
      old: 'A pet name and a great age in years.',
      stray: 'FOUND / NO CHIP: nobody knows its name.',
    }),
    beside: choice('What has been left beside it?', {
      nothing: 'Nothing.',
      pencil: 'A grease pencil and the brown film envelope.',
      dish: 'A steel kidney dish holding whatever was retrieved.',
      tissues: 'A box of tissues, one pulled half out.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const patient = a.patient as Patient, finding = a.finding as Finding, tint = a.tint as Tint;
    const triple = a.layout === 'triple';
    const films = triple
      ? [paintFilm(patient, finding, tint, mood.wear, random), paintFilm(patient, 'clean', tint, mood.wear, random, 1, true), paintFilm(patient, finding === 'baby' || finding === 'fracture' ? finding : 'clean', tint, mood.wear, random, 1.7)]
      : [paintFilm(patient, finding, tint, mood.wear, random)];
    const glowTint = new THREE.Color().setHSL(mix(0.58, 0.1, mood.warmth), 0.5, 0.92);
    const glow = mix(0.7, 1.15, mood.cheer * 0.5 + 0.5 * (1 - mood.wear));
    const lit: THREE.MeshStandardMaterial[] = [];
    const filmMat = (canvas: HTMLCanvasElement) => {
      const map = texture(canvas);
      const m = new THREE.MeshStandardMaterial({ map, emissiveMap: map, emissive: '#ffffff', emissiveIntensity: glow, roughness: 0.25, color: '#606060' });
      lit.push(m);
      return m;
    };
    const steel = s.material('#c9cdd0', { metalness: 0.55, roughness: 0.4 });
    const darkPlastic = s.material('#24272c', { roughness: 0.45 });
    const name = NAMES[Math.floor(random() * NAMES.length)];
    const labelText = a.label === 'young' ? `${name}  ${3 + Math.floor(random() * 7)} MO` : a.label === 'old' ? `${name}  ${12 + Math.floor(random() * 8)} YR` : 'FOUND / NO CHIP';
    const fw = 0.36, fh = 0.28;
    let width = 0.5;
    const unit = new THREE.Group();
    s.root.add(unit);
    const add = (mesh: THREE.Mesh) => { unit.add(mesh); return mesh; };

    if (a.display === 'lightbox') {
      const n = films.length;
      width = n * (fw + 0.05) + 0.07;
      const h = 0.4, y0 = 0.05 + h / 2;
      const casing = s.material(new THREE.Color('#e9e6dc').lerp(new THREE.Color('#cdbf94'), mood.wear * 0.7), { roughness: 0.55 });
      add(s.box([width, h, 0.085], [0, y0, 0], casing));
      const panel = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: glowTint, emissiveIntensity: glow * 0.95, roughness: 0.4 });
      lit.push(panel);
      add(s.box([width - 0.05, h - 0.07, 0.006], [0, y0 - 0.008, 0.044], panel));
      // Spring clip bar with rollers along the top edge.
      add(s.box([width - 0.03, 0.022, 0.02], [0, y0 + h / 2 - 0.036, 0.054], steel));
      films.forEach((canvas, i) => {
        const x = (i - (n - 1) / 2) * (fw + 0.05) + (random() - 0.5) * 0.012;
        const sheet = add(s.mesh(new THREE.PlaneGeometry(fw, fh), filmMat(canvas), [x, y0 - 0.02, 0.0485]));
        sheet.rotation.z = (random() - 0.5) * 0.05 * (0.4 + mood.wear);
        sheet.castShadow = false;
        for (const dx of [-0.11, 0.11]) add(s.cylinder(0.008, 0.008, 0.026, [x + dx, y0 + h / 2 - 0.05, 0.062], darkPlastic, 10)).rotation.z = Math.PI / 2;
      });
      // Feet, rocker switch and a trailing cord.
      for (const x of [-1, 1]) add(s.box([0.03, 0.05, 0.2], [x * (width / 2 - 0.06), 0.025, -0.01], steel));
      add(s.box([0.03, 0.045, 0.012], [width / 2 - 0.035, 0.085, 0.046], s.material('#c8452f', { emissive: '#ff5a3a', emissiveIntensity: 0.5 })));
      add(s.tube([[-width / 2 + 0.05, 0.1, -0.045], [-width / 2 - 0.02, 0.03, -0.1], [-width / 2 - 0.1, 0.006, -0.06], [-width / 2 - 0.16, 0.006, 0.04 + random() * 0.08]], 0.005, darkPlastic));
      unit.rotation.x = -0.1;
      if (a.label !== 'none') {
        const tag = add(s.label(labelText, 0.2, 0.045, [-width / 2 + 0.13, y0 + h / 2 + 0.012, 0.03], '#20242c', a.label === 'stray' ? '#f4d24a' : '#f7f4ea'));
        tag.rotation.z = (random() - 0.5) * 0.12;
        add(s.box([0.03, 0.03, 0.012], [-width / 2 + 0.13, y0 + h / 2 - 0.004, 0.042], darkPlastic));
      }
    } else {
      // A screen: compose the views and the software chrome into one canvas.
      const tablet = a.display === 'tablet';
      const sw = triple ? 0.62 : 0.46, sh = tablet ? sw * 0.7 : sw * 0.66;
      width = sw + 0.03;
      const screen = document.createElement('canvas');
      screen.width = 1024; screen.height = Math.round(1024 * sh / sw);
      const g = screen.getContext('2d')!;
      g.fillStyle = '#0c0f14'; g.fillRect(0, 0, screen.width, screen.height);
      g.fillStyle = '#1d2530'; g.fillRect(0, 0, screen.width, 54);
      g.fillStyle = '#9fd0ff'; g.font = 'bold 28px monospace'; g.textBaseline = 'middle';
      g.fillText(a.label === 'none' ? 'PATIENT —' : labelText, 20, 28);
      for (let i = 0; i < 5; i++) { g.fillStyle = i === 1 ? '#3fa7ff' : '#3a4654'; g.fillRect(screen.width - 60 - i * 52, 12, 38, 30); }
      const top = 64, bodyH = screen.height - top - 10;
      if (triple) {
        const mainW = screen.width * 0.66;
        g.drawImage(films[0], 10, top, mainW - 20, bodyH);
        const th = (bodyH - 10) / 2;
        g.drawImage(films[1], mainW, top, screen.width - mainW - 10, th);
        g.drawImage(films[2], mainW, top + th + 10, screen.width - mainW - 10, th);
        g.strokeStyle = '#3fa7ff'; g.lineWidth = 4; g.strokeRect(10, top, mainW - 20, bodyH);
      } else g.drawImage(films[0], 10, top, screen.width - 20, bodyH);
      const bezel = tablet ? darkPlastic : s.material('#dfe2e4', { roughness: 0.5 });
      const t = tablet ? 0.012 : 0.03;
      const slab = new THREE.Group();
      unit.add(slab);
      const slabAdd = (mesh: THREE.Mesh) => { slab.add(mesh); return mesh; };
      slabAdd(s.box([sw + 0.03, sh + 0.03, t], [0, 0, 0], bezel));
      const face = slabAdd(s.mesh(new THREE.PlaneGeometry(sw, sh), filmMat(screen), [0, 0, t / 2 + 0.001]));
      face.castShadow = false;
      if (tablet) {
        const lean = 0.42;
        slab.rotation.x = -lean;
        slab.position.set(0, Math.cos(lean) * (sh + 0.03) / 2 + 0.012, 0);
        // Folding easel behind it and a lip in front.
        add(s.box([sw * 0.5, 0.012, 0.05], [0, 0.006, Math.sin(lean) * (sh + 0.03) / 2 + 0.02], steel));
        add(s.rod([0, 0.006, Math.sin(lean) * sh / 2], [0, sh * 0.55, -Math.sin(lean) * sh * 0.05 - 0.02], 0.007, steel));
        add(s.rod([0, sh * 0.55, -Math.sin(lean) * sh * 0.05 - 0.02], [0, 0.006, -0.2], 0.007, steel));
        add(s.box([sw * 0.4, 0.012, 0.04], [0, 0.006, -0.2], steel));
      } else {
        const cy = 0.2 + sh / 2;
        slab.position.set(0, cy, 0);
        slab.rotation.x = -0.08;
        add(s.cylinder(0.02, 0.024, cy, [0, cy / 2, -0.05], steel, 14));
        add(s.box([0.09, 0.07, 0.05], [0, cy - 0.02, -0.03], steel));
        add(s.cylinder(0.14, 0.15, 0.016, [0, 0.008, -0.03], steel, 28)).scale.z = 0.75;
        add(s.box([0.012, 0.012, 0.004], [sw / 2 - 0.02, cy - sh / 2 - 0.006, 0.018], s.material('#3fe07a', { emissive: '#3fe07a', emissiveIntensity: 1 })));
        if (a.label !== 'none') {
          // A paper sticky note on the bezel all the same.
          const note = add(s.label(labelText, 0.16, 0.05, [-sw / 2 + 0.09, cy + sh / 2 + 0.03, 0.012], '#20242c', a.label === 'stray' ? '#f4d24a' : '#fff2a8'));
          note.rotation.z = (random() - 0.5) * 0.2;
        }
      }
    }

    // What has been left beside it, at the foot.
    const side = random() < 0.5 ? -1 : 1, bx = side * (width / 2 - 0.12), bz = 0.2 + random() * 0.04;
    if (a.beside === 'pencil') {
      const env = s.box([0.3, 0.004, 0.24], [bx, 0.002, bz + 0.04], s.material('#b08a55', { roughness: 0.95 }));
      env.rotation.y = (random() - 0.5) * 0.6;
      const pencil = s.cylinder(0.006, 0.006, 0.13, [bx - side * 0.05, 0.011, bz + 0.03], s.material(tint === 'amber' ? '#e2402e' : '#f0c232'), 8);
      pencil.rotation.set(Math.PI / 2, 0, 1.1 + random());
    } else if (a.beside === 'dish') {
      const shape = new THREE.Shape();
      for (let i = 0; i <= 32; i++) { const t = (i / 32) * Math.PI * 2, r = 0.07 + 0.022 * Math.cos(t * 2) - 0.012 * Math.sin(t); const p: [number, number] = [Math.cos(t) * r * 1.35, Math.sin(t) * r]; if (i) shape.lineTo(...p); else shape.moveTo(...p); }
      const dish = s.mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.03, bevelEnabled: true, bevelSize: 0.006, bevelThickness: 0.006, bevelSegments: 2 }), s.material('#c5cacd', { metalness: 0.8, roughness: 0.25 }), [bx, 0.036, bz + 0.03]);
      dish.rotation.set(Math.PI / 2, 0, random() * 2);
      s.box([0.11, 0.004, 0.06], [bx, 0.039, bz + 0.03], s.material('#8d9396', { metalness: 0.6, roughness: 0.5 })).rotation.y = dish.rotation.z;
      // The retrieved thing: a hook, a tooth, or a bloodied swab.
      if (finding === 'hook') {
        const hook = s.ring(0.014, 0.0022, [bx, 0.045, bz + 0.03], s.material('#e9ecef', { metalness: 0.9, roughness: 0.2 }), Math.PI * 1.3);
        hook.rotation.x = Math.PI / 2;
        s.rod([bx + 0.014, 0.045, bz + 0.03], [bx + 0.014, 0.045, bz - 0.015], 0.0022, s.material('#e9ecef', { metalness: 0.9, roughness: 0.2 }));
      } else if (finding === 'baby' || finding === 'fracture') {
        for (let i = 0; i < 2; i++) s.mesh(new THREE.ConeGeometry(0.005, 0.02, 8), s.material('#f4efe0', { roughness: 0.4 }), [bx + (i - 0.5) * 0.03, 0.045, bz + 0.03]).rotation.set(Math.PI / 2, 0, random() * 3);
      } else s.ball([0.02, 0.008, 0.015], [bx, 0.046, bz + 0.03], s.material(mood.cheer < 0.4 ? '#b8443c' : '#f1eee6', { roughness: 1 }), 10);
    } else if (a.beside === 'tissues') {
      const card = s.material(new THREE.Color().setHSL(mix(0.58, 0.08, mood.warmth), 0.4, 0.72), { roughness: 0.8 });
      const box = s.box([0.22, 0.075, 0.115], [bx, 0.0375, bz + 0.03], card);
      box.rotation.y = (random() - 0.5) * 0.7;
      const tissue = s.mesh(new THREE.ConeGeometry(0.045, 0.085, 5, 1, true), s.material('#fbfaf6', { roughness: 1, side: THREE.DoubleSide, flatShading: true }), [bx, 0.105, bz + 0.03]);
      tissue.rotation.set(Math.PI, random() * 3, 0.15);
      // Used ones, more of them the grimmer the news.
      for (let i = 0; i < Math.round((1 - mood.cheer) * 4); i++) s.mesh(new THREE.IcosahedronGeometry(0.022, 0), s.material('#f6f4ee', { roughness: 1, flatShading: true }), [bx - side * (0.16 + random() * 0.1), 0.02, bz + 0.02 + random() * 0.12]).rotation.set(random() * 3, random() * 3, 0);
    }

    // Tubes flicker more the more worn and restless the scene.
    const flicker = a.display === 'lightbox' ? mix(0.02, 0.3, mood.wear) * (0.4 + mood.energy) : 0.03 * mood.energy;
    const base = lit.map((m) => m.emissiveIntensity);
    return s.finish({
      update: (_dt, time) => {
        const n = Math.sin(time * 37) * Math.sin(time * 11.3 + 2) * Math.sin(time * 3.1);
        const drop = n > 0.55 ? 1 - flicker * 2.2 : 1 - flicker * 0.25 * (0.5 + 0.5 * Math.sin(time * 50));
        lit.forEach((m, i) => { m.emissiveIntensity = base[i] * drop; });
      },
    });
  },
});
