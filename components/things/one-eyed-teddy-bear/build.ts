import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

const FURS = { honey: '#c9984c', chocolate: '#6f4a33', cream: '#e4d5b5', grey: '#9c958c', pink: '#d8a2a8', blue: '#8ea8c3' } as const;
type V3 = readonly [number, number, number];

export default defineThing({
  questions: {
    posture: choice('How is the bear sitting or lying?', {
      upright: 'Sitting up straight with legs out, attentive, as if set down with care.',
      slumped: 'Sitting slumped forward, chin on chest, arms hanging.',
      lolling: 'Sitting with the head lolled right over to one side.',
      toppled: 'Tipped over onto one side, still in a sitting shape.',
      back: 'Flat on his back with arms flung out, staring at the ceiling.',
      facedown: 'Face down on the floor where he was dropped.',
    }),
    eye: choice('What is there where the missing eye was?', {
      threads: 'A bare pale patch and a few loose threads.',
      cross: 'A cross of black stitches sewn in its place.',
      button: 'A mismatched replacement: a bigger coloured coat button.',
      patch: 'A black felt eyepatch on a strap, like a pirate.',
    }),
    mended: choice('Where has he been mended, or where does he need it?', {
      belly: 'A long seam of clumsy cross-stitches up the belly.',
      ear: 'One ear replaced with a different checked fabric.',
      arm: 'One arm hanging on by a few threads, stuffing showing at the shoulder.',
      heart: 'A red gingham heart patch sewn on the chest.',
      burst: 'A split seam in his side with white stuffing coming out, not mended yet.',
      none: 'No repairs at all apart from the eye.',
    }),
    wearing: choice('What is he wearing?', {
      nothing: 'Nothing.',
      bow: 'A ribbon tied in a bow at the neck.',
      bandage: 'A white bandage wound round his head.',
      scarf: 'A little striped knitted scarf.',
      tag: 'A cardboard luggage label on a string round his neck.',
    }),
    fur: choice('What colour is his fur?', {
      honey: 'Classic honey gold.',
      chocolate: 'Dark chocolate brown.',
      cream: 'Pale cream.',
      grey: 'Washed-out grey.',
      pink: 'Faded nursery pink.',
      blue: 'Soft baby blue.',
    }),
    build: choice('What sort of bear is he?', {
      chubby: 'Round and chubby with a big head and short limbs.',
      antique: 'An antique jointed bear: long snout, long arms, humped back, small ears.',
      floppy: 'Understuffed and floppy, flattened from years of being slept on.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const jit = (range: number) => (random() - 0.5) * 2 * range;
    const base = new THREE.Color(FURS[a.fur]).lerp(new THREE.Color('#a79c8c'), mood.wear * 0.3);
    const pale = base.clone().lerp(new THREE.Color('#f3e6cc'), 0.55);

    const plush = (tone: THREE.Color, bald: number) => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 256;
      const g = canvas.getContext('2d')!;
      g.fillStyle = `#${tone.getHexString()}`;
      g.fillRect(0, 0, 256, 256);
      g.lineCap = 'round';
      for (let i = 0; i < 2400; i++) {
        const x = random() * 256, y = random() * 256, angle = Math.PI / 2 + jit(0.9), reach = 3 + random() * 5;
        g.strokeStyle = random() < 0.5 ? 'rgba(40,25,10,0.22)' : 'rgba(255,245,220,0.2)';
        g.lineWidth = 1 + random();
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + Math.cos(angle) * reach, y + Math.sin(angle) * reach);
        g.stroke();
      }
      // Threadbare places: the pale backing cloth and its weave show through.
      for (let i = 0; i < Math.round(bald * 9); i++) {
        const x = random() * 256, y = random() * 256, r = 14 + random() * 26;
        const worn = g.createRadialGradient(x, y, 2, x, y, r);
        worn.addColorStop(0, 'rgba(214,196,160,0.85)');
        worn.addColorStop(1, 'rgba(214,196,160,0)');
        g.fillStyle = worn;
        g.fillRect(x - r, y - r, r * 2, r * 2);
        g.strokeStyle = 'rgba(120,100,70,0.25)';
        g.lineWidth = 1;
        for (let k = -r * 0.6; k < r * 0.6; k += 4) { g.beginPath(); g.moveTo(x + k, y - r * 0.5); g.lineTo(x + k, y + r * 0.5); g.stroke(); g.beginPath(); g.moveTo(x - r * 0.5, y + k); g.lineTo(x + r * 0.5, y + k); g.stroke(); }
      }
      const map = new THREE.CanvasTexture(canvas);
      map.colorSpace = THREE.SRGBColorSpace;
      map.wrapS = map.wrapT = THREE.RepeatWrapping;
      map.repeat.set(2, 1);
      return new THREE.MeshStandardMaterial({ map, roughness: 1 });
    };
    const fur = plush(base, mood.wear);
    const pad = plush(pale, mood.wear * 0.6);
    const thread = s.material(a.fur === 'chocolate' || a.fur === 'grey' ? '#efe6d0' : '#2a2320', { roughness: 0.9 });
    const black = new THREE.MeshStandardMaterial({ color: '#17140f', roughness: 0.25 });
    const stuffing = s.material('#f6f3ea', { roughness: 1 });

    const put = <T extends THREE.Object3D>(parent: THREE.Object3D, node: T, at: V3 = [0, 0, 0]) => {
      node.position.set(...at);
      node.castShadow = node.receiveShadow = true;
      parent.add(node);
      return node;
    };
    const blob = (parent: THREE.Object3D, radii: V3, at: V3, material: THREE.Material) => {
      const mesh = put(parent, new THREE.Mesh(new THREE.SphereGeometry(1, 28, 18), material), at);
      mesh.scale.set(...radii);
      return mesh;
    };
    const rod = (parent: THREE.Object3D, from: V3, to: V3, radius: number, material: THREE.Material) => {
      const p = new THREE.Vector3(...from), q = new THREE.Vector3(...to), d = q.clone().sub(p);
      const mesh = put(parent, new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, d.length(), 6), material), p.add(q).multiplyScalar(0.5).toArray() as [number, number, number]);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
      return mesh;
    };
    const cross = (parent: THREE.Object3D, at: V3, size: number, material: THREE.Material = thread, radius = 0.0013) => {
      const [x, y, z] = at;
      rod(parent, [x - size, y - size, z], [x + size, y + size, z], radius, material);
      rod(parent, [x - size, y + size, z], [x + size, y - size, z], radius, material);
    };

    const antique = a.build === 'antique', floppy = a.build === 'floppy';
    const torsoR: V3 = antique ? [0.066, 0.094, 0.06] : floppy ? [0.08, 0.078, 0.05] : [0.076, 0.09, 0.066];
    const torsoY = torsoR[1] + 0.012;
    const neckY = torsoY + torsoR[1] * 0.88;
    const headR: V3 = antique ? [0.058, 0.055, 0.058] : [0.07, 0.064, 0.066];
    const limbFlat = floppy ? 0.62 : 1;
    const armLong = antique ? 0.082 : 0.064, legLong = antique ? 0.074 : 0.068;
    const damaged = random() < 0.5 ? -1 : 1; // which side took the damage

    const bear = new THREE.Group();
    const upper = put(bear, new THREE.Group(), [0, 0.03, 0]);
    blob(upper, torsoR, [0, torsoY - 0.03, 0], fur);
    blob(upper, [torsoR[0] * 0.62, torsoR[1] * 0.6, 0.012], [0, torsoY - 0.04, torsoR[2] * 0.93], pad);
    if (antique) blob(upper, [0.045, 0.04, 0.035], [0, neckY - 0.065, -0.04], fur);

    // Head.
    const head = put(upper, new THREE.Group(), [0, neckY - 0.03 - 0.012, 0.004]);
    const headC = new THREE.Vector3(0, headR[1] * 0.92, 0);
    blob(head, headR, headC.toArray() as [number, number, number], fur);
    const snout = antique ? 1.55 : 1;
    blob(head, [0.034, 0.027, 0.03 * snout], [0, headC.y - 0.014, headR[2] * 0.82], pad);
    const noseZ = headR[2] * 0.82 + 0.03 * snout;
    blob(head, [0.0125, 0.009, 0.008], [0, headC.y - 0.004, noseZ - 0.003], black);
    rod(head, [0, headC.y - 0.012, noseZ - 0.001], [0, headC.y - 0.024, noseZ - 0.006], 0.0013, black);
    const smile = mood.cheer > 0.6 ? 1 : mood.cheer < 0.3 ? -1 : 0;
    for (const side of [-1, 1]) rod(head, [0, headC.y - 0.024, noseZ - 0.006], [side * 0.014, headC.y - 0.024 + smile * 0.007, noseZ - 0.012], 0.0013, black);
    const earSize = antique ? 0.021 : 0.029;
    const earDroop = mood.wear * 0.5;
    for (const side of [-1, 1]) {
      const ear = put(head, new THREE.Group(), [side * headR[0] * 0.76, headC.y + headR[1] * 0.7, -0.004]);
      const swapped = a.mended === 'ear' && side === damaged;
      let cloth: THREE.Material = fur;
      if (swapped) {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 64;
        const g = canvas.getContext('2d')!;
        g.fillStyle = '#a3322c';
        g.fillRect(0, 0, 64, 64);
        g.fillStyle = 'rgba(20,40,70,0.7)';
        for (let i = 0; i < 4; i++) { g.fillRect(i * 16, 0, 5, 64); g.fillRect(0, i * 16, 64, 5); }
        const map = new THREE.CanvasTexture(canvas);
        map.colorSpace = THREE.SRGBColorSpace;
        cloth = new THREE.MeshStandardMaterial({ map, roughness: 0.95 });
        for (let i = 0; i < 5; i++) cross(ear, [(i - 2) * 0.009, -earSize * 0.72 + Math.abs(i - 2) * 0.003, earSize * 0.5], 0.004, s.material('#c9362c'));
      }
      blob(ear, [earSize, earSize, earSize * 0.5], [0, 0, 0], cloth);
      if (!swapped) blob(ear, [earSize * 0.62, earSize * 0.62, earSize * 0.2], [0, -0.001, earSize * 0.4], pad);
      ear.rotation.z = -side * (0.35 + earDroop * (side === damaged ? 1.4 : 0.5));
    }

    // Eyes: one good button, and whatever is left where the other was.
    const onHead = (x: number, y: number, z: number) => {
      const normal = new THREE.Vector3(x, y, z).normalize();
      const at = headC.clone().add(new THREE.Vector3(normal.x * headR[0], normal.y * headR[1], normal.z * headR[2]));
      const turn = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
      return { at, turn, normal };
    };
    const button = (spot: ReturnType<typeof onHead>, radius: number, material: THREE.Material, holes: number) => {
      const eye = put(head, new THREE.Group(), spot.at.toArray() as [number, number, number]);
      eye.quaternion.copy(spot.turn);
      put(eye, new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 1.05, 0.005, 20), material), [0, 0.002, 0]);
      put(eye, new THREE.Mesh(new THREE.TorusGeometry(radius * 0.86, radius * 0.16, 6, 20), material), [0, 0.0045, 0]).rotation.x = Math.PI / 2;
      for (let i = 0; i < holes; i++) {
        const angle = (i / holes) * Math.PI * 2 + 0.6;
        put(eye, new THREE.Mesh(new THREE.SphereGeometry(radius * 0.16, 8, 6), s.material('#d9cfbb')), [Math.cos(angle) * radius * 0.34, 0.0048, Math.sin(angle) * radius * 0.34]);
      }
    };
    button(onHead(-damaged * 0.42, 0.24, 0.88), 0.0115, black, 2);
    const gone = onHead(damaged * 0.42, 0.24, 0.88);
    const socket = put(head, new THREE.Group(), gone.at.toArray() as [number, number, number]);
    socket.quaternion.copy(gone.turn);
    if (a.eye === 'threads') {
      put(socket, new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.013, 0.002, 18), s.material('#d9c9a4', { roughness: 1 })), [0, 0.0006, 0]);
      for (let i = 0; i < 4; i++) rod(socket, [jit(0.004), 0.001, jit(0.004)], [jit(0.014), 0.008 + random() * 0.012, 0.004 + random() * 0.014], 0.0009, black);
    } else if (a.eye === 'cross') {
      rod(socket, [-0.011, 0.002, -0.011], [0.011, 0.002, 0.011], 0.0018, black);
      rod(socket, [-0.011, 0.002, 0.011], [0.011, 0.002, -0.011], 0.0018, black);
    } else if (a.eye === 'button') {
      const coat = ['#c9362c', '#2f6fb8', '#3d9c46', '#e7b522', '#efe9da'][Math.floor(random() * 5)];
      socket.position.y -= 0.004;
      button({ ...gone, at: socket.position.clone() }, 0.0165, new THREE.MeshStandardMaterial({ color: coat, roughness: 0.3 }), 4);
    } else {
      const felt = s.material('#1b1a1c', { roughness: 1 });
      put(socket, new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.021, 0.004, 5), felt), [0, 0.002, 0]);
      const strap = put(head, new THREE.Mesh(new THREE.TorusGeometry(1, 0.045, 6, 40), felt), [0, headC.y + 0.012, 0]);
      strap.scale.set(headR[0] * 1.005, headR[2] * 1.005, headR[0]);
      strap.rotation.set(Math.PI / 2, damaged * 0.28, 0, 'ZYX');
      strap.rotation.z = -damaged * 0.3;
    }

    // Arms and legs hang from pivots so every posture can move them.
    const limb = (parent: THREE.Object3D, at: V3, radius: number, long: number, foot: boolean) => {
      const pivot = put(parent, new THREE.Group(), at);
      blob(pivot, [radius, long, radius * limbFlat], [0, -long * 0.8, 0], fur);
      if (foot) {
        blob(pivot, [radius * 1.08, radius * 0.9, radius * 1.25], [0, -long * 1.55, radius * 0.4], fur);
        put(pivot, new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.74, radius * 0.74, 0.004, 18), pad), [0, -long * 1.55 - radius * 0.86, radius * 0.45]).scale.z = 1.2;
      } else put(pivot, new THREE.Mesh(new THREE.SphereGeometry(radius * 0.62, 14, 10), pad), [0, -long * 1.55, radius * 0.55 * limbFlat]).scale.z = 0.45;
      return pivot;
    };
    const shoulderY = neckY - 0.03 - 0.03;
    const arms = [-1, 1].map((side) => limb(upper, [side * torsoR[0] * 0.9, shoulderY, 0.008], 0.027, armLong, false));
    const legs = [-1, 1].map((side) => limb(bear, [side * torsoR[0] * 0.6, 0.046, 0.022], 0.031, legLong, true));
    for (const leg of legs) leg.rotation.order = 'YXZ';

    // Repairs.
    const front = (y: number, x = 0) => {
      const skin = torsoR[2] * Math.sqrt(Math.max(0.05, 1 - ((y - (torsoY - 0.03)) / torsoR[1]) ** 2 - (x / torsoR[0]) ** 2));
      const within = 1 - (x / (torsoR[0] * 0.62)) ** 2 - ((y - (torsoY - 0.04)) / (torsoR[1] * 0.6)) ** 2;
      return within > 0 ? Math.max(skin, torsoR[2] * 0.93 + 0.012 * Math.sqrt(within)) : skin;
    };
    if (a.mended === 'belly') {
      const stitch = s.material(['#c9362c', '#2a2320', '#f1ead6'][Math.floor(random() * 3)]);
      for (let i = 0; i < 8; i++) {
        const y = torsoY - 0.03 - torsoR[1] * 0.62 + i * torsoR[1] * 0.17, x = jit(0.004);
        cross(upper, [x, y, front(y, x) + 0.002], 0.0065, stitch, 0.0016);
      }
    } else if (a.mended === 'heart') {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 64;
      const g = canvas.getContext('2d')!;
      g.fillStyle = '#c9302c';
      g.fillRect(0, 0, 64, 64);
      g.fillStyle = 'rgba(255,255,255,0.7)';
      for (let i = 0; i < 4; i++) { g.fillRect(i * 16, 0, 6, 64); g.fillRect(0, i * 16, 64, 6); }
      const map = new THREE.CanvasTexture(canvas);
      map.colorSpace = THREE.SRGBColorSpace;
      map.wrapS = map.wrapT = THREE.RepeatWrapping;
      map.repeat.set(40, 40);
      const heart = new THREE.Shape();
      heart.moveTo(0, -0.02);
      heart.bezierCurveTo(-0.034, 0.002, -0.02, 0.028, 0, 0.012);
      heart.bezierCurveTo(0.02, 0.028, 0.034, 0.002, 0, -0.02);
      const x = damaged * torsoR[0] * 0.36, y = torsoY - 0.03 + torsoR[1] * 0.32;
      const patch = put(upper, new THREE.Mesh(new THREE.ExtrudeGeometry(heart, { depth: 0.003, bevelEnabled: false }), new THREE.MeshStandardMaterial({ map, roughness: 0.95 })), [x, y, front(y, x) - 0.001]);
      patch.rotation.set(-0.3, damaged * 0.38, damaged * 0.15);
      patch.scale.setScalar(1.15);
    } else if (a.mended === 'burst') {
      const x = damaged * torsoR[0] * 0.62, y = torsoY - 0.03 - torsoR[1] * 0.2, z = front(y, x);
      blob(upper, [0.008, 0.03, 0.006], [x, y, z - 0.001], black).rotation.z = damaged * 0.2;
      for (let i = 0; i < 5; i++) blob(upper, [0.011 + random() * 0.008, 0.01 + random() * 0.007, 0.011 + random() * 0.006], [x + damaged * random() * 0.014 + jit(0.006), y - 0.012 + i * 0.008 + jit(0.004), z + 0.004 + random() * 0.008], stuffing);
      for (let i = 0; i < 3; i++) blob(s.root, [0.012 + random() * 0.006, 0.008, 0.011 + random() * 0.006], [damaged * (0.1 + random() * 0.07), 0.008, 0.07 + jit(0.05)], stuffing);
    } else if (a.mended === 'arm') {
      const arm = arms[damaged === 1 ? 1 : 0];
      blob(upper, [0.017, 0.017, 0.015], [damaged * torsoR[0] * 0.88, shoulderY - 0.004, 0.008], stuffing);
      arm.position.x += damaged * 0.016;
      arm.position.y -= 0.03;
      for (let i = 0; i < 3; i++) rod(upper, [damaged * torsoR[0] * 0.9, shoulderY + jit(0.008), 0.008 + jit(0.008)], [arm.position.x + jit(0.006), arm.position.y - 0.006, arm.position.z + jit(0.008)], 0.001, thread);
    }

    // Worn things round the neck or head.
    const neck: V3 = [0, neckY - 0.03 - 0.006, 0];
    const neckR = Math.min(torsoR[0], headR[0]) * 0.74;
    if (a.wearing === 'bow') {
      const ribbon = s.material(mood.cheer > 0.3 ? ['#c9302c', '#2f6fb8', '#e2a91f', '#3d8f5a'][Math.floor(random() * 4)] : '#3a3540', { roughness: 0.6 });
      put(upper, new THREE.Mesh(new THREE.TorusGeometry(neckR, 0.006, 6, 28), ribbon), neck).rotation.x = Math.PI / 2;
      const knot: V3 = [0, neck[1] - 0.004, neckR + 0.008];
      blob(upper, [0.011, 0.011, 0.009], knot, ribbon);
      for (const side of [-1, 1]) {
        blob(upper, [0.03, 0.017, 0.007], [side * 0.032, knot[1] + 0.006, knot[2]], ribbon).rotation.z = side * 0.3;
        const tail = put(upper, new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.05, 0.003), ribbon), [side * 0.015, knot[1] - 0.03, knot[2] + 0.004]);
        tail.rotation.set(-0.35, 0, side * 0.35);
      }
    } else if (a.wearing === 'bandage') {
      const gauze = new THREE.MeshStandardMaterial({ color: '#f1eee4', roughness: 1, side: THREE.DoubleSide });
      for (const [lift, tilt] of [[0.022, 0.26], [0.03, -0.12]] as const) {
        const band = put(head, new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.024, 32, 1, true), gauze), [0, headC.y + lift, 0]);
        band.scale.set(headR[0] * 0.985, 1, headR[2] * 0.985);
        band.rotation.z = damaged * tilt;
      }
      if (mood.cheer < 0.4) blob(head, [0.009, 0.007, 0.002], [damaged * 0.02, headC.y + 0.032, headR[2] * 0.93], s.material('#a8322a'));
    } else if (a.wearing === 'scarf') {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const g = canvas.getContext('2d')!;
      const [one, two] = [['#c9302c', '#f1ead6'], ['#2f5f8f', '#e2a91f'], ['#3d7a52', '#f1ead6'], ['#6a3f8a', '#e7b0c0']][Math.floor(random() * 4)];
      for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? one : two; g.fillRect(0, i * 8, 64, 8); }
      const map = new THREE.CanvasTexture(canvas);
      map.colorSpace = THREE.SRGBColorSpace;
      const wool = new THREE.MeshStandardMaterial({ map, roughness: 1 });
      const ring = map.clone();
      ring.wrapS = THREE.RepeatWrapping;
      ring.rotation = Math.PI / 2;
      ring.repeat.set(1, 3);
      ring.needsUpdate = true;
      put(upper, new THREE.Mesh(new THREE.TorusGeometry(neckR + 0.004, 0.015, 8, 32), new THREE.MeshStandardMaterial({ map: ring, roughness: 1 })), neck).rotation.x = Math.PI / 2;
      const long = put(upper, new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.095, 0.008), wool), [damaged * 0.03, neck[1] - 0.05, neckR + 0.022]);
      long.rotation.set(-0.42, 0, damaged * 0.12);
      const short = put(upper, new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.05, 0.008), wool), [damaged * 0.052, neck[1] - 0.024, neckR + 0.012]);
      short.rotation.set(-0.3, 0, damaged * 0.5);
    } else if (a.wearing === 'tag') {
      put(upper, new THREE.Mesh(new THREE.TorusGeometry(neckR, 0.0016, 6, 28), s.material('#b89b6a')), neck).rotation.x = Math.PI / 2;
      const y = neck[1] - 0.05;
      rod(upper, [0, neck[1], neckR], [0.006, y + 0.03, front(y + 0.03) + 0.006], 0.0012, s.material('#b89b6a'));
      const label = s.label(mood.cheer < 0.35 ? 'LOST' : 'MINE', 0.046, 0.068, [0.008, y, front(y) + 0.008], '#3a2f28', '#d9bf8f');
      label.rotation.set(-0.32, 0, 0.14 + jit(0.1));
      upper.add(label);
    }

    // Posture.
    const sitLeg = -Math.PI / 2 + 0.1;
    const pose = {
      upright: { lean: 0.04, nod: 0.02, loll: jit(0.1), leg: sitLeg, armX: -0.5, armZ: 0.42 },
      slumped: { lean: 0.36, nod: 0.62, loll: jit(0.2), leg: sitLeg, armX: -0.15, armZ: 0.22 },
      lolling: { lean: -0.1, nod: -0.05, loll: damaged * 0.62, leg: sitLeg, armX: -0.3, armZ: 0.5 },
      toppled: { lean: 0.1, nod: 0.1, loll: jit(0.15), leg: sitLeg, armX: -0.6, armZ: 0.5 },
      back: { lean: 0, nod: -0.05, loll: jit(0.25), leg: -0.22, armX: 0.05, armZ: 1.25 },
      facedown: { lean: 0, nod: 0, loll: 0, leg: 0.12, armX: 0.1, armZ: 2.3 },
    }[a.posture];
    upper.rotation.x = pose.lean + (floppy ? 0.1 : 0);
    head.rotation.set(pose.nod + (floppy ? 0.15 : 0), a.posture === 'facedown' ? damaged * 0.9 : jit(0.12), pose.loll);
    arms.forEach((arm, index) => {
      const side = index ? 1 : -1;
      const limp = a.mended === 'arm' && side === damaged;
      arm.rotation.set(limp ? -0.1 : pose.armX + jit(0.12), 0, side * (limp ? 0.12 : pose.armZ + jit(0.1)));
    });
    legs.forEach((leg, index) => leg.rotation.set(pose.leg + jit(0.06), (index ? 1 : -1) * (0.36 + jit(0.08)), 0));
    if (a.posture === 'toppled') bear.rotation.z = -damaged * (Math.PI / 2 - 0.2);
    if (a.posture === 'back') bear.rotation.x = -(Math.PI / 2 - 0.06);
    if (a.posture === 'facedown') bear.rotation.x = Math.PI / 2 - 0.04;
    bear.rotation.y = jit(0.12);
    s.root.add(bear);

    // The faintest breathing: a loved toy never looks quite inanimate.
    const breath = mix(0, 0.012, mood.energy);
    return s.finish({ update: (_dt, time) => { upper.scale.setScalar(1 + Math.sin(time * 1.4) * breath); } });
  },
});
