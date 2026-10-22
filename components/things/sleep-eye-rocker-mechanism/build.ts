import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';
import { dollHead } from './doll';

export default defineThing({
  questions: {
    eyes: choice('Are the eyes open or shut?', {
      open: 'Wide open and staring forward, the weight hanging straight down.',
      half: 'Half-lidded, caught mid-swing and drowsy.',
      shut: 'Rolled fully shut, only the flesh-painted lids and lashes showing.',
    }),
    lashes: choice('What are the lashes like?', {
      painted: 'No real lashes, only a painted lid edge.',
      bristle: 'A short stiff fringe of dark bristle.',
      long: 'Long real-hair lashes that sweep right out past the lids.',
      feathery: 'Absurdly thick glamorous lashes, like a film star\'s.',
    }),
    weight: choice('What shape is the lead counterweight?', {
      teardrop: 'A hanging teardrop.',
      ball: 'A plain round shot ball.',
      disc: 'A flat hammered disc like a coin.',
      bar: 'A stubby cylinder slug.',
      bell: 'A small flared bell shape.',
    }),
    mount: choice('How is the mechanism shown?', {
      cutaway: 'Inside a doll\'s head cut in half down the face, one eye peering through its socket and the other laid bare.',
      loose: 'Loose on the bench, lying back on its weight and staring up.',
      stand: 'Hung between two brass posts on a repairer\'s test stand, free to rock.',
    }),
    condition: choice('What condition is it in?', {
      working: 'In good order, balanced and ready.',
      broken: 'Broken: the wire has snapped, the weight has dropped off and one eye sits askew.',
      plaster: 'Freshly set: wet white plaster lumps at the pivots, a mixing bowl and spatula beside it.',
      stuck: 'Seized: gummed with old glue and rust, one eye cloudy.',
    }),
    iris: choice('What colour are the eyes?', {
      blue: 'Bright paperweight blue.',
      brown: 'Warm brown.',
      green: 'Grey-green.',
      violet: 'An unnatural violet.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const wear = Math.min(1, mood.wear + (a.condition === 'stuck' ? 0.35 : 0));
    const put = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, x = 0, y = 0, z = 0) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z);
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    const h = 0.16, er = 0.085 * h * 1.12;
    const skinColour = new THREE.Color('#f1d2c0');
    const skin = new THREE.MeshStandardMaterial({ color: skinColour, roughness: 0.45 });
    const wireColour = new THREE.Color('#9a9a94').lerp(new THREE.Color('#8a4a26'), wear * 0.8);
    const wire = new THREE.MeshStandardMaterial({ color: wireColour, metalness: 0.7 - wear * 0.4, roughness: 0.35 + wear * 0.5 });
    const lead = new THREE.MeshStandardMaterial({ color: new THREE.Color('#5d6066').lerp(new THREE.Color('#b9bab4'), wear * 0.5), metalness: 0.45, roughness: 0.55 });
    const glass = new THREE.MeshStandardMaterial({ color: '#f5f1e8', roughness: 0.1 });
    const cloudy = new THREE.MeshStandardMaterial({ color: '#cfcabc', roughness: 0.6 });
    const irisColour = { blue: '#2f6fd0', brown: '#6b3d1c', green: '#5f8f6a', violet: '#7a4fc8' }[a.iris];
    const iris = new THREE.MeshStandardMaterial({ color: irisColour, roughness: 0.15 });
    const pupil = new THREE.MeshStandardMaterial({ color: '#0a0a0b', roughness: 0.1 });
    const lashMaterial = new THREE.MeshStandardMaterial({ color: '#1a1410', roughness: 0.8 });

    // Head shell first, so the rocker can sit exactly behind its sockets.
    let pivot = new THREE.Vector3(0, 0.075, 0), ex = 0.016;
    if (a.mount === 'cutaway') {
      const head = dollHead({
        h, skin: skinColour.getStyle(), roughness: 0.45, expression: 'sweet', leftEye: true, rightEye: true, iris: irisColour,
        lid: 0, crown: 'open', paint: 1, damage: wear > 0.6 ? ['cheek'] : [], wear: wear * 0.8, noEyes: true, arc: Math.PI - 0.04, random,
      });
      s.root.add(head.group);
      const y = 0.63 * h, r = head.radius(y) - er * 0.62;
      ex = Math.sin(0.43) * r;
      pivot = new THREE.Vector3(0, y, Math.cos(0.43) * r);
    }

    const rocker = new THREE.Group();
    rocker.position.copy(pivot);
    s.root.add(rocker);
    const broken = a.condition === 'broken';
    const lostSide = broken && a.mount !== 'cutaway' ? (random() < 0.5 ? -1 : 1) : 0;
    const makeEye = (parent: THREE.Object3D, clouded: boolean) => {
      const eye = new THREE.Group();
      parent.add(eye);
      put(eye, new THREE.SphereGeometry(er, 24, 16), clouded ? cloudy : glass);
      const disc = put(eye, new THREE.SphereGeometry(er * 0.62, 18, 10), iris, 0, 0, er * 0.84);
      disc.scale.z = 0.3;
      const dot = put(eye, new THREE.SphereGeometry(er * 0.3, 12, 8), pupil, 0, 0, er * 0.96);
      dot.scale.z = 0.3;
      // The flesh-painted lid is part of the eyeball: it comes round to the front as the rocker tips.
      const lid = put(eye, new THREE.SphereGeometry(er * 1.03, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.46), skin);
      lid.rotation.x = -0.32;
      if (a.lashes !== 'painted') {
        const n = a.lashes === 'feathery' ? 17 : 11;
        const length = er * { bristle: 0.4, long: 0.85, feathery: 1.05 }[a.lashes];
        const fringe = new THREE.Group();
        fringe.rotation.x = -0.32;
        eye.add(fringe);
        for (let i = 0; i < n; i++) {
          const angle = (i / (n - 1) - 0.5) * 2.3;
          const lash = put(fringe, new THREE.ConeGeometry(er * (a.lashes === 'feathery' ? 0.07 : 0.045), length, 5), lashMaterial);
          const dir = new THREE.Vector3(Math.sin(angle), 0.12 + (a.lashes === 'bristle' ? 0 : 0.35), Math.cos(angle)).normalize();
          lash.position.set(Math.sin(angle) * er * 1.02, er * 0.12, Math.cos(angle) * er * 1.02).addScaledVector(dir, length / 2);
          lash.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
        }
      } else {
        const line = put(eye, new THREE.TorusGeometry(er * 1.03, er * 0.035, 5, 24, Math.PI), lashMaterial);
        line.rotation.set(Math.PI / 2 - 0.32 - 0.12, 0, 0);
        line.rotation.z = 0;
        line.rotation.y = 0;
        line.rotation.x = -Math.PI / 2 - 0.32 + 0.12;
      }
      return eye;
    };
    for (const side of [-1, 1]) {
      const clouded = a.condition === 'stuck' && side < 0;
      if (side === lostSide) continue;
      makeEye(rocker, clouded).position.x = side * ex;
      // Pivot pin.
      const pin = put(rocker, new THREE.CylinderGeometry(er * 0.09, er * 0.09, er * 0.9, 8), wire, side * (ex + er * 1.3), 0, 0);
      pin.rotation.z = Math.PI / 2;
      const stub = put(rocker, new THREE.CylinderGeometry(er * 0.07, er * 0.07, er * 0.5, 6), wire, side * ex, 0, -er * 1.15);
      stub.rotation.x = Math.PI / 2;
    }
    const bar = put(rocker, new THREE.CylinderGeometry(er * 0.09, er * 0.09, ex * 2 + er * 0.3, 8), wire, 0, 0, -er * 1.38);
    bar.rotation.z = Math.PI / 2;
    const stemEnd = new THREE.Vector3(0, -er * 3.6, -er * 2.1);
    const stemPoints = [new THREE.Vector3(0, 0, -er * 1.38), new THREE.Vector3(0, -er * 0.9, -er * 2.3), new THREE.Vector3(0, -er * 2.4, -er * 2.5), stemEnd];
    const usedPoints = broken ? stemPoints.slice(0, 3) : stemPoints;
    put(rocker, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(usedPoints), 20, er * 0.09, 8), wire);
    const makeWeight = () => {
      const g = new THREE.Group();
      const w = er * 1.15;
      if (a.weight === 'teardrop') put(g, new THREE.LatheGeometry([[0, 1.5], [0.25, 1.1], [0.8, 0.2], [1, -0.4], [0.75, -1], [0, -1.25]].map(([x, y]) => new THREE.Vector2(x * w, y * w)), 20), lead);
      if (a.weight === 'ball') put(g, new THREE.SphereGeometry(w * 1.05, 18, 12), lead);
      if (a.weight === 'disc') put(g, new THREE.CylinderGeometry(w * 1.35, w * 1.35, w * 0.4, 22), lead).rotation.z = Math.PI / 2;
      if (a.weight === 'bar') put(g, new THREE.CylinderGeometry(w * 0.7, w * 0.7, w * 2.2, 18), lead);
      if (a.weight === 'bell') put(g, new THREE.LatheGeometry([[0, 1.1], [0.35, 1], [0.5, 0.2], [1.2, -0.8], [1.2, -1], [0, -1]].map(([x, y]) => new THREE.Vector2(x * w, y * w)), 20), lead);
      return g;
    };
    const weight = makeWeight();
    if (!broken) {
      weight.position.copy(stemEnd).add(new THREE.Vector3(0, -er * 0.9, 0));
      rocker.add(weight);
    }
    const angle = { open: 0, half: 0.52, shut: 1.12 }[a.eyes];
    rocker.rotation.x = angle;
    if (broken) rocker.rotation.z = (random() < 0.5 ? -1 : 1) * 0.16;

    const brass = s.material('#c9a23a', { metalness: 0.85, roughness: 0.3 });
    const benchWood = s.material('#8a623c', { roughness: 0.8 });
    let floor = 0;
    if (a.mount === 'stand') {
      const base = er * 6.5;
      pivot.set(0, base, 0);
      rocker.position.copy(pivot);
      const half = ex + er * 1.75;
      s.box([half * 2 + 0.03, 0.01, 0.07], [0, 0.005, -0.006], benchWood);
      for (const side of [-1, 1]) {
        s.cylinder(0.0022, 0.003, base + 0.004, [side * half, base / 2 + 0.006, 0], brass, 10);
        s.ball([0.004, 0.004, 0.004], [side * half, base, 0], brass, 10);
        s.cylinder(0.007, 0.008, 0.004, [side * half, 0.01, 0], brass, 12);
      }
    } else if (a.mount === 'loose') {
      // Lying back on its weight on a folded cloth.
      rocker.rotation.x = -1.05 + angle * 0.5;
      rocker.rotation.z += (random() - 0.5) * 0.2;
      rocker.rotation.y = (random() - 0.5) * 0.5;
      rocker.updateMatrixWorld(true);
      const low = new THREE.Box3().setFromObject(rocker).min.y;
      rocker.position.y -= low - 0.005;
      const clothMaterial = s.material(mood.cheer > 0.5 ? '#c9d6dc' : '#b8b0a0', { roughness: 1 });
      const pad = s.box([0.14, 0.005, 0.12], [0, 0.0025, -0.015], clothMaterial);
      pad.rotation.y = (random() - 0.5) * 0.4;
    } else {
      floor = 0;
    }
    if (broken) {
      const dropped = weight;
      dropped.position.set((random() - 0.5) * 0.03 + 0.07, floor + er * 0.9, 0.06 + random() * 0.02);
      dropped.rotation.set(Math.PI / 2, 0, random() * 3);
      s.root.add(dropped);
      if (lostSide) {
        const fallen = makeEye(s.root, false);
        fallen.position.set(lostSide * 0.03 - 0.03, floor + er, 0.08);
        fallen.rotation.set(-0.9, random() - 0.5, 0);
      }
      s.rod([0.02, floor + 0.001, 0.1], [0.05, floor + 0.001, 0.08], er * 0.09, wire);
    }
    if (a.condition === 'plaster') {
      const plaster = new THREE.MeshStandardMaterial({ color: '#f6f4ee', roughness: 0.9, flatShading: true });
      for (const side of [-1, 1]) {
        const lump = s.mesh(new THREE.IcosahedronGeometry(er * 0.75, 1), plaster, [pivot.x + side * (ex + er * 1.55), pivot.y, pivot.z - er * 0.2]);
        lump.scale.set(0.8, 1.1 + random() * 0.3, 1.1);
        lump.rotation.set(random() * 3, random() * 3, 0);
      }
      const bx = a.mount === 'cutaway' ? 0.11 : 0.1;
      s.lathe([[0, 0.002], [0.018, 0.002], [0.027, 0.02], [0.029, 0.02], [0.02, 0], [0, 0]], s.material('#7d9aa6', { roughness: 0.4, side: THREE.DoubleSide }), [bx, 0, 0.03]);
      s.cylinder(0.024, 0.02, 0.004, [bx, 0.014, 0.03], plaster, 16);
      s.rod([bx - 0.012, 0.016, 0.03], [bx + 0.04, 0.03, 0.055], 0.0018, s.material('#c9cdd0', { metalness: 0.8, roughness: 0.3 }), 0.003);
    }
    if (a.condition === 'stuck') {
      const glue = new THREE.MeshStandardMaterial({ color: '#a8782a', roughness: 0.3 });
      for (const side of [-1, 1]) {
        const blob = s.ball([er * 0.5, er * 0.7, er * 0.5], [pivot.x + side * (ex + er * 1.3), pivot.y - er * 0.2, pivot.z], glue, 10);
        blob.rotation.z = random();
      }
    }

    const free = a.condition === 'working' && a.mount !== 'loose';
    const base = rocker.rotation.x, energy = mood.energy;
    return s.finish({
      update: (_dt, time) => {
        if (!free || energy < 0.1) return;
        rocker.rotation.x = THREE.MathUtils.clamp(base + Math.sin(time * mix(0.5, 2.2, energy)) * mix(0.1, 0.5, energy), -0.05, 1.2);
      },
    });
  },
});
