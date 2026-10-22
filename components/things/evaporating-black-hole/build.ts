import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

const SPARKS = {
  gold: ['#ffb321', '#ff7a1a', '#ffe08a'],
  blue: ['#2f8bff', '#6fd3ff', '#3b4fe0'],
  rose: ['#f0448f', '#ff8fb5', '#b42fc0'],
  green: ['#3ed67a', '#b6f25a', '#1fa58f'],
  spectrum: ['#ff5a3c', '#ffc02e', '#3ed67a', '#2f8bff', '#b455e6'],
} as const;

export default defineThing({
  questions: {
    stage: choice('How near the end is it?', {
      fizz: 'A slow steady fizz: a tight, even halo, with ages still to go.',
      sputter: 'Sputtering: uneven bursts and gaps, a sparkler nearly down to the wire.',
      flash: 'The final flash: the core is a pinpoint and long rays are thrown in every direction.',
    }),
    sparks: choice('What colour are the sparks?', {
      gold: 'Sparkler gold and orange.',
      blue: 'Electric blue and cyan.',
      rose: 'Rose and magenta, oddly gentle.',
      green: 'Sickly green going to lime.',
      spectrum: 'Every colour at once, like a dropped box of fireworks.',
    }),
    halo: choice('What shape is the halo of sparks?', {
      shell: 'An even ball of sparks in every direction, a dandelion clock.',
      disc: 'A flat spinning disc, a catherine wheel.',
      fountains: 'Two opposed fountains from the poles.',
      tail: 'Blown to one side into a short comet tail.',
      spiral: 'Curling spiral arms, a pinwheel.',
    }),
    watchers: choice('Is anything watching it go?', {
      nobody: 'Nobody. It ends unobserved.',
      probe: 'One small probe with its dish turned toward it.',
      ring: 'A patient ring of instruments spaced evenly around it.',
      ships: 'Two little ships side by side at a respectful distance.',
    }),
    lens: noul('Is there a dark lens of bent space around it, like a bruise in the air?'),
    ash: noul('Has it left a curtain of cooled grey ash hanging beneath it?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const palette = SPARKS[a.sparks];
    const core = { fizz: 0.2, sputter: 0.14, flash: 0.075 }[a.stage];
    const reach = { fizz: 0.8, sputter: 1.0, flash: 1.45 }[a.stage];
    const body = new THREE.Group();
    s.root.add(body);

    // The hole itself, a bright photon rim and an optional bruise of bent space.
    const hole = new THREE.Mesh(new THREE.SphereGeometry(core, 32, 20), new THREE.MeshBasicMaterial({ color: '#05060a' }));
    body.add(hole);
    const rimMat = new THREE.MeshBasicMaterial({ color: palette[0], side: THREE.BackSide });
    const rim = new THREE.Mesh(new THREE.SphereGeometry(core * 1.14, 32, 20), rimMat);
    body.add(rim);
    const glowMat = new THREE.MeshBasicMaterial({ color: palette[1 % palette.length], transparent: true, opacity: a.stage === 'flash' ? 0.3 : 0.18, depthWrite: false, side: THREE.BackSide });
    body.add(new THREE.Mesh(new THREE.SphereGeometry(core * (a.stage === 'flash' ? 4 : 1.9), 32, 20), glowMat));
    if (a.lens) {
      for (const [k, opacity] of [[0.4, 0.07], [0.5, 0.07], [0.6, 0.06], [0.7, 0.06], [0.8, 0.05], [0.9, 0.05], [1.0, 0.04]] as const)
        body.add(new THREE.Mesh(new THREE.SphereGeometry(reach * k, 36, 20), new THREE.MeshBasicMaterial({ color: '#2a1f3d', transparent: true, opacity, depthWrite: false, side: THREE.BackSide })));
    }

    // Sparks: one instanced mesh, each spark flying outward and shrinking, then starting again.
    const count = Math.round({ fizz: 260, sputter: 200, flash: 420 }[a.stage] * mix(0.7, 1.3, mood.density));
    const sparkMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
    const sparks = new THREE.InstancedMesh(new THREE.OctahedronGeometry(1, 0), sparkMat, count);
    sparks.castShadow = true;
    const lobes = Array.from({ length: 5 }, () => new THREE.Vector3(random() - 0.5, random() - 0.5, random() - 0.5).normalize());
    const wind = new THREE.Vector3(0.9, 0.25, -0.2).normalize();
    const data = Array.from({ length: count }, (_unused, i) => {
      let dir = new THREE.Vector3(random() - 0.5, random() - 0.5, random() - 0.5).normalize();
      if (a.halo === 'disc' || a.halo === 'spiral') { dir.y *= 0.1; dir.normalize(); }
      if (a.halo === 'fountains') dir = new THREE.Vector3((random() - 0.5) * 0.55, i % 2 ? 1 : -1, (random() - 0.5) * 0.55).normalize();
      if (a.halo === 'spiral') { const arm = (i % 3) * (Math.PI * 2 / 3) + (random() - 0.5) * 0.5; dir.set(Math.cos(arm), dir.y, Math.sin(arm)).normalize(); }
      if (a.stage === 'sputter') dir.lerp(lobes[i % lobes.length], 0.55 + random() * 0.3).normalize();
      const long = a.stage === 'flash' ? 1 + random() * 3.5 : 1 + random() * 1.2;
      return {
        dir, phase: random(), speed: 0.25 + random() * 0.5,
        far: reach * (0.45 + random() * 0.55) * (a.halo === 'fountains' ? 1.15 : 1),
        width: 0.02 + random() * 0.024, long,
        twist: a.halo === 'spiral' ? 2.6 : a.halo === 'disc' ? 0.7 : 0,
        burst: random() * Math.PI * 2,
      };
    });
    const colour = new THREE.Color();
    data.forEach((_spark, i) => { sparks.setColorAt(i, colour.set(palette[Math.floor(random() * palette.length)])); });
    const matrix = new THREE.Matrix4(), at = new THREE.Vector3(), quat = new THREE.Quaternion(), size = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), heading = new THREE.Vector3(), axis = new THREE.Vector3(0, 1, 0);
    const pace = mix(0.35, 1.5, mood.energy);
    const lay = (time: number) => {
      data.forEach((spark, i) => {
        const f = (spark.phase + time * spark.speed * pace) % 1;
        const r = core * 1.1 + (spark.far - core) * Math.pow(f, 0.7);
        heading.copy(spark.dir);
        if (spark.twist) heading.applyAxisAngle(axis, f * spark.twist);
        at.copy(heading).multiplyScalar(r);
        if (a.halo === 'tail') { at.addScaledVector(wind, f * f * reach * 1.1); heading.copy(at).normalize(); }
        let fade = Math.pow(1 - f, 0.45);
        if (a.stage === 'sputter') fade *= 0.6 + 0.4 * Math.max(0, Math.sin(time * 2.2 * pace + spark.burst));
        size.set(spark.width * fade, spark.width * fade * 3.2 * spark.long, spark.width * fade);
        quat.setFromUnitVectors(up, heading);
        sparks.setMatrixAt(i, matrix.compose(at, quat, size));
      });
      sparks.instanceMatrix.needsUpdate = true;
    };
    lay(0);
    sparks.frustumCulled = false;
    body.add(sparks);

    // The final flash also throws a crown of long thin rays.
    const rays: THREE.Mesh[] = [];
    if (a.stage === 'flash') {
      const rayMat = new THREE.MeshBasicMaterial({ color: palette[0] });
      for (let i = 0; i < 14; i++) {
        const dir = data[i].dir, len = reach * (0.5 + random() * 0.5);
        const ray = new THREE.Mesh(new THREE.ConeGeometry(0.03, len, 5), rayMat);
        ray.position.copy(dir).multiplyScalar(core + len / 2);
        ray.quaternion.setFromUnitVectors(up, dir);
        body.add(ray);
        rays.push(ray);
      }
    }
    body.rotation.z = a.halo === 'disc' || a.halo === 'spiral' ? 0.35 : a.halo === 'fountains' ? 0.3 : 0;
    body.rotation.x = a.halo === 'disc' || a.halo === 'spiral' ? 0.25 : 0;

    if (a.ash) {
      const bits = Array.from({ length: 150 }, () => {
        const t = random() * Math.PI * 2, r = random() ** 0.6 * reach * 0.55, drop = random();
        return { at: [Math.cos(t) * r, -reach * (0.35 + drop * 0.75), Math.sin(t) * r] as [number, number, number], size: 0.008 + random() * 0.014 * (1 - drop * 0.5), color: random() < 0.5 ? '#8c8a90' : '#b9b5b0' };
      });
      s.scatter(new THREE.OctahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true }), bits);
    }

    // Watchers, small and well back.
    const metal = s.material('#8d8a86', { metalness: 0.5, roughness: 0.45 });
    const panel = s.material('#27334a', { metalness: 0.4, roughness: 0.4 });
    const pale = s.material('#e6e0d2', { side: THREE.DoubleSide });
    const lamp = new THREE.MeshStandardMaterial({ color: '#ffd27a', emissive: '#ffc658', emissiveIntensity: mix(0.5, 1.4, mood.cheer) });
    const probe = (where: THREE.Vector3, scale: number) => {
      const g = new THREE.Group();
      const hull = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 0.12), metal);
      hull.castShadow = true;
      g.add(hull);
      for (const side of [-1, 1]) { const wing = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.006, 0.08), panel); wing.position.x = side * 0.15; wing.castShadow = true; g.add(wing); }
      const dish = new THREE.Mesh(new THREE.SphereGeometry(0.08, 14, 6, 0, Math.PI * 2, 0, 0.95), pale);
      dish.rotation.x = -Math.PI / 2; dish.position.z = 0.15;
      g.add(dish);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), lamp);
      eye.position.set(0.03, 0.05, 0.05);
      g.add(eye);
      g.position.copy(where);
      g.lookAt(0, 0, 0);
      g.scale.setScalar(scale);
      s.root.add(g);
      return g;
    };
    const ringGroup: THREE.Object3D[] = [];
    if (a.watchers === 'probe') probe(new THREE.Vector3(reach * 1.25, reach * 0.3, reach * 0.9), 1.5);
    if (a.watchers === 'ring') for (let i = 0; i < 6; i++) { const t = i * Math.PI / 3 + 0.4; ringGroup.push(probe(new THREE.Vector3(Math.cos(t) * reach * 1.4, Math.sin(t * 2) * 0.08, Math.sin(t) * reach * 1.4), 1.0)); }
    if (a.watchers === 'ships') {
      for (const side of [-1, 1]) {
        const ship = new THREE.Group();
        const hull = new THREE.Mesh(new THREE.LatheGeometry([[0, -0.2], [0.05, -0.16], [0.065, 0], [0.045, 0.14], [0, 0.22]].map(([x, y]) => new THREE.Vector2(x, y)), 12), s.material(side < 0 ? '#b8a48a' : '#8c97a3', { metalness: 0.3 }));
        hull.rotation.x = Math.PI / 2; hull.castShadow = true;
        ship.add(hull);
        const fin = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.008, 0.07), metal);
        fin.position.z = -0.13;
        ship.add(fin);
        const port = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), lamp);
        port.position.set(0, 0.05, 0.08);
        ship.add(port);
        ship.position.set(reach * 1.15 + side * 0.14, -reach * 0.2 + side * 0.05, reach * 1.0 - side * 0.14);
        ship.lookAt(0, 0, 0);
        ship.scale.setScalar(1.3);
        s.root.add(ship);
      }
    }

    return s.finish({
      footprint: reach * 0.8,
      update(_dt, time) {
        lay(time);
        const pulse = a.stage === 'fizz' ? 1 + Math.sin(time * 9) * 0.05 : a.stage === 'sputter' ? 0.75 + Math.max(0, Math.sin(time * 5.3) * Math.sin(time * 1.7)) * 0.6 : 1 + Math.sin(time * 14) * 0.2;
        rim.scale.setScalar(pulse);
        for (const [i, ray] of rays.entries()) ray.scale.set(1, 0.8 + Math.sin(time * 6 + i) * 0.25, 1);
      },
    });
  },
});
