import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

type P3 = [number, number, number];

function paint(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

export default defineThing({
  questions: {
    coat: choice('What kind of cow is she?', {
      brown: 'Mouse-brown Swiss Braunvieh with a pale ring round a dark nose.',
      pied: 'Red-and-white patched Simmental, the chocolate-box cow.',
      black: 'A compact black fighting cow of the high valleys, all shoulder.',
      grey: 'Silvery grey alpine cow with dark legs and face.',
    }),
    doing: choice('What is she doing?', {
      staring: 'Standing square and staring straight at you, chewing.',
      grazing: 'Head down, tearing at the short grass.',
      lying: 'Lying down with her legs folded, chewing the cud.',
      bellowing: 'Neck stretched, head up, mid-bellow.',
      walking: 'Stepping out in procession, head nodding.',
    }),
    bell: choice('What bell does she carry?', {
      trychel: 'A huge flat-sided hammered steel bell, as big as a bucket, that clonks.',
      bronze: 'A round cast bronze bell with a raised rim, that rings.',
      small: 'A small tin bell, the everyday one.',
      none: 'No bell at all, the collar hangs empty or is gone.',
    }),
    collar: choice('What is the collar like?', {
      embroidered: 'A hand-wide black leather strap embroidered with bright flowers and brass studs.',
      fringed: 'A red festival collar with a white fringe and a brass buckle plate.',
      plain: 'A plain worn leather strap, working gear.',
    }),
    crown: choice('What is she wearing on her head?', {
      bare: 'Nothing, an ordinary summer day.',
      headdress: 'A towering headdress of fir, paper roses and ribbons for the autumn descent.',
      wreath: 'A simple wreath of meadow flowers round the horns.',
      stool: 'A flower-decked milking stool strapped upside down between the horns.',
    }),
    horns: choice('What are her horns like?', {
      lyre: 'Wide upswept horns.',
      short: 'Short forward stubs.',
      polled: 'No horns.',
    }),
    company: choice('What is with her?', {
      alone: 'Nothing, she has the pasture to herself.',
      calf: 'A leggy calf standing against her flank.',
      pat: 'A fresh cowpat and a few flies behind her.',
      salt: 'A licked-hollow block of salt on a stone.',
      bird: 'A black alpine chough perched on her back.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const herd = new THREE.Group();
    herd.rotation.y = -0.7;
    s.root.add(herd);
    const into = <T extends THREE.Object3D>(g: THREE.Object3D, m: T) => { g.add(m); return m; };

    const hide = { brown: '#8a6f55', pied: '#f1ebdd', black: '#231c19', grey: '#a9a79f' }[a.coat];
    const coatTex = a.coat === 'pied' ? paint(256, 256, (c) => {
      c.fillStyle = '#fff'; c.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 9; i++) {
        c.fillStyle = '#8a3a1a';
        c.beginPath(); c.ellipse(random() * 256, 20 + random() * 150, 30 + random() * 45, 22 + random() * 40, random() * 3, 0, 7); c.fill();
      }
    }) : null;
    const coat = s.material(hide, { roughness: 0.85, map: coatTex });
    const coatPlain = s.material(a.coat === 'pied' ? '#8a3a1a' : hide, { roughness: 0.85 });
    const dark = s.material({ brown: '#4d3c30', pied: '#e8e0d0', black: '#15110f', grey: '#4a4744' }[a.coat], { roughness: 0.9 });
    const pale = s.material({ brown: '#d9cbb4', pied: '#f3e2d6', black: '#3a302b', grey: '#e3e0d6' }[a.coat], { roughness: 0.8 });
    const nose = s.material(a.coat === 'pied' ? '#d99a8f' : '#2a2422', { roughness: 0.5 });
    const hoof = s.material('#2b2622', { roughness: 0.6 });
    const horn = s.material('#e4d9bd', { roughness: 0.5 });
    const pink = s.material('#e6a79b', { roughness: 0.7 });
    const eye = s.material('#0e0c0b', { roughness: 0.2 });
    const mud = s.material('#5b4a38', { roughness: 1 });
    const swingers: { node: THREE.Object3D; axis: 'x' | 'z'; amp: number; rate: number; phase: number }[] = [];

    const cow = (g: THREE.Group, adult: boolean, pose: typeof a.doing) => {
      const lying = pose === 'lying';
      const drop = lying ? 0.58 : 0;
      const trunk = into(g, new THREE.Group());
      trunk.position.y = -drop;
      const T = (m: THREE.Mesh) => into(trunk, m);
      // Barrel, chest, rump, withers, hip bones, belly.
      T(s.ball([0.43, 0.45, 0.92], [0, 1.02, 0], coat, 24));
      T(s.ball([0.4, 0.5, 0.45], [0, 1.0, 0.55], coat, 20));
      T(s.ball([0.42, 0.44, 0.42], [0, 1.03, -0.62], coat, 20));
      T(s.ball([0.2, 0.14, 0.32], [0, 1.36, 0.5], coatPlain, 12));
      for (const x of [-1, 1]) T(s.ball([0.1, 0.08, 0.16], [x * 0.27, 1.36, -0.7], coatPlain, 10));
      T(s.ball([0.4, 0.3, 0.6], [0, 0.82, -0.1], a.coat === 'brown' ? pale : coat, 18));
      if (adult) {
        T(s.ball([0.2, 0.17, 0.24], [0, 0.6, -0.5], pink, 14));
        for (const x of [-1, 1]) for (const z of [-0.6, -0.42]) T(s.cylinder(0.022, 0.03, 0.09, [x * 0.09, 0.44, z], pink, 8));
      }
      // Legs.
      const walk = pose === 'walking' ? 1 : 0;
      for (const [i, [x, z]] of ([[-1, 0.55], [1, 0.55], [-1, -0.62], [1, -0.62]] as const).entries()) {
        const hind = z < 0, px = x * 0.24;
        if (lying) {
          if (hind) {
            into(g, s.ball([0.15, 0.2, 0.34], [x * 0.36, 0.24, z + 0.12], coatPlain, 10));
            into(g, s.rod([x * 0.42, 0.08, z + 0.05], [x * 0.44, 0.07, z + 0.6], 0.065, dark, 0.055));
            into(g, s.ball([0.07, 0.06, 0.09], [x * 0.44, 0.06, z + 0.66], hoof, 8));
          } else {
            into(g, s.ball([0.1, 0.13, 0.2], [x * 0.27, 0.14, z + 0.32], coatPlain, 10));
            into(g, s.rod([x * 0.27, 0.09, z + 0.45], [x * 0.3, 0.07, z + 0.1], 0.06, dark, 0.055));
            into(g, s.ball([0.07, 0.06, 0.09], [x * 0.3, 0.06, z + 0.05], hoof, 8));
          }
          continue;
        }
        const stride = walk * (i === 0 || i === 3 ? 0.24 : -0.2) + (random() - 0.5) * 0.06;
        const knee: P3 = [px, 0.52, z + (hind ? -0.13 : 0.02) + stride * 0.5];
        const foot: P3 = [px, 0.1, z + (hind ? -0.02 : 0) + stride];
        into(g, s.rod([px, 0.98, z], knee, hind ? 0.15 : 0.12, coatPlain, 0.075));
        into(g, s.ball([0.08, 0.08, 0.08], knee, coatPlain, 8));
        into(g, s.rod(knee, foot, 0.07, mood.wear > 0.6 ? mud : dark, 0.055));
        into(g, s.cylinder(0.065, 0.08, 0.11, [foot[0], 0.055, foot[2] + 0.02], hoof, 8));
      }
      // Tail.
      const tail = into(trunk, new THREE.Group());
      tail.position.set(0, 1.38, -1.0);
      into(tail, s.tube([[0, 0, 0], [0, -0.1, -0.1], [0.02, -0.6, -0.12], [0, -0.95, -0.08]], 0.025, coatPlain));
      into(tail, s.ball([0.05, 0.14, 0.05], [0, -1.0 + (lying ? 0.3 : 0), -0.08], dark, 8));
      if (lying) tail.rotation.set(1.1, 0, 0.5);
      swingers.push({ node: tail, axis: 'z', amp: 0.35, rate: 2.2, phase: random() * 6 });

      // Head and neck.
      const [hy, hz, pitch] = ({ staring: [1.38, 1.38, 0.3], grazing: [0.3, 1.42, 1.25], lying: [0.95, 1.35, 0.25], bellowing: [1.62, 1.4, -0.45], walking: [1.2, 1.5, 0.45] } as const)[pose];
      const neck0 = new THREE.Vector3(0, 1.12 - drop, 0.82), headAt = new THREE.Vector3(0, hy, hz);
      into(g, s.rod(neck0.toArray() as P3, headAt.toArray() as P3, 0.3, coatPlain, 0.17));
      into(g, s.ball([0.07, 0.2, 0.3], neck0.clone().lerp(headAt, 0.35).add(new THREE.Vector3(0, -0.2, 0.05)).toArray() as P3, coatPlain, 10));
      const head = into(g, new THREE.Group());
      head.position.copy(headAt); head.rotation.x = pitch;
      const H = (m: THREE.Mesh) => into(head, m);
      const turn = pose === 'staring' ? 0.55 : pose === 'lying' ? 0.35 : 0;
      head.rotation.order = 'YXZ'; head.rotation.y = turn;
      H(s.ball([0.17, 0.18, 0.2], [0, 0, 0], coatPlain, 16));
      H(s.rod([0, -0.01, 0.05], [0, -0.05, 0.36], 0.155, a.coat === 'pied' ? pale : coatPlain, 0.115));
      H(s.ball([0.125, 0.1, 0.09], [0, -0.06, 0.4], a.coat === 'brown' ? pale : nose, 12));
      H(s.ball([0.1, 0.07, 0.05], [0, -0.05, 0.455], nose, 10));
      for (const x of [-1, 1]) {
        H(s.ball([0.02, 0.025, 0.015], [x * 0.045, -0.035, 0.5], eye, 6));
        H(s.ball([0.034, 0.034, 0.03], [x * 0.14, 0.05, 0.12], eye, 8));
        const ear = H(s.ball([0.15, 0.075, 0.03], [x * 0.27, 0.06, -0.06], coatPlain, 10));
        ear.rotation.z = x * -0.25; ear.rotation.y = x * 0.3;
        H(s.ball([0.1, 0.045, 0.02], [x * 0.27, 0.06, -0.04], pink, 8)).rotation.z = x * -0.25;
        if (adult && a.horns === 'lyre') H(s.tube([[x * 0.09, 0.14, -0.06], [x * 0.24, 0.2, -0.04], [x * 0.32, 0.36, 0.02], [x * 0.27, 0.52, 0.04]], 0.03, horn));
        if (adult && a.horns === 'short') H(s.rod([x * 0.09, 0.14, -0.05], [x * 0.2, 0.2, 0.08], 0.035, horn, 0.012));
      }
      H(s.ball([0.1, 0.06, 0.08], [0, 0.17, -0.04], a.coat === 'pied' ? pale : coatPlain, 8));
      if (pose === 'bellowing') { H(s.ball([0.085, 0.05, 0.08], [0, -0.16, 0.36], pink, 10)); H(s.ball([0.11, 0.04, 0.12], [0, -0.2, 0.3], coatPlain, 10)).rotation.x = 0.35; }
      if (pose === 'grazing' || pose === 'lying' || pose === 'staring') {
        for (let i = 0; i < 5; i++) H(s.rod([(random() - 0.5) * 0.12, -0.1, 0.44], [(random() - 0.5) * 0.3, -0.1 - random() * 0.12, 0.5 + random() * 0.1], 0.008, s.material('#6f9a3d')));
      }
      return { head, neck0, headAt, trunk };
    };

    const main = into(herd, new THREE.Group());
    const body = cow(main, true, a.doing);

    // Collar and bell.
    const neckDir = body.headAt.clone().sub(body.neck0).normalize();
    const collarAt = body.neck0.clone().lerp(body.headAt, 0.62);
    const collarR = 0.245;
    const leather = a.collar === 'embroidered' ? '#1b1614' : a.collar === 'fringed' ? '#c4202a' : '#6a4630';
    const collarTex = paint(256, 48, (c) => {
      c.fillStyle = leather; c.fillRect(0, 0, 256, 48);
      if (a.collar === 'embroidered') {
        const cols = mood.cheer > 0.25 ? ['#e8312f', '#f4d13a', '#ffffff', '#3a8fdd', '#e85ca0'] : ['#b9b2a2', '#8c2b2a', '#d8cfae'];
        for (let x = 12; x < 256; x += 32) {
          c.fillStyle = cols[Math.floor(random() * cols.length)];
          for (let p = 0; p < 6; p++) { c.beginPath(); c.ellipse(x + Math.cos(p) * 8, 24 + Math.sin(p) * 8, 6, 6, 0, 0, 7); c.fill(); }
          c.fillStyle = '#f4d13a'; c.beginPath(); c.arc(x, 24, 4, 0, 7); c.fill();
          c.fillStyle = '#3f8a3a'; c.fillRect(x + 12, 20, 10, 6);
        }
        c.fillStyle = '#c9a03a'; for (let x = 0; x < 256; x += 8) { c.fillRect(x, 2, 4, 3); c.fillRect(x, 43, 4, 3); }
      } else if (a.collar === 'fringed') {
        c.fillStyle = '#ffffff'; for (let x = 0; x < 256; x += 6) c.fillRect(x, 34, 3, 14);
        c.fillStyle = '#f4d13a'; c.fillRect(0, 4, 256, 3);
      }
    });
    collarTex.repeat.set(2, 1);
    const collar = s.mesh(new THREE.CylinderGeometry(collarR, collarR * 1.08, a.collar === 'plain' ? 0.09 : 0.2, 24, 1, true), s.material('#ffffff', { map: collarTex, side: THREE.DoubleSide, roughness: 0.7 }), collarAt.toArray() as P3);
    collar.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), neckDir);
    into(main, collar);
    if (a.bell !== 'none') {
      const size = { trychel: 1, bronze: 0.72, small: 0.4 }[a.bell];
      const metal = a.bell === 'bronze' ? s.material('#c0902f', { metalness: 0.8, roughness: 0.3 }) : a.bell === 'trychel' ? s.material('#6d6f72', { metalness: 0.7, roughness: 0.45 }) : s.material('#a9a79a', { metalness: 0.6, roughness: 0.5 });
      const bell = into(main, new THREE.Group());
      const hang = new THREE.Vector3(0, -1, 0).addScaledVector(neckDir, neckDir.y).normalize();
      bell.position.copy(collarAt).addScaledVector(hang, collarR + 0.02);
      const h = 0.46 * size;
      const profile: [number, number][] = a.bell === 'bronze'
        ? [[0.001, 0], [0.09 * size, -0.02 * size], [0.13 * size, -0.12 * size], [0.16 * size, -0.3 * size], [0.23 * size, -0.42 * size], [0.25 * size, -h]]
        : [[0.001, 0], [0.13 * size, -0.02 * size], [0.19 * size, -0.2 * size], [0.22 * size, -0.36 * size], [0.19 * size, -h]];
      const shell = into(bell, s.lathe(profile, metal, [0, -0.05, 0]));
      (shell.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
      if (a.bell !== 'bronze') shell.scale.z = 0.62;
      into(bell, s.box([0.07, 0.09, 0.03], [0, -0.02, 0], s.material(leather)));
      into(bell, s.ball([0.045 * size, 0.045 * size, 0.045 * size], [0, -h - 0.03, 0], s.material('#3a3a3c', { metalness: 0.6 }), 8));
      bell.position.y = Math.max(bell.position.y, h + 0.1);
      swingers.push({ node: bell, axis: 'x', amp: 0.22, rate: 3.1, phase: 0 });
    }

    // Headgear.
    const bright = mood.cheer > 0.25 ? ['#e8312f', '#f4d13a', '#ffffff', '#3a8fdd', '#e85ca0', '#ff8a2a'] : ['#b7a98f', '#8c5b4a', '#d8cfae', '#7b6a86'];
    const gear = into(body.head, new THREE.Group());
    gear.rotation.x = -body.head.rotation.x * 0.75;
    const blooms: { at: P3; size: number; color: string }[] = [];
    const firs: { at: P3; size: number }[] = [];
    if (a.crown === 'headdress') {
      const n = Math.round(mix(26, 60, mood.density));
      for (let i = 0; i < n; i++) {
        const t = random(), ang = (random() - 0.5) * 2.4, r = 0.34 * (1 - t * 0.75);
        blooms.push({ at: [Math.sin(ang) * r, 0.2 + t * 0.75, -0.02 + Math.cos(ang) * r * 0.35], size: 0.04 + random() * 0.035, color: bright[Math.floor(random() * bright.length)] });
      }
      for (let i = 0; i < 10; i++) { const t = random(), ang = (random() - 0.5) * 2.6; firs.push({ at: [Math.sin(ang) * 0.36 * (1 - t * 0.7), 0.2 + t * 0.85, -0.08], size: 0.8 + random() * 0.6 }); }
      into(gear, s.box([0.03, 0.24, 0.03], [0, 1.06, -0.04], s.material('#c9a03a', { metalness: 0.7, roughness: 0.3 })));
      into(gear, s.box([0.2, 0.03, 0.03], [0, 1.1, -0.04], s.material('#c9a03a', { metalness: 0.7, roughness: 0.3 })));
      for (const x of [-1, 1]) into(gear, s.box([0.05, 0.5, 0.008], [x * 0.3, 0.02, 0.03], s.material(bright[0], { side: THREE.DoubleSide }))).rotation.z = x * 0.2;
    } else if (a.crown === 'wreath') {
      for (let i = 0; i < 22; i++) { const ang = i / 22 * Math.PI * 2; blooms.push({ at: [Math.sin(ang) * 0.17, 0.19 + random() * 0.03, -0.04 + Math.cos(ang) * 0.13], size: 0.035 + random() * 0.02, color: random() < 0.25 ? '#4b8a3a' : bright[Math.floor(random() * bright.length)] }); }
    } else if (a.crown === 'stool') {
      const pine = s.material('#c9a469', { roughness: 0.8 });
      into(gear, s.cylinder(0.16, 0.16, 0.04, [0, 0.24, -0.04], pine, 14));
      for (let i = 0; i < 3; i++) { const ang = i * 2.094 + 0.5; into(gear, s.rod([Math.sin(ang) * 0.1, 0.26, -0.04 + Math.cos(ang) * 0.1], [Math.sin(ang) * 0.16, 0.56, -0.04 + Math.cos(ang) * 0.16], 0.02, pine)); }
      for (let i = 0; i < 18; i++) { const t = random(), ang = random() * 6.3; blooms.push({ at: [Math.sin(ang) * 0.15, 0.27 + t * 0.3, -0.04 + Math.cos(ang) * 0.15], size: 0.035 + random() * 0.02, color: bright[Math.floor(random() * bright.length)] }); }
    }
    if (blooms.length) into(gear, s.scatter(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ roughness: 0.8 }), blooms));
    if (firs.length) into(gear, s.scatter(new THREE.ConeGeometry(0.06, 0.24, 5), s.material('#2f5a35', { roughness: 1 }), firs));

    // Company.
    if (a.company === 'calf') {
      const calf = into(herd, new THREE.Group());
      cow(calf, false, a.doing === 'lying' ? 'lying' : 'staring');
      calf.scale.setScalar(0.52); calf.position.set(0.8, 0, 0.15); calf.rotation.y = 0.35;
    } else if (a.company === 'pat') {
      const dung = s.material('#4f4326', { roughness: 0.7 });
      for (let i = 0; i < 3; i++) into(herd, s.cylinder(0.1 - i * 0.03, 0.2 - i * 0.04, 0.04, [0.25, 0.02 + i * 0.035, -1.75], dung, 12));
      const flies: { at: P3; size: number }[] = [];
      for (let i = 0; i < 4 + mood.density * 8; i++) flies.push({ at: [0.25 + (random() - 0.5) * 0.5, 0.15 + random() * 0.35, -1.75 + (random() - 0.5) * 0.5], size: 0.012 });
      into(herd, s.scatter(new THREE.IcosahedronGeometry(1, 0), eye, flies));
    } else if (a.company === 'salt') {
      const rock = into(herd, s.mesh(new THREE.DodecahedronGeometry(0.3, 0), s.material('#8e8f8b', { flatShading: true }), [0.75, 0.1, 1.5]));
      rock.scale.y = 0.5;
      into(herd, s.box([0.2, 0.16, 0.2], [0.75, 0.3, 1.5], s.material('#f1ded6', { roughness: 0.4 }))).rotation.y = 0.4;
    } else if (a.company === 'bird') {
      const by = a.doing === 'lying' ? 0.89 : 1.47;
      const feather = s.material('#17181c', { roughness: 0.5 });
      into(herd, s.ball([0.06, 0.07, 0.13], [0, by + 0.08, -0.3], feather, 10)).rotation.x = -0.3;
      into(herd, s.ball([0.04, 0.04, 0.045], [0, by + 0.16, -0.2], feather, 8));
      into(herd, s.rod([0, by + 0.155, -0.165], [0, by + 0.145, -0.11], 0.012, s.material('#f2c11e'), 0.003));
      for (const x of [-1, 1]) into(herd, s.rod([x * 0.02, by + 0.03, -0.29], [x * 0.02, by - 0.03, -0.29], 0.006, s.material('#d23a2a')));
    }
    if (mood.wear > 0.5) for (let i = 0; i < 6; i++) into(body.trunk, s.ball([0.1 + random() * 0.08, 0.08, 0.1 + random() * 0.1], [(random() < 0.5 ? -1 : 1) * 0.38, 0.75 + random() * 0.25, -0.7 + random() * 0.4], mud, 6));

    const energy = mix(0.15, 1.3, mood.energy);
    return s.finish({
      footprint: 1.25,
      update: (_dt, time) => {
        for (const sw of swingers) sw.node.rotation[sw.axis] = Math.sin(time * sw.rate * energy + sw.phase) * sw.amp * energy;
      },
    });
  },
});
