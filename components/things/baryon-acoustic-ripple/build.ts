import * as THREE from 'three';
import { Sculpture, choice, clamp01, defineThing, disposeTree, mix, score } from '@conjure/kit';

type Dot = { x: number; y: number; z: number; size: number; color: THREE.Color };

export default defineThing({
  questions: {
    rings: choice('How many rings spread from the centre?', {
      one: 'A single great ring.',
      two: 'Two rings, one inside the other.',
      three: 'Three widening rings, like a dropped pebble.',
      many: 'Five fine rings, a struck bell still ringing.',
    }),
    crispness: score('How crisp is the ring?', ['So faint you only see it by squinting at the whole field', 'A soft crowding of galaxies', 'A clear ring', 'A sharp drawn line']),
    drawn: choice('How is the ripple drawn?', {
      dots: 'Only in dots: each galaxy a separate fleck, the ring made of nothing but crowding.',
      band: 'As a soft smudged band of light with a few galaxies caught in it.',
      contour: 'As thin ruled contour lines, a survey diagram laid over the galaxies.',
      crest: 'As a raised wave crest, the ring standing up out of the sheet like a real ripple in water.',
    }),
    overlap: choice('Is it alone, or crossing another ripple?', {
      alone: 'One ripple, concentric and whole.',
      pair: 'Two ripples from two centres, their rings crossing like raindrops on a pond.',
      crowd: 'Three ripples of different sizes overlapping.',
      broken: 'One ripple with a sector missing, as if part of the sky was never surveyed.',
    }),
    centre: choice('What sits at the centre, where the stone went in?', {
      clump: 'A dense clump of galaxies.',
      giant: 'One swollen giant galaxy with a few attendants.',
      empty: 'Nothing: a small bare patch, the source long gone.',
      seed: 'A single hard bright point.',
    }),
    palette: choice('What colours are the galaxies?', {
      mixed: 'Mixed blue spirals and gold ellipticals.',
      blue: 'Mostly young blue.',
      gold: 'Mostly old amber and ivory.',
      ink: 'Dark ink dots, as plotted on a survey chart.',
    }),
    tilt: choice('How does the ripple lie?', {
      pond: 'Flat like the surface of a pond, seen from above at an angle.',
      plate: 'Tipped up toward the viewer like a displayed plate.',
      halo: 'Standing upright like a halo or a wreath.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const sheet = new THREE.Group();
    s.root.add(sheet);
    const ringCount = { one: 1, two: 2, three: 3, many: 5 }[a.rings];
    const sharp = clamp01(a.crispness);
    const spread = mix(0.55, 0.05, sharp);
    const palettes = {
      mixed: ['#3f78d8', '#e2a23a', '#6c9cf0', '#d9772e', '#8a5bc7'],
      blue: ['#3f78d8', '#5fa2ff', '#3458b8', '#7f8cf0'],
      gold: ['#e2a23a', '#c9772a', '#b9902f', '#d8553a'],
      ink: ['#27313f', '#3b3147', '#1f3b4a'],
    }[a.palette].map((c) => new THREE.Color(c).lerp(new THREE.Color('#d8553a'), a.palette === 'ink' ? 0 : (mood.warmth - 0.5) * 0.3));
    const pick = () => palettes[Math.floor(random() * palettes.length)];
    const gauss = () => (random() + random() + random() - 1.5) * 1.15;
    const dots: Dot[] = [];
    const lines: { x: number; z: number; r: number; gap: number }[] = [];
    const height = (lift: number) => (a.drawn === 'crest' ? lift : 0);

    const ripples = { alone: 1, pair: 2, crowd: 3, broken: 1 }[a.overlap];
    const outer = ripples === 1 ? 4 : 3;
    for (let k = 0; k < ripples; k++) {
      const cx = ripples === 1 ? 0 : k === 0 ? -1.9 : k === 1 ? 2 : 0.2;
      const cz = ripples === 1 ? 0 : k === 0 ? 0.3 : k === 1 ? -0.5 : 2.3 * (random() < 0.5 ? -1 : 1);
      const big = outer * (k === 0 ? 1 : k === 1 ? mix(0.7, 0.95, random()) : 0.6);
      const gap = a.overlap === 'broken' ? random() * 6.28 : -1;
      const missing = (ang: number) => gap >= 0 && Math.abs(((ang - gap + 9.42) % 6.28) - 3.14) < 0.55;
      for (let ring = 1; ring <= ringCount; ring++) {
        const r = big * ring / ringCount;
        const n = Math.round(mix(60, 150, mood.density) * (r / outer) * mix(0.7, 1.5, sharp) * (ringCount > 3 ? 0.75 : 1));
        for (let i = 0; i < n; i++) {
          const ang = random() * 6.28;
          if (missing(ang)) continue;
          const d = r + gauss() * spread * (1 + ring * 0.08), fall = Math.exp(-(((d - r) / 0.3) ** 2));
          dots.push({ x: cx + Math.cos(ang) * d, z: cz + Math.sin(ang) * d, y: height(fall * 0.55) + gauss() * 0.07, size: mix(0.05, 0.12, random() ** 2), color: pick() });
        }
        lines.push({ x: cx, z: cz, r, gap });
      }
      // The centre.
      const core: Dot[] = [];
      if (a.centre === 'clump') for (let i = 0; i < 46; i++) { const d = Math.abs(gauss()) * 0.5, ang = random() * 6.28; core.push({ x: Math.cos(ang) * d, z: Math.sin(ang) * d, y: gauss() * 0.14 + height(0.3), size: mix(0.07, 0.17, random() ** 2), color: pick() }); }
      if (a.centre === 'giant') {
        core.push({ x: 0, z: 0, y: 0.1, size: 0.5, color: palettes[1 % palettes.length] });
        for (let i = 0; i < 9; i++) { const ang = random() * 6.28, d = 0.6 + random() * 0.5; core.push({ x: Math.cos(ang) * d, z: Math.sin(ang) * d, y: gauss() * 0.1, size: 0.09 + random() * 0.07, color: pick() }); }
      }
      if (a.centre === 'seed') {
        const seed = new THREE.Mesh(new THREE.OctahedronGeometry(0.2, 0), new THREE.MeshBasicMaterial({ color: a.palette === 'ink' ? '#27313f' : '#ffffff', toneMapped: false }));
        seed.position.set(cx, 0.22, cz);
        sheet.add(seed);
        for (const turn of [0, Math.PI / 2]) {
          const spike = new THREE.Mesh(new THREE.OctahedronGeometry(1, 0), new THREE.MeshBasicMaterial({ color: palettes[0], toneMapped: false }));
          spike.scale.set(0.9, 0.035, 0.035);
          spike.rotation.y = turn + 0.4;
          spike.position.set(cx, 0.22, cz);
          sheet.add(spike);
        }
      }
      for (const dot of core) dots.push({ ...dot, x: dot.x + cx, z: dot.z + cz });
    }

    // The ordinary scatter of galaxies the ring is only a slight excess over.
    const field = Math.round(mix(120, 420, mood.density) * mix(1.5, 0.6, sharp) * (a.drawn === 'dots' ? 1 : 0.7));
    const reach = outer + (ripples > 1 ? 2.2 : 0.9);
    for (let i = 0; i < field; i++) {
      const ang = random() * 6.28, d = Math.sqrt(random()) * reach;
      if (a.centre === 'empty' && lines.some((l) => Math.hypot(Math.cos(ang) * d - l.x, Math.sin(ang) * d - l.z) < 0.7)) continue;
      dots.push({ x: Math.cos(ang) * d, z: Math.sin(ang) * d, y: gauss() * 0.07, size: mix(0.035, 0.085, random() ** 2), color: pick().clone().lerp(new THREE.Color('#b9b6ae'), 0.35) });
    }

    // Each galaxy is a little tilted lens, not a ball.
    const lens = new THREE.SphereGeometry(1, 10, 6);
    const galaxies = new THREE.InstancedMesh(lens, new THREE.MeshStandardMaterial({ roughness: 0.6, emissive: '#ffffff', emissiveIntensity: 0 }), dots.length);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    dots.forEach((dot, i) => {
      e.set((random() - 0.5) * 1.6, random() * 6.28, (random() - 0.5) * 1.6);
      q.setFromEuler(e);
      m.compose(new THREE.Vector3(dot.x, dot.y, dot.z), q, new THREE.Vector3(dot.size * 1.5, dot.size * mix(0.35, 0.9, random()), dot.size * 1.5));
      galaxies.setMatrixAt(i, m);
      galaxies.setColorAt(i, dot.color);
    });
    galaxies.castShadow = true;
    const paint = galaxies.material as THREE.MeshStandardMaterial;
    paint.emissive = new THREE.Color(a.palette === 'ink' ? '#000000' : '#ffffff');
    paint.emissiveIntensity = a.palette === 'ink' ? 0 : mix(0.05, 0.22, mood.cheer);
    sheet.add(galaxies);

    const bandColour = (a.palette === 'ink' ? new THREE.Color('#5a6878') : palettes[0].clone().lerp(new THREE.Color('#ffffff'), 0.25));
    for (const { x, z, r, gap } of lines) {
      const arc = gap >= 0 ? 6.28 - 1.1 : 6.28, start = gap >= 0 ? gap + 0.55 : 0;
      if (a.drawn === 'band') {
        const w = mix(0.6, 0.22, sharp);
        for (const [k, o] of [[1, 0.2], [0.5, 0.25]] as const) {
          const band = new THREE.Mesh(new THREE.RingGeometry(r - w * k, r + w * k, 96, 1, start, arc), new THREE.MeshBasicMaterial({ color: bandColour, transparent: true, opacity: o * mix(0.6, 1.3, sharp), depthWrite: false, side: THREE.DoubleSide }));
          band.rotation.x = -Math.PI / 2;
          band.position.set(x, 0.02 * k, z);
          sheet.add(band);
        }
      }
      if (a.drawn === 'contour' || a.drawn === 'crest') {
        const wire = new THREE.Mesh(new THREE.TorusGeometry(r, a.drawn === 'crest' ? mix(0.05, 0.11, sharp) : 0.022, 6, 128, arc), new THREE.MeshStandardMaterial({ color: a.drawn === 'crest' ? bandColour : '#3a4656', roughness: 0.7, transparent: a.drawn === 'crest', opacity: a.drawn === 'crest' ? mix(0.35, 0.8, sharp) : 1 }));
        wire.rotation.x = -Math.PI / 2;
        wire.rotation.z = -start - arc;
        wire.position.set(x, a.drawn === 'crest' ? 0.3 : 0, z);
        if (a.drawn === 'crest') wire.scale.z = 4;
        sheet.add(wire);
      }
      if (a.drawn === 'contour') {
        // Radial tick marks and a centre cross, as on a plotted survey.
        const ink = new THREE.MeshBasicMaterial({ color: '#3a4656' });
        for (let i = 0; i < 12; i++) {
          const ang = i * Math.PI / 6;
          if (gap >= 0 && Math.abs(((ang - gap + 9.42) % 6.28) - 3.14) < 0.55) continue;
          const tick = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.02, 0.02), ink);
          tick.position.set(x + Math.cos(ang) * (r + 0.13), 0, z + Math.sin(ang) * (r + 0.13));
          tick.rotation.y = -ang;
          sheet.add(tick);
        }
      }
    }

    sheet.rotation.y = random() * 6.28;
    const lean = new THREE.Group();
    s.root.add(lean);
    lean.add(sheet);
    lean.rotation.x = { pond: 0, plate: 0.75, halo: Math.PI / 2 - 0.12 }[a.tilt];
    const built = s.finish();
    const speed = mix(0, 0.22, mood.energy);
    return {
      object: built.object,
      update: (dt) => { sheet.rotation.y += dt * speed; },
      dispose: () => disposeTree(built.object),
    };
  },
});
