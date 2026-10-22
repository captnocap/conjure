import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

type P3 = readonly [number, number, number];

export default defineThing({
  questions: {
    familiar: choice('What kind of familiar keeps this perch?', {
      owl: 'A round-headed owl with huge eyes and ear tufts.',
      raven: 'A big glossy raven with a heavy beak.',
      cat: 'A cat, sitting on a little platform at the top with its tail hanging down.',
      bat: 'A large bat hanging upside down from the bar.',
    }),
    state: choice('What is the familiar doing?', {
      asleep: 'Asleep: hunched small, eyes shut.',
      alert: 'Alert: upright, eyes wide and bright, head turned to watch.',
      spread: 'Startled or arriving: wings thrown wide (a cat arches and bristles).',
      gone: 'Gone: the perch is empty, a tether dangles, and more is shed on the floor.',
    }),
    coat: choice('What colour is it?', {
      tawny: 'Tawny brown with a pale front.',
      white: 'Snow white.',
      black: 'Soot black.',
      grey: 'Ash grey.',
      ginger: 'Rusty ginger red.',
    }),
    eyes: choice('What are its eyes like?', {
      amber: 'Amber-gold lamps.',
      green: 'Bright green.',
      red: 'Red embers.',
      moon: 'Pale blue-white, like moons.',
    }),
    message: choice('Where is the message tube?', {
      none: 'There is no message.',
      hanging: 'A sealed leather tube hangs by a cord from the perch, waiting to be sent.',
      delivered: 'Lying open on the floor beside an unrolled letter with a red seal.',
      dropped: 'Fallen sealed at the foot of the perch, undelivered.',
    }),
    perch: choice('What is the perch?', {
      turned: 'A tall turned dark-oak stand with brass collars and ball finials.',
      branch: 'A crooked natural branch lashed upright in a stone pot.',
      iron: 'A black wrought-iron pole with a hoop above the crossbar.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const H = 1.12;
    const coatHex = { tawny: '#9a6a3c', white: '#f0ece2', black: '#1f1e24', grey: '#85878c', ginger: '#c0622a' }[a.coat];
    const paleHex = { tawny: '#e6d2a8', white: '#ffffff', black: '#3a3944', grey: '#c9cace', ginger: '#f0d0a0' }[a.coat];
    const coat = s.material(coatHex, { roughness: a.familiar === 'raven' ? 0.35 : 0.85 });
    const pale = s.material(paleHex, { roughness: 0.85 });
    const darkCoat = s.material(new THREE.Color(coatHex).multiplyScalar(0.55).getStyle(), { roughness: 0.8 });
    const eyeHex = { amber: '#ffb420', green: '#5ae04a', red: '#ff3a1e', moon: '#cfe6ff' }[a.eyes];
    const iris = s.material(eyeHex, { emissive: eyeHex, emissiveIntensity: mix(0.7, 1.4, mood.cheer), roughness: 0.2 });
    const black = s.material('#0d0c0e', { roughness: 0.3 });
    const horn = s.material('#3a3228', { roughness: 0.5 });
    const brass = s.material('#c49a44', { metalness: 0.7, roughness: 0.35 });

    // The perch.
    const barHalf = 0.36;
    let wood: THREE.Material;
    if (a.perch === 'turned') {
      wood = s.material('#4a3222');
      s.lathe([[0, 0.03], [0.24, 0.03], [0.25, 0.06], [0.2, 0.09], [0.08, 0.12], [0.05, 0.2], [0.07, 0.26], [0.04, 0.32], [0.04, 0.7], [0.065, 0.74], [0.04, 0.8], [0.034, H - 0.06], [0.05, H - 0.03], [0, H - 0.03]], wood);
      for (let i = 0; i < 3; i++) s.ball([0.05, 0.035, 0.05], [Math.cos(i * 2.094) * 0.2, 0.03, Math.sin(i * 2.094) * 0.2], wood, 10);
      for (const y of [0.29, 0.77, H - 0.07]) s.cylinder(0.045, 0.045, 0.025, [0, y, 0], brass, 16);
      s.rod([-barHalf, H, 0], [barHalf, H, 0], 0.022, wood);
      for (const x of [-1, 1]) s.ball([0.036, 0.036, 0.036], [x * barHalf, H, 0], brass, 12);
    } else if (a.perch === 'branch') {
      wood = s.material('#6a5038');
      s.lathe([[0, 0], [0.17, 0], [0.22, 0.14], [0.2, 0.26], [0.22, 0.28], [0.19, 0.29], [0, 0.29]], s.material('#8a8a84', { roughness: 0.95 }));
      for (let i = 0; i < 7; i++) s.ball([0.05, 0.03, 0.05], [Math.cos(i * 0.9) * 0.12, 0.29, Math.sin(i * 0.9) * 0.12], s.material('#6f6a60'), 7);
      s.tube([[0, 0.2, 0], [0.04, 0.45, 0.02], [-0.05, 0.7, -0.02], [0.03, 0.95, 0.01], [0, H, 0]], 0.04, wood);
      s.tube([[-barHalf - 0.04, H + 0.05, 0.02], [-0.15, H - 0.01, -0.01], [0, H, 0], [0.16, H + 0.02, 0.015], [barHalf + 0.06, H - 0.02, -0.01]], 0.026, wood);
      s.tube([[-0.04, 0.68, -0.02], [-0.16, 0.8, 0.03], [-0.24, 0.86, 0.06]], 0.02, wood);
      for (let i = 0; i < 5; i++) s.ring(0.045, 0.008, [0, H - 0.035 + i * 0.016, 0], s.material('#c9b88a')).rotation.x = Math.PI / 2 + (random() - 0.5) * 0.3;
    } else {
      wood = s.material('#27262a', { metalness: 0.5, roughness: 0.55 });
      for (let i = 0; i < 3; i++) { const t = i * 2.094 + 0.5; s.tube([[Math.cos(t) * 0.27, 0.015, Math.sin(t) * 0.27], [Math.cos(t) * 0.2, 0.1, Math.sin(t) * 0.2], [Math.cos(t) * 0.04, 0.2, Math.sin(t) * 0.04], [0, 0.36, 0]], 0.024, wood); s.ball([0.03, 0.018, 0.03], [Math.cos(t) * 0.28, 0.016, Math.sin(t) * 0.28], wood, 8); }
      const poleTop = a.familiar === 'cat' ? H : H + 0.5;
      s.cylinder(0.026, 0.03, poleTop - 0.3, [0, (poleTop + 0.3) / 2, 0], wood, 10);
      s.rod([-barHalf, H, 0], [barHalf, H, 0], 0.024, wood);
      for (const x of [-1, 1]) s.ring(0.03, 0.008, [x * (barHalf + 0.03), H, 0], wood);
      if (a.familiar !== 'cat') s.ring(0.27, 0.016, [0, H + 0.27, 0], wood).visible = a.familiar === 'bat' || a.state === 'gone';
      if (a.familiar !== 'cat') s.mesh(new THREE.ConeGeometry(0.03, 0.09, 4), wood, [0, H + 0.59, 0]);
    }
    const isCat = a.familiar === 'cat';
    if (isCat) { s.cylinder(0.27, 0.24, 0.035, [0, H + 0.035, 0], wood, 20); s.cylinder(0.25, 0.26, 0.03, [0, H + 0.065, 0], s.material('#7a2a3a', { roughness: 0.95 }), 20); }

    // The familiar.
    const pet = new THREE.Group(); pet.position.set(isCat ? 0 : a.perch === 'iron' ? 0.12 : 0.1, H + (isCat ? 0.08 : 0.02), 0); pet.scale.setScalar(1.5); s.root.add(pet);
    const add = <T extends THREE.Object3D>(parent: THREE.Object3D, mesh: T) => { parent.add(mesh); return mesh; };
    const wing = (span: number, chord: number, scallops: number, bat: boolean) => {
      const shape = new THREE.Shape(); shape.moveTo(0, 0); shape.lineTo(span * 0.45, chord * 0.5); shape.lineTo(span, chord * 0.35);
      for (let i = scallops; i >= 0; i--) { const x = span * (i / scallops) * 0.98; if (bat) shape.quadraticCurveTo(x + span / scallops * 0.5, -chord * 0.25, x, -chord * (0.75 - 0.3 * i / scallops)); else { shape.lineTo(x + span / scallops * 0.45, -chord * (0.5 + 0.35 * (1 - i / scallops))); shape.lineTo(x, -chord * (0.38 + 0.3 * (1 - i / scallops))); } }
      shape.lineTo(0, 0);
      return new THREE.ExtrudeGeometry(shape, { depth: 0.012, bevelEnabled: false });
    };
    const eyes = (head: THREE.Object3D, x: number, y: number, z: number, r: number, slit: boolean) => {
      for (const side of [-1, 1]) {
        if (a.state === 'asleep') { add(head, s.box([r * 1.8, r * 0.3, r * 0.4], [side * x, y, z], black)).rotation.z = side * -0.2; continue; }
        add(head, s.ball([r, r, r * 0.6], [side * x, y, z], iris, 12));
        add(head, s.ball(slit ? [r * 0.22, r * 0.8, r * 0.3] : [r * 0.5, r * 0.5, r * 0.3], [side * x, y, z + r * 0.42], black, 8));
      }
    };
    const spread = a.state === 'spread', asleep = a.state === 'asleep';
    let head: THREE.Group | null = null;
    const flappers: THREE.Object3D[] = [];
    if (a.state !== 'gone') {
      head = add(pet, new THREE.Group());
      if (a.familiar === 'owl') {
        add(pet, s.ball([0.105, asleep ? 0.125 : 0.14, 0.1], [0, 0.15, 0], coat, 18));
        add(pet, s.ball([0.075, 0.1, 0.05], [0, 0.14, 0.062], pale, 14));
        const dots = Array.from({ length: 16 }, () => ({ at: [(random() - 0.5) * 0.1, 0.07 + random() * 0.13, 0.108 - Math.abs(random() - 0.5) * 0.02] as P3, size: 0.007 }));
        add(pet, s.scatter(new THREE.SphereGeometry(1, 6, 4), darkCoat, dots));
        add(pet, s.box([0.09, 0.11, 0.018], [0, 0.02, -0.085], darkCoat)).rotation.x = 0.35;
        head.position.set(0, asleep ? 0.27 : 0.31, 0.005);
        add(head, s.ball([0.1, 0.086, 0.092], [0, 0, 0], coat, 18));
        for (const side of [-1, 1]) { add(head, s.ball([0.05, 0.052, 0.014], [side * 0.043, 0.004, 0.082], pale, 14)).rotation.y = side * 0.35; const tuft = add(head, s.mesh(new THREE.ConeGeometry(0.022, 0.07, 6), coat, [side * 0.065, 0.085, 0.01])); tuft.rotation.z = side * -0.5; }
        eyes(head, 0.043, 0.008, 0.094, 0.027, false);
        add(head, s.mesh(new THREE.ConeGeometry(0.014, 0.04, 6), horn, [0, -0.03, 0.098])).rotation.x = Math.PI * 0.9;
        for (const side of [-1, 1]) {
          if (spread) { const w = add(pet, s.mesh(wing(0.46, 0.26, 6, false), coat, [side * 0.07, 0.22, -0.03])); w.scale.x = side; w.rotation.set(0, 0, side * 0.3); flappers.push(w); }
          else add(pet, s.ball([0.035, 0.115, 0.08], [side * 0.098, 0.15, -0.012], darkCoat, 12)).rotation.z = side * 0.12;
          for (let k = -1; k <= 1; k++) add(pet, s.rod([side * 0.04 + k * 0.014, 0.012, 0.0], [side * 0.04 + k * 0.016, -0.014, 0.03], 0.006, horn, 0.003));
        }
      } else if (a.familiar === 'raven') {
        const body = add(pet, s.ball([0.075, asleep ? 0.09 : 0.08, 0.15], [0, 0.13, -0.02], coat, 16)); body.rotation.x = -0.55;
        add(pet, s.box([0.075, 0.014, 0.2], [0, 0.03, -0.2], coat)).rotation.x = -0.45;
        head.position.set(asleep ? 0.03 : 0, asleep ? 0.2 : 0.25, asleep ? 0.03 : 0.085);
        add(head, s.ball([0.058, 0.055, 0.062], [0, 0, 0], coat, 14));
        add(head, s.ball([0.05, 0.045, 0.05], [0, -0.04, -0.02], coat, 10));
        const beak = add(head, s.mesh(new THREE.ConeGeometry(0.024, 0.12, 8), horn, [0, -0.012, 0.105])); beak.rotation.x = Math.PI / 2 + 0.12; beak.scale.x = 0.75;
        eyes(head, 0.045, 0.012, 0.035, 0.013, false);
        if (asleep) head.rotation.set(0.5, 1.9, 0);
        for (const side of [-1, 1]) {
          if (spread) { const w = add(pet, s.mesh(wing(0.5, 0.24, 7, false), coat, [side * 0.05, 0.19, -0.03])); w.scale.x = side; w.rotation.set(-0.2, 0, side * 0.35); flappers.push(w); }
          else add(pet, s.ball([0.025, 0.055, 0.15], [side * 0.07, 0.12, -0.06], darkCoat, 10)).rotation.x = -0.5;
          add(pet, s.rod([side * 0.03, 0.08, 0], [side * 0.03, 0, 0.005], 0.008, horn));
          for (let k = -1; k <= 1; k++) add(pet, s.rod([side * 0.03, 0.008, 0.0], [side * 0.03 + k * 0.014, -0.012, 0.03], 0.005, horn, 0.003));
        }
      } else if (a.familiar === 'cat') {
        if (asleep) {
          add(pet, s.ball([0.115, 0.07, 0.15], [0, 0.065, -0.02], coat, 16));
          head.position.set(0.03, 0.075, 0.13);
        } else if (spread) {
          const arch = add(pet, s.ball([0.075, 0.09, 0.15], [0, 0.2, -0.02], coat, 16)); arch.rotation.x = 0.0;
          for (const x of [-0.045, 0.045]) for (const z of [-0.11, 0.08]) add(pet, s.rod([x, 0, z], [x, 0.17, z], 0.02, coat, 0.024));
          for (let i = 0; i < 9; i++) add(pet, s.mesh(new THREE.ConeGeometry(0.014, 0.05, 5), darkCoat, [(random() - 0.5) * 0.03, 0.295 - Math.abs(i - 4) * 0.008, -0.14 + i * 0.03]));
          head.position.set(0, 0.2, 0.15);
        } else {
          add(pet, s.ball([0.085, 0.13, 0.1], [0, 0.125, -0.03], coat, 16));
          add(pet, s.ball([0.06, 0.09, 0.05], [0, 0.13, 0.04], pale, 12));
          for (const x of [-0.035, 0.035]) add(pet, s.rod([x, 0, 0.07], [x, 0.16, 0.05], 0.02, coat, 0.022));
          head.position.set(0, 0.29, 0.03);
        }
        add(head, s.ball([0.075, 0.066, 0.07], [0, 0, 0], coat, 16));
        add(head, s.ball([0.036, 0.026, 0.03], [0, -0.022, 0.055], pale, 10));
        add(head, s.ball([0.01, 0.008, 0.008], [0, -0.01, 0.083], s.material('#d88a8a'), 6));
        for (const side of [-1, 1]) { const ear = add(head, s.mesh(new THREE.ConeGeometry(0.03, 0.06, 4), coat, [side * 0.045, 0.068, 0])); ear.rotation.set(0, Math.PI / 4, side * -0.25); }
        eyes(head, 0.032, 0.012, 0.06, 0.017, true);
        const tx = a.perch === 'iron' ? -0.05 : 0.06;
        if (spread) add(pet, s.tube([[0, 0.2, -0.15], [0, 0.32, -0.2], [0, 0.46, -0.17]], 0.035, darkCoat));
        else add(pet, s.tube([[tx, 0.04, -0.12], [tx + 0.05, 0.03, -0.2], [tx + 0.06, -0.12, -0.2], [tx + 0.04, -0.25, -0.19], [tx + 0.09, -0.31, -0.17]], 0.02, coat));
      } else {
        pet.position.set(a.perch === 'iron' ? 0.12 : 0.1, H - 0.02, 0); pet.scale.setScalar(2.3);
        for (const side of [-1, 1]) add(pet, s.rod([side * 0.015, 0, 0], [side * 0.012, -0.05, 0], 0.005, darkCoat));
        add(pet, s.ball([0.045, 0.075, 0.045], [0, -0.11, 0], coat, 14));
        head.position.set(0, -0.2, 0.01);
        add(head, s.ball([0.036, 0.034, 0.036], [0, 0, 0], coat, 12));
        add(head, s.ball([0.016, 0.014, 0.02], [0, -0.012, 0.03], darkCoat, 8));
        for (const side of [-1, 1]) { const ear = add(head, s.mesh(new THREE.ConeGeometry(0.018, 0.06, 5), darkCoat, [side * 0.026, -0.045, 0])); ear.rotation.z = Math.PI + side * 0.3; }
        eyes(head, 0.016, 0.004, 0.03, 0.008, false);
        for (const side of [-1, 1]) {
          if (asleep) add(pet, s.ball([0.04, 0.095, 0.035], [side * 0.022, -0.115, 0.022], darkCoat, 12)).rotation.z = side * 0.12;
          else { const w = add(pet, s.mesh(wing(spread ? 0.26 : 0.13, spread ? 0.2 : 0.17, 4, true), darkCoat, [side * 0.03, -0.06, -0.01])); w.scale.x = side; w.rotation.set(0, 0, side * (spread ? -0.35 : -1.1)); flappers.push(w); }
        }
      }
      if (a.state === 'alert' && head) head.rotation.y = (random() < 0.5 ? -1 : 1) * (0.5 + random() * 0.5);
    } else {
      const cord = s.material('#8a2a2a');
      s.tube([[0.1, H - 0.02, 0.01], [0.11, H - 0.2, 0.02], [0.08, H - 0.36, 0.0], [0.1, H - 0.48, 0.02]], 0.006, cord);
      s.ring(0.022, 0.005, [0.1, H - 0.5, 0.02], brass);
      s.ring(0.03, 0.007, [0.1, H, 0], cord).rotation.y = Math.PI / 2;
    }

    // Cups on the bar end.
    if (!isCat) { s.cylinder(0.04, 0.03, 0.045, [-barHalf + 0.06, H + 0.04, 0], brass, 12); s.cylinder(0.034, 0.034, 0.004, [-barHalf + 0.06, H + 0.062, 0], s.material(a.state === 'gone' ? '#3a3228' : '#c8b060'), 12); }

    // Message tube.
    const tube = (at: P3, tilt: P3, open: boolean) => {
      const g = new THREE.Group(); g.position.set(...at); g.rotation.set(...tilt); s.root.add(g);
      add(g, s.cylinder(0.026, 0.026, 0.17, [0, 0, 0], s.material('#6a3a22'), 12));
      add(g, s.cylinder(0.029, 0.029, 0.03, [0, -0.085, 0], brass, 12));
      if (!open) { add(g, s.cylinder(0.029, 0.029, 0.03, [0, 0.085, 0], brass, 12)); add(g, s.cylinder(0.014, 0.014, 0.008, [0, 0.104, 0], s.material('#b0202a'), 8)); }
      return g;
    };
    if (a.message === 'hanging') {
      const x = a.perch === 'branch' ? -0.24 : -barHalf + 0.03, y = a.perch === 'branch' ? 0.86 : H;
      s.rod([x, y, 0.03], [x, y - 0.2, 0.03], 0.004, s.material('#c9b88a'));
      tube([x, y - 0.3, 0.03], [0, 0, 0.12], false);
    } else if (a.message === 'dropped') tube([0.2 + random() * 0.1, 0.03, 0.26], [Math.PI / 2, 0, random() * 3], false);
    else if (a.message === 'delivered') {
      tube([0.3, 0.03, 0.2], [Math.PI / 2, 0, 0.8], true);
      s.cylinder(0.031, 0.031, 0.03, [0.42, 0.016, 0.3], brass, 12);
      const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 320; const g = canvas.getContext('2d')!;
      g.fillStyle = '#eadfbd'; g.fillRect(0, 0, 256, 320); g.strokeStyle = '#2b2118'; g.lineWidth = 4;
      for (let y = 36; y < 230; y += 22) { g.beginPath(); g.moveTo(26, y); for (let x = 26; x < 230 - random() * 70; x += 10) g.lineTo(x, y + (random() - 0.5) * 8); g.stroke(); }
      g.fillStyle = '#b0202a'; g.beginPath(); g.arc(190, 268, 26, 0, 7); g.fill();
      const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace;
      const letter = s.mesh(new THREE.PlaneGeometry(0.22, 0.28), new THREE.MeshStandardMaterial({ map, roughness: 0.9, side: THREE.DoubleSide }), [0.08, 0.006, 0.36]); letter.rotation.set(-Math.PI / 2, 0, -0.4);
      for (const z of [-1, 1]) { const curl = s.cylinder(0.014, 0.014, 0.22, [0.08 + z * 0.13 * Math.sin(0.4 + Math.PI / 2) * 1.0, 0.014, 0.36 + z * 0.13 * Math.cos(0.4 + Math.PI / 2)], s.material('#e0d4b0'), 8); curl.rotation.set(Math.PI / 2, 0, 0); curl.rotation.z = -0.4 + Math.PI / 2; curl.visible = false; }
    }

    // What it sheds.
    const shed = Math.round((2 + mood.density * 8) * (a.state === 'gone' ? 2 : 1));
    const fur = a.familiar === 'cat' || a.familiar === 'bat';
    for (let i = 0; i < shed; i++) {
      const t = random() * 6.283, d = 0.2 + random() * 0.32;
      const f = s.ball(fur ? [0.022, 0.008, 0.03] : [0.02, 0.003, 0.07], [Math.cos(t) * d, 0.006, Math.sin(t) * d], i % 3 ? coat : pale, 8); f.rotation.y = random() * 6;
      if (!fur) s.box([0.003, 0.003, 0.09], [Math.cos(t) * d, 0.007, Math.sin(t) * d], pale).rotation.y = f.rotation.y;
    }
    for (let i = 0; i < Math.round(mood.wear * 7); i++) { const t = random() * 6.283, d = 0.08 + random() * 0.25; s.cylinder(0.02 + random() * 0.02, 0.02, 0.003, [Math.cos(t) * d + 0.08, 0.002, Math.sin(t) * d], s.material('#eeeee6'), 8); }

    const speed = mix(0.2, 1.6, mood.energy);
    const turn = head?.rotation.y ?? 0;
    return s.finish({
      footprint: 0.34,
      update: (_dt, time) => {
        if (head && a.state === 'alert') head.rotation.y = turn + Math.sin(time * 0.7 * speed) * 0.5;
        if (asleep) pet.scale.y = pet.scale.x * (1 + Math.sin(time * 1.2) * 0.02);
        for (const [i, w] of flappers.entries()) w.rotation.y = (i % 2 ? -1 : 1) * Math.sin(time * 5 * speed) * 0.25;
      },
    });
  },
});
