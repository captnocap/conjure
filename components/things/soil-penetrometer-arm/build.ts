import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

type P3 = [number, number, number];
const V = (p: P3) => new THREE.Vector3(...p);
const lerp3 = (a: P3, b: P3, t: number): P3 => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];

const BARS = {
  grey: ['#111111', '#3a3a3a', '#666666', '#939393', '#c2c2c2', '#f4f4f4'],
  colour: ['#f4f4f4', '#e2c22a', '#2f9a48', '#2c58c8', '#c8302a', '#111111'],
  teeth: ['#111111', '#f4f4f4', '#111111', '#f4f4f4', '#111111', '#f4f4f4', '#111111', '#f4f4f4'],
  rainbow: ['#c8302a', '#e07a22', '#e2c22a', '#2f9a48', '#2c58c8', '#5b3aa0'],
} as const;

export default defineThing({
  questions: {
    state: choice('What is the arm doing right now?', {
      pressing: 'Swung down and pressing: the conical tip sunk into the ground, a ring of disturbed grit around it.',
      folded: 'Still folded against its mount, latched, waiting for the command that may never come.',
      jammed: 'Jammed: the forearm bent and the tip skidded against a slab edge at a wrong angle.',
      lifted: 'Lifted clear after the measurement, a neat conical hole left in the ground below.',
    }),
    mount: choice('What is it mounted on?', {
      ring: 'A curved stretch of the lander\'s toothed landing ring.',
      post: 'A squat square instrument post bolted to a base plate.',
      skid: 'A flat sled-like skid plate, as if the lander were just out of frame.',
    }),
    build: choice('How is the arm made?', {
      tube: 'Round polished tubes with fat hinge knuckles.',
      lattice: 'A light lattice truss of thin rods, like a tiny crane jib.',
      flat: 'Stamped flat steel bars riveted at the joints, crude and strong.',
    }),
    bar: choice('What calibration target stands beside it for the camera?', {
      grey: 'A grey-scale step wedge from white to black.',
      colour: 'Patches of white, yellow, green, blue, red and black.',
      teeth: 'Alternating black and white blocks like a ruler.',
      rainbow: 'A bright rainbow strip of saturated colours.',
      twin: 'Two bars, a grey wedge and a colour strip, side by side.',
    }),
    ground: choice('What is the ground it presses into?', {
      soil: 'Dark fine soil that takes the tip easily.',
      slab: 'A flat basalt slab, hard enough that the tip barely scratches it.',
      rubble: 'Grit and pebbles crowded with sharp flakes.',
      dust: 'Rust-orange dust drifted in a soft layer.',
    }),
    cable: choice('How does its cable run?', {
      taut: 'Pulled straight along the arm, tidy and taped.',
      looped: 'In a loose loop sagging to the ground.',
      torn: 'Snapped, the frayed end trailing in the dust.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const dust = mix(0.05, 0.55, mood.wear);
    const ochre = new THREE.Color('#a87c46');
    const paint = (colour: string, options: THREE.MeshStandardMaterialParameters = {}) =>
      new THREE.MeshStandardMaterial({ color: new THREE.Color(colour).lerp(ochre, dust * 0.5), roughness: mix(0.45, 0.95, dust), ...options });
    const steel = paint('#c3c0b6', { metalness: 0.65 });
    const dark = paint('#2b2825', { metalness: 0.3 });
    const frame = paint('#5a5a55', { metalness: 0.45 });
    const shell = paint('#d8d5cb', { metalness: 0.25 });

    // ---- Ground patch ----------------------------------------------------------------------
    const groundTone = { soil: '#3b302a', slab: '#4a4038', rubble: '#4d4036', dust: '#9a5e33' }[a.ground];
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = groundTone;
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 1400; i++) {
      ctx.fillStyle = random() < 0.5 ? `rgba(160,130,95,${random() * 0.25})` : `rgba(10,8,6,${random() * 0.35})`;
      ctx.fillRect(random() * 256, random() * 256, 1 + random() * 3, 1 + random() * 3);
    }
    if (a.ground === 'slab') {
      ctx.strokeStyle = 'rgba(12,9,7,0.7)';
      for (let i = 0; i < 6; i++) { ctx.lineWidth = 1 + random() * 2; ctx.beginPath(); let x = random() * 256, y = random() * 256; ctx.moveTo(x, y); for (let k = 0; k < 5; k++) { x += (random() - 0.5) * 90; y += (random() - 0.5) * 90; ctx.lineTo(x, y); } ctx.stroke(); }
    }
    ctx.fillStyle = `rgba(168,124,70,${dust * 0.4})`;
    ctx.fillRect(0, 0, 256, 256);
    const groundMap = new THREE.CanvasTexture(canvas);
    groundMap.colorSpace = THREE.SRGBColorSpace;
    const groundPaint = new THREE.MeshStandardMaterial({ map: groundMap, bumpMap: groundMap, bumpScale: 1, roughness: 0.97 });
    const pad = a.ground === 'slab' ? 0.06 : 0.035;
    if (a.ground === 'slab') {
      const outline = new THREE.Shape();
      for (let i = 0; i < 8; i++) { const t = (i / 8) * Math.PI * 2 + (random() - 0.5) * 0.3, r = 0.56 + random() * 0.14; i ? outline.lineTo(Math.cos(t) * r, -Math.sin(t) * r * 0.85) : outline.moveTo(Math.cos(t) * r, -Math.sin(t) * r * 0.85); }
      const plate = new THREE.ExtrudeGeometry(outline, { depth: pad - 0.01, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.012, bevelSegments: 1 });
      plate.rotateX(-Math.PI / 2);
      s.mesh(plate, groundPaint, [0, 0.008, 0.05]);
    } else {
      s.cylinder(0.62, 0.66, pad, [0, pad / 2, 0.05], groundPaint, 32);
    }
    if (a.ground === 'rubble') {
      const stones = Array.from({ length: 40 }, () => {
        const angle = random() * Math.PI * 2, r = 0.12 + random() * 0.46;
        return { at: [Math.cos(angle) * r, pad + 0.01, 0.05 + Math.sin(angle) * r * 0.9] as P3, size: mix(0.012, 0.05, random() ** 2) };
      });
      s.scatter(new THREE.DodecahedronGeometry(1, 0), paint('#3a322c'), stones);
    }

    // ---- Mount -----------------------------------------------------------------------------
    const backZ = -0.42;
    let shoulder: P3;
    if (a.mount === 'ring') {
      const R = 1.5, span = 0.95;
      const ring = new THREE.TorusGeometry(R, 0.06, 10, 36, span);
      ring.rotateZ(Math.PI / 2 - span / 2);
      ring.rotateX(Math.PI / 2);
      s.mesh(ring, paint('#8a8173', { metalness: 0.35 }), [0, 0.12, backZ - R]);
      for (let i = 0; i <= 9; i++) {
        const t = Math.PI / 2 - span / 2 + 0.04 + (i / 9) * (span - 0.08);
        s.box([0.07, 0.09, 0.1], [Math.cos(t) * (R + 0.09), 0.05, backZ - R + Math.sin(t) * (R + 0.09)], dark).rotation.y = -t + Math.PI / 2;
      }
      s.box([0.16, 0.14, 0.14], [0.38, 0.25, backZ + 0.02], frame);
      shoulder = [0.38, 0.3, backZ + 0.08];
    } else if (a.mount === 'post') {
      s.box([0.34, 0.03, 0.3], [0.38, 0.015, backZ], frame);
      s.box([0.16, 0.42, 0.16], [0.38, 0.24, backZ], shell);
      for (const [x, z] of [[-0.12, -0.11], [0.12, -0.11], [-0.12, 0.11], [0.12, 0.11]]) s.cylinder(0.012, 0.012, 0.02, [0.38 + x, 0.04, backZ + z], dark, 6);
      shoulder = [0.38, 0.42, backZ + 0.09];
    } else {
      const skid = s.box([1.1, 0.05, 0.36], [0, 0.04, backZ - 0.05], frame);
      skid.rotation.x = -0.04;
      s.box([1.1, 0.12, 0.04], [0, 0.1, backZ + 0.12], shell);
      for (let i = 0; i < 8; i++) s.cylinder(0.012, 0.012, 0.02, [-0.48 + i * 0.137, 0.1, backZ + 0.145], dark, 6).rotation.x = Math.PI / 2;
      s.box([0.14, 0.12, 0.14], [0.38, 0.22, backZ + 0.06], frame);
      shoulder = [0.38, 0.26, backZ + 0.12];
    }

    // ---- Arm geometry ------------------------------------------------------------------------
    const tipAt: P3 = [-0.14 + (random() - 0.5) * 0.08, pad, 0.24 + (random() - 0.5) * 0.06];
    const head = 0.15, cone = 0.13;
    let wrist: P3, elbow: P3, tipDown: P3 = [0, -1, 0];
    let kink: P3 | null = null;
    if (a.state === 'pressing') {
      wrist = [tipAt[0], pad + cone * 0.55 + head, tipAt[2]];
      elbow = [lerp3(shoulder, wrist, 0.62)[0], Math.max(shoulder[1], wrist[1]) + 0.36, lerp3(shoulder, wrist, 0.55)[2]];
    } else if (a.state === 'lifted') {
      wrist = [tipAt[0], pad + cone + head + 0.16, tipAt[2]];
      elbow = [lerp3(shoulder, wrist, 0.62)[0], Math.max(shoulder[1], wrist[1]) + 0.28, lerp3(shoulder, wrist, 0.55)[2]];
    } else if (a.state === 'folded') {
      elbow = [shoulder[0] - 0.06, shoulder[1] + 0.5, shoulder[2] + 0.06];
      wrist = [shoulder[0] - 0.24, shoulder[1] + 0.36, shoulder[2] + 0.14];
      tipDown = [-0.15, -1, 0.05];
    } else {
      wrist = [tipAt[0] + 0.12, pad + 0.27, tipAt[2] - 0.04];
      elbow = [lerp3(shoulder, wrist, 0.5)[0] + 0.1, Math.max(shoulder[1], wrist[1]) + 0.3, lerp3(shoulder, wrist, 0.5)[2]];
      kink = [lerp3(elbow, wrist, 0.5)[0] + 0.08, lerp3(elbow, wrist, 0.5)[1] + 0.06, lerp3(elbow, wrist, 0.5)[2] + 0.05];
      tipDown = [-0.55, -1, 0.25];
    }

    const beam = (from: P3, to: P3) => {
      if (a.build === 'tube') {
        s.rod(from, to, 0.03, steel);
      } else if (a.build === 'lattice') {
        const along = V(to).sub(V(from));
        const side = new THREE.Vector3().crossVectors(along, new THREE.Vector3(0, 1, 0));
        if (side.lengthSq() < 1e-6) side.set(1, 0, 0);
        side.normalize().multiplyScalar(0.04);
        const up = new THREE.Vector3().crossVectors(side, along).normalize().multiplyScalar(0.032);
        const rails = [side.clone().add(up), side.clone().negate().add(up), up.clone().negate()];
        for (const off of rails) s.rod(V(from).add(off).toArray() as P3, V(to).add(off).toArray() as P3, 0.01, steel);
        const bays = Math.max(3, Math.round(along.length() / 0.09));
        for (let i = 0; i < bays; i++) {
          const p = V(from).addScaledVector(along, i / bays), q = V(from).addScaledVector(along, (i + 1) / bays);
          const r1 = rails[i % 3], r2 = rails[(i + 1) % 3];
          s.rod(p.clone().add(r1).toArray() as P3, q.clone().add(r2).toArray() as P3, 0.006, steel);
        }
      } else {
        const along = V(to).sub(V(from));
        const bar = s.box([0.02, 0.075, along.length()], lerp3(from, to, 0.5), steel);
        bar.quaternion.setFromRotationMatrix(new THREE.Matrix4().lookAt(V(from), V(to), new THREE.Vector3(0, 1, 0)));
        for (const p of [from, to]) s.cylinder(0.016, 0.016, 0.04, p, dark, 8).rotation.z = Math.PI / 2;
      }
    };
    const knuckle = (at: P3, size = 0.045) => {
      const pin = s.cylinder(size, size, 0.1, at, frame, 14);
      pin.rotation.z = Math.PI / 2;
      pin.rotation.y = 0.2;
    };
    beam(shoulder, elbow);
    if (kink) { beam(elbow, kink); beam(kink, wrist); knuckle(kink, 0.03); } else beam(elbow, wrist);
    knuckle(shoulder, 0.055);
    knuckle(elbow);
    // A damper strut from the mount to the upper arm, with its spring.
    const strutFrom: P3 = [shoulder[0] - 0.06, shoulder[1] - 0.1, shoulder[2] - 0.02];
    const strutTo = lerp3(shoulder, elbow, 0.55);
    s.rod(strutFrom, strutTo, 0.012, dark);
    {
      const axis = V(strutTo).sub(V(strutFrom));
      const ortho = new THREE.Vector3().crossVectors(axis, new THREE.Vector3(1, 0, 0)).normalize();
      const ortho2 = new THREE.Vector3().crossVectors(axis, ortho).normalize();
      const coil: P3[] = [];
      for (let i = 0; i <= 60; i++) {
        const t = 0.15 + (i / 60) * 0.55, angle = i * 0.75;
        coil.push(V(strutFrom).addScaledVector(axis, t).addScaledVector(ortho, Math.cos(angle) * 0.022).addScaledVector(ortho2, Math.sin(angle) * 0.022).toArray() as P3);
      }
      s.tube(coil, 0.004, paint('#b58a3a', { metalness: 0.6 }));
    }

    // ---- The penetrometer head and its conical tip ------------------------------------------------
    const headGroup = new THREE.Group();
    headGroup.position.set(...wrist);
    headGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), V(tipDown).normalize());
    s.root.add(headGroup);
    const hold = <T extends THREE.Object3D>(node: T) => { headGroup.add(node); return node; };
    hold(s.cylinder(0.055, 0.055, head, [0, -head / 2, 0], shell, 18));
    hold(s.cylinder(0.06, 0.06, 0.02, [0, -0.01, 0], frame, 18));
    hold(s.cylinder(0.1, 0.1, 0.012, [0, -head + 0.005, 0], frame, 24));
    hold(s.cylinder(0.042, 0.002, cone, [0, -head - cone / 2, 0], paint('#9d988c', { metalness: 0.8, roughness: 0.3 }), 18));
    for (let i = 0; i < 4; i++) hold(s.box([0.008, head * 0.7, 0.014], [Math.cos(i * 1.57) * 0.056, -head / 2, Math.sin(i * 1.57) * 0.056], dark)).rotation.y = -i * 1.57;

    // Marks on the ground.
    const grit = paint(a.ground === 'dust' ? '#a8683a' : '#6b5038', { roughness: 1 });
    if (a.state === 'pressing' && a.ground !== 'slab') {
      const lip = s.mesh(new THREE.TorusGeometry(0.08, 0.022, 8, 20), grit, [tipAt[0], pad, tipAt[2]]);
      lip.rotation.x = Math.PI / 2;
      lip.scale.z = 0.6;
    } else if (a.state === 'lifted') {
      s.mesh(new THREE.TorusGeometry(0.045, 0.014, 8, 20), grit, [tipAt[0], pad, tipAt[2]]).rotation.x = Math.PI / 2;
      const hole = s.mesh(new THREE.CircleGeometry(0.035, 18), new THREE.MeshStandardMaterial({ color: '#120d09', roughness: 1 }), [tipAt[0], pad + 0.003, tipAt[2]]);
      hole.rotation.x = -Math.PI / 2;
    } else if (a.state === 'jammed') {
      const scrape = s.box([0.24, 0.004, 0.025], [tipAt[0] - 0.02, pad + 0.002, tipAt[2] + 0.02], paint('#b4aa98', { roughness: 0.9 }));
      scrape.rotation.y = 0.5;
      const step = s.box([0.5, 0.06, 0.22], [tipAt[0] - 0.22, pad + 0.03, tipAt[2] + 0.12], paint('#3e352e', { roughness: 0.95 }));
      step.rotation.y = 0.5;
    }

    // ---- Cable ---------------------------------------------------------------------------------
    const cableMat = paint('#1f1c1a', { roughness: 0.8 });
    const from: P3 = [shoulder[0] + 0.05, shoulder[1] - 0.04, shoulder[2] - 0.03];
    if (a.cable === 'taut') {
      s.tube([from, [elbow[0] + 0.03, elbow[1] + 0.03, elbow[2] + 0.02], [wrist[0] + 0.04, wrist[1] + 0.02, wrist[2]]], 0.006, cableMat);
    } else if (a.cable === 'looped') {
      const low = lerp3(from, wrist, 0.5);
      s.tube([from, [low[0] + 0.25, pad + 0.02, low[2] + 0.05], [low[0] + 0.1, pad + 0.03, low[2] + 0.22], [wrist[0] + 0.04, wrist[1] + 0.02, wrist[2]]], 0.007, cableMat);
    } else {
      s.tube([from, [from[0] + 0.15, pad + 0.05, from[2] + 0.18], [from[0] + 0.3, pad + 0.012, from[2] + 0.35], [from[0] + 0.45, pad + 0.01, from[2] + 0.38]], 0.007, cableMat);
      s.tube([[wrist[0] + 0.04, wrist[1] + 0.02, wrist[2]], [wrist[0] + 0.12, wrist[1] - 0.06, wrist[2] + 0.03], [wrist[0] + 0.15, wrist[1] - 0.16, wrist[2] + 0.02]], 0.006, cableMat);
      for (let i = 0; i < 5; i++) s.rod([from[0] + 0.45, pad + 0.01, from[2] + 0.38], [from[0] + 0.48 + random() * 0.05, pad + 0.01, from[2] + 0.36 + random() * 0.06], 0.002, paint('#b5793a', { metalness: 0.7 }));
    }

    // ---- Calibration bar(s) ------------------------------------------------------------------------
    const barTexture = (colours: readonly string[]) => {
      const c = document.createElement('canvas');
      c.width = 384; c.height = 64;
      const g = c.getContext('2d')!;
      colours.forEach((colour, i) => {
        const tint = new THREE.Color(colour).lerp(ochre, dust * 0.4).offsetHSL(0, (mood.cheer - 0.5) * 0.15, 0);
        g.fillStyle = tint.getStyle();
        g.fillRect((i * 384) / colours.length, 0, 384 / colours.length + 1, 64);
      });
      g.strokeStyle = 'rgba(20,18,16,0.8)'; g.lineWidth = 4; g.strokeRect(2, 2, 380, 60);
      const map = new THREE.CanvasTexture(c);
      map.colorSpace = THREE.SRGBColorSpace;
      return new THREE.MeshStandardMaterial({ map, roughness: 0.7 });
    };
    const bars = a.bar === 'twin' ? [BARS.grey, BARS.colour] : [BARS[a.bar]];
    bars.forEach((colours, index) => {
      const x = 0.3 - index * 0.06, z = 0.3 + index * 0.16, y = 0.2;
      const face = barTexture(colours);
      const edge = dark;
      const slab = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.1, 0.02), [edge, edge, edge, edge, face, edge]);
      slab.position.set(x, y, z);
      slab.castShadow = slab.receiveShadow = true;
      s.root.add(slab);
      slab.rotation.set(-0.2, 0.35, 0);
      for (const dx of [-0.16, 0.16]) {
        const lx = x + Math.cos(0.35) * dx, lz = z - Math.sin(0.35) * dx;
        s.rod([lx, pad, lz - 0.03], [lx, y - 0.02, lz - 0.005], 0.008, frame);
      }
    });

    // Energy makes the dynamic probe tap: the head rises and drops in short strokes.
    const rest = headGroup.position.y;
    const pace = mix(0.5, 3.5, mood.energy);
    const tapping = a.state === 'pressing' || a.state === 'lifted';
    return s.finish({
      update(_dt, time) {
        if (!tapping) return;
        const stroke = Math.max(0, Math.sin(time * pace)) ** 6;
        headGroup.position.y = rest + stroke * 0.03;
      },
    });
  },
});
