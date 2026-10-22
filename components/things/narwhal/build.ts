import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

const LENGTH = 4.4;
const GIRTH: [number, number][] = [[0, 0.02], [0.02, 0.17], [0.06, 0.29], [0.13, 0.37], [0.24, 0.44], [0.38, 0.47], [0.52, 0.43], [0.66, 0.34], [0.8, 0.21], [0.92, 0.1], [1, 0.07]];
const girth = (t: number) => {
  for (let i = 1; i < GIRTH.length; i++) if (t <= GIRTH[i][0]) { const [t0, r0] = GIRTH[i - 1], [t1, r1] = GIRTH[i]; return r0 + (r1 - r0) * (t - t0) / (t1 - t0); }
  return 0.07;
};

export default defineThing({
  questions: {
    count: choice('How many narwhals are there?', {
      one: 'One, alone in the lead.',
      pair: 'Two together; if they are raising tusks, the tusks cross like swords.',
      pod: 'A small pod surfacing side by side, backs and tusks in a row.',
    }),
    doing: choice('What is it doing at the surface?', {
      tusking: 'Head lifted out at an angle, tusk raised into the air.',
      logging: 'Lying still along the surface, back awash, tusk resting just above the water.',
      breaching: 'Driving up out of the water, half its body clear, spray flying.',
      diving: 'Going down: only the tail flukes are left above the water.',
    }),
    tusk: choice('What is the tusk like?', {
      short: 'A modest tusk about a metre long.',
      long: 'A fine long tusk, two metres of spiralled ivory.',
      giant: 'An extraordinary tusk nearly as long as the animal.',
      double: 'Two tusks side by side, the rare double-tusked narwhal.',
      broken: 'Snapped off short, a blunt stump.',
      none: 'No tusk at all: a female or a calf.',
    }),
    skin: choice('How is it marked?', {
      mottled: 'Classic leopard mottling, dark blotches over a pale ground.',
      ghost: 'Old and nearly white, only faint freckles left.',
      dark: 'Young and dark, slate blue-grey all over.',
    }),
    lead: choice('What sort of opening in the ice is it?', {
      crack: 'A long narrow lead, a dark crack between two floes.',
      hole: 'A single breathing hole in unbroken ice, barely big enough.',
      open: 'Wide open water with loose brash ice drifting in it.',
    }),
    blow: noul('Is it blowing a puff of mist?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;

    // Skin: painted once, wrapped round every body. Back at the middle of the texture, belly at its edges.
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    const c = canvas.getContext('2d')!;
    const ground = { mottled: '#e2e3dc', ghost: '#f1f2ec', dark: '#8494a3' }[a.skin];
    const spot = { mottled: '#2f3438', ghost: '#9a9f9f', dark: '#27323e' }[a.skin];
    c.fillStyle = ground; c.fillRect(0, 0, 256, 256);
    const shade = c.createLinearGradient(0, 0, 256, 0);
    const backTone = { mottled: 'rgba(60,66,72,0.55)', ghost: 'rgba(150,156,158,0.3)', dark: 'rgba(30,40,52,0.75)' }[a.skin];
    shade.addColorStop(0, 'rgba(255,255,255,0.5)'); shade.addColorStop(0.3, 'rgba(255,255,255,0)'); shade.addColorStop(0.5, backTone); shade.addColorStop(0.7, 'rgba(255,255,255,0)'); shade.addColorStop(1, 'rgba(255,255,255,0.5)');
    c.fillStyle = shade; c.fillRect(0, 0, 256, 256);
    const blotches = { mottled: 520, ghost: 130, dark: 240 }[a.skin];
    c.fillStyle = spot;
    for (let i = 0; i < blotches; i++) {
      const u = 0.5 + (random() + random() + random() - 1.5) * 0.36;
      c.globalAlpha = 0.35 + random() * 0.5;
      c.beginPath(); c.ellipse(u * 256, random() * 256, 1.5 + random() * 4.5, 2 + random() * 6, random() * 3, 0, 7); c.fill();
    }
    c.globalAlpha = 1;
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    const skin = new THREE.MeshStandardMaterial({ map, roughness: 0.28, metalness: 0.05 });
    const ivory = new THREE.MeshStandardMaterial({ color: '#efe6cb', roughness: 0.55, flatShading: true });
    const black = new THREE.MeshStandardMaterial({ color: '#111315', roughness: 0.4 });
    const foam = new THREE.MeshBasicMaterial({ color: '#f4fbff', transparent: true, opacity: 0.4, depthWrite: false });
    const owned: (THREE.Material | THREE.Texture)[] = [map, skin, ivory, black, foam];

    const put = (group: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = mesh.receiveShadow = material !== foam;
      group.add(mesh);
      return mesh;
    };
    const tuskLength = { short: 1.1, long: 2.0, giant: 2.9, double: 1.9, broken: 0.5, none: 0 }[a.tusk];
    const tuskGeometry = (length: number, blunt: boolean) => {
      const geometry = new THREE.CylinderGeometry(blunt ? 0.04 : 0.009, 0.055, length, 6, Math.max(6, Math.round(length * 14)));
      const at = geometry.getAttribute('position');
      for (let i = 0; i < at.count; i++) {
        const twist = (at.getY(i) / length) * length * 5.5, x = at.getX(i), z = at.getZ(i);
        at.setXYZ(i, x * Math.cos(twist) - z * Math.sin(twist), at.getY(i), x * Math.sin(twist) + z * Math.cos(twist));
      }
      geometry.computeVertexNormals();
      return geometry.rotateX(Math.PI / 2).translate(0, 0, length / 2);
    };
    const flukeShape = new THREE.Shape();
    flukeShape.moveTo(0, 0.12); flukeShape.quadraticCurveTo(0.3, 0.14, 0.62, -0.2); flukeShape.quadraticCurveTo(0.3, -0.2, 0, -0.3); flukeShape.quadraticCurveTo(-0.3, -0.2, -0.62, -0.2); flukeShape.quadraticCurveTo(-0.3, 0.14, 0, 0.12);
    const flukeGeometry = new THREE.ExtrudeGeometry(flukeShape, { depth: 0.05, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 1 }).translate(0, 0, -0.025).rotateX(Math.PI / 2);

    const extent = { x0: -0.8, x1: 0.8, z0: -0.6, z1: 0.6 };
    const reach = (x: number, z: number, pad = 0.5) => { extent.x0 = Math.min(extent.x0, x - pad); extent.x1 = Math.max(extent.x1, x + pad); extent.z0 = Math.min(extent.z0, z - pad); extent.z1 = Math.max(extent.z1, z + pad); };
    const rings: { mesh: THREE.Mesh; phase: number; size: number }[] = [];
    const ripple = (x: number, z: number, size: number) => {
      for (let i = 0; i < 1; i++) {
        const mesh = put(s.root, new THREE.RingGeometry(0.93, 1, 28).rotateX(-Math.PI / 2), foam);
        mesh.position.set(x, 0.012 + i * 0.002, z);
        rings.push({ mesh, phase: i / 2 + random() * 0.2, size });
      }
    };
    const puffs: { mesh: THREE.Mesh; origin: THREE.Vector3; offset: number }[] = [];

    type Mode = 'tusking' | 'logging' | 'breaching' | 'diving';
    /** (x, z) is where the animal breaks the surface; yaw 0 faces +z. */
    const animal = (x: number, z: number, yaw: number, mode: Mode, tusk: number, size = 1, pitchBias = 0) => {
      const holder = new THREE.Group();
      holder.position.set(x, 0, z);
      holder.rotation.y = yaw;
      holder.scale.setScalar(size);
      s.root.add(holder);
      const world = (lz: number, lx = 0) => { const p = new THREE.Vector3(lx, 0, lz).multiplyScalar(size).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw); return [x + p.x, z + p.z] as const; };
      if (mode === 'diving') {
        const stock = put(holder, new THREE.CylinderGeometry(0.075, 0.2, 0.9, 12), skin);
        stock.position.set(0, 0.25, 0); stock.rotation.x = 0.35;
        const flukes = put(holder, flukeGeometry, skin);
        flukes.position.set(0, 0.72, 0.2); flukes.rotation.x = -1.0 + (random() - 0.5) * 0.3; flukes.scale.setScalar(1.15);
        ripple(x, z, 0.9 * size);
        reach(...world(0), 0.9);
        return;
      }
      const pitch = (mode === 'tusking' ? mix(0.48, 0.66, random()) : mode === 'breaching' ? mix(0.95, 1.15, random()) : 0.035) + pitchBias;
      const out = mode === 'tusking' ? 1.9 : mode === 'breaching' ? 2.5 : 0;
      const cut = mode === 'tusking' ? 2.4 : mode === 'breaching' ? 3.0 : LENGTH;
      const body = new THREE.Group();
      body.rotation.x = -pitch;
      body.position.set(0, mode === 'logging' ? -0.22 : Math.sin(pitch) * out, mode === 'logging' ? 1.5 : Math.cos(pitch) * out);
      holder.add(body);
      const profile: THREE.Vector2[] = [];
      const steps = 26;
      for (let i = 0; i <= steps; i++) { const d = i / steps * cut; profile.push(new THREE.Vector2(girth(d / LENGTH), -d)); }
      profile.push(new THREE.Vector2(0.001, -cut));
      put(body, new THREE.LatheGeometry(profile, 22).rotateX(Math.PI / 2), skin);
      // Low dorsal ridge instead of a fin, small flippers, dark eyes.
      for (const side of [-1, 1]) {
        const flipper = put(body, new THREE.SphereGeometry(1, 10, 6), skin);
        flipper.scale.set(0.22, 0.035, 0.13); flipper.position.set(side * 0.44, -0.2, -1.05); flipper.rotation.set(0, side * 0.5, side * -0.5);
        const eye = put(body, new THREE.SphereGeometry(0.022, 6, 5), black);
        eye.position.set(side * 0.3, 0.03, -0.36);
      }
      if (tusk > 0) {
        const pairs = a.tusk === 'double' ? [-0.07, 0.07] : [-0.05];
        for (const offset of pairs) {
          const horn = put(body, tuskGeometry(tusk, a.tusk === 'broken'), ivory);
          horn.position.set(offset, 0.02, -0.06); horn.rotation.set(-0.03, offset * 0.6, 0);
        }
      }
      if (mode === 'logging') {
        const flukes = put(body, flukeGeometry, skin);
        flukes.position.set(0, 0.05, -LENGTH - 0.05); flukes.rotation.x = -0.25; flukes.scale.setScalar(1.1);
        reach(...world(1.5 + tusk * 0.9), 0.15); reach(...world(1.5 - LENGTH - 0.3), 0.3); reach(...world(0, 0.6), 0.2); reach(...world(0, -0.6), 0.2);
        ripple(...world(0.6), 1.1 * size);
      } else {
        const tip = out + tusk;
        reach(...world(Math.cos(pitch) * tip), 0.15); reach(...world(-0.75), 0.4);
        ripple(...world(-0.1), (mode === 'breaching' ? 1.25 : 0.85) * size);
        if (mode === 'breaching') {
          const drops = Array.from({ length: Math.round(mix(18, 46, mood.energy)) }, () => { const angle = random() * 6.283, r = 0.5 + random() * 0.75; return { at: [Math.cos(angle) * r, 0.05 + random() ** 2 * 1.2, Math.sin(angle) * r - 0.1] as [number, number, number], size: 0.03 + random() * 0.05 }; });
          const spray = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 6, 4), new THREE.MeshStandardMaterial({ color: '#f2fbff', roughness: 0.2 }), drops.length);
          const matrix = new THREE.Matrix4();
          drops.forEach((drop, i) => spray.setMatrixAt(i, matrix.makeScale(drop.size, drop.size * 1.4, drop.size).setPosition(...drop.at)));
          holder.add(spray);
          const collar = put(holder, new THREE.TorusGeometry(0.55, 0.12, 6, 20).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#f2fbff', roughness: 0.3 }));
          collar.position.set(0, 0.03, -0.25);
        }
      }
      if (a.blow && mode !== 'breaching') {
        const origin = new THREE.Vector3(...((): [number, number, number] => { const [wx, wz] = world(mode === 'logging' ? 1.5 - 0.55 : Math.cos(pitch) * (out - 0.55)); return [wx, mode === 'logging' ? 0.25 : Math.sin(pitch) * (out - 0.55) * size + 0.4, wz]; })());
        const mist = new THREE.MeshStandardMaterial({ color: '#f1f6f9', transparent: true, opacity: 0.5, depthWrite: false, roughness: 1 });
        owned.push(mist);
        for (let i = 0; i < 5; i++) { const mesh = put(s.root, new THREE.SphereGeometry(1, 10, 8), mist); mesh.castShadow = false; puffs.push({ mesh, origin, offset: i / 5 }); }
      }
    };

    const mode = a.doing as Mode;
    const tuskless = tuskLength === 0;
    if (a.count === 'one') animal(0, 0, 0, mode, tuskLength);
    else if (a.count === 'pair') {
      if (mode === 'tusking' && !tuskless) {
        // Facing one another so the raised tusks cross in the middle.
        const apart = 1.6 + tuskLength * 0.5;
        animal(-0.12, -apart, 0, 'tusking', tuskLength, 1, 0);
        animal(0.12, apart, Math.PI, 'tusking', tuskLength * mix(0.8, 1, random()), 0.93, 0.08);
      } else {
        animal(-0.65, 0.2, 0.06, mode, tuskLength);
        animal(0.7, -0.5, -0.08, mode === 'breaching' ? 'tusking' : mode, a.tusk === 'none' ? 0 : tuskLength * 0.7, 0.88);
      }
    } else {
      const pod = 3 + Math.round(mood.density);
      for (let i = 0; i < pod; i++) {
        const slot = i - (pod - 1) / 2;
        const each: Mode = i === Math.floor(pod / 2) ? mode : mode === 'logging' ? 'logging' : (['diving', 'tusking'] as const)[Math.floor(random() * 2)];
        animal(slot * 1.05, -Math.abs(slot) * 0.5 + (random() - 0.5) * 0.4, slot * -0.04, each, i % 2 || tuskless ? (tuskless ? 0 : tuskLength * mix(0.5, 0.8, random())) : tuskLength, i === Math.floor(pod / 2) ? 1 : mix(0.78, 0.95, random()));
      }
    }

    // The lead: thick ice either side of dark water, all one block so nothing shows beneath.
    const DEPTH = 0.75, FREEBOARD = 0.22;
    const margin = a.lead === 'hole' ? 0.1 : a.lead === 'crack' ? 0.05 : 0.3;
    const x0 = extent.x0 - margin, x1 = extent.x1 + margin, z0 = extent.z0 - 0.2, z1 = extent.z1 + 0.2;
    const shelf = a.lead === 'open' ? 0 : 0.6;
    const water = s.box([x1 - x0 + shelf * 2 - (shelf ? 0.06 : 0), DEPTH - 0.01, z1 - z0 + (a.lead === 'hole' ? shelf * 2 - 0.06 : a.lead === 'crack' ? -0.03 : 0)], [(x0 + x1) / 2, -DEPTH / 2, (z0 + z1) / 2], new THREE.MeshStandardMaterial({ color: new THREE.Color('#10303f').lerp(new THREE.Color('#1c4a55'), mood.cheer * 0.5), roughness: 0.1, metalness: 0.25 }));
    water.castShadow = false;
    const blue = s.material('#8fc2dc', { roughness: 0.4, flatShading: true });
    const white = s.material('#eef4f8', { roughness: 0.95, flatShading: true });
    const slab = (shape: THREE.Shape) => {
      s.mesh(new THREE.ExtrudeGeometry(shape, { depth: DEPTH - 0.02, bevelEnabled: false }).rotateX(-Math.PI / 2), blue, [0, -DEPTH + 0.001, 0]);
      s.mesh(new THREE.ExtrudeGeometry(shape, { depth: FREEBOARD, bevelEnabled: false }).rotateX(-Math.PI / 2), white, [0, -0.02, 0]);
    };
    const jag = (from: number, to: number, at: (t: number) => [number, number]) => { const steps = Math.max(5, Math.round(Math.abs(to - from) / 0.7)); return Array.from({ length: steps + 1 }, (_unused, i) => at(i / steps)); };
    if (a.lead === 'crack') {
      for (const side of [-1, 1]) {
        const inner = side < 0 ? x0 : x1, outer = inner + side * shelf;
        const shape = new THREE.Shape();
        shape.moveTo(outer, -z0); shape.lineTo(outer, -z1);
        for (const [px, pz] of jag(z1, z0, (t) => [inner + side * random() * 0.3 - side * Math.sin(t * 3.14) * 0.0, z1 + (z0 - z1) * t])) shape.lineTo(px, -pz);
        slab(shape);
      }
    } else if (a.lead === 'hole') {
      const shape = new THREE.Shape();
      const ox0 = x0 - shelf, ox1 = x1 + shelf, oz0 = z0 - shelf, oz1 = z1 + shelf;
      shape.moveTo(ox0, -oz0); shape.lineTo(ox1, -oz0); shape.lineTo(ox1, -oz1); shape.lineTo(ox0, -oz1);
      const hole = new THREE.Path();
      const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, rx = (x1 - x0) / 2, rz = (z1 - z0) / 2;
      for (let i = 0; i < 18; i++) { const angle = i / 18 * 6.283, wobble = 0.92 + random() * 0.12; const px = cx + Math.cos(angle) * rx * wobble * 1.08, pz = cz + Math.sin(angle) * rz * wobble * 1.08; if (i) hole.lineTo(px, -pz); else hole.moveTo(px, -pz); }
      shape.holes.push(hole);
      slab(shape);
    }
    // Brash and pancake ice drifting in the water.
    const loose = a.lead === 'open' ? Math.round(mix(9, 22, mood.density)) : Math.round(mix(1, 5, mood.density));
    for (let i = 0; i < loose; i++) {
      const px = mix(x0 + 0.3, x1 - 0.3, random()), pz = mix(z0 + 0.3, z1 - 0.3, random());
      const edge = Math.min(px - x0, x1 - px, pz - z0, z1 - pz);
      if (a.lead !== 'open' && edge > 0.5) continue;
      if (a.lead === 'open' && Math.abs(px - (extent.x0 + extent.x1) / 2) < (extent.x1 - extent.x0) / 2 - 0.35 && Math.abs(pz - (extent.z0 + extent.z1) / 2) < (extent.z1 - extent.z0) / 2 - 0.35) continue;
      const r = a.lead === 'open' ? 0.2 + random() * 0.45 : 0.12 + random() * 0.15;
      const chunk = s.cylinder(r * 0.85, r, 0.16 + random() * 0.1, [px, 0.0, pz], white, 5 + Math.floor(random() * 3));
      chunk.rotation.y = random() * 3;
    }

    // Long subjects read best three-quarter on.
    s.root.rotation.y = -0.8;
    s.root.updateMatrixWorld(true);
    const thing = s.finish({
      update: (_dt, time) => {
        for (const ring of rings) {
          const t = (time * mix(0.12, 0.5, mood.energy) + ring.phase) % 1;
          ring.mesh.scale.setScalar(ring.size * (0.75 + t * 0.7));
        }
        for (const puff of puffs) {
          const t = (time * mix(0.15, 0.4, mood.energy) + puff.offset) % 1;
          puff.mesh.position.set(puff.origin.x + t * 0.25, puff.origin.y + t * 0.9, puff.origin.z + Math.sin(puff.offset * 20) * 0.1 * t);
          puff.mesh.scale.setScalar(0.08 + t * 0.32);
        }
      },
    });
    const centre = new THREE.Box3().setFromObject(water).getCenter(new THREE.Vector3());
    s.root.position.x -= centre.x; s.root.position.z -= centre.z;
    thing.update?.(0, 0);
    return { ...thing, dispose: () => { thing.dispose(); for (const item of owned) item.dispose(); } };
  },
});
