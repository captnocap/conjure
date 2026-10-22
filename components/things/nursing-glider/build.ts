import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

const FABRIC = { oatmeal: '#d8cdb8', grey: '#a9adb0', rose: '#d3a3a2', sage: '#9fb09a', navy: '#3d4a68', mustard: '#d3a646' } as const;
const FRAME = { white: '#f0ede5', oak: '#c79e68', espresso: '#4f392c' } as const;

export default defineThing({
  questions: {
    style: choice('What kind of nursing chair is it?', {
      glider: 'The classic nursery glider: a wooden frame with spindle sides and tied-on cushions, swinging on a fixed base.',
      upholstered: 'A fully upholstered wingback swivel glider, plump and expensive.',
      rocker: 'A traditional wooden rocking chair on curved runners with cushions added, handed down.',
    }),
    fabric: choice('What are the cushions covered in?', {
      oatmeal: 'Oatmeal linen.',
      grey: 'Practical dove grey.',
      rose: 'Dusty rose.',
      sage: 'Soft sage green.',
      navy: 'Deep navy that hides stains.',
      mustard: 'Mustard yellow.',
    }),
    frame: choice('What is the woodwork like?', {
      white: 'Painted white.',
      oak: 'Honey oak.',
      espresso: 'Dark espresso stain.',
    }),
    ottoman: choice('Where is the matching ottoman?', {
      front: 'Squarely in front, where feet rest.',
      aside: 'Shoved off to one side at an angle.',
      none: 'There is no ottoman.',
    }),
    pillow: choice('Where is the curved nursing pillow?', {
      seat: 'Waiting on the seat, ready for the next feed.',
      floor: 'Dropped on the floor beside the chair.',
      ottoman: 'Parked on the ottoman, or by the chair if there is none.',
      none: 'No nursing pillow.',
    }),
    muslin: choice('Where is the muslin cloth?', {
      arm: 'Draped over the arm, within reach.',
      back: 'Thrown over the top of the backrest.',
      floor: 'Fallen in a crumpled heap on the floor.',
      none: 'No cloth.',
    }),
    left: choice('What has been left within reach of the chair?', {
      mug: 'A mug of tea gone cold on the floor.',
      bottle: 'A baby bottle, half finished.',
      book: 'A paperback splayed face down.',
      phone: 'A phone lying on the seat, screen still glowing.',
      nothing: 'Nothing at all.',
    }),
    tufted: noul('Is the back cushion button-tufted?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const fabric = s.material(FABRIC[a.fabric], { roughness: 1 });
    const fabricDark = s.material(new THREE.Color(FABRIC[a.fabric]).multiplyScalar(0.82), { roughness: 1 });
    const wood = s.material(FRAME[a.frame], { roughness: 0.45 });
    const chair = new THREE.Group();
    s.root.add(chair);
    const c = <T extends THREE.Object3D>(node: T) => { chair.add(node); return node; };
    const dent = mood.wear * 0.1;
    const pad = (w: number, h: number, d: number, at: readonly [number, number, number], material: THREE.Material, sag = 0, r = Math.min(w, h, d) * 0.42) => {
      const geometry = new RoundedBoxGeometry(w, h, d, 5, r);
      if (sag > 0) {
        const p = geometry.attributes.position;
        for (let i = 0; i < p.count; i++) {
          const x = p.getX(i) / (w * 0.5), z = p.getZ(i) / (d * 0.5);
          if (p.getY(i) > 0) p.setY(i, p.getY(i) - sag * Math.exp(-(x * x + z * z) * 2.2));
        }
        geometry.computeVertexNormals();
      }
      return s.mesh(geometry, material, at);
    };

    let seatTop = 0.48, armTop = 0.66, armX = 0.36, backTop = 1.05;
    const back = new THREE.Group();
    chair.add(back);
    const b = <T extends THREE.Object3D>(node: T) => { back.add(node); return node; };

    if (a.style === 'upholstered') {
      seatTop = 0.47; armTop = 0.64; armX = 0.37; backTop = 1.08;
      s.cylinder(0.3, 0.32, 0.04, [0, 0.02, 0], s.material('#3a3a3c', { metalness: 0.4 }), 28);
      s.cylinder(0.07, 0.09, 0.1, [0, 0.08, 0], s.material('#3a3a3c', { metalness: 0.4 }), 16);
      c(pad(0.84, 0.3, 0.8, [0, 0.26, 0], fabricDark, 0, 0.06));
      c(pad(0.56, 0.16, 0.6, [0, seatTop - 0.07, 0.06], fabric, dent));
      for (const x of [-armX, armX]) c(pad(0.17, 0.3, 0.78, [x, 0.51, 0.01], fabric, 0, 0.08));
      back.position.set(0, 0.38, -0.33); back.rotation.x = -0.2;
      b(pad(0.84, 0.74, 0.2, [0, 0.36, 0], fabric, 0, 0.09));
      b(pad(0.54, 0.5, 0.12, [0, 0.4, 0.1], fabric, 0, 0.055));
      for (const x of [-0.37, 0.37]) b(pad(0.11, 0.42, 0.26, [x, 0.5, 0.13], fabric, 0, 0.05));
    } else {
      const sway = a.style === 'rocker';
      // Seat frame and side frames with spindles.
      c(s.box([0.68, 0.04, 0.6], [0, 0.36, 0], wood));
      for (const x of [-armX, armX]) {
        c(s.box([0.075, 0.035, 0.66], [x, armTop - 0.018, 0.02], wood));
        c(s.box([0.045, 0.05, 0.6], [x, 0.36, 0], wood));
        for (const z of [-0.27, 0.29]) c(s.box([0.045, sway ? armTop - 0.05 : armTop - 0.33, 0.045], [x, sway ? (armTop - 0.05) / 2 + 0.05 : (armTop + 0.31) / 2, z], wood));
        for (let i = 0; i < 5; i++) c(s.rod([x, 0.38, -0.17 + i * 0.09], [x, armTop - 0.03, -0.17 + i * 0.09], 0.011, wood));
        if (!sway) c(pad(0.085, 0.045, 0.4, [x, armTop + 0.018, 0.04], fabric));
      }
      if (sway) {
        for (const x of [-armX, armX]) {
          const runner = s.tube(Array.from({ length: 9 }, (_, i) => { const t = i / 8 - 0.5; return [x, 0.03 + t * t * 0.42, t * 1.0 - 0.03] as const; }), 0.022, wood);
          c(runner);
        }
        for (const z of [-0.27, 0.29]) c(s.rod([-armX, 0.16, z], [armX, 0.16, z], 0.012, wood));
      } else {
        // Fixed glider base and the four swing links the chair hangs from.
        for (const x of [-0.31, 0.31]) {
          s.box([0.06, 0.05, 0.74], [x, 0.025, 0], wood);
          s.box([0.05, 0.05, 0.5], [x, 0.3, 0], wood);
          for (const z of [-0.22, 0.22]) s.box([0.045, 0.26, 0.045], [x, 0.17, z], wood);
        }
        for (const z of [-0.3, 0.3]) s.box([0.62, 0.04, 0.05], [0, 0.03, z], wood);
      }
      c(pad(0.6, 0.13, 0.56, [0, seatTop - 0.06, 0.02], fabric, dent));
      back.position.set(0, 0.36, -0.3); back.rotation.x = -0.2;
      for (const x of [-0.3, 0.3]) b(s.box([0.045, 0.72, 0.045], [x, 0.36, -0.03], wood));
      b(s.box([0.66, 0.07, 0.04], [0, 0.72, -0.03], wood));
      for (let i = 0; i < 6; i++) b(s.rod([-0.225 + i * 0.09, 0.02, -0.03], [-0.225 + i * 0.09, 0.7, -0.03], 0.011, wood));
      b(pad(0.58, sway ? 0.5 : 0.66, 0.13, [0, sway ? 0.33 : 0.4, 0.07], fabric, 0, 0.055));
      // Ties that hold the cushions on.
      for (const x of [-0.27, 0.27]) b(s.rod([x, 0.6, 0.02], [x + (x > 0 ? 0.05 : -0.05), 0.52, -0.07], 0.006, fabricDark));
    }

    if (a.tufted) {
      const buttons: { at: [number, number, number]; size: number }[] = [];
      const front = a.style === 'upholstered' ? 0.162 : 0.137;
      for (let row = 0; row < 3; row++) for (let col = 0; col < 3 + (row % 2); col++)
        buttons.push({ at: [(col - (2 + (row % 2)) / 2) * 0.13, 0.24 + row * 0.13 + (a.style === 'rocker' ? -0.04 : 0), front], size: 0.014 });
      b(s.scatter(new THREE.SphereGeometry(1, 8, 6), fabricDark, buttons));
    }

    // Ottoman.
    const ottoX = a.ottoman === 'aside' ? 0.52 + random() * 0.1 : (random() - 0.5) * 0.06;
    const ottoZ = a.ottoman === 'aside' ? 0.72 : 0.86;
    const otto = new THREE.Group();
    let ottoTop = 0;
    if (a.ottoman !== 'none') {
      s.root.add(otto);
      otto.position.set(ottoX, 0, ottoZ);
      otto.rotation.y = a.ottoman === 'aside' ? 0.5 + random() * 0.5 : (random() - 0.5) * 0.15;
      const o = <T extends THREE.Object3D>(node: T) => { otto.add(node); return node; };
      if (a.style === 'upholstered') {
        ottoTop = 0.4;
        o(s.cylinder(0.2, 0.21, 0.03, [0, 0.015, 0], s.material('#3a3a3c', { metalness: 0.4 }), 20));
        o(pad(0.5, 0.26, 0.42, [0, 0.17, 0], fabricDark, 0, 0.05));
        o(pad(0.48, 0.12, 0.4, [0, 0.34, 0], fabric, dent * 0.6));
      } else {
        ottoTop = 0.38;
        for (const x of [-0.2, 0.2]) {
          if (a.style === 'rocker') o(s.tube(Array.from({ length: 7 }, (_, i) => { const t = i / 6 - 0.5; return [x, 0.025 + t * t * 0.3, t * 0.46] as const; }), 0.018, wood));
          else o(s.box([0.05, 0.045, 0.44], [x, 0.022, 0], wood));
          for (const z of [-0.13, 0.13]) o(s.box([0.04, 0.24, 0.04], [x, 0.15, z], wood));
        }
        o(s.box([0.46, 0.04, 0.36], [0, 0.27, 0], wood));
        o(pad(0.46, 0.11, 0.38, [0, 0.33, 0], fabric, dent * 0.6));
      }
    }

    // Nursing pillow: a fat C.
    if (a.pillow !== 'none') {
      const cover = new THREE.CanvasTexture(dots(a.fabric === 'oatmeal' || a.fabric === 'grey' ? '#f3d9a8' : '#f4f0e6', a.fabric === 'navy' ? '#6f86b8' : '#ffffff'));
      cover.colorSpace = THREE.SRGBColorSpace; cover.wrapS = cover.wrapT = THREE.RepeatWrapping; cover.repeat.set(6, 2);
      const pillow = s.mesh(new THREE.TorusGeometry(0.2, 0.088, 12, 28, Math.PI * 1.42), new THREE.MeshStandardMaterial({ map: cover, roughness: 1 }));
      pillow.scale.z = 0.8;
      const onOtto = a.pillow === 'ottoman' && a.ottoman !== 'none';
      if (a.pillow === 'seat') {
        pillow.rotation.set(-Math.PI / 2 + 0.05, 0, -3.85 + (random() - 0.5) * 0.3, 'XYZ');
        pillow.position.set(0, seatTop + 0.06 - dent * 0.5, 0.1);
        chair.add(pillow);
      } else if (onOtto) {
        pillow.rotation.set(-Math.PI / 2, 0, random() * 6);
        pillow.position.set(0, ottoTop + 0.06, 0);
        otto.add(pillow);
      } else {
        // Leaning against the side of the chair, or flat on the floor.
        if (a.pillow === 'floor') { pillow.rotation.set(-Math.PI / 2, 0, random() * 6); pillow.position.set(-0.68, 0.07, 0.35 + random() * 0.2); }
        else { pillow.rotation.set(0.1, Math.PI / 2 - 0.2, -2.2, 'YXZ'); pillow.position.set(-0.53, 0.27, 0.1); }
      }
    }

    // Muslin square.
    if (a.muslin !== 'none') {
      const print = new THREE.CanvasTexture(dots('#fbfaf4', '#b9c9d6'));
      print.colorSpace = THREE.SRGBColorSpace; print.wrapS = print.wrapT = THREE.RepeatWrapping; print.repeat.set(2, 2);
      const muslin = new THREE.MeshStandardMaterial({ map: print, roughness: 1 });
      if (a.muslin === 'arm') {
        const x = armX, w = a.style === 'upholstered' ? 0.19 : 0.1, z = 0.08 + random() * 0.12;
        c(s.box([w, 0.012, 0.3], [x, armTop + (a.style === 'glider' ? 0.045 : 0.008), z], muslin));
        c(s.box([0.012, 0.3 + random() * 0.1, 0.3], [x + w / 2, armTop - 0.14, z], muslin)).rotation.z = 0.03;
        c(s.box([0.012, 0.16 + random() * 0.08, 0.3], [x - w / 2, armTop - 0.07, z], muslin));
      } else if (a.muslin === 'back') {
        const h = a.style === 'rocker' ? 0.76 : a.style === 'glider' ? 0.74 : 0.74, t = a.style === 'upholstered' ? 0.22 : 0.16, x = (random() - 0.5) * 0.2;
        b(s.box([0.32, 0.012, t], [x, h + 0.012, 0.02], muslin));
        b(s.box([0.32, 0.26 + random() * 0.1, 0.012], [x, h - 0.14, t / 2 + 0.02], muslin));
        b(s.box([0.32, 0.3, 0.012], [x, h - 0.14, -t / 2 + 0.02], muslin));
      } else {
        const heap = s.mesh(new THREE.IcosahedronGeometry(1, 2), muslin, [0.62, 0.035, 0.3 + random() * 0.25]);
        const p = heap.geometry.attributes.position;
        for (let i = 0; i < p.count; i++) p.setY(i, p.getY(i) * (0.6 + random() * 0.7));
        heap.geometry.computeVertexNormals();
        heap.scale.set(0.16, 0.045, 0.13); heap.rotation.y = random() * 3;
      }
    }

    // Whatever was put down when the baby finally slept.
    const fx = 0.6 + random() * 0.08, fz = -0.05 + random() * 0.15;
    if (a.left === 'mug') {
      const mug = s.material(new THREE.Color().setHSL(random(), 0.4, 0.55), { roughness: 0.3 });
      s.cylinder(0.042, 0.036, 0.095, [fx, 0.0475, fz], mug, 18);
      s.ring(0.028, 0.008, [fx + 0.045, 0.05, fz], mug).scale.set(1, 1, 1);
      s.cylinder(0.037, 0.037, 0.004, [fx, 0.08, fz], s.material('#6b4a2e', { roughness: 0.2 }), 18);
    } else if (a.left === 'bottle') {
      s.cylinder(0.03, 0.03, 0.12, [fx, 0.06, fz], s.material('#eef3f4', { roughness: 0.15, transparent: true, opacity: 0.75 }), 16);
      s.cylinder(0.027, 0.027, 0.05 + random() * 0.04, [fx, 0.035, fz], s.material('#fbf6e6'), 16);
      s.cylinder(0.033, 0.033, 0.022, [fx, 0.13, fz], s.material('#8fc0c9'), 16);
      s.cylinder(0.008, 0.02, 0.035, [fx, 0.158, fz], s.material('#e8d9b8', { roughness: 0.3 }), 12);
    } else if (a.left === 'book') {
      const cover = s.material(new THREE.Color().setHSL(random(), 0.5, 0.42));
      for (const side of [-1, 1]) {
        const leaf = s.box([0.13, 0.014, 0.19], [fx + side * 0.058, 0.03, fz], cover);
        leaf.rotation.z = -side * 0.42; leaf.rotation.y = 0;
        s.box([0.125, 0.012, 0.18], [fx + side * 0.056, 0.02, fz], s.material('#f1ead8')).rotation.z = -side * 0.42;
      }
    } else if (a.left === 'phone') {
      const phone = c(s.box([0.075, 0.009, 0.15], [0.14, seatTop + 0.022 - dent * 0.25, 0.2], s.material('#1c1d21', { roughness: 0.3 })));
      phone.rotation.y = 0.4 + random() * 0.6;
      const screen = s.box([0.066, 0.002, 0.138], [0, 0.0055, 0], new THREE.MeshStandardMaterial({ color: '#dfeaff', emissive: '#bcd4ff', emissiveIntensity: 1.3 }));
      phone.add(screen);
    }
    if (mood.density > 0.7) {
      // A burp cloth and a fallen sock: the debris of a busy night.
      s.box([0.2, 0.01, 0.16], [-0.6, 0.006, 0.7], s.material('#f7f4ec', { roughness: 1 })).rotation.y = random();
      s.ball([0.05, 0.016, 0.025], [0.3, 0.014, 0.45 + random() * 0.1], s.material('#f1c9cf', { roughness: 1 }), 10).rotation.y = random() * 3;
    }

    const amount = mix(0.02, 1, mood.energy);
    const rate = mix(0.9, 1.9, mood.energy), phase = random() * 6;
    const rocker = a.style === 'rocker';
    return s.finish({
      update: (_dt, time) => {
        const swing = Math.sin(time * rate + phase) * amount;
        if (rocker) { chair.rotation.x = swing * 0.11; chair.position.z = swing * 0.03; }
        else { chair.position.z = swing * 0.05; chair.position.y = (1 - Math.cos(swing * 1.2)) * 0.02; chair.rotation.x = swing * 0.025; }
        if (a.ottoman === 'front' && !rocker) otto.children.forEach((part, i) => { if (i >= (a.style === 'upholstered' ? 1 : 6)) part.position.z = swing * 0.02; });
      },
    });
  },
});

function dots(ground: string, ink: string) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const g = canvas.getContext('2d')!;
  g.fillStyle = ground; g.fillRect(0, 0, 64, 64);
  g.fillStyle = ink;
  for (const [x, y] of [[16, 16], [48, 48]]) { g.beginPath(); g.arc(x, y, 9, 0, 7); g.fill(); }
  return canvas;
}
