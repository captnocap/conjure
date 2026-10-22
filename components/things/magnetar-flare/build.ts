import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

const FLARES = {
  violet: 'White-hot violet, the colour of a migraine aura.',
  gamma: 'Sickly gamma green.',
  xray: 'Hard electric blue.',
  solar: 'Furnace orange, like a solar prominence.',
  magenta: 'Raw magenta, a nerve exposed.',
} as const;
const FLARE_TINT: Record<keyof typeof FLARES, [string, string]> = {
  violet: ['#7b2fe0', '#ead6ff'], gamma: ['#3fae1c', '#e2ffc0'], xray: ['#1f6fe8', '#cfe6ff'], solar: ['#e8601a', '#ffe0a6'], magenta: ['#d81f8c', '#ffd0ea'],
};
const CRUSTS = {
  plated: 'Broken into angular plates like dried mud or armour, light showing in the joints.',
  veined: 'Dark and whole but shot through with fine branching glowing veins.',
  seam: 'One great molten seam running round it like a wound, the rest dull.',
  scabbed: 'Old pocked crust with ringed scars where earlier quakes healed over.',
} as const;
const HUES = {
  iron: 'Blue-black iron.',
  bone: 'Pale ashen bone.',
  bruise: 'Deep bruise purple.',
  rust: 'Dried-blood rust.',
} as const;
const HUE_TINT: Record<keyof typeof HUES, string> = { iron: '#2b3340', bone: '#b9b2a4', bruise: '#46305c', rust: '#6e3226' };

type P = [number, number, number];

