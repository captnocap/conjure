import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';
import { SKULL, SOCKET, buildSkull, strands, surface } from './skull';

export default defineThing({
  questions: {
    gag: choice('What has been jammed into its mouth?', {
      brick: 'Half a red clay brick, forcing the jaws wide.',
      stone: 'A rough grey river stone the size of a fist.',
      sickle: 'An iron sickle laid across the throat, blade inward, so it would cut itself if it rose.',
      coin: 'A single coin clenched between the front teeth.',
      garlic: 'A whole bulb of garlic, papery and white.',
      horseshoe: 'A rusty iron horseshoe hooked over the lower jaw.',
    }),
    fangs: score('How long are its canine teeth?', ['Perfectly ordinary', 'A little long, if you are nervous', 'Pointed and suspicious', 'Unmistakable curved fangs']),
    hold: choice('Is the gag still holding?', {
      firm: 'Wedged tight, exactly as the gravediggers left it.',
      slipping: 'Worked loose and tilting out of the mouth.',
      fallen: 'Fallen out onto the soil, the jaws beginning to close.',
    }),
    wards: choice('What else was done to keep it down?', {
      none: 'Nothing more.',
      stake: 'A wooden stake driven into the earth where the chest would be.',
      nails: 'Iron nails hammered into the crown of the skull.',
      crucifix: 'A small iron crucifix pressed against the brow.',
      chain: 'A heavy chain dragged over the forehead and pegged down.',
    }),
    buried: score('How much of it is still in the ground?', ['Lying free on top of the spoil', 'Sunk to the jaw hinge', 'Half buried, face upturned', 'Only the face and the gag show']),
    damage: choice('What state is the bone in?', {
      intact: 'Whole and smooth.',
      cracked: 'A long crack running from brow to temple.',
      holed: 'A fist-sized hole broken through one temple.',
      rooted: 'Laced with fine tree roots that have grown across it.',
    }),
    soil: choice('What is it buried in?', {
      loam: 'Dark wet graveyard loam.',
      lime: 'Chalky white quicklime from a plague pit.',
      sand: 'Pale lagoon sand and shell.',
      ash: 'Grey ash and cinders.',
    }),
    glow: noul('Is there a faint ember of light deep in the eye sockets?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const g = new THREE.Group();
    g.scale.setScalar(SKULL.unit);
    s.root.add(g);
    const jitter = (amount: number) => (random() - 0.5) * 2 * amount;
    const mesh = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, at: [number, number, number] = [0, 0, 0]) => {
      const m = new THREE.Mesh(geometry, material);
      m.position.set(...at);
      m.castShadow = m.receiveShadow = true;
      parent.add(m);
      return m;
    };

    const soilColour = { loam: '#4f3f31', lime: '#cfcabb', sand: '#c9b88e', ash: '#7c7a78' }[a.soil];
    const boneColour = new THREE.Color('#ddcfa9').lerp(new THREE.Color(soilColour), 0.18 + mood.wear * 0.2).lerp(new THREE.Color(mood.warmth > 0.5 ? '#d6b27a' : '#c5c9c0'), Math.abs(mood.warmth - 0.5) * 0.7);
    const wide = { brick: 0.78, stone: 0.7, sickle: 0.16, coin: 0.2, garlic: 0.55, horseshoe: 0.42 }[a.gag];
    const gape = a.hold === 'fallen' ? 0.16 : a.hold === 'slipping' ? wide * 0.85 : wide;
    const skull = buildSkull({
      bone: boneColour, hollow: '#1f1713', stain: soilColour, blotch: mix(0.35, 1, mood.wear), random,
      jaw: 'open', gape, fang: a.fangs,
      upper: (i) => i === 3 || i === 8 || random() > 0.12 + mood.wear * 0.25,
      lower: (i) => i === 3 || i === 8 || random() > 0.15 + mood.wear * 0.25,
    });
    const head = new THREE.Group();
    head.add(skull.root);
    g.add(head);
    const lean = mix(-0.25, -0.62, a.buried);
    head.rotation.set(lean, jitter(0.3), jitter(0.12));
    const iron = new THREE.MeshStandardMaterial({ color: new THREE.Color('#4a4644').lerp(new THREE.Color('#8a4a2a'), 0.25 + mood.wear * 0.5), roughness: 0.75, metalness: 0.5 });
    const wood = s.material('#8a6a44', { roughness: 0.9 });

    // The gag, built in skull space at the mouth; moved out if it has slipped or fallen.
    const gagGroup = new THREE.Group();
    const mouth = new THREE.Vector3(0, -1.02 - Math.sin(gape) * 0.38, 0.66);
    if (a.gag === 'brick') {
      const clay = new THREE.MeshStandardMaterial({ color: new THREE.Color('#a8492f').lerp(new THREE.Color(soilColour), 0.15), roughness: 0.95 });
      mesh(gagGroup, new THREE.BoxGeometry(0.72, 0.46, 1.25), clay);
      const broken = mesh(gagGroup, new THREE.DodecahedronGeometry(0.34), clay, [0.05, 0, 0.62]);
      broken.scale.set(1.05, 0.68, 0.7);
      for (let i = 0; i < 3; i++) mesh(gagGroup, new THREE.SphereGeometry(0.06, 6, 4), new THREE.MeshStandardMaterial({ color: '#6d2d1c', roughness: 1 }), [jitter(0.25), 0.235, jitter(0.4) + 0.2]).scale.y = 0.3;
    } else if (a.gag === 'stone') {
      const rock = mesh(gagGroup, new THREE.DodecahedronGeometry(0.5, 1), s.material('#8b8c88', { roughness: 1, flatShading: true }));
      rock.scale.set(0.95, 0.72, 1.15);
      rock.rotation.set(jitter(0.5), jitter(1), jitter(0.5));
    } else if (a.gag === 'coin') {
      const coin = mesh(gagGroup, new THREE.CylinderGeometry(0.2, 0.2, 0.035, 20), new THREE.MeshStandardMaterial({ color: '#d9ae45', metalness: 0.9, roughness: 0.3, emissive: '#5a4208', emissiveIntensity: 0.6 }), [0, 0.02, 0.16]);
      coin.rotation.x = Math.PI / 2 - 0.5;
    } else if (a.gag === 'garlic') {
      const paper = new THREE.MeshStandardMaterial({ color: '#efe9da', roughness: 0.8 });
      for (let i = 0; i < 7; i++) {
        const clove = mesh(gagGroup, new THREE.SphereGeometry(1, 10, 8), paper, [Math.sin(i * 0.9) * 0.16, 0, 0.1 + Math.cos(i * 0.9) * 0.16]);
        clove.scale.set(0.2, 0.3, 0.2);
      }
      mesh(gagGroup, new THREE.ConeGeometry(0.07, 0.34, 6), s.material('#b9ad8a'), [0, 0.36, 0.1]);
    } else if (a.gag === 'horseshoe') {
      const shoe = mesh(gagGroup, new THREE.TorusGeometry(0.42, 0.075, 6, 18, Math.PI * 1.25), iron, [0, -0.1, 0.12]);
      shoe.rotation.set(-0.3, 0, -Math.PI * 0.125 - Math.PI / 2 + Math.PI);
      shoe.scale.z = 0.6;
    } else {
      const blade = mesh(gagGroup, new THREE.TorusGeometry(0.95, 0.07, 4, 24, Math.PI * 1.05), iron, [0.2, -0.62, -0.5]);
      blade.rotation.set(Math.PI / 2, 0, -0.25);
      blade.scale.z = 0.25;
      const handle = mesh(gagGroup, new THREE.CylinderGeometry(0.075, 0.09, 0.95, 8), wood, [1.58, -0.62, -0.42]);
      handle.rotation.z = Math.PI / 2 - 0.35;
      handle.rotation.y = 0.5;
    }
    const gagFallen = a.hold === 'fallen' && a.gag !== 'sickle';
    if (!gagFallen) {
      gagGroup.position.copy(mouth);
      gagGroup.rotation.x = gape * 0.5 + (a.hold === 'slipping' ? 0.42 : 0);
      if (a.hold === 'slipping') { gagGroup.position.add(new THREE.Vector3(0.12, -0.12, 0.3)); gagGroup.rotation.z = 0.28; gagGroup.rotation.y = 0.2; }
      skull.root.add(gagGroup);
    }

    // Wards fixed to the skull.
    if (a.wards === 'nails') {
      const count = 3 + Math.floor(random() * 3);
      for (let i = 0; i < count; i++) {
        const d = new THREE.Vector3(jitter(0.6), 0.75, 0.25 + jitter(0.4)).normalize();
        const nail = new THREE.Group();
        mesh(nail, new THREE.CylinderGeometry(0.035, 0.02, 0.6, 6), iron, [0, 0.1, 0]);
        mesh(nail, new THREE.CylinderGeometry(0.09, 0.09, 0.04, 8), iron, [0, 0.41, 0]);
        nail.position.copy(surface(d));
        nail.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().add(new THREE.Vector3(jitter(0.3), 0, jitter(0.3))).normalize());
        skull.root.add(nail);
      }
    } else if (a.wards === 'crucifix') {
      const cross = new THREE.Group();
      mesh(cross, new THREE.BoxGeometry(0.1, 0.75, 0.05), iron);
      mesh(cross, new THREE.BoxGeometry(0.46, 0.1, 0.05), iron, [0, 0.14, 0]);
      const d = new THREE.Vector3(0.05, 0.42, 0.9).normalize();
      cross.position.copy(surface(d, 1.04));
      cross.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), d);
      cross.rotateZ(jitter(0.3));
      skull.root.add(cross);
    }

    // Damage.
    const dark = new THREE.MeshStandardMaterial({ color: '#1c1512', roughness: 1 });
    if (a.damage === 'cracked' || a.damage === 'holed') {
      const side = random() < 0.5 ? -1 : 1;
      const lines: THREE.Vector3[][] = [];
      const crack = (from: THREE.Vector3, to: THREE.Vector3, steps: number) => {
        const points: THREE.Vector3[] = [];
        for (let i = 0; i <= steps; i++) points.push(surface(from.clone().lerp(to, i / steps).add(new THREE.Vector3(jitter(0.06), jitter(0.06), jitter(0.06))), 1.004));
        lines.push(points);
      };
      const temple = new THREE.Vector3(side * 0.72, 0.38, 0.5);
      if (a.damage === 'cracked') {
        crack(new THREE.Vector3(side * 0.12, 0.25, 0.95), new THREE.Vector3(side * 0.85, 0.5, -0.1), 9);
        crack(new THREE.Vector3(side * 0.5, 0.42, 0.7), new THREE.Vector3(side * 0.3, 0.9, 0.2), 5);
      } else {
        const hole = mesh(skull.root, new THREE.SphereGeometry(1, 9, 6), dark);
        const centre = temple.clone().normalize();
        hole.position.copy(surface(centre, 0.985));
        hole.scale.set(0.3, 0.26, 0.07);
        hole.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), centre);
        for (let i = 0; i < 6; i++) {
          const angle = i * 1.05 + random();
          crack(temple, temple.clone().add(new THREE.Vector3(0, Math.sin(angle) * 0.55, Math.cos(angle) * 0.55)), 4);
        }
      }
      skull.root.add(strands(lines, 0.014, dark, 3));
    } else if (a.damage === 'rooted') {
      const rootMat = new THREE.MeshStandardMaterial({ color: '#5b4632', roughness: 0.9 });
      const lines: THREE.Vector3[][] = [];
      for (let i = 0; i < 9; i++) {
        const d = new THREE.Vector3(jitter(0.9), 0.2 + random() * 0.7, jitter(0.7)).normalize();
        const drift = new THREE.Vector3(jitter(0.25), -0.2, jitter(0.25));
        const points: THREE.Vector3[] = [];
        for (let k = 0; k < 8; k++) { points.push(surface(d, 1.02)); d.add(drift).add(new THREE.Vector3(jitter(0.12), 0, jitter(0.12))).normalize(); }
        lines.push(points);
      }
      skull.root.add(strands(lines, 0.022, rootMat, 4));
    }

    // Glow.
    let embers: THREE.MeshStandardMaterial | null = null;
    if (a.glow) {
      embers = new THREE.MeshStandardMaterial({ color: '#ff5a2a', emissive: mood.warmth > 0.35 ? '#ff3b12' : '#7fe0ff', emissiveIntensity: 2.5 });
      for (const side of [-1, 1]) mesh(skull.root, new THREE.SphereGeometry(0.075, 10, 8), embers, [side * SOCKET[0], SOCKET[1], SOCKET[2] - 0.2]).castShadow = false;
    }

    // Seat it in the soil.
    s.root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(skull.cranium);
    if (skull.jaw) box.expandByObject(skull.jaw);
    const bottom = box.min.y / SKULL.unit, topY = box.max.y / SKULL.unit;
    const soilTop = bottom + mix(0.08, (topY - bottom) * 0.56, a.buried);
    const earth = new THREE.MeshStandardMaterial({ color: new THREE.Color(soilColour).multiplyScalar(mix(1, 0.8, mood.wear * 0.5)), roughness: 1, flatShading: true });
    const moundGeo = new THREE.CylinderGeometry(2.0, 2.35, 0.9, 22, 1);
    const mp = moundGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < mp.count; i++) if (mp.getY(i) > 0) mp.setY(i, mp.getY(i) + jitter(0.07));
    mesh(g, moundGeo, earth, [0, soilTop - 0.45, 0.3]);
    const clodGeo = new THREE.DodecahedronGeometry(1, 0);
    const clodCount = Math.round(mix(26, 70, mood.density));
    const clods = new THREE.InstancedMesh(clodGeo, earth, clodCount);
    const matrix = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    for (let i = 0; i < clodCount; i++) {
      const angle = random() * Math.PI * 2, r = mix(0.95, 1.9, Math.sqrt(random()));
      const size = mix(0.1, 0.34, random());
      q.setFromEuler(e.set(random() * 3, random() * 3, random() * 3));
      matrix.compose(new THREE.Vector3(Math.sin(angle) * r, soilTop + size * 0.2, 0.3 + Math.cos(angle) * r), q, new THREE.Vector3(size, size * 0.7, size));
      clods.setMatrixAt(i, matrix);
    }
    clods.castShadow = clods.receiveShadow = true;
    g.add(clods);
    if (a.soil === 'sand') for (let i = 0; i < 6; i++) {
      const shell = mesh(g, new THREE.SphereGeometry(0.16, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), s.material('#efe3cf'), [jitter(1.5), soilTop + 0.02, 0.3 + jitter(1.5)]);
      shell.rotation.set(jitter(0.5), random() * 6, jitter(0.5));
    }
    if (a.soil === 'ash') for (let i = 0; i < 8; i++) mesh(g, new THREE.DodecahedronGeometry(mix(0.08, 0.2, random())), new THREE.MeshStandardMaterial({ color: '#2a2625', roughness: 1, emissive: '#ff4a12', emissiveIntensity: i % 3 === 0 ? mix(0.2, 1.4, mood.warmth) : 0 }), [jitter(1.5), soilTop + 0.05, 0.3 + jitter(1.5)]);

    if (gagFallen) {
      gagGroup.position.set(0.4 + jitter(0.3), soilTop + 0.25, 1.75);
      gagGroup.rotation.set(0.15, 0.7 + jitter(0.5), a.gag === 'coin' ? 0 : 0.2);
      if (a.gag === 'coin') gagGroup.rotation.x = 0.5 - Math.PI / 2 + 0.1;
      g.add(gagGroup);
    }
    if (a.wards === 'stake') {
      const stake = new THREE.Group();
      mesh(stake, new THREE.CylinderGeometry(0.14, 0.13, 2.6, 7), wood, [0, 1.3, 0]);
      mesh(stake, new THREE.CylinderGeometry(0.17, 0.14, 0.12, 7), s.material('#6d5235'), [0, 2.62, 0]);
      stake.position.set(1.35, soilTop - 0.5, 1.1);
      stake.rotation.set(0.28, 0, -0.22 + jitter(0.1));
      g.add(stake);
    } else if (a.wards === 'chain') {
      const link = new THREE.TorusGeometry(0.13, 0.04, 5, 10);
      const points: THREE.Vector3[] = [];
      for (let i = 0; i <= 22; i++) {
        const t = i / 22, x = mix(-1.8, 1.8, t);
        const over = surface(new THREE.Vector3(mix(-1, 1, t), 0.75, 0.55), 1.06).applyEuler(head.rotation).add(head.position);
        const yGround = soilTop + 0.08;
        const blend = Math.min(1, Math.max(0, (Math.abs(x) - 0.75) / 1.1));
        points.push(new THREE.Vector3(x * (1 - (1 - blend) * 0.25), mix(over.y, yGround, blend * blend), mix(over.z, over.z + 0.5, blend)));
      }
      const chain = new THREE.InstancedMesh(link, iron, points.length);
      points.forEach((at, i) => {
        q.setFromEuler(e.set(i % 2 ? Math.PI / 2 : 0, 0.3, i % 2 ? 0 : Math.PI / 2));
        matrix.compose(at, q, new THREE.Vector3(1, 1, 1));
        chain.setMatrixAt(i, matrix);
      });
      chain.castShadow = true;
      g.add(chain);
      for (const x of [-1.8, 1.8]) mesh(g, new THREE.CylinderGeometry(0.07, 0.04, 0.7, 6), iron, [x, soilTop + 0.15, points[0].z]);
    }

    const pulse = mix(0.6, 5, mood.energy);
    return s.finish({
      update: embers ? (_dt, time) => { embers!.emissiveIntensity = 2.2 + Math.sin(time * pulse) * 1.1; } : undefined,
    });
  },
});
// seated in a tighter mound
// tighter mound.
