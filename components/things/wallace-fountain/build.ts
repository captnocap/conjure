import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

export default defineThing({
  questions: {
    colour: choice('What colour is the fountain painted?', {
      green: 'The classic deep carriage green.',
      red: 'Lacquer red, like the ones near Chinatown.',
      yellow: 'Bright egg-yolk yellow, cheerful and odd.',
      pink: 'Candy pink, a district being playful.',
      blue: 'Strong cobalt blue.',
      bronze: 'Bare dark bronze, unpainted and solemn.',
    }),
    model: choice('Which model is it?', {
      caryatids: 'The grand model: four draped women with raised arms holding up the dome.',
      columns: 'The plainer model: four slim columns instead of figures.',
    }),
    water: choice('What is the water doing?', {
      thread: 'A thin steady thread falling from under the dome.',
      generous: 'Running hard and splashing, the basin brimming.',
      dry: 'Shut off: a dry basin with a few leaves in it.',
      frozen: 'Frozen into a single icicle over a basin of white ice.',
    }),
    rim: choice('What is on the rim of the basin?', {
      nothing: 'Nothing.',
      cup: 'A tin cup on a short chain, as there used to be.',
      pigeon: 'A pigeon leaning in to drink.',
      sparrows: 'Two sparrows.',
      bottle: 'A plastic bottle left half filled.',
      glove: 'A child\'s lost mitten, set there for its owner to find.',
    }),
    gilt: noul('Are the ornaments picked out in gold?'),
    puddle: noul('Has water pooled on the ground around the base?'),
    pad: choice('What does it stand on?', {
      stone: 'An octagonal stone kerb.',
      grate: 'A round iron tree-grate pattern set in the pavement.',
      cobbles: 'A ring of small cobbles.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const hue = new THREE.Color({ green: '#1d4c38', red: '#a52428', yellow: '#e0b22a', pink: '#d8789a', blue: '#2a5ba0', bronze: '#4a3a28' }[a.colour]);
    hue.lerp(new THREE.Color('#6c5a44'), mood.wear * 0.25);
    const iron = s.material(hue, { metalness: a.colour === 'bronze' ? 0.7 : 0.3, roughness: 0.45 });
    const gold = a.gilt ? s.material('#c9a23a', { metalness: 0.7, roughness: 0.35 }) : iron;
    const lathe = (profile: [number, number][], material: THREE.Material, segments: number, turn = 0) => {
      const mesh = s.mesh(new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), segments), material);
      mesh.rotation.y = turn;
      return mesh;
    };

    // What it stands on.
    if (a.pad === 'stone') lathe([[0, 0.07], [0.82, 0.07], [0.86, 0.0]], s.material('#b7b1a2', { roughness: 0.95 }), 8, Math.PI / 8);
    else if (a.pad === 'grate') {
      const dark = s.material('#3a3d3c', { metalness: 0.5 });
      for (const r of [0.5, 0.68, 0.86]) s.ring(r, 0.025, [0, 0.02, 0], dark).rotation.x = Math.PI / 2;
      for (let i = 0; i < 12; i++) { const t = i * Math.PI / 6; s.rod([Math.sin(t) * 0.5, 0.02, Math.cos(t) * 0.5], [Math.sin(t) * 0.86, 0.02, Math.cos(t) * 0.86], 0.02, dark); }
    } else {
      const tones = ['#8d8a82', '#a09a8e', '#77756f', '#958c7c'];
      const stones = [];
      for (let ring = 0; ring < 2; ring++)
        for (let i = 0; i < 16 + ring * 6; i++) {
          const t = (i + random() * 0.3) * Math.PI * 2 / (16 + ring * 6), r = 0.6 + ring * 0.2;
          stones.push({ at: [Math.sin(t) * r, 0.0, Math.cos(t) * r] as [number, number, number], size: 0.085 + random() * 0.015, color: tones[Math.floor(random() * 4)] });
        }
      s.scatter(new THREE.SphereGeometry(1, 8, 6).scale(1, 0.45, 1), s.material('#ffffff', { roughness: 0.95 }), stones);
    }

    // Octagonal pedestal with panels, then the round basin.
    lathe([[0.5, 0], [0.5, 0.16], [0.42, 0.24], [0.4, 0.3], [0.37, 0.36], [0.37, 0.84], [0.42, 0.9], [0.5, 0.96], [0.5, 1.04], [0.3, 1.06]], iron, 8, Math.PI / 8);
    for (let i = 0; i < 8; i++) {
      const t = i * Math.PI / 4;
      const plate = s.box([0.2, 0.36, 0.02], [Math.sin(t) * 0.35, 0.6, Math.cos(t) * 0.35], i % 2 ? gold : iron);
      plate.rotation.y = t;
      if (i % 2 === 0) s.ball([0.05, 0.07, 0.03], [Math.sin(t) * 0.365, 0.6, Math.cos(t) * 0.365], gold, 10).rotation.y = t;
    }
    lathe([[0.3, 1.04], [0.44, 1.08], [0.5, 1.16], [0.5, 1.2], [0.46, 1.2], [0.4, 1.13], [0.15, 1.1], [0, 1.1]], iron, 32);

    // Figures or columns.
    const top = 2.02;
    for (let i = 0; i < 4; i++) {
      const t = i * Math.PI / 2 + Math.PI / 4, x = Math.sin(t) * 0.27, z = Math.cos(t) * 0.27;
      if (a.model === 'caryatids') {
        const figure = new THREE.Group();
        figure.add(s.lathe([[0.1, 0], [0.085, 0.12], [0.07, 0.34], [0.055, 0.5], [0.068, 0.6], [0.075, 0.68], [0.04, 0.74], [0.03, 0.78]], iron));
        figure.add(s.ball([0.05, 0.06, 0.05], [0, 0.82, 0], iron, 12));
        figure.add(s.ball([0.056, 0.035, 0.056], [0, 0.865, -0.01], gold, 10));
        const bent = i % 2 === 0;
        for (const side of [-1, 1]) {
          figure.add(s.rod([side * 0.07, 0.7, 0], [side * 0.13, bent ? 0.8 : 0.84, 0.02], 0.022, iron));
          figure.add(s.rod([side * 0.13, bent ? 0.8 : 0.84, 0.02], [side * 0.09, 0.93, 0.03], 0.02, iron));
        }
        figure.position.set(x, 1.1, z);
        figure.rotation.y = t;
        s.root.add(figure);
      } else {
        s.lathe([[0.055, 0], [0.06, 0.05], [0.035, 0.1], [0.03, 0.8], [0.05, 0.86], [0.06, 0.92]], iron, [x, 1.1, z]);
        s.ring(0.04, 0.012, [x, 1.5, z], gold).rotation.x = Math.PI / 2;
      }
    }

    // Dome with scales, dolphins reduced to a crown of buds, and a spike.
    lathe([[0, top - 0.02], [0.46, top - 0.02], [0.5, top + 0.02], [0.5, top + 0.07], [0.44, top + 0.11]], iron, 32);
    const scaleCanvas = document.createElement('canvas');
    scaleCanvas.width = 256; scaleCanvas.height = 128;
    const g = scaleCanvas.getContext('2d')!;
    g.fillStyle = `#${hue.getHexString()}`; g.fillRect(0, 0, 256, 128);
    for (let r = 6; r >= 0; r--)
      for (let c = -1; c <= 12; c++) {
        g.beginPath(); g.arc((c + (r % 2) * 0.5 + 0.5) * 256 / 12, r * 128 / 6, 11.5, 0, Math.PI);
        g.fillStyle = `rgba(255,255,255,${0.06 + ((r + c + 12) % 3) * 0.04})`; g.fill();
        g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 2.5; g.stroke();
      }
    const scales = new THREE.CanvasTexture(scaleCanvas);
    scales.colorSpace = THREE.SRGBColorSpace;
    lathe([[0.44, top + 0.11], [0.4, top + 0.22], [0.3, top + 0.36], [0.18, top + 0.46], [0.1, top + 0.5]], new THREE.MeshStandardMaterial({ map: scales, metalness: 0.3, roughness: 0.5 }), 32);
    for (let i = 0; i < 8; i++) { const t = i * Math.PI / 4; s.ball([0.035, 0.045, 0.035], [Math.sin(t) * 0.47, top + 0.12, Math.cos(t) * 0.47], gold, 8); }
    s.lathe([[0.1, 0], [0.06, 0.05], [0.11, 0.12], [0.12, 0.17], [0.05, 0.24], [0.025, 0.36], [0, 0.42]], gold, [0, top + 0.5, 0]);

    // Water.
    const wet = new THREE.MeshStandardMaterial({ color: '#bfe3ee', transparent: true, opacity: 0.72, roughness: 0.08, depthWrite: false });
    let stream: THREE.Mesh | null = null;
    if (a.water === 'thread' || a.water === 'generous') {
      const r = a.water === 'thread' ? 0.011 : 0.028;
      stream = s.cylinder(r, r * 1.25, top - 1.16, [0, (top + 1.14) / 2, 0], wet, 10);
      stream.castShadow = false;
      const pool = s.cylinder(0.44, 0.4, 0.02, [0, a.water === 'generous' ? 1.185 : 1.15, 0], wet, 32);
      pool.castShadow = false;
      s.ring(a.water === 'generous' ? 0.12 : 0.05, 0.008, [0, a.water === 'generous' ? 1.2 : 1.165, 0], s.material('#f2fbfd', { roughness: 0.2 })).rotation.x = Math.PI / 2;
      if (a.water === 'generous') for (let i = 0; i < 6; i++) { const t = random() * 7; s.ball([0.012, 0.018, 0.012], [Math.sin(t) * 0.09, 1.22 + random() * 0.08, Math.cos(t) * 0.09], s.material('#eefafd', { roughness: 0.1 }), 6); }
    } else if (a.water === 'frozen') {
      const ice = s.material('#e6f3f7', { roughness: 0.25 });
      s.cylinder(0.035, 0.004, 0.55, [0, top - 0.3, 0], ice, 8);
      for (let i = 0; i < 5; i++) { const t = i * 1.3 + random(); s.cylinder(0.014, 0.002, 0.1 + random() * 0.12, [Math.sin(t) * 0.48, top - 0.08, Math.cos(t) * 0.48], ice, 6); }
      s.cylinder(0.44, 0.4, 0.03, [0, 1.17, 0], ice, 32);
    } else {
      const tones = ['#a8762a', '#7d5524', '#c29a3a'];
      for (let i = 0; i < 5 + Math.round(mood.wear * 6); i++) {
        const t = random() * 7, r = random() * 0.34;
        s.cylinder(0.035, 0.035, 0.006, [Math.sin(t) * r, 1.125 + random() * 0.01, Math.cos(t) * r], s.material(tones[i % 3]), 5).rotation.y = random() * 3;
      }
    }
    if (a.puddle) {
      const sheet = new THREE.MeshStandardMaterial({ color: '#7f97a3', roughness: 0.05, metalness: 0.4 });
      for (let i = 0; i < 3; i++) {
        const t = random() * 7, r = 0.5 + random() * 0.35;
        const blob = s.cylinder(1, 1, 0.012, [Math.sin(t) * r, a.pad === 'stone' ? 0.076 : 0.008, Math.cos(t) * r], sheet, 20);
        blob.scale.set(0.3 + random() * 0.3, 1, 0.22 + random() * 0.2);
        blob.rotation.y = random() * 3;
        blob.castShadow = false;
      }
    }

    // On the rim.
    const rimAt = (t: number, r = 0.48): [number, number, number] => [Math.sin(t) * r, 1.2, Math.cos(t) * r];
    const spot = 0.3 + random() * 0.5;
    const bird = (t: number, size: number, body: string, head: string, drinking: boolean) => {
      const group = new THREE.Group();
      group.add(s.ball([0.06, 0.055, 0.1], [0, 0.085, 0], s.material(body, { roughness: 0.85 }), 12));
      group.add(s.ball([0.035, 0.038, 0.035], [0, drinking ? 0.09 : 0.15, 0.09], s.material(head, { roughness: 0.8 }), 10));
      group.add(s.box([0.01, 0.01, 0.03], [0, drinking ? 0.075 : 0.145, 0.13], s.material('#d6a03c')));
      group.add(s.box([0.06, 0.01, 0.09], [0, 0.085, -0.12], s.material(head)));
      for (const side of [-1, 1]) group.add(s.rod([side * 0.02, 0.05, 0], [side * 0.02, 0, 0.01], 0.005, s.material('#c66a5a')));
      group.scale.setScalar(size);
      group.position.set(...rimAt(t));
      group.rotation.y = t + Math.PI + (random() - 0.5) * 0.6;
      if (drinking) group.rotation.x = 0.25;
      s.root.add(group);
    };
    if (a.rim === 'cup') {
      const tin = s.material('#aeb4b6', { metalness: 0.8, roughness: 0.3 });
      const [x, , z] = rimAt(spot);
      s.cylinder(0.045, 0.035, 0.08, [x, 1.24, z], tin, 14);
      s.ring(0.022, 0.006, [x * 1.12, 1.24, z * 1.12], tin).rotation.y = spot;
      s.tube([[x * 1.1, 1.22, z * 1.1], [x * 1.18, 1.02, z * 1.18], [x * 0.95, 0.98, z * 0.95], [x * 0.84, 1.03, z * 0.84]], 0.006, tin);
    } else if (a.rim === 'pigeon') bird(spot, 1.25, '#8d95a0', '#4f6a66', a.water !== 'dry' && a.water !== 'frozen');
    else if (a.rim === 'sparrows') { bird(spot, 0.6, '#8a6a48', '#5c4026', false); bird(spot + 0.9 + random(), 0.6, '#96744e', '#5c4026', true); }
    else if (a.rim === 'bottle') {
      const [x, , z] = rimAt(spot, 0.47);
      const pet = new THREE.MeshStandardMaterial({ color: '#cfeaf3', transparent: true, opacity: 0.6, roughness: 0.1 });
      s.cylinder(0.032, 0.032, 0.17, [x, 1.285, z], pet, 12);
      s.cylinder(0.031, 0.031, 0.08, [x, 1.245, z], s.material('#8fc4d8', { roughness: 0.1 }), 12);
      s.cylinder(0.012, 0.026, 0.04, [x, 1.39, z], pet, 10);
      s.cylinder(0.014, 0.014, 0.015, [x, 1.415, z], s.material('#2a6fc0'), 10);
    } else if (a.rim === 'glove') {
      const wool = s.material(mood.cheer > 0.5 ? '#d8342c' : '#5a6f9a', { roughness: 1 });
      const [x, , z] = rimAt(spot, 0.48);
      s.ball([0.045, 0.02, 0.06], [x, 1.215, z], wool, 10).rotation.y = spot;
      s.ball([0.018, 0.016, 0.03], [x + Math.cos(spot) * 0.045, 1.215, z - Math.sin(spot) * 0.045], wool, 8);
      s.cylinder(0.04, 0.04, 0.02, [x * 1.1, 1.205, z * 1.1], s.material('#f1ece0', { roughness: 1 }), 10);
    }

    const energy = mix(0.3, 1.6, mood.energy), phase = random() * 6;
    return s.finish({
      update: (_dt, time) => {
        if (stream) { const wobble = 1 + Math.sin(time * 11 * energy + phase) * 0.18; stream.scale.set(wobble, 1, 2 - wobble); }
      },
    });
  },
});
