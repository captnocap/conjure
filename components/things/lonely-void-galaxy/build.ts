import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type V3 = [number, number, number];

export default defineThing({
  questions: {
    form: choice('What form does the little galaxy take?', {
      tidy: 'A tidy two-armed spiral, as neat as a diagram.',
      disc: 'A pale smooth disc with no arms at all, featureless and calm.',
      ring: 'A faint perfect ring around a small core, with a clear gap between.',
      barred: 'A short straight bar with one arm curling from each end.',
      wound: 'Many thin arms wound tight like a watch spring.',
    }),
    colour: choice('What colour are its stars?', {
      blue: 'Young blue, still making stars.',
      gold: 'Quiet gold, settled and old.',
      rose: 'Blue with rose-pink nurseries dotted along the arms.',
      ash: 'Pale ash grey, nearly burnt out.',
    }),
    heart: choice('What is at its heart?', {
      warm: 'A warm bright bulge, like a lit window.',
      point: 'One sharp hard point of light.',
      hollow: 'A dim, hollow centre: the light is all at the edges.',
    }),
    tilt: choice('How do we see it?', {
      face: 'Nearly face-on, the whole pattern laid open.',
      plate: 'Tilted like a plate on a shelf.',
      edge: 'Almost edge-on, a thin bright sliver with a dust line.',
    }),
    approaching: choice('Is anything approaching?', {
      nothing: 'Nothing. It is entirely alone.',
      dwarf: 'A tiny dwarf galaxy, still far off: its first ever visitor.',
      star: 'A single runaway star, leaving.',
      stream: 'A thin stream of stars reaching in from the dark, not yet touching.',
    }),
    glow: score('How large is its glow against the emptiness?', ['A tight pinprick, nothing around it', 'A modest halo', 'A wide soft halo of stray stars']),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const disc = new THREE.Group();
    const plane = new THREE.Group();
    plane.add(disc);
    s.root.add(plane);
    const R = 2.1;
    const palette = {
      blue: ['#3f6fd0', '#7aa2ee', '#a9c6ff', '#5b8fe6'],
      gold: ['#c08428', '#deaf58', '#f0d08e', '#b06d2a'],
      rose: ['#4a78d4', '#8fb0f0', '#e2679a', '#f08fb4'],
      ash: ['#5c6470', '#868d99', '#b3b8c1', '#6f6e7a'],
    }[a.colour].map((hex) => new THREE.Color(hex).lerp(new THREE.Color('#e9a15a'), (mood.warmth - 0.5) * 0.3));
    const gauss = () => (random() + random() + random() - 1.5) / 1.5;
    type Dot = { at: V3; size: number; color: THREE.Color };
    const stars: Dot[] = [], dust: { at: V3; size: number }[] = [];
    const thick = (r: number) => 0.05 + 0.1 * Math.exp(-r * 1.6);

    const count = Math.round(mix(1100, 2000, mood.density));
    const arms = a.form === 'wound' ? 5 : 2;
    const pitch = a.form === 'wound' ? 4.2 : a.form === 'barred' ? 2.1 : 2.9;
    const bar = 0.55;
    for (let i = 0; i < count; i++) {
      let x = 0, z = 0, r = 0, tint = palette[i % 3];
      if (a.form === 'disc') {
        r = R * Math.sqrt(random()) * (0.25 + 0.75 * random() ** 0.6);
        const ang = random() * Math.PI * 2;
        x = Math.cos(ang) * r; z = Math.sin(ang) * r;
      } else if (a.form === 'ring') {
        const inRing = random() < 0.74;
        r = inRing ? R * (0.8 + gauss() * 0.075) : R * 0.26 * random() ** 0.7;
        const ang = random() * Math.PI * 2;
        x = Math.cos(ang) * r; z = Math.sin(ang) * r;
        if (inRing && a.colour === 'rose' && random() < 0.2) tint = palette[2 + (i % 2)];
      } else {
        const onArm = random() < 0.82;
        const k = random() ** 0.75;
        r = onArm ? R * (0.12 + k * 0.88) : R * random() ** 0.6;
        if (a.form === 'barred' && onArm && random() < 0.26) {
          x = (random() * 2 - 1) * bar; z = gauss() * 0.07; r = Math.abs(x);
        } else {
          const arm = (i % arms) * ((Math.PI * 2) / arms);
          const start = a.form === 'barred' ? Math.max(r, bar) : r;
          const ang = onArm ? arm + Math.log(start / (a.form === 'barred' ? bar : R * 0.12)) * pitch * 0.55 + gauss() * mix(0.16, 0.34, r / R) * (a.form === 'wound' ? 0.55 : 1) : random() * Math.PI * 2;
          x = Math.cos(ang) * start; z = Math.sin(ang) * start; r = start;
          if (onArm && a.colour === 'rose' && random() < 0.16) tint = palette[2 + (i % 2)];
          // Dust rides the inner edge of each arm.
          if (onArm && i % 7 === 0 && r > R * 0.2) { const lag = ang - 0.2; dust.push({ at: [Math.cos(lag) * r * 0.96, gauss() * 0.02, Math.sin(lag) * r * 0.96], size: 0.012 + random() * 0.016 }); }
        }
      }
      const fade = 1 - (r / R) * 0.35;
      stars.push({ at: [x, gauss() * thick(r), z], size: (0.016 + random() ** 3 * 0.04) * fade, color: a.heart === 'hollow' && r < R * 0.3 ? tint.clone().multiplyScalar(0.7) : tint });
    }
    // A few brighter beacons.
    for (let i = 0; i < 26; i++) { const pick = stars[Math.floor(random() * stars.length)]; stars.push({ at: pick.at, size: 0.05 + random() * 0.03, color: palette[2] }); }
    if (a.tilt === 'edge' || a.form === 'disc') for (let i = 0; i < 200; i++) { const ang = random() * Math.PI * 2, r = R * (0.5 + gauss() * 0.06 + (i % 2) * 0.3); dust.push({ at: [Math.cos(ang) * r, gauss() * 0.012, Math.sin(ang) * r], size: 0.011 + random() * 0.014 }); }

    // Halo: stray stars far from the disc, more of them as the glow widens.
    const haloR = R * mix(1.05, 1.9, a.glow);
    for (let i = 0; i < Math.round(a.glow * 240); i++) {
      const dir = new THREE.Vector3(gauss(), gauss() * 0.22, gauss()).normalize().multiplyScalar(R * 0.5 + random() ** 1.6 * (haloR - R * 0.5));
      stars.push({ at: dir.toArray() as V3, size: 0.012 + random() * 0.016, color: palette[1] });
    }

    const dot = new THREE.IcosahedronGeometry(1, 0);
    disc.add(s.scatter(dot, new THREE.MeshBasicMaterial({ color: '#ffffff' }), stars));
    if (dust.length) disc.add(s.scatter(dot.clone(), new THREE.MeshBasicMaterial({ color: a.colour === 'gold' ? '#7a4f2c' : a.colour === 'ash' ? '#4a4e58' : '#2c3f78' }), dust));

    // The soft light of the whole thing: a painted glow lying in the disc, never measured as solid.
    const paint = document.createElement('canvas');
    paint.width = paint.height = 256;
    const g = paint.getContext('2d')!;
    const wash = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    const tone = palette[1];
    const rgba = (c: THREE.Color, alpha: number) => `rgba(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)},${alpha})`;
    wash.addColorStop(0, rgba(tone, a.heart === 'hollow' ? 0.25 : 0.95));
    wash.addColorStop(0.25, rgba(tone, 0.6));
    wash.addColorStop(0.6, rgba(tone, 0.22));
    wash.addColorStop(1, rgba(tone, 0));
    g.fillStyle = wash;
    g.fillRect(0, 0, 256, 256);
    const washMap = new THREE.CanvasTexture(paint);
    washMap.colorSpace = THREE.SRGBColorSpace;
    const veil = new THREE.Mesh(new THREE.CircleGeometry(haloR * 1.05, 48), new THREE.MeshBasicMaterial({ map: washMap, transparent: true, opacity: mix(0.5, 0.85, a.glow), depthWrite: false, side: THREE.DoubleSide }));
    veil.rotation.x = -Math.PI / 2;
    disc.add(veil);

    // Heart.
    const heartColour = a.colour === 'ash' ? '#e3e1da' : '#ffe2a4';
    if (a.heart === 'warm') {
      const bulge = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), new THREE.MeshStandardMaterial({ color: heartColour, emissive: heartColour, emissiveIntensity: mix(0.5, 1.1, mood.cheer), roughness: 0.6 }));
      bulge.scale.set(0.25, 0.17, 0.25);
      disc.add(bulge);
      const shell = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), new THREE.MeshBasicMaterial({ color: heartColour, transparent: true, opacity: 0.3, depthWrite: false }));
      shell.scale.set(0.42, 0.26, 0.42);
      disc.add(shell);
    } else if (a.heart === 'point') {
      disc.add(new THREE.Mesh(new THREE.OctahedronGeometry(0.11, 0), new THREE.MeshBasicMaterial({ color: '#ffffff' })));
      const flare = new THREE.MeshBasicMaterial({ color: heartColour });
      for (const turn of [0, Math.PI / 2]) { const spike = new THREE.Mesh(new THREE.OctahedronGeometry(1, 0), flare); spike.scale.set(0.42, 0.02, 0.025); spike.rotation.y = turn + 0.4; disc.add(spike); }
    } else {
      const ringlet = new THREE.Mesh(new THREE.TorusGeometry(R * 0.2, 0.018, 6, 40), new THREE.MeshBasicMaterial({ color: palette[2] }));
      ringlet.rotation.x = Math.PI / 2;
      disc.add(ringlet);
    }

    // Visitors, kept outside the spinning disc so they hold their place.
    const far = R * 1.75;
    if (a.approaching === 'dwarf') {
      const blob: Dot[] = Array.from({ length: 150 }, () => ({ at: [far + gauss() * 0.2, 0.5 + gauss() * 0.14, 0.9 + gauss() * 0.2] as V3, size: 0.012 + random() * 0.022, color: palette[(Math.floor(random() * 2) + 2) % 4] }));
      plane.add(s.scatter(dot.clone(), new THREE.MeshBasicMaterial({ color: '#ffffff' }), blob));
    } else if (a.approaching === 'star') {
      const runaway = new THREE.Mesh(new THREE.OctahedronGeometry(0.08, 1), new THREE.MeshBasicMaterial({ color: '#ff9a52' }));
      runaway.position.set(far * 0.95, 0.75, -0.5);
      plane.add(runaway);
      const trail: Dot[] = Array.from({ length: 34 }, (_unused, i) => { const k = i / 34; return { at: [mix(far * 0.95, R * 0.75, k), mix(0.75, 0.12, k) + gauss() * 0.02, mix(-0.5, -0.25, k)] as V3, size: 0.022 * (1 - k) + 0.006, color: new THREE.Color('#ffb070') }; });
      plane.add(s.scatter(dot.clone(), new THREE.MeshBasicMaterial({ color: '#ffffff' }), trail));
    } else if (a.approaching === 'stream') {
      const river: Dot[] = Array.from({ length: 190 }, () => { const k = random(), ang = -0.4 + k * 1.5, r = mix(far * 1.15, R * 1.08, k ** 0.8); return { at: [Math.cos(ang) * r + gauss() * 0.07, mix(0.9, 0.12, k) + gauss() * 0.05, Math.sin(ang) * r + gauss() * 0.07] as V3, size: 0.01 + random() * 0.02, color: palette[i3(k)] }; });
      plane.add(s.scatter(dot.clone(), new THREE.MeshBasicMaterial({ color: '#ffffff' }), river));
    }

    plane.rotation.set({ face: 1.0, plate: 0.38, edge: -0.15 }[a.tilt], 0, (random() - 0.5) * 0.5);
    disc.rotation.y = random() * Math.PI * 2;
    const rate = mix(0.01, 0.12, mood.energy);
    return s.finish({ footprint: R, update: (dt) => { disc.rotation.y += dt * rate; } });
  },
});

function i3(k: number) { return k > 0.66 ? 0 : k > 0.33 ? 1 : 2; }
