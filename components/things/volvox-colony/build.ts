import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

const HUES = {
  spring: 'Fresh spring green, bright and young.',
  emerald: 'Deep saturated emerald.',
  olive: 'Golden olive, sun-fed and late-summer.',
  teal: 'Cool blue-green, like sea glass.',
  rust: 'Autumn orange-red, turning toward winter.',
  ghost: 'Pale and nearly colourless, a bleached net.',
} as const;
const HUE: Record<keyof typeof HUES, [string, string]> = {
  spring: ['#8fd04a', '#2f7d2a'], emerald: ['#2fae5a', '#12602f'], olive: ['#b5b53a', '#5f6a1c'], teal: ['#3fb8a4', '#17685f'], rust: ['#e0803a', '#8a3a1c'], ghost: ['#cfdcc0', '#7f927a'],
};

export default defineThing({
  questions: {
    stage: choice('What stage of life is the colony in?', {
      young: 'Young and empty: an even net of cells with nothing inside yet.',
      gravid: 'Gravid: round dark daughter colonies riding inside it.',
      nested: 'Three generations at once: daughters inside, each already holding granddaughters.',
      birthing: 'Giving birth: the sphere has torn open and the daughters are rolling out.',
      wintering: 'Wintering: inside are spiky orange resting spores instead of daughters.',
      husk: 'A spent husk: sagging, sparse and fading after the daughters have left.',
    }),
    daughters: score('If it carries daughters, how many?', ['Two or three', 'Half a dozen', 'A dozen', 'Crowded with them']),
    hue: choice('What colour is it?', HUES),
    net: choice('How are the surface cells set?', {
      fine: 'A fine dense stipple, thousands of pinpoints.',
      beaded: 'Fewer, larger cells like beads on a ball.',
      webbed: 'Beads joined to their neighbours by visible threads, a living net.',
    }),
    company: choice('What travels with it?', {
      alone: 'Nothing; it rolls alone.',
      ring: 'A thin tilted ring of debris, like a ringed planet.',
      moons: 'Two or three small colonies orbiting it like moons.',
      haze: 'A soft haze of beating flagella, a thin atmosphere.',
    }),
    spots: noul('Does one pole carry a cluster of red eyespots turned toward the light?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const [light, deep] = HUE[a.hue].map((c) => new THREE.Color(c).offsetHSL((mood.warmth - 0.5) * 0.04, (mood.cheer - 0.5) * 0.25, -mood.wear * 0.05));
    const husk = a.stage === 'husk', birthing = a.stage === 'birthing';
    const globe = new THREE.Group();
    const unit = new THREE.IcosahedronGeometry(1, 1);
    const squash = husk ? 0.7 : 1;

    // The jelly sphere. When birthing, a cap is missing where the daughters leave.
    const jelly = new THREE.MeshPhysicalMaterial({ color: light.clone().lerp(new THREE.Color('#ffffff'), 0.35), transparent: true, opacity: husk ? 0.22 : 0.3, roughness: 0.15, clearcoat: 0.6, side: birthing ? THREE.DoubleSide : THREE.FrontSide, depthWrite: !birthing });
    const tear = 0.55;
    const shell = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32, 0, Math.PI * 2, birthing ? tear : 0, Math.PI - (birthing ? tear : 0)), jelly);
    shell.renderOrder = 3;
    const rim = new THREE.Mesh(new THREE.SphereGeometry(1.03, 40, 24), new THREE.MeshBasicMaterial({ color: deep, side: THREE.BackSide, transparent: true, opacity: 0.35, depthWrite: false }));
    globe.add(shell);
    if (!birthing) globe.add(rim);

    // Somatic cells on a Fibonacci lattice.
    const count = Math.round({ fine: 1500, beaded: 420, webbed: 300 }[a.net] * (husk ? 0.45 : 1) * mix(0.8, 1.15, mood.density));
    const cellSize = { fine: 0.02, beaded: 0.034, webbed: 0.046 }[a.net];
    const cellMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.5, emissive: deep, emissiveIntensity: 0.25 });
    const cells = new THREE.InstancedMesh(a.net === 'fine' ? new THREE.OctahedronGeometry(1, 1) : unit, cellMat, count);
    const m = new THREE.Matrix4(), points: THREE.Vector3[] = [], colour = new THREE.Color();
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < count; i++) {
      const y = 1 - ((i + 0.5) / count) * 2, r = Math.sqrt(1 - y * y), phi = i * golden;
      const p = new THREE.Vector3(Math.cos(phi) * r, y, Math.sin(phi) * r);
      points.push(p);
      const lost = (husk && random() < 0.35) || (birthing && Math.acos(y) < tear + 0.04);
      const size = lost ? 0 : cellSize * mix(0.8, 1.2, random());
      m.makeScale(size, size, size).setPosition(p);
      cells.setMatrixAt(i, m);
      cells.setColorAt(i, colour.copy(deep).lerp(light, random() * 0.5).lerp(new THREE.Color('#8a7a4a'), husk ? 0.5 : 0));
    }
    cells.castShadow = true;
    globe.add(cells);
    if (a.net === 'webbed') {
      // Threads to the nearest neighbours.
      const lines: number[] = [];
      for (let i = 0; i < count; i++) {
        const near = points.map((p, j) => [p.distanceToSquared(points[i]), j] as const).filter(([, j]) => j > i).sort((x, y) => x[0] - y[0]).slice(0, 3);
        for (const [d, j] of near) if (d < 0.09) lines.push(...points[i].toArray(), ...points[j].toArray());
      }
      const web = new THREE.BufferGeometry();
      web.setAttribute('position', new THREE.Float32BufferAttribute(lines, 3));
      globe.add(new THREE.LineSegments(web, new THREE.LineBasicMaterial({ color: deep, transparent: true, opacity: 0.8 })));
    }
    if (a.spots) {
      const red = new THREE.MeshStandardMaterial({ color: '#d8402a', emissive: '#a02010', emissiveIntensity: 0.5 });
      for (let i = 0; i < 30; i++) {
        const angle = random() * Math.PI * 2, tilt = 0.5 + Math.sqrt(random()) * 0.45;
        const dot = new THREE.Mesh(unit, red);
        dot.position.set(Math.sin(tilt) * Math.cos(angle), Math.sin(tilt) * Math.sin(angle) * 0.6 + 0.35, Math.cos(tilt)).normalize().multiplyScalar(1.005);
        dot.scale.setScalar(0.03);
        globe.add(dot);
      }
    }

    // What rides inside.
    const inner = new THREE.Group();
    const daughterMat = new THREE.MeshStandardMaterial({ color: deep, roughness: 0.55, emissive: deep, emissiveIntensity: 0.3 });
    const grandMat = new THREE.MeshStandardMaterial({ color: deep.clone().multiplyScalar(0.45), roughness: 0.6 });
    const dotMat = new THREE.MeshStandardMaterial({ color: light, roughness: 0.5, emissive: light, emissiveIntensity: 0.2 });
    const sporeMat = new THREE.MeshStandardMaterial({ color: '#e8862a', roughness: 0.5, emissive: '#b04a10', emissiveIntensity: 0.12, flatShading: true });
    const placed: { p: THREE.Vector3; r: number }[] = [];
    const spinners: THREE.Object3D[] = [];
    const daughter = (r: number, withGrand: boolean) => {
      const group = new THREE.Group();
      const ball = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), daughterMat);
      ball.castShadow = true;
      group.add(ball);
      const freckles = new THREE.InstancedMesh(unit, dotMat, 70);
      for (let i = 0; i < 70; i++) {
        const y = 1 - ((i + 0.5) / 70) * 2, rr = Math.sqrt(1 - y * y);
        m.makeScale(0.05, 0.05, 0.05).setPosition(Math.cos(i * golden) * rr, y, Math.sin(i * golden) * rr);
        freckles.setMatrixAt(i, m);
      }
      group.add(freckles);
      if (withGrand) for (let k = 0; k < 4; k++) {
        const g = new THREE.Mesh(unit, grandMat);
        const angle = k * 1.6 + random();
        g.position.set(Math.cos(angle) * 0.7, (random() - 0.5) * 0.9, Math.sin(angle) * 0.7).normalize().multiplyScalar(0.86);
        g.scale.setScalar(0.3);
        group.add(g);
      }
      group.scale.setScalar(r);
      spinners.push(group);
      return group;
    };
    const wanted = a.stage === 'young' || husk ? 0 : Math.round(mix(2, 16, a.daughters));
    for (let i = 0, tries = 0; i < wanted && tries < 400; tries++) {
      const r = a.stage === 'wintering' ? mix(0.09, 0.14, random()) : mix(0.17, 0.3, random()) * (wanted > 9 ? 0.8 : 1);
      const p = new THREE.Vector3(random() * 2 - 1, random() * 2 - 1.15, random() * 2 - 1);
      if (p.length() > 0.93 - r || placed.some((other) => other.p.distanceTo(p) < other.r + r + 0.02)) continue;
      placed.push({ p, r });
      i++;
      if (a.stage === 'wintering') {
        const spore = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), sporeMat);
        for (const turn of [0, 0.9]) {
          const spikes = new THREE.Mesh(new THREE.OctahedronGeometry(r * 1.7, 0), sporeMat);
          spikes.rotation.set(0.6 + turn, 0.6, 0.3 + turn);
          spikes.scale.set(0.45, 1, 0.45);
          spore.add(spikes);
        }
        spore.rotation.set(random() * 3, random() * 3, random() * 3);
        spore.position.copy(p);
        inner.add(spore);
      } else {
        const child = daughter(r, a.stage === 'nested');
        child.position.copy(p);
        inner.add(child);
      }
    }
    globe.add(inner);
    globe.scale.y = squash;

    const world = new THREE.Group();
    world.add(globe);
    const tiltAxis = new THREE.Vector3(0.35 + (random() - 0.5) * 0.3, 1, 0.25).normalize();
    if (birthing) {
      // The tear faces up and toward the viewer; escaped daughters lie around.
      globe.rotation.set(0.75, 0, -0.35);
      const escaped = 2 + Math.floor(random() * 3);
      for (let i = 0; i < escaped; i++) {
        const r = mix(0.2, 0.3, random()), angle = -0.4 + i * 0.75 + random() * 0.3, d = 1.2 + r + random() * 0.5;
        const child = daughter(r, false);
        child.position.set(Math.sin(angle) * d, i === 0 ? 0.95 : -1 + r, Math.cos(angle) * d * (i === 0 ? 0.55 : 1));
        world.add(child);
      }
    }
    if (a.company === 'ring') {
      const grit: { at: [number, number, number]; size: number; color: THREE.Color }[] = [];
      for (let i = 0; i < Math.round(mix(90, 260, mood.density)); i++) {
        const angle = random() * Math.PI * 2, d = mix(1.35, 1.75, random());
        grit.push({ at: [Math.cos(angle) * d, (random() - 0.5) * 0.04, Math.sin(angle) * d], size: mix(0.012, 0.035, random()), color: deep.clone().lerp(new THREE.Color('#c9b88a'), random()) });
      }
      const belt = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ roughness: 0.8 }), grit.length);
      grit.forEach((g, i) => { belt.setMatrixAt(i, m.makeScale(g.size, g.size, g.size).setPosition(...g.at)); belt.setColorAt(i, g.color); });
      const tilted = new THREE.Group();
      tilted.rotation.set(0.32, 0, 0.22);
      tilted.add(belt);
      world.add(tilted);
      spinners.push(belt);
    }
    const orbit = new THREE.Group();
    if (a.company === 'moons') {
      const moons = 2 + Math.floor(random() * 2);
      for (let i = 0; i < moons; i++) {
        const r = mix(0.12, 0.2, random()), angle = (i / moons) * Math.PI * 2 + random(), d = 1.4 + i * 0.22;
        const moon = daughter(r, false);
        moon.position.set(Math.cos(angle) * d, (random() - 0.5) * 0.5, Math.sin(angle) * d);
        orbit.add(moon);
      }
      world.add(orbit);
    }
    if (a.company === 'haze') {
      const fuzz = new THREE.ConeGeometry(0.006, 0.16, 3);
      fuzz.translate(0, 0.08, 0);
      const halo = new THREE.InstancedMesh(fuzz, new THREE.MeshStandardMaterial({ color: light.clone().lerp(new THREE.Color('#ffffff'), 0.5), roughness: 0.6 }), 900);
      const q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), n = new THREE.Vector3();
      for (let i = 0; i < 900; i++) {
        const y = 1 - ((i + 0.5) / 900) * 2, r = Math.sqrt(1 - y * y);
        n.set(Math.cos(i * golden) * r, y, Math.sin(i * golden) * r);
        q.setFromUnitVectors(up, n.clone().add(new THREE.Vector3(random() - 0.5, random() - 0.5, random() - 0.5).multiplyScalar(0.7)).normalize());
        halo.setMatrixAt(i, m.compose(n.clone().multiplyScalar(squash < 1 ? 0.99 : 1), q, new THREE.Vector3(1, mix(0.6, 1.3, random()), 1)));
      }
      globe.add(halo);
    }
    world.position.y = squash;
    s.root.add(world);
    s.root.scale.setScalar(0.2);
    const speed = husk ? 0.05 : mix(0.08, 0.7, mood.energy);
    return s.finish({
      footprint: 0.2,
      update: (dt) => {
        if (!birthing) globe.rotateOnWorldAxis(tiltAxis, dt * speed);
        orbit.rotation.y += dt * speed * 1.6;
        for (const spinner of spinners) spinner.rotation.y += dt * speed * 2;
      },
    });
  },
});
