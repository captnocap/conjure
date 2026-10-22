import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

type Point = [number, number, number];

export default defineThing({
  questions: {
    turn: choice('How is it turned to us?', {
      profile: 'In three-quarter profile: the white shield to one side, the gold body and boom trailing behind it.',
      hiding: 'Shield square to us, the craft hiding behind it: only antenna tips and panel edges peek out.',
      behind: 'From behind: instruments, dish and boom toward us, the shield a dark disc beyond.',
    }),
    shield: choice('What shape is the heat shield?', {
      disc: 'A thick round disc, white on the sunward face, black carbon at the edge.',
      hexagon: 'A flat hexagonal slab with chamfered black edges.',
      cone: 'A shallow white cone pointing at the sun, like a parasol.',
      square: 'A flat square shield with slots cut in it for the instruments to peer through.',
    }),
    panels: choice('Where are its solar panels?', {
      tucked: 'Swung back and tucked into the shield shadow, only their tips showing.',
      spread: 'Spread wide like wings, far from the sun where it is safe to.',
      lopsided: 'One tucked in, the other stuck out at an angle.',
    }),
    ordeal: choice('What has the sun done to it so far?', {
      unscathed: 'Nothing yet: clean white and gold, freshly launched.',
      glowing: 'It is at closest approach: the shield face glowing orange-white hot.',
      scarred: 'Struck by dust at enormous speed: the shield cracked and chipped, flakes drifting away.',
      failing: 'Failing: an antenna melted and drooping, a panel torn, the craft beginning to tumble.',
    }),
    body: choice('What is the body wrapped in?', {
      gold: 'Crinkled gold thermal foil.',
      black: 'Matte black blankets.',
      silver: 'Bright silver foil.',
    }),
    mount: choice('What holds it up?', {
      adrift: 'Nothing: it is out there, adrift in space.',
      stand: 'A museum display stand with a little plaque.',
      cradle: 'A yellow clean-room cradle on castors, waiting to be packed for launch.',
    }),
    whiskers: noul('Do its thin antennas stick out past the shield rim?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const jitter = (amount: number) => (random() - 0.5) * amount;
    const craft = new THREE.Group();
    s.root.add(craft);
    const add = (geometry: THREE.BufferGeometry, material: THREE.Material | THREE.Material[], at: Point = [0, 0, 0], parent: THREE.Object3D = craft) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...at);
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    const rod = (from: THREE.Vector3, to: THREE.Vector3, radius: number, material: THREE.Material, parent: THREE.Object3D = craft) => {
      const direction = to.clone().sub(from);
      const mesh = add(new THREE.CylinderGeometry(radius, radius, direction.length(), 8), material, from.clone().add(to).multiplyScalar(0.5).toArray() as Point, parent);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
      return mesh;
    };

    // ---- Materials. The craft points along +z: shield forward, boom trailing back. ----
    const scorch = mood.wear * 0.6 + (a.ordeal === 'glowing' ? 0.35 : a.ordeal === 'unscathed' ? 0 : 0.25);
    const hot = new THREE.Color().setHSL(mix(0.09, 0.04, mood.warmth), 1, 0.5);
    const faceCanvas = document.createElement('canvas');
    faceCanvas.width = faceCanvas.height = 256;
    const f = faceCanvas.getContext('2d')!;
    f.fillStyle = '#f4f2ec';
    f.fillRect(0, 0, 256, 256);
    // Scorch: a browned centre fading to white, with blisters.
    const burn = f.createRadialGradient(128, 128, 10, 128, 128, 128);
    burn.addColorStop(0, `rgba(120,70,30,${(scorch * 0.75).toFixed(3)})`);
    burn.addColorStop(0.6, `rgba(170,120,70,${(scorch * 0.35).toFixed(3)})`);
    burn.addColorStop(1, 'rgba(200,170,130,0)');
    f.fillStyle = burn;
    f.fillRect(0, 0, 256, 256);
    for (let i = 0; i < Math.round(scorch * 60); i++) {
      const angle = random() * 6.28, r = random() ** 0.7 * 100;
      f.fillStyle = `rgba(${random() < 0.5 ? '90,55,25' : '235,225,205'},${mix(0.25, 0.6, random()).toFixed(2)})`;
      f.beginPath();
      f.arc(128 + Math.cos(angle) * r, 128 + Math.sin(angle) * r, mix(1.5, 5, random()), 0, Math.PI * 2);
      f.fill();
    }
    if (a.ordeal === 'scarred' || a.ordeal === 'failing') {
      f.strokeStyle = 'rgba(40,30,25,0.85)';
      f.lineWidth = 1.6;
      for (let c = 0; c < 4; c++) {
        let x = 128 + jitter(80), y = 128 + jitter(80);
        f.beginPath();
        f.moveTo(x, y);
        for (let k = 0; k < 7; k++) { x += jitter(40); y += jitter(40); f.lineTo(x, y); }
        f.stroke();
      }
      for (let i = 0; i < 5; i++) {
        f.fillStyle = 'rgba(45,40,38,0.9)';
        f.beginPath();
        f.arc(128 + jitter(180), 128 + jitter(180), mix(3, 9, random()), 0, Math.PI * 2);
        f.fill();
      }
    }
    const faceMap = new THREE.CanvasTexture(faceCanvas);
    faceMap.colorSpace = THREE.SRGBColorSpace;
    const face = new THREE.MeshStandardMaterial({
      map: faceMap, roughness: 0.75,
      emissive: a.ordeal === 'glowing' ? hot : new THREE.Color('#000000'),
      emissiveMap: a.ordeal === 'glowing' ? faceMap : null,
      emissiveIntensity: a.ordeal === 'glowing' ? mix(0.6, 1.1, mood.energy) : 0,
    });
    const carbon = new THREE.MeshStandardMaterial({ color: '#2b2a2c', roughness: 0.8 });
    const backside = new THREE.MeshStandardMaterial({ color: '#4a4a4e', roughness: 0.85 });
    const foil = {
      gold: new THREE.MeshStandardMaterial({ color: '#d6a63a', metalness: 0.75, roughness: 0.32 }),
      black: new THREE.MeshStandardMaterial({ color: '#232326', metalness: 0.2, roughness: 0.7 }),
      silver: new THREE.MeshStandardMaterial({ color: '#cfd3d8', metalness: 0.85, roughness: 0.25 }),
    }[a.body];
    const titanium = new THREE.MeshStandardMaterial({ color: '#9ea4aa', metalness: 0.7, roughness: 0.4 });
    const white = new THREE.MeshStandardMaterial({ color: '#efeee8', roughness: 0.55 });
    const glowRod = new THREE.MeshStandardMaterial({ color: hot, emissive: hot.clone().multiplyScalar(0.85), emissiveIntensity: a.ordeal === 'glowing' ? 1.2 : 0.9, roughness: 0.6 });

    // ---- The heat shield. ----
    const R = 1.15, T = 0.12, Z = 0.78;
    const shield = new THREE.Group();
    shield.position.z = Z;
    craft.add(shield);
    if (a.shield === 'disc' || a.shield === 'hexagon') {
      const sides = a.shield === 'disc' ? 56 : 6;
      const slab = add(new THREE.CylinderGeometry(R, R * 0.97, T, sides), [carbon, face, backside], [0, 0, 0], shield);
      slab.rotation.x = Math.PI / 2;
      if (a.shield === 'hexagon') {
        slab.rotation.y = Math.PI / 6;
        // A chamfered black edge band.
        const band = add(new THREE.CylinderGeometry(R * 1.01, R * 1.01, T * 0.45, 6, 1, true), carbon, [0, 0, -T * 0.1], shield);
        band.rotation.set(Math.PI / 2, Math.PI / 6, 0);
      }
    } else if (a.shield === 'cone') {
      const profile = [new THREE.Vector2(0.001, 0.32), new THREE.Vector2(R * 0.4, 0.2), new THREE.Vector2(R, 0), new THREE.Vector2(R * 0.98, -T * 0.6), new THREE.Vector2(0.001, -T * 0.6)];
      const cone = add(new THREE.LatheGeometry(profile, 48), face, [0, 0, 0], shield);
      cone.rotation.x = Math.PI / 2;
      const rim = add(new THREE.TorusGeometry(R * 0.99, T * 0.3, 8, 56), carbon, [0, 0, -T * 0.2], shield);
      void rim;
      const back = add(new THREE.CircleGeometry(R * 0.98, 48), backside, [0, 0, -T * 0.62], shield);
      back.rotation.y = Math.PI;
    } else {
      const side = R * 1.75;
      add(new THREE.BoxGeometry(side, side, T), [carbon, carbon, carbon, carbon, face, backside], [0, 0, 0], shield);
      // Peep-holes: dark slots through the shield for instruments to look past.
      for (const [x, y] of [[-0.35, 0.45], [0.4, -0.3], [0.15, 0.55]] as const) {
        const slot = add(new THREE.BoxGeometry(0.16, 0.09, T * 1.04), carbon, [x * R, y * R, 0], shield);
        slot.castShadow = false;
      }
    }
    const shieldReach = a.shield === 'square' ? R * 1.2 : R;

    // ---- The truss and the body hiding behind it. ----
    const busR = 0.42, busFront = 0.36, busBack = -0.46;
    const bus = add(new THREE.CylinderGeometry(busR, busR, busFront - busBack, 6), foil, [0, 0, (busFront + busBack) / 2]);
    bus.rotation.x = Math.PI / 2;
    // Foil seams: thin dark bands round the body.
    for (const z of [busFront - 0.15, busBack + 0.2]) {
      const seam = add(new THREE.CylinderGeometry(busR * 1.01, busR * 1.01, 0.015, 6, 1, true), carbon, [0, 0, z]);
      seam.rotation.x = Math.PI / 2;
    }
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 + Math.PI / 6;
      rod(new THREE.Vector3(Math.cos(angle) * busR * 0.9, Math.sin(angle) * busR * 0.9, busFront), new THREE.Vector3(Math.cos(angle + 0.4) * R * 0.55, Math.sin(angle + 0.4) * R * 0.55, Z - T / 2), 0.018, titanium);
    }
    // Radiators on the upper truss.
    for (const side of [-1, 1]) {
      const radiator = add(new THREE.BoxGeometry(0.32, 0.02, 0.36), white, [side * 0.28, busR + 0.12, busFront + 0.1]);
      radiator.rotation.z = side * 0.35;
    }

    // ---- Solar panels on hinged arms. ----
    const cells = document.createElement('canvas');
    cells.width = 128;
    cells.height = 256;
    const c = cells.getContext('2d')!;
    c.fillStyle = '#b8bcc2';
    c.fillRect(0, 0, 128, 256);
    for (let x = 0; x < 4; x++) for (let y = 0; y < 10; y++) {
      c.fillStyle = (x + y) % 3 ? '#1c2c62' : '#22377a';
      c.fillRect(x * 32 + 2, y * 25.6 + 2, 28, 21.6);
    }
    const cellMap = new THREE.CanvasTexture(cells);
    cellMap.colorSpace = THREE.SRGBColorSpace;
    const panel = new THREE.MeshStandardMaterial({ map: cellMap, metalness: 0.45, roughness: 0.35, emissive: '#101c48', emissiveIntensity: 0.2 });
    const wings: THREE.Group[] = [];
    for (const side of [-1, 1]) {
      const hinge = new THREE.Group();
      hinge.position.set(side * busR * 0.95, 0, -0.02);
      craft.add(hinge);
      const mode = a.panels === 'lopsided' ? (side < 0 ? 'tucked' : 'spread') : a.panels;
      // Tucked panels sweep back along the body; spread ones stand out sideways.
      hinge.rotation.y = side * (mode === 'tucked' ? -1.25 : -0.12);
      const arm = add(new THREE.BoxGeometry(0.28, 0.035, 0.035), titanium, [side * 0.14, 0, 0], hinge);
      void arm;
      const length = 0.95;
      const torn = a.ordeal === 'failing' && side > 0;
      const wing = add(new THREE.BoxGeometry(length * (torn ? 0.55 : 1), 0.022, 0.4), panel, [side * (0.28 + length * (torn ? 0.55 : 1) / 2), 0, 0], hinge);
      wing.rotation.x = mode === 'tucked' ? 0.5 : 0.15;
      if (torn) {
        const shard = add(new THREE.BoxGeometry(0.28, 0.018, 0.32), panel, [side * (0.28 + length * 0.75), 0.06, 0.08], hinge);
        shard.rotation.set(0.8, 0.4, side * 0.6);
      }
      wings.push(hinge);
    }

    // ---- Instruments, dish and boom. ----
    const dish = add(new THREE.SphereGeometry(0.34, 24, 10, 0, Math.PI * 2, 0, 0.62), new THREE.MeshStandardMaterial({ color: '#f1f0ea', roughness: 0.5, side: THREE.DoubleSide }), [0, -0.12, busBack - 0.3 - 0.34]);
    // Convex side to the body, the bowl opening backward toward home.
    dish.rotation.x = Math.PI / 2;
    rod(new THREE.Vector3(0, -0.12, busBack), new THREE.Vector3(0, -0.12, busBack - 0.3), 0.03, titanium);
    const boomEnd = new THREE.Vector3(0, busR * 0.7, -2.5);
    rod(new THREE.Vector3(0, busR * 0.7, busBack), boomEnd, 0.016, carbon);
    for (const t of [0.45, 0.75, 1]) {
      add(new THREE.BoxGeometry(0.07, 0.07, 0.09), t === 1 ? white : foil, new THREE.Vector3(0, busR * 0.7, busBack).lerp(boomEnd, t).toArray() as Point);
    }
    // The sun-facing cup peeking round the rim.
    const cupAngle = -Math.PI / 2 + 0.5;
    const cupAt = new THREE.Vector3(Math.cos(cupAngle) * (shieldReach + 0.05), Math.sin(cupAngle) * (shieldReach + 0.05), Z + 0.08);
    rod(new THREE.Vector3(Math.cos(cupAngle) * busR, Math.sin(cupAngle) * busR, busFront), cupAt, 0.015, titanium);
    const cup = add(new THREE.CylinderGeometry(0.075, 0.05, 0.12, 16, 1, true), glowRod, cupAt.toArray() as Point);
    cup.rotation.x = Math.PI / 2;

    // ---- Antennas poking past the rim: dark in the shadow, glowing where the sun reaches. ----
    if (a.whiskers) {
      for (let i = 0; i < 4; i++) {
        const angle = Math.PI / 4 + (i / 4) * Math.PI * 2 + jitter(0.15);
        const out = new THREE.Vector3(Math.cos(angle), Math.sin(angle), 0.18).normalize();
        const root = new THREE.Vector3(Math.cos(angle) * R * 0.7, Math.sin(angle) * R * 0.7, Z - T);
        const rim = root.clone().addScaledVector(out, (shieldReach - R * 0.7) * 1.05);
        let tip = root.clone().addScaledVector(out, 2.0);
        if (a.ordeal === 'failing' && i === 1) tip = rim.clone().add(new THREE.Vector3(Math.cos(angle) * 0.4, -0.7, 0.2));
        rod(root, rim, 0.02, carbon);
        rod(rim, tip, 0.02, glowRod);
      }
    }

    // ---- The glint on the shield rim. ----
    const glint = new THREE.Group();
    const spark = new THREE.MeshBasicMaterial({ color: '#fff3b8' });
    // Three crossed rays, so the star reads from any side.
    for (const [sx, sy, sz] of [[1, 0.05, 0.05], [0.05, 1, 0.05], [0.05, 0.05, 1]] as const) {
      const ray = add(new THREE.OctahedronGeometry(0.5, 0), spark, [0, 0, 0], glint);
      ray.scale.set(sx * 0.62, sy * 0.62, sz * 0.62);
      ray.castShadow = false;
    }
    const glintAngle = Math.PI / 3 + jitter(0.4);
    glint.position.set(Math.cos(glintAngle) * shieldReach * 1.01, Math.sin(glintAngle) * shieldReach * 1.01, Z);
    craft.add(glint);

    // ---- Dust flakes shed from a struck or failing shield. ----
    if (a.ordeal === 'scarred' || a.ordeal === 'failing') {
      const count = 14 + Math.round(mood.density * 12);
      const flakes = new THREE.InstancedMesh(new THREE.TetrahedronGeometry(1, 0), white, count);
      const matrix = new THREE.Matrix4();
      for (let i = 0; i < count; i++) {
        const angle = random() * 6.28, r = shieldReach * mix(0.9, 1.6, random());
        const size = mix(0.02, 0.06, random());
        matrix.makeRotationFromEuler(new THREE.Euler(random() * 6, random() * 6, 0)).scale(new THREE.Vector3(size, size, size)).setPosition(Math.cos(angle) * r, Math.sin(angle) * r, Z - mix(0, 1.2, random()));
        flakes.setMatrixAt(i, matrix);
      }
      flakes.castShadow = true;
      craft.add(flakes);
    }

    // ---- Turned toward the viewer, then mounted. ----
    const side = random() < 0.5 ? -1 : 1;
    craft.rotation.order = 'YXZ';
    craft.rotation.y = { profile: side * 1.05, hiding: side * 0.18, behind: Math.PI + side * 0.6 }[a.turn];
    craft.rotation.x = a.ordeal === 'failing' ? 0.45 : jitter(0.12);
    craft.rotation.z = a.ordeal === 'failing' ? 0.6 : jitter(0.2);
    const metal = new THREE.MeshStandardMaterial({ color: '#3a3b3e', metalness: 0.6, roughness: 0.4 });
    if (a.mount === 'stand') {
      craft.position.y = 1.75;
      s.cylinder(0.6, 0.66, 0.08, [0, 0.04, 0], s.material('#2c2c30', { roughness: 0.5 }), 40);
      s.cylinder(0.045, 0.06, 1.75 - busR * 0.6, [0, (1.75 - busR * 0.6) / 2, 0], metal, 16);
      const plaque = s.label('SOLAR PROBE', 0.36, 0.08, [0, 0.11, 0.6], '#3a2a12', '#c9a44a');
      plaque.rotation.x = -0.6;
    } else if (a.mount === 'cradle') {
      craft.position.y = 1.45;
      const yellow = s.material('#e3b21c', { roughness: 0.5 });
      s.box([2.0, 0.08, 1.2], [0, 0.22, 0], yellow);
      for (const x of [-0.85, 0.85]) for (const z of [-0.5, 0.5]) {
        s.cylinder(0.025, 0.025, 0.12, [x, 0.14, z], metal, 8);
        const wheel = s.cylinder(0.07, 0.07, 0.05, [x, 0.07, z], s.material('#1e1e20'), 16);
        wheel.rotation.x = Math.PI / 2;
      }
      for (const x of [-0.5, 0.5]) s.box([0.08, 1.45 - 0.26 - busR * 0.4, 0.08], [x, 0.26 + (1.45 - 0.26 - busR * 0.4) / 2, 0], yellow);
      s.box([1.08, 0.08, 0.1], [0, 1.45 - busR * 0.55, 0], yellow);
      // A red REMOVE BEFORE FLIGHT tag on a ribbon.
      const tag = s.label('REMOVE BEFORE FLIGHT', 0.42, 0.07, [0.5, 0.9, 0.06], '#ffffff', '#c41e1e');
      tag.rotation.z = 0.1;
    }
    craft.updateMatrixWorld(true);

    const pace = mix(0.05, 0.6, mood.energy);
    const tumble = a.ordeal === 'failing' ? 1 : a.mount === 'adrift' ? 0.15 : 0;
    const baseZ = craft.rotation.z;
    return s.finish({
      footprint: a.mount === 'adrift' ? 1.1 : a.mount === 'stand' ? 0.66 : 1.0,
      update: (_dt, time) => {
        const flash = 0.6 + 0.4 * Math.max(0, Math.sin(time * mix(0.6, 2.5, mood.energy)));
        glint.scale.setScalar(mix(0.7, 1.15, mood.cheer) * flash);
        glint.rotation.z = time * 0.2;
        craft.rotation.z = baseZ + Math.sin(time * pace) * 0.05 * tumble;
        if (a.ordeal === 'glowing') face.emissiveIntensity = mix(0.6, 1.1, mood.energy) * (0.92 + 0.08 * Math.sin(time * 1.7));
      },
    });
  },
});