export default defineThing({
  questions: {
    state: choice('What is it doing right now?', {
      brooding: 'Holding it in: the loops are taut and nothing has broken yet.',
      quaking: 'The crust has just cracked: a bright fracture and a loop straining upward.',
      flaring: 'Mid-flare: a huge arc of plasma is tearing free of the surface.',
      spent: 'Just after: a detached ring of plasma drifts away and the star looks emptied.',
    }),
    tangle: score('How tangled is the magnetic field?', ['A few clean arches', 'Braided and crossing', 'A knotted, twisted mess']),
    crust: choice('What pattern does the crust have?', CRUSTS),
    hue: choice('What colour is the crust?', HUES),
    flare: choice('What colour is the plasma and the light in the cracks?', FLARES),
    arc: choice('If plasma is breaking free, what shape does it take?', {
      prominence: 'One great closed arch standing off the surface.',
      whip: 'A snapped loop lashing outward, its free end fraying.',
      spray: 'A fan of several thin streamers thrown from one spot.',
      twin: 'Two arcs from opposite sides, as if it were tearing in half.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const [deep, pale] = FLARE_TINT[a.flare];
    const R = 1.1;
    const glow = mix(0.7, 1.4, mood.cheer);
    const anger = { brooding: 0.25, quaking: 0.6, flaring: 1, spent: 0.4 }[a.state];
    const star = new THREE.Group();
    star.rotation.set(mix(-0.15, 0.15, random()), random() * 6, mix(-0.15, 0.15, random()));
    s.root.add(star);
    const solid = (geometry: THREE.BufferGeometry, material: THREE.Material, parent: THREE.Object3D = star) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true;
      parent.add(mesh);
      return mesh;
    };
    const onSphere = (theta: number, phi: number, r = 1): THREE.Vector3 => new THREE.Vector3().setFromSphericalCoords(r, theta, phi);

    // Where the quake is: everything violent happens around this point.
    const quakeTheta = mix(0.4, 0.8, random()), quakePhi = random() * Math.PI * 2;
    const quake = onSphere(quakeTheta, quakePhi);

    // Crust: one canvas for colour, one for the light in the cracks.
    const W = 1024, H = 512;
    const paint = document.createElement('canvas'), light = document.createElement('canvas');
    paint.width = light.width = W; paint.height = light.height = H;
    const c = paint.getContext('2d')!, e = light.getContext('2d')!;
    const base = new THREE.Color(HUE_TINT[a.hue]).lerp(new THREE.Color('#7a3a20'), mood.warmth * 0.25);
    c.fillStyle = `#${base.getHexString()}`;
    c.fillRect(0, 0, W, H);
    e.fillStyle = '#000';
    e.fillRect(0, 0, W, H);
    // Mottle.
    for (let i = 0; i < 500; i++) {
      c.fillStyle = random() < 0.5 ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.07)';
      c.beginPath();
      c.ellipse(random() * W, random() * H, 4 + random() * 26, 3 + random() * 12, random() * 3, 0, 7);
      c.fill();
    }
    const stroke = (points: [number, number][], width: number, bright: number) => {
      for (const shift of [-W, 0, W]) {
        for (const [ctx, colour, w] of [[c, 'rgba(8,6,10,0.85)', width * 2.4], [c, pale, width], [e, `rgba(255,255,255,${bright})`, width * 1.5]] as const) {
          ctx.strokeStyle = colour;
          ctx.lineWidth = w;
          ctx.lineJoin = ctx.lineCap = 'round';
          ctx.beginPath();
          points.forEach(([x, y], index) => (index ? ctx.lineTo(x + shift, y) : ctx.moveTo(x + shift, y)));
          ctx.stroke();
        }
      }
    };
    const walk = (x: number, y: number, heading: number, steps: number, width: number, bright: number, branch: number) => {
      const points: [number, number][] = [[x, y]];
      for (let i = 0; i < steps; i++) {
        heading += (random() - 0.5) * 1.1;
        x += Math.cos(heading) * 14;
        y += Math.sin(heading) * 9;
        points.push([x, y]);
        if (branch > 0 && random() < 0.16) walk(x, y, heading + (random() < 0.5 ? 1 : -1) * mix(0.6, 1.3, random()), Math.round(steps * 0.5), width * 0.6, bright * 0.8, branch - 1);
      }
      stroke(points, width, bright);
    };
    const heat = mix(0.45, 1, anger);
    const extra = mix(0.7, 1.5, mood.wear);
    if (a.crust === 'plated') {
      // Jittered cell corners joined into a net of plates.
      const cols = 14, rows = 7;
      const corner = Array.from({ length: rows + 1 }, (_r, j) => Array.from({ length: cols }, (_c, i) => [(i + 0.5 * (j % 2) + (random() - 0.5) * 0.7) * (W / cols), (j + (j === 0 || j === rows ? 0 : (random() - 0.5) * 0.7)) * (H / rows)] as [number, number]));
      for (let j = 0; j <= rows; j++)
        for (let i = 0; i < cols; i++) {
          const here = corner[j][i];
          const right = corner[j][(i + 1) % cols];
          stroke([here, [right[0] + (i + 1 === cols ? W : 0), right[1]]], 3.2, heat * mix(0.4, 1, random()));
          if (j < rows) {
            const below = corner[j + 1][i];
            stroke([here, [(here[0] + below[0]) / 2 + (random() - 0.5) * 18, (here[1] + below[1]) / 2], below], 3.2, heat * mix(0.4, 1, random()));
          }
        }
    } else if (a.crust === 'veined') {
      for (let i = 0; i < Math.round(16 * extra); i++) walk(random() * W, mix(0.1, 0.9, random()) * H, random() * 6.3, 16, 2.6, heat, 2);
    } else if (a.crust === 'seam') {
      const points: [number, number][] = [];
      const phase = random() * 6, lift = mix(0.4, 0.6, random()) * H;
      for (let i = 0; i <= 64; i++) points.push([(i / 64) * W, lift + Math.sin((i / 64) * Math.PI * 2 * 2 + phase) * 46 + Math.sin((i / 64) * Math.PI * 2 * 7 + phase) * 12]);
      stroke(points, 15, 1);
      stroke(points, 5, 1);
      for (let i = 0; i < Math.round(12 * extra); i++) {
        const [x, y] = points[Math.floor(random() * 64)];
        walk(x, y, (random() < 0.5 ? 1 : -1) * mix(0.9, 2.1, random()), 9, 2.4, heat * 0.8, 1);
      }
    } else {
      for (let i = 0; i < Math.round(22 * extra); i++) {
        const x = random() * W, y = mix(0.12, 0.88, random()) * H, r = mix(12, 46, random());
        const squash = 1 / Math.max(0.35, Math.sin((y / H) * Math.PI));
        const ring: [number, number][] = [];
        for (let k = 0; k <= 20; k++) ring.push([x + Math.cos((k / 20) * 6.283) * r * squash * mix(0.85, 1.1, random()), y + Math.sin((k / 20) * 6.283) * r * 0.5 * mix(0.85, 1.1, random())]);
        stroke(ring, 2.2, heat * (random() < 0.3 ? 0.9 : 0.15));
        c.fillStyle = 'rgba(0,0,0,0.22)';
        c.beginPath();
        c.ellipse(x, y, r * squash * 0.8, r * 0.4, 0, 0, 7);
        c.fill();
      }
      for (let i = 0; i < 6; i++) walk(random() * W, mix(0.2, 0.8, random()) * H, random() * 6.3, 10, 2, heat * 0.7, 1);
    }
    // The fresh fracture at the quake site, on every crust unless it is still holding.
    if (a.state !== 'brooding') {
      const u = ((quakePhi / (Math.PI * 2) + 0.25) % 1) * W, v = (quakeTheta / Math.PI) * H;
      for (let i = 0; i < 9; i++) walk(u, v, (i / 9) * 6.283 + random() * 0.4, a.state === 'flaring' ? 9 : 6, 5, 1, 1);
    }
    const map = new THREE.CanvasTexture(paint), emissiveMap = new THREE.CanvasTexture(light);
    map.colorSpace = THREE.SRGBColorSpace;
    const crust = new THREE.MeshStandardMaterial({ map, emissiveMap, emissive: deep, emissiveIntensity: 2.2 * glow, roughness: 0.75, metalness: 0.15 });
    solid(new THREE.SphereGeometry(R, 56, 36), crust);

    // Tangled loops: arches between two foot points, corkscrewed more as the tangle rises.
    const tangle = a.tangle;
    const loopPaint = new THREE.MeshStandardMaterial({ color: new THREE.Color(deep).lerp(new THREE.Color('#15101f'), 0.5), emissive: deep, emissiveIntensity: 0.3 * glow, roughness: 0.5 });
    const loopPaintLit = new THREE.MeshStandardMaterial({ color: new THREE.Color(deep).lerp(new THREE.Color(pale), 0.3), emissive: deep, emissiveIntensity: 0.8 * glow, roughness: 0.4 });
    const arch = (from: THREE.Vector3, to: THREE.Vector3, height: number, turns: number, wobble: number, open = 1): P[] => {
      const side = new THREE.Vector3().crossVectors(from, to).normalize();
      const points: P[] = [];
      const steps = 40;
      for (let i = 0; i <= steps * open; i++) {
        const t = i / steps;
        const dir = from.clone().lerp(to, t).normalize();
        const rise = Math.sin(Math.PI * t);
        const out = dir.clone().multiplyScalar(R * (0.98 + height * rise));
        const swirl = t * Math.PI * 2 * turns;
        out.addScaledVector(side, Math.sin(swirl) * wobble * rise).addScaledVector(dir, Math.cos(swirl) * wobble * rise * 0.6);
        points.push([out.x, out.y, out.z]);
      }
      return points;
    };
    const tubeOf = (points: P[], radius: number, material: THREE.Material, parent: THREE.Object3D = star) =>
      solid(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))), points.length * 2, radius, 6, false), material, parent);
    const loops = Math.round(mix(5, 9, mood.density) + tangle * 12);
    for (let i = 0; i < loops; i++) {
      const from = onSphere(mix(0.35, 2.8, random()), random() * 6.283);
      const axis = new THREE.Vector3(random() - 0.5, random() - 0.5, random() - 0.5).cross(from).normalize();
      const to = from.clone().applyAxisAngle(axis, mix(0.5, 1.7, random()));
      const height = mix(0.18, 0.75, random()) * mix(0.8, 1.2, tangle);
      tubeOf(arch(from, to, height, Math.round(mix(0, 5, tangle) * mix(0.5, 1.2, random())), mix(0.0, 0.2, tangle) * mix(0.5, 1.3, random())), mix(0.028, 0.02, tangle), random() < 0.25 * anger ? loopPaintLit : loopPaint);
    }

    // The plasma breaking free.
    const plasma = new THREE.MeshStandardMaterial({ color: new THREE.Color(deep).lerp(new THREE.Color(pale), 0.4), emissive: deep, emissiveIntensity: 1.5 * glow, roughness: 0.35 });
    const sheath = new THREE.MeshBasicMaterial({ color: deep, transparent: true, opacity: 0.3, depthWrite: false });
    const blobs: { at: P; size: number }[] = [];
    const free = new THREE.Group();
    star.add(free);
    const tangent = new THREE.Vector3(0, 1, 0).cross(quake).normalize();
    const bitangent = quake.clone().cross(tangent).normalize();
    const foot = (angle: number, spread: number) => quake.clone().addScaledVector(tangent, Math.cos(angle) * spread).addScaledVector(bitangent, Math.sin(angle) * spread).normalize();
    const ribbon = (points: P[], radius: number, parent: THREE.Object3D = star) => {
      tubeOf(points, radius, plasma, parent);
      const haze = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))), points.length * 2, radius * 2.6, 8, false), sheath);
      parent.add(haze);
    };
    const reach = mix(0.9, 1.5, random()) * mix(0.85, 1.2, mood.energy);
    const erupt = (centre: THREE.Vector3, tangentA: number) => {
      const from = centre.clone().addScaledVector(tangent, Math.cos(tangentA) * 0.42).addScaledVector(bitangent, Math.sin(tangentA) * 0.42).normalize();
      const to = centre.clone().addScaledVector(tangent, -Math.cos(tangentA) * 0.42).addScaledVector(bitangent, -Math.sin(tangentA) * 0.42).normalize();
      if (a.arc === 'whip') {
        const points = arch(from, to, reach * 1.25, 1.5, 0.16, 0.62);
        ribbon(points, 0.075);
        const tip = new THREE.Vector3(...points.at(-1)!), before = new THREE.Vector3(...points.at(-4)!);
        const fling = tip.clone().sub(before).normalize();
        for (let i = 0; i < 4; i++) {
          const fray: P[] = [];
          const lean = new THREE.Vector3(random() - 0.5, random() - 0.5, random() - 0.5).multiplyScalar(0.7);
          for (let k = 0; k <= 5; k++) {
            const p = tip.clone().addScaledVector(fling, k * 0.11).addScaledVector(lean, (k / 5) ** 2 * 0.5);
            fray.push([p.x, p.y, p.z]);
          }
          tubeOf(fray, 0.03, plasma);
          blobs.push({ at: fray.at(-1)!, size: mix(0.05, 0.1, random()) });
        }
      } else if (a.arc === 'spray') {
        for (let i = 0; i < 6; i++) {
          const lean = foot(random() * 6.283, mix(0.1, 0.55, random()));
          const points: P[] = [];
          const far = mix(0.7, 1.3, random()) * reach;
          const curl = new THREE.Vector3(random() - 0.5, random() - 0.5, random() - 0.5).multiplyScalar(0.5);
          for (let k = 0; k <= 8; k++) {
            const t = k / 8;
            const p = centre.clone().lerp(lean, t).normalize().multiplyScalar(R * (0.98 + far * t)).addScaledVector(curl, t * t);
            points.push([p.x, p.y, p.z]);
          }
          ribbon(points, mix(0.035, 0.06, random()));
          blobs.push({ at: points.at(-1)!, size: mix(0.07, 0.13, random()) });
        }
      } else {
        ribbon(arch(from, to, reach, 2, 0.12), 0.085);
        tubeOf(arch(from, to, reach * 0.8, 3, 0.1), 0.035, plasma);
      }
      for (let i = 0; i < 10; i++) {
        const p = centre.clone().multiplyScalar(R * mix(1.2, 1.3 + reach * 1.3, random())).add(new THREE.Vector3(random() - 0.5, random() - 0.5, random() - 0.5).multiplyScalar(0.7));
        blobs.push({ at: [p.x, p.y, p.z], size: mix(0.03, 0.09, random() ** 2) });
      }
    };
    if (a.state === 'flaring') {
      erupt(quake, random() * 3.14);
      if (a.arc === 'twin') erupt(quake.clone().negate(), random() * 3.14);
    } else if (a.state === 'quaking') {
      // One loop over the fracture is lit and pulled tall, about to go.
      const angle = random() * 3.14;
      tubeOf(arch(foot(angle, 0.4), foot(angle + Math.PI, 0.4), reach * 0.7, 4, 0.1), 0.05, plasma);
      for (let i = 0; i < 6; i++) {
        const p = quake.clone().multiplyScalar(R * mix(1.05, 1.5, random())).add(new THREE.Vector3(random() - 0.5, random() - 0.5, random() - 0.5).multiplyScalar(0.4));
        blobs.push({ at: [p.x, p.y, p.z], size: mix(0.03, 0.07, random()) });
      }
    } else if (a.state === 'spent') {
      // A plasmoid ring, cut loose and drifting out along the quake direction.
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.07, 10, 48), plasma);
      ring.castShadow = true;
      ring.position.copy(quake).multiplyScalar(R * 2.25);
      ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), quake);
      ring.rotateX(0.35);
      free.add(ring);
      const haze = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.2, 10, 48), sheath);
      haze.position.copy(ring.position);
      haze.quaternion.copy(ring.quaternion);
      free.add(haze);
      for (let i = 0; i < 12; i++) {
        const p = quake.clone().multiplyScalar(R * mix(1.15, 2.1, random())).add(new THREE.Vector3(random() - 0.5, random() - 0.5, random() - 0.5).multiplyScalar(0.5));
        blobs.push({ at: [p.x, p.y, p.z], size: mix(0.025, 0.06, random()) });
      }
    }
    if (blobs.length) {
      const drops = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), plasma, blobs.length);
      const matrix = new THREE.Matrix4();
      blobs.forEach((blob, index) => drops.setMatrixAt(index, matrix.makeScale(blob.size, blob.size, blob.size).setPosition(...blob.at)));
      drops.castShadow = true;
      star.add(drops);
    }
    // A faint coloured atmosphere so the limb holds against pale paper.
    star.add(new THREE.Mesh(new THREE.SphereGeometry(R * 1.07, 32, 20), new THREE.MeshBasicMaterial({ color: deep, transparent: true, opacity: 0.12, depthWrite: false })));

    const pace = mix(0.4, 2.2, mood.energy);
    const phase = random() * 10;
    return s.finish({
      footprint: R * 1.15,
      update(dt, time) {
        star.rotation.y += dt * 0.06 * pace;
        const throb = 0.5 + 0.5 * Math.sin((time + phase) * pace * 2.4) * Math.sin((time + phase) * pace * 0.9 + 1);
        crust.emissiveIntensity = glow * mix(1.5, 3, throb * anger + (1 - anger) * 0.3);
        plasma.emissiveIntensity = glow * mix(1.1, 1.9, throb);
      },
    });
  },
});
