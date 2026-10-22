import * as THREE from 'three';
import { Sculpture, choice, clamp01, defineThing, disposeTree, mix, score } from '@conjure/kit';

type P = [number, number, number];

export default defineThing({
  questions: {
    company: choice('Is it alone, or one of a small litter?', {
      alone: 'Entirely alone, one giant in empty dark.',
      twin: 'A close pair, a second star nearly as large beside it.',
      litter: 'A litter: three or four smaller siblings born from the same cloud circle it.',
      runt: 'It has one tiny companion, a runt that will outlive it by billions of years.',
    }),
    stage: choice('How near is it to its end?', {
      steady: 'Steady and round, burning evenly in its prime.',
      swelling: 'Swelling: bloated, soft-edged and mottled, its skin lifting away.',
      shedding: 'Shedding: it has coughed off thin shells that hang around it like onion skins.',
      going: 'About to go: flattened and cracked with white fissures, jets escaping at the poles.',
    }),
    halo: choice('What shape is the glare around it?', {
      corona: 'A plain round corona, soft rings of light.',
      cross: 'Four long diffraction spikes, a plus sign of light.',
      six: 'Six spikes, as a segmented telescope mirror would draw it.',
      rays: 'Dozens of uneven rays like a child drawing the sun.',
      bare: 'Almost no glare, just the hard disc of the star.',
    }),
    purity: score('How pure is its colour?', ['Flawless blue-white, hydrogen and helium only', 'A faint violet cast', 'Flecked with the first gold and rust of heavier elements']),
    surface: choice('What does its surface look like?', {
      smooth: 'Smooth as a pearl, featureless.',
      granules: 'Fine boiling granulation like simmering milk.',
      bands: 'Slow broad bands, faintly striped.',
      blotched: 'A few huge pale blotches, each larger than a planet.',
    }),
    surround: choice('What has it done to the space around it?', {
      nothing: 'Nothing: clean empty dark right up to its edge.',
      bubble: 'It has blown a clear bubble, a thin spherical wall of pushed-back gas.',
      disc: 'A thin flat disc of untouched gas still circles its waist.',
      wisps: 'A few last wisps of its birth cloud are being burned away.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const R = { steady: 2, swelling: 2.5, shedding: 2.1, going: 2.2 }[a.stage];
    const stain = clamp01(a.purity * 0.85 + mood.wear * 0.25);
    const base = new THREE.Color('#5d9dff').lerp(new THREE.Color('#8f7cf2'), clamp01(a.purity * 1.6) * 0.35).lerp(new THREE.Color('#ffd9b0'), Math.max(0, mood.warmth - 0.5) * 0.12 + (a.stage === 'swelling' ? 0.08 : 0));
    const deep = base.clone().multiplyScalar(0.55);
    const pale = base.clone().lerp(new THREE.Color('#ffffff'), 0.78);

    // Painted photosphere.
    const paint = (seedShift: number) => {
      const canvas = document.createElement('canvas');
      canvas.width = 512; canvas.height = 256;
      const ctx = canvas.getContext('2d')!;
      const css = (c: THREE.Color, alpha = 1) => `rgba(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)},${alpha})`;
      const flat = base.clone().lerp(pale, 0.3).convertLinearToSRGB(), light = pale.clone().convertLinearToSRGB(), dark = deep.clone().lerp(base, 0.4).convertLinearToSRGB();
      ctx.fillStyle = css(flat);
      ctx.fillRect(0, 0, 512, 256);
      const blob = (x: number, y: number, r: number, c: THREE.Color, alpha: number) => {
        for (const dx of [-512, 0, 512]) {
          const g = ctx.createRadialGradient(x + dx, y, 0, x + dx, y, r);
          g.addColorStop(0, css(c, alpha)); g.addColorStop(1, css(c, 0));
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.ellipse(x + dx, y, r * 1.6, r, 0, 0, 6.3); ctx.fill();
        }
      };
      if (a.surface === 'granules') for (let i = 0; i < 520; i++) blob(random() * 512, random() * 256, 5 + random() * 9, i % 3 ? light : dark, 0.5);
      if (a.surface === 'bands') for (let i = 0; i < 9; i++) { ctx.fillStyle = css(i % 2 ? light : dark, 0.42); const y = 14 + i * 27 + random() * 10; ctx.fillRect(0, y, 512, 8 + random() * 12); }
      if (a.surface === 'blotched') for (let i = 0; i < 9; i++) blob(random() * 512, 40 + random() * 176, 26 + random() * 34, i % 4 ? light : dark, 0.75);
      if (a.surface === 'smooth') for (let i = 0; i < 6; i++) blob(random() * 512, random() * 256, 70, light, 0.2);
      if (a.stage === 'swelling') for (let i = 0; i < 30; i++) blob(random() * 512, random() * 256, 16 + random() * 26, i % 2 ? light : dark, 0.5);
      const flecks = Math.round(stain * 150);
      for (let i = 0; i < flecks; i++) blob(random() * 512, random() * 256, 2.5 + random() * 6, new THREE.Color(i % 3 ? '#d99a2b' : '#a8482a').convertLinearToSRGB(), 0.85);
      if (a.stage === 'going') {
        ctx.strokeStyle = '#ffffff'; ctx.lineCap = 'round';
        for (let i = 0; i < 16; i++) {
          let x = random() * 512, y = 30 + random() * 196;
          ctx.lineWidth = 2 + random() * 4;
          ctx.beginPath(); ctx.moveTo(x, y);
          for (let k = 0; k < 7; k++) { x += (random() - 0.5) * 60; y += (random() - 0.5) * 44; ctx.lineTo(x, y); }
          ctx.stroke();
        }
      }
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = THREE.RepeatWrapping;
      texture.offset.x = seedShift;
      return texture;
    };

    const spinners: THREE.Object3D[] = [];
    const star = (at: P, radius: number, squash = 1) => {
      const group = new THREE.Group();
      group.position.set(...at);
      const texture = paint(random());
      const globe = new THREE.Mesh(new THREE.SphereGeometry(radius, 48, 32), new THREE.MeshStandardMaterial({ map: texture, emissiveMap: texture, emissive: '#ffffff', emissiveIntensity: mix(0.5, 0.72, mood.cheer), roughness: 1 }));
      globe.castShadow = true;
      globe.scale.y = squash;
      globe.rotation.z = 0.2;
      group.add(globe);
      spinners.push(globe);
      // A deeper blue rim so the disc holds its edge on a pale backdrop.
      const rim = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.035, 48, 32), new THREE.MeshBasicMaterial({ color: deep, side: THREE.BackSide }));
      rim.scale.y = squash;
      group.add(rim);
      s.root.add(group);
      return group;
    };
    const squash = a.stage === 'going' ? 0.8 : 1;
    const main = star([0, 0, 0], R, squash);

    const veil = (color: THREE.ColorRepresentation, opacity: number) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide });
    const glare = (group: THREE.Group, radius: number, strength: number) => {
      const spikePaint = new THREE.MeshBasicMaterial({ color: base.clone().lerp(pale, 0.35), toneMapped: false });
      const spike = (angle: number, reach: number, width: number) => {
        const mesh = new THREE.Mesh(new THREE.OctahedronGeometry(1, 0), spikePaint);
        mesh.scale.set(reach, width, width);
        mesh.rotation.z = angle;
        group.add(mesh);
      };
      if (a.halo !== 'bare') for (const [k, o] of [[1.2, 0.22], [1.45, 0.13], [1.75, 0.07]] as const) {
        group.add(new THREE.Mesh(new THREE.SphereGeometry(radius * mix(1.1, k, strength), 32, 20), veil(base, o)));
      }
      if (a.halo === 'cross') for (let i = 0; i < 2; i++) spike(i * Math.PI / 2 + 0.35, radius * 2.7 * strength, radius * 0.09);
      if (a.halo === 'six') for (let i = 0; i < 3; i++) spike(i * Math.PI / 3 + Math.PI / 6, radius * (i === 1 ? 2.1 : 2.6) * strength, radius * 0.08);
      if (a.halo === 'rays') {
        const n = 13 + Math.floor(random() * 6);
        for (let i = 0; i < n; i++) spike(i * Math.PI / n + (random() - 0.5) * 0.1, radius * mix(1.35, 2.5, random()) * strength, radius * mix(0.03, 0.07, random()));
      }
    };
    glare(main, R, mix(0.85, 1.1, mood.cheer));

    const orbiters: { group: THREE.Group; radius: number; phase: number; rate: number; tilt: number }[] = [];
    const sibling = (radius: number, distance: number, phase: number, tilt: number) => {
      const group = star([0, 0, 0], radius);
      glare(group, radius, 0.7);
      orbiters.push({ group, radius: distance, phase, rate: 1 / distance ** 1.5, tilt });
    };
    if (a.company === 'twin') sibling(R * 0.72, R * 2.5, 0.5 + random(), 0.15);
    if (a.company === 'runt') sibling(R * 0.16, R * 1.9, random() * 6, 0.3);
    if (a.company === 'litter') {
      const n = 3 + Math.floor(random() * 2);
      for (let i = 0; i < n; i++) sibling(R * mix(0.2, 0.38, random()), R * mix(1.8, 2.9, random()), i * 6.28 / n + random() * 0.6, (random() - 0.5) * 0.5);
    }
    const setOrbits = (time: number) => {
      for (const o of orbiters) {
        const ang = o.phase + time * o.rate;
        o.group.position.set(Math.cos(ang) * o.radius, Math.sin(ang) * o.radius * Math.sin(o.tilt), Math.sin(ang) * o.radius * Math.cos(o.tilt));
      }
    };
    setOrbits(0);

    const shells: THREE.Mesh[] = [];
    if (a.stage === 'shedding') {
      for (let i = 0; i < 3; i++) {
        const shell = new THREE.Mesh(new THREE.SphereGeometry(R * (1.35 + i * 0.33), 28, 14, random() * 6, Math.PI * mix(0.9, 1.5, random()), 0.5, 2.1), new THREE.MeshStandardMaterial({ color: base.clone().lerp(pale, 0.3), emissive: base, emissiveIntensity: 0.4, transparent: true, opacity: 0.42 - i * 0.08, side: THREE.DoubleSide, depthWrite: false }));
        shell.rotation.set(random() - 0.5, random() * 6, random() - 0.5);
        main.add(shell);
        shells.push(shell);
        const edge = new THREE.Mesh(new THREE.TorusGeometry(R * (1.35 + i * 0.33) * Math.sin(0.5), 0.025, 6, 64), new THREE.MeshBasicMaterial({ color: deep }));
        edge.rotation.x = Math.PI / 2;
        edge.position.y = R * (1.35 + i * 0.33) * Math.cos(0.5);
        shell.add(edge);
      }
    }
    if (a.stage === 'swelling') {
      // The skin lifting away: close soft layers that blur the limb.
      for (const [k, o] of [[1.06, 0.2], [1.13, 0.12]] as const) main.add(new THREE.Mesh(new THREE.SphereGeometry(R * k, 40, 24), veil(base.clone().lerp(pale, 0.4), o)));
    }
    if (a.stage === 'going') {
      const jetPaint = new THREE.MeshBasicMaterial({ color: pale, toneMapped: false });
      for (const up of [1, -1]) {
        const jet = new THREE.Mesh(new THREE.ConeGeometry(R * 0.2, R * 1.5, 12, 1, true), jetPaint);
        jet.position.y = up * (R * squash + R * 0.7);
        jet.rotation.x = up === 1 ? Math.PI : 0;
        main.add(jet);
      }
      const bits = Array.from({ length: 60 }, () => {
        const up = random() < 0.5 ? 1 : -1, h = R * (0.9 + random() * 1.6), w = (h - R * 0.7) * 0.28;
        return { at: [(random() - 0.5) * w, up * h, (random() - 0.5) * w] as P, size: 0.03 + random() * 0.06, color: random() < 0.5 ? pale : base };
      });
      main.add(s.scatter(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }), bits));
      main.rotation.z = (random() - 0.5) * 0.5;
    }

    if (a.surround === 'bubble') {
      const wall = R * 2.2;
      for (const [rx, rz] of [[Math.PI / 2, 0], [0.5, 0.4], [1.1, -0.7]] as const) {
        const hoop = new THREE.Mesh(new THREE.TorusGeometry(wall, 0.03, 6, 96), new THREE.MeshBasicMaterial({ color: '#7d8aa0' }));
        hoop.rotation.set(rx, 0, rz);
        s.root.add(hoop);
      }
      s.root.add(new THREE.Mesh(new THREE.SphereGeometry(wall, 32, 20), veil('#9fb0cc', 0.08)));
    }
    if (a.surround === 'disc') {
      for (let i = 0; i < 4; i++) {
        const band = new THREE.Mesh(new THREE.RingGeometry(R * (1.25 + i * 0.32), R * (1.5 + i * 0.32), 72), new THREE.MeshStandardMaterial({ color: '#c9cdd6', roughness: 1, transparent: true, opacity: 0.8 - i * 0.15, side: THREE.DoubleSide }));
        band.rotation.x = -Math.PI / 2 + 0.22;
        band.rotation.y = 0.12;
        s.root.add(band);
      }
    }
    if (a.surround === 'wisps') {
      const fog = new THREE.MeshStandardMaterial({ color: '#8f97a6', roughness: 1, transparent: true, opacity: 0.8 });
      for (let i = 0; i < 9; i++) {
        const ang = random() * 6.28, d = R * mix(1.7, 2.6, random()), y = (random() - 0.5) * R * 1.4;
        const pts = Array.from({ length: 6 }, (_u, k) => new THREE.Vector3(Math.cos(ang + k * 0.2) * (d + k * 0.3), y + Math.sin(k * 1.3 + i) * 0.25, Math.sin(ang + k * 0.2) * (d + k * 0.3)));
        const wisp = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 20, mix(0.03, 0.07, random()), 6), fog);
        s.root.add(wisp);
      }
    }

    const built = s.finish();
    const pivot = new THREE.Group();
    pivot.add(built.object);
    const energy = mood.energy;
    return {
      object: pivot,
      update(dt, time) {
        for (const globe of spinners) globe.rotation.y += dt * mix(0.03, 0.3, energy);
        setOrbits(time * mix(0.2, 2, energy));
        const beat = 1 + Math.sin(time * mix(0.6, 5, energy)) * (a.stage === 'steady' ? 0.004 : 0.02) * (0.3 + energy);
        main.scale.setScalar(beat);
        shells.forEach((shell, i) => { shell.rotation.y += dt * 0.05 * (i + 1) * energy; });
      },
      dispose: () => disposeTree(pivot),
    };
  },
});
