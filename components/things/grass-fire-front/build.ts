import * as THREE from 'three';
import { choice, defineThing, mix, score } from '@conjure/kit';
import { Batch, type P3, vary } from './sav';

export default defineThing({
  questions: {
    burn: choice('How hard is it burning?', {
      creeping: 'Ankle-high flickers nibbling through short stems, almost gentle.',
      running: 'A waist-high wall of flame with the wind behind it, moving at a walk.',
      flaring: 'Head-high sheets of fire torching everything, loud and frightening.',
      dying: 'Nearly out: the line broken into separate smoulders, more smoke than flame.',
    }),
    shape: choice('What shape is the fire front?', {
      line: 'One fairly straight line from side to side.',
      ragged: 'A ragged edge of long tongues and lagging bays.',
      arc: 'A horseshoe bulging forward in the middle.',
      pincer: 'Two fronts closing on a last narrow strip of unburnt grass between them.',
      island: 'A ring of fire tightening around one island of standing grass.',
    }),
    wind: score('How strong is the wind on the smoke?', ['Dead still, smoke standing straight up', 'A steady breeze leaning it over', 'A hard wind laying smoke and flame almost flat']),
    grass: choice('What is it burning into?', {
      short: 'Short cropped tawny stubble.',
      knee: 'Knee-high dry grass, thick and pale gold.',
      tall: 'Head-high elephant grass that hides the flames until it goes up.',
      bush: 'Knee-high grass with a thorn bush just starting to catch.',
    }),
    behind: choice('What is left in the black behind it?', {
      ash: 'Bare black earth streaked with white ash.',
      embers: 'Smouldering stumps and a scatter of orange embers still glowing.',
      bones: 'Old bleached bones and a tortoise shell the grass had been hiding.',
      shoots: 'Bright green shoots already spiking up through the ash: the fire is days old back there.',
    }),
    company: choice('Who else is at the fire?', {
      nobody: 'Nobody.',
      storks: 'White storks stalking the burnt edge, snapping up whatever runs from the flames.',
      fleeing: 'Small gazelles bounding away ahead of it and a tortoise that will not make it.',
      beater: 'One person beating at the flames with a leafy green branch.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const root = new THREE.Group();
    const g = new Batch();
    const glow = new Batch();
    const solidSmoke = new Batch();
    const thinSmoke = new Batch();
    const p = [random() * 6.28, random() * 6.28, random() * 6.28];
    const island = a.shape === 'island', pincer = a.shape === 'pincer';
    const X = 5.4, Z0 = pincer ? -3.9 : -4.4, Z1 = pincer ? 3.9 : 3.0;

    /** Signed distance to the front: negative is burnt, positive still standing. */
    const dist = (x: number, z: number) => {
      if (island) { const t = Math.atan2(z, x); return 2.2 + 0.5 * Math.sin(3 * t + p[0]) + 0.25 * Math.sin(5 * t + p[1]) - Math.hypot(x, z); }
      if (pincer) return 0.85 + 0.35 * Math.sin(0.9 * x + p[0]) - Math.abs(z - 0.4 * Math.sin(0.6 * x + p[1]));
      const f = a.shape === 'ragged' ? 0.95 * Math.sin(0.8 * x + p[0]) + 0.6 * Math.sin(1.9 * x + p[1]) + 0.3 * Math.sin(4.1 * x + p[2])
        : a.shape === 'arc' ? 1.7 - 0.12 * x * x + 0.2 * Math.sin(2 * x + p[0])
        : 0.28 * Math.sin(0.9 * x + p[0]) + 0.14 * Math.sin(2.3 * x + p[1]);
      return z - f + 0.2;
    };

    const grassH = { short: 0.22, knee: 0.6, tall: 1.5, bush: 0.6 }[a.grass];
    const flameH = { creeping: 0.42, running: 1.0, flaring: 1.9, dying: 0.3 }[a.burn] * mix(0.85, 1.25, mood.energy) * (a.grass === 'tall' ? 1.25 : 1);
    const straw = new THREE.Color('#d1b56a').lerp(new THREE.Color('#d9a94f'), mood.warmth * 0.4).lerp(new THREE.Color('#b3a98c'), mood.wear * 0.3);
    const soil = new THREE.Color('#b8925e'), char = new THREE.Color('#201b18');
    const lean = mix(0.04, 1.35, a.wind), windAngle = (random() - 0.5) * 0.5 + (pincer || island ? 0 : 0.25);
    const wx = Math.cos(windAngle) * lean, wz = Math.sin(windAngle) * lean;

    const step = mix(0.5, 0.4, mood.density);
    const fires: P3[] = [], burnt: [number, number, number][] = [], standing: [number, number, number][] = [];
    for (let gx = -X; gx <= X; gx += step)
      for (let gz = Z0; gz <= Z1; gz += step) {
        const x = gx + (random() - 0.5) * step * 0.8, z = gz + (random() - 0.5) * step * 0.8;
        const rim = island ? Math.hypot(x, z) / 5.3 : Math.max(Math.abs(x) / X, (z - (Z0 + Z1) / 2) / ((Z1 - Z0) / 2) * (z > 0 ? 1 : -1));
        if (rim > 1 || (rim > 0.86 && random() < 0.5)) continue;
        const d = dist(x, z);
        if (d < 0) {
          const ashy = random() < (a.behind === 'ash' ? 0.3 : 0.1) + mood.wear * 0.15 && d < -0.6;
          g.drum(step * 0.82, 0.03, [x, 0.01 + random() * 0.012, z], ashy ? vary('#9a948b', random, 0.08) : d > -0.5 ? vary('#3b1d14', random, 0.05) : vary(char, random, 0.04), [0, random() * 3, 0], 7);
          if (random() < 0.55) for (let k = 0; k < 2; k++) g.cone(0.03, mix(0.06, 0.2, random()), [x + (random() - 0.5) * 0.3, 0.07, z + (random() - 0.5) * 0.3], '#151210', [(random() - 0.5) * 0.6, 0, (random() - 0.5) * 0.6], 4);
          burnt.push([x, z, d]);
        } else {
          g.drum(step * 0.82, 0.03, [x, 0.01 + random() * 0.012, z], vary(soil, random, 0.05), [0, random() * 3, 0], 7);
          const scorched = d < 0.45, c = scorched ? vary('#8a5a2e', random, 0.08) : vary(straw, random, 0.1);
          const blades = a.grass === 'short' ? 3 : 4;
          for (let k = 0; k < blades; k++) { const h = grassH * mix(0.65, 1.2, random()); g.cone(0.035 + grassH * 0.03, h, [x + (random() - 0.5) * step * 0.7, h * 0.5, z + (random() - 0.5) * step * 0.7], c, [(random() - 0.5) * 0.4 + wz * 0.12, 0, (random() - 0.5) * 0.4 - wx * 0.12], 4); }
          standing.push([x, z, d]);
        }
        if (Math.abs(d) < step * 0.62 && !(a.burn === 'dying' && random() < 0.68)) fires.push([x, 0.02, z]);
      }

    // The thorn bush catching.
    if (a.grass === 'bush' && fires.length) {
      const [bx, , bz] = fires[Math.floor(fires.length * mix(0.35, 0.65, random()))];
      const z = bz + (dist(bx, bz + 0.3) > dist(bx, bz) ? 0.7 : -0.7);
      for (let i = 0; i < 9; i++) {
        const t = (i / 9) * 6.28, tip: P3 = [bx + Math.cos(t) * mix(0.6, 1.1, random()), mix(1.1, 1.9, random()), z + Math.sin(t) * mix(0.6, 1.1, random())];
        g.rod([bx, 0, z], tip, 0.05, 0.015, '#3a2c22', 4);
        if (Math.sin(t) * (z > bz ? 1 : -1) > -0.2) g.blob([0.42, 0.3, 0.42], tip, vary('#6f7a3e', random, 0.1), [0, random() * 3, 0], 1);
        else fires.push([tip[0], tip[1] - 0.5, tip[2]], [tip[0] * 0.5 + bx * 0.5, 0.5, tip[2] * 0.5 + z * 0.5]);
      }
    }

    // Flames: two instanced layers so they can flicker.
    const tongues: { at: THREE.Vector3; yaw: number; r: number; h: number; f: number; phase: number }[] = [];
    for (const [x, y, z] of fires) {
      const n = a.burn === 'dying' ? 1 : 2 + Math.floor(random() * 2);
      for (let k = 0; k < n; k++) {
        const h = flameH * mix(0.45, 1.3, random()) * (random() < 0.12 ? 1.5 : 1);
        tongues.push({ at: new THREE.Vector3(x + (random() - 0.5) * 0.4, y, z + (random() - 0.5) * 0.4), yaw: random() * 6.28, r: h * 0.13 + 0.08, h, f: mix(5, 11, random()), phase: random() * 6.28 });
      }
      if (random() < 0.3) glow.blob([0.09, 0.03, 0.09], [x + (random() - 0.5) * 0.5, 0.05, z + (random() - 0.5) * 0.5], '#ff7a2a', undefined, 0);
    }
    const cone = new THREE.ConeGeometry(1, 1, 5);
    cone.translate(0, 0.5, 0);
    const hot = mix(0.55, 1.0, mood.energy);
    const outerMaterial = new THREE.MeshStandardMaterial({ color: '#e8431a', emissive: '#d92c06', emissiveIntensity: hot, roughness: 0.7, flatShading: true });
    const innerMaterial = new THREE.MeshStandardMaterial({ color: '#ffc93a', emissive: '#ff9d12', emissiveIntensity: hot * 1.1, roughness: 0.7, flatShading: true });
    const count = Math.max(1, tongues.length);
    const outer = new THREE.InstancedMesh(cone, outerMaterial, count), inner = new THREE.InstancedMesh(cone, innerMaterial, count);
    outer.castShadow = inner.castShadow = false;
    const shear = new THREE.Matrix4().set(1, wx * 0.75, 0, 0, 0, 1, 0, 0, 0, wz * 0.75, 1, 0, 0, 0, 0, 1);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), zero = new THREE.Vector3();
    const flicker = (time: number) => {
      tongues.forEach((t, i) => {
        const pulse = 1 + 0.22 * Math.sin(time * t.f + t.phase) + 0.1 * Math.sin(time * t.f * 2.3 + t.phase * 2);
        q.setFromAxisAngle(up, t.yaw + time * 0.5);
        m.compose(zero, q, s.set(t.r, t.h * pulse, t.r)).premultiply(shear).setPosition(t.at);
        outer.setMatrixAt(i, m);
        m.compose(zero, q, s.set(t.r * 0.62, t.h * (2 - pulse) * 0.68, t.r * 0.62)).premultiply(shear).setPosition(t.at.x + t.r * 0.55, t.at.y + 0.02, t.at.z + t.r * 0.75);
        inner.setMatrixAt(i, m);
      });
      if (!tongues.length) { m.makeScale(0, 0, 0); outer.setMatrixAt(0, m); inner.setMatrixAt(0, m); }
      outer.instanceMatrix.needsUpdate = inner.instanceMatrix.needsUpdate = true;
    };
    flicker(0);
    outer.computeBoundingBox(); inner.computeBoundingBox();
    outer.frustumCulled = inner.frustumCulled = false;
    root.add(outer, inner);

    // Smoke columns, dense low down and thinning as they lean away.
    const sources = fires.filter((_f, i) => i % Math.max(1, Math.round(fires.length / (a.burn === 'dying' ? 9 : 7))) === 0);
    const smokeTone = new THREE.Color('#756c63').lerp(new THREE.Color('#5a4a3c'), mood.warmth * 0.3);
    const rise = { creeping: 3.2, running: 5.2, flaring: 7, dying: 4.2 }[a.burn];
    for (const [x, , z] of sources) {
      const puffs = 6 + Math.floor(random() * 3), top = rise * mix(0.75, 1.1, random()) / (1 + lean * 0.35);
      for (let j = 0; j < puffs; j++) {
        const t = (j + 0.5) / puffs, y = flameH * 0.7 + t * top, size = mix(0.3, 1.15, t) * mix(0.8, 1.2, random()) * (a.burn === 'creeping' ? 0.75 : 1);
        const at: P3 = [x + wx * y * 1.1 + (random() - 0.5) * 0.4 * t, y, z + wz * y * 1.1 + (random() - 0.5) * 0.4 * t];
        const colour = smokeTone.clone().lerp(new THREE.Color('#ddd7cf'), t * 0.9);
        (t < 0.55 ? solidSmoke : thinSmoke).blob([size, size * 0.8, size], at, vary(colour, random, 0.04), [random() * 3, random() * 3, 0], 1);
      }
    }

    // What the fire has left behind.
    const deep = burnt.filter(([, , d]) => d < -1.1).sort(() => random() - 0.5);
    if (a.behind === 'embers') {
      for (const [x, z] of deep.slice(0, 5)) {
        const t = random() * 3.14, len = mix(0.4, 0.9, random());
        g.rod([x - Math.cos(t) * len, 0.1, z - Math.sin(t) * len], [x + Math.cos(t) * len, 0.16, z + Math.sin(t) * len], 0.11, 0.08, '#191513', 6);
        glow.ball([0.08, 0.08, 0.08], [x + Math.cos(t) * len, 0.16, z + Math.sin(t) * len], '#ff8a2a', undefined, 6);
        for (let j = 0; j < 3; j++) thinSmoke.blob([0.12 + j * 0.1, 0.16 + j * 0.1, 0.12 + j * 0.1], [x + wx * (0.4 + j * 0.5), 0.5 + j * 0.55, z + wz * (0.4 + j * 0.5)], '#cfc8bf', undefined, 1);
      }
      for (const [x, z] of deep.slice(5, 60)) if (random() < 0.5) glow.blob([0.045, 0.03, 0.045], [x + (random() - 0.5) * 0.3, 0.045, z + (random() - 0.5) * 0.3], '#ff7a2a', undefined, 0);
    } else if (a.behind === 'bones' && deep.length > 2) {
      const [x, z] = deep[0], bone = '#e9e3d2';
      g.blob([0.2, 0.15, 0.14], [x + 0.9, 0.14, z], bone, [0, 0.4, 0], 1);
      for (const sgn of [-1, 1]) g.tube([[x + 0.82, 0.24, z + sgn * 0.06], [x + 0.72, 0.42, z + sgn * 0.26], [x + 0.84, 0.62, z + sgn * 0.3]], 0.03, 0.008, '#cfc6b0', 4);
      for (let i = 0; i < 6; i++) g.tube([[x - 0.4 + i * 0.16, 0.03, z - 0.25], [x - 0.4 + i * 0.16, 0.36, z], [x - 0.4 + i * 0.16, 0.03, z + 0.28]], 0.022, 0.016, bone, 4);
      g.rod([x - 0.5, 0.06, z], [x + 0.75, 0.08, z], 0.03, 0.03, bone, 5);
      const [tx, tz] = deep[1];
      g.ball([0.24, 0.15, 0.2], [tx, 0.1, tz], '#d8cfb5', [0, random() * 3, 0], 8);
      for (let i = 0; i < 5; i++) g.box([0.012, 0.012, 0.36], [tx - 0.16 + i * 0.08, 0.235 - Math.abs(i - 2) * 0.025, tz], '#7a705c');
    } else if (a.behind === 'shoots') {
      const green = new THREE.Color('#63b23a').lerp(new THREE.Color('#9acb4a'), mood.cheer * 0.5);
      for (const [x, z] of deep) for (let k = 0; k < 3; k++) g.cone(0.022, mix(0.12, 0.3, random()), [x + (random() - 0.5) * step, 0.1, z + (random() - 0.5) * step], vary(green, random, 0.08), [(random() - 0.5) * 0.4, 0, (random() - 0.5) * 0.4], 4);
    }

    // Company.
    const put = (batch: Batch, x: number, z: number, heading: number, scale = 1) => g.absorb(batch, new THREE.Matrix4().compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, heading, 0)), new THREE.Vector3(scale, scale, scale)));
    const edge = burnt.filter(([, , d]) => d < -0.7 && d > -1.9).sort(() => random() - 0.5);
    const ahead = standing.filter(([x, z, d]) => d > 0.9 && Math.abs(x) < X - 1 && z < Z1 - 0.6).sort(() => random() - 0.5);
    if (a.company === 'storks') {
      for (const [x, z] of edge.slice(0, 3 + Math.floor(random() * 3))) {
        const b = new Batch(), red = '#d83a2a';
        b.ball([0.3, 0.17, 0.15], [0, 0.82, 0], '#f3f0e8', [0, 0, 0.25], 9).ball([0.2, 0.1, 0.14], [-0.2, 0.78, 0], '#1d1a18', [0, 0, 0.45], 8);
        const stoop = random() < 0.5;
        b.tube(stoop ? [[0.22, 0.9, 0], [0.42, 0.95, 0], [0.55, 0.62, 0]] : [[0.22, 0.9, 0], [0.3, 1.15, 0], [0.38, 1.38, 0]], 0.05, 0.035, '#f3f0e8', 5);
        const head: P3 = stoop ? [0.56, 0.58, 0] : [0.4, 1.42, 0];
        b.ball([0.055, 0.05, 0.05], head, '#f3f0e8', undefined, 6).cone(0.022, 0.3, [head[0] + 0.1, head[1] - 0.11, head[2]], red, [0, 0, -2.4], 4);
        for (const sgn of [-1, 1]) b.rod([0.02, 0.7, sgn * 0.05], [0.04 + sgn * 0.08, 0, sgn * 0.06], 0.014, 0.012, red, 4);
        put(b, x, z, random() * 6.28, mix(1.1, 1.3, random()));
      }
    } else if (a.company === 'fleeing') {
      for (const [x, z] of ahead.slice(0, 2 + Math.floor(random() * 2))) {
        const b = new Batch(), fur = vary('#c98f4e', random, 0.05), lift = mix(0.25, 0.7, random());
        b.ball([0.36, 0.15, 0.13], [0, 0.62 + lift, 0], fur, [0, 0, 0.12], 9).ball([0.3, 0.07, 0.11], [0, 0.54 + lift, 0], '#f1e9d8', [0, 0, 0.12], 8);
        b.box([0.42, 0.035, 0.27], [0, 0.6 + lift, 0], '#2b221c', [0, 0, 0.12]);
        b.tube([[0.28, 0.7 + lift, 0], [0.4, 0.88 + lift, 0], [0.5, 1.0 + lift, 0]], 0.06, 0.04, fur, 5).ball([0.06, 0.05, 0.05], [0.55, 1.02 + lift, 0], fur, undefined, 6);
        for (const sgn of [-1, 1]) {
          b.rod([0.5, 1.05 + lift, sgn * 0.03], [0.42, 1.3 + lift, sgn * 0.07], 0.012, 0.006, '#2b221c', 4);
          b.rod([0.25, 0.58 + lift, sgn * 0.07], [0.72, 0.36 + lift, sgn * 0.07], 0.03, 0.015, fur, 4);
          b.rod([-0.28, 0.58 + lift, sgn * 0.07], [-0.78, 0.4 + lift, sgn * 0.07], 0.035, 0.015, fur, 4);
        }
        put(b, x, z, -1.57 + (random() - 0.5) * 0.9, 1.25); // away from the fire, toward the viewer
      }
      if (standing.length) {
        const near = standing.filter(([, , d]) => d > 0.3 && d < 0.9), [x, z] = (near.length ? near : standing)[Math.floor(random() * (near.length || standing.length))];
        const b = new Batch();
        b.ball([0.24, 0.16, 0.2], [0, 0.14, 0], '#5d5a34', undefined, 9).ball([0.06, 0.05, 0.05], [0.27, 0.12, 0], '#7a744a', undefined, 6);
        for (const [lx, lz] of [[0.14, 0.17], [0.14, -0.17], [-0.14, 0.17], [-0.14, -0.17]]) b.ball([0.05, 0.05, 0.05], [lx, 0.04, lz], '#7a744a', undefined, 5);
        put(b, x, z, -1.57 + (random() - 0.5), 1.2);
      }
    } else if (a.company === 'beater' && burnt.length) {
      const close = burnt.filter(([x, , d]) => d > -0.9 && d < -0.35 && Math.abs(x) < X - 1.5), [x, z] = (close.length ? close : burnt)[Math.floor(random() * (close.length || burnt.length))];
      const b = new Batch(), skin = '#4a3024', cloth = new THREE.Color('#b8262c').lerp(new THREE.Color('#8a5a50'), mood.wear * 0.4);
      for (const sgn of [-1, 1]) b.rod([0, 0.9, sgn * 0.1], [sgn * 0.12, 0, sgn * 0.16], 0.065, 0.045, skin, 5);
      b.shaped([[0, 0.7, 0], [0.06, 1.15, 0], [0.16, 1.48, 0]], (t) => mix(0.24, 0.17, t), cloth, 8);
      b.ball([0.11, 0.12, 0.11], [0.22, 1.66, 0], skin, undefined, 8);
      b.rod([0.14, 1.42, 0.12], [0.4, 1.9, 0.1], 0.045, 0.035, skin, 4).rod([0.14, 1.42, -0.12], [0.42, 1.85, -0.06], 0.045, 0.035, skin, 4);
      b.rod([0.4, 1.88, 0.04], [1.3, 1.25, 0], 0.03, 0.02, '#4d3d2c', 4);
      for (let i = 0; i < 6; i++) b.blob([0.2, 0.12, 0.2], [1.0 + random() * 0.55, 1.4 - random() * 0.5, (random() - 0.5) * 0.4], vary('#4f8a34', random, 0.1), [random(), random(), random()], 1);
      const e = 0.3, heading = Math.atan2(-(dist(x, z + e) - dist(x, z - e)), dist(x + e, z) - dist(x - e, z)); // face the flames
      put(b, x, z, heading);
    }

    root.add(g.mesh({ roughness: 0.95 }));
    if (!glow.empty) { const mesh = glow.mesh({ emissive: '#ff5a1e', emissiveIntensity: hot * 1.4 }); mesh.castShadow = false; root.add(mesh); }
    const smokes: THREE.Mesh[] = [];
    if (!solidSmoke.empty) { const mesh = solidSmoke.mesh({ flatShading: true, roughness: 1 }); mesh.castShadow = false; smokes.push(mesh); root.add(mesh); }
    if (!thinSmoke.empty) { const mesh = thinSmoke.mesh({ flatShading: true, roughness: 1, transparent: true, opacity: 0.5, depthWrite: false }); mesh.castShadow = false; smokes.push(mesh); root.add(mesh); }

    const speed = mix(0.5, 1.6, mood.energy);
    return {
      object: root,
      update: (_dt, time) => {
        flicker(time * speed);
        smokes.forEach((mesh, i) => { mesh.position.set(Math.sin(time * 0.5 + i) * 0.06 * (1 + lean), Math.sin(time * 0.7 + i * 2) * 0.05, 0); });
      },
      dispose: () => {
        const seen = new Set<{ dispose(): void }>();
        root.traverse((node) => {
          const mesh = node as THREE.Mesh;
          if (!mesh.isMesh) return;
          seen.add(mesh.geometry); seen.add(mesh.material as THREE.Material);
        });
        for (const item of seen) item.dispose();
        root.removeFromParent();
      },
    };
  },
});
