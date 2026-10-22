import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

type P3 = readonly [number, number, number];

const SHAPES = {
  dome: 'A low beehive dome with the funnel mouth in the crown.',
  barrel: 'A barrel lying on its side with a funnel woven into each end.',
  box: 'A square slatted cage with a side funnel and a hinged lid.',
  cone: 'A long tapering cone, a fish-trap shape with one wide mouth.',
} as const;
const CANES = {
  bamboo: 'Split golden bamboo in an open diamond lattice.',
  rattan: 'Dark brown rattan woven tight like a basket.',
  green: 'Freshly cut green cane, made this week.',
  wire: 'Rusting chicken wire stretched over a cane frame, a modern shortcut.',
} as const;
const CANE_COLOURS: Record<keyof typeof CANES, [string, string]> = {
  bamboo: ['#d2ab5e', '#8f6c2f'], rattan: ['#85552b', '#4a2d16'], green: ['#9db04e', '#5d7030'], wire: ['#8d7460', '#c2a15c'],
};

export default defineThing({
  questions: {
    shape: choice('What shape is the trap?', SHAPES),
    cane: choice('What is it woven from?', CANES),
    catch: choice('What is inside it?', {
      empty: 'Nothing but the bait, still waiting.',
      'mud-crabs': 'Two or three heavy dark mud crabs with orange claws.',
      'blue-crabs': 'Several blue swimmer crabs, bright as enamel.',
      'one-giant': 'A single enormous crab that barely fits, the catch of the season.',
      fish: 'A few silver fish that wandered in by mistake.',
      rubbish: 'A plastic bottle, a flip-flop and weed: the tide brought junk.',
    }),
    stack: choice('How many pots are there?', {
      single: 'One pot on its own.',
      pair: 'Two, the second leaning against the first.',
      stack: 'A stack of three ready for the boat.',
    }),
    float: choice('What marks it on the surface?', {
      bottle: 'An empty plastic jug reused as a buoy.',
      bamboo: 'A sealed length of fat bamboo.',
      coconut: 'A dry coconut husk on the line.',
      foam: 'A chewed block of white polystyrene with a painted stripe.',
      glass: 'An old green glass ball in a knotted net.',
    }),
    moment: choice('What moment is this?', {
      baited: 'Baited and ready, line coiled neatly beside it.',
      hauled: 'Just hauled out, dripping, draped in weed, standing in its own puddle.',
      drying: 'Left out to dry and bleach between seasons, line thrown anyhow.',
      mending: 'Half mended: a hole in the side and loose cane strips laid out.',
    }),
    flag: noul('Does the float carry a little rag flag on a stick?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const [light, shade] = CANE_COLOURS[a.cane];
    const wet = a.moment === 'hauled';
    const lattice = (() => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 128;
      const ctx = canvas.getContext('2d')!;
      const strip = (x0: number, y0: number, x1: number, y1: number, width: number, colour: string) => {
        ctx.strokeStyle = colour;
        ctx.lineWidth = width;
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      };
      if (a.cane === 'rattan') {
        ctx.fillStyle = shade;
        ctx.fillRect(0, 0, 128, 128);
        ctx.clearRect(20, 20, 24, 24); ctx.clearRect(84, 84, 24, 24); ctx.clearRect(84, 20, 24, 24); ctx.clearRect(20, 84, 24, 24);
        for (const v of [0, 64, 128]) { strip(0, v, 128, v, 30, light); strip(v, 0, v, 128, 22, shade); }
        for (const v of [32, 96]) strip(0, v, 128, v, 12, light);
      } else if (a.cane === 'wire') {
        for (let k = -2; k < 4; k++) { strip(k * 64, 0, k * 64 + 128, 128, 5, light); strip(k * 64 + 128, 0, k * 64, 128, 5, light); }
      } else {
        for (let k = -2; k < 4; k++) { strip(k * 64 - 4, 0, k * 64 + 124, 128, 12, shade); strip(k * 64 + 128, 0, k * 64, 128, 12, light); }
        for (let k = -2; k < 4; k++) strip(k * 64 + 32, 32, k * 64 + 96, 96, 12, shade);
      }
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      return texture;
    })();
    const tint = new THREE.Color('#ffffff').lerp(new THREE.Color('#9a958a'), mood.wear * 0.55).multiplyScalar(wet ? 0.72 : 1);
    const weave = new THREE.MeshStandardMaterial({ map: lattice, color: tint, alphaTest: 0.5, side: THREE.DoubleSide, roughness: wet ? 0.35 : 0.8 });
    const frame = s.material(new THREE.Color(a.cane === 'wire' ? '#b08d55' : shade).multiplyScalar(wet ? 0.75 : 1), { roughness: wet ? 0.35 : 0.75 });
    const pale = s.material(light, { roughness: 0.7 });
    const hollow = s.material('#15120e', { roughness: 1, side: THREE.DoubleSide });
    const rope = s.material(mix(0, 1, mood.cheer) > 0.6 ? '#3f86c9' : '#c9b78a', { roughness: 0.9 });
    const tile = <G extends THREE.BufferGeometry>(geometry: G, u: number, v: number) => {
      const uv = geometry.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * u, uv.getY(i) * v);
      return geometry;
    };

    const crab = (size: number, body: string, claw: string) => {
      const group = new THREE.Group();
      const shellPaint = s.material(body, { roughness: 0.4 }), clawPaint = s.material(claw, { roughness: 0.4 });
      const shell = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 8), shellPaint);
      shell.scale.set(size * 0.5, size * 0.16, size * 0.34);
      shell.position.y = size * 0.2;
      group.add(shell);
      for (const e of [-1, 1]) {
        const arm = new THREE.Mesh(new THREE.CylinderGeometry(size * 0.05, size * 0.06, size * 0.4, 6), shellPaint);
        arm.position.set(e * size * 0.5, size * 0.2, size * 0.3);
        arm.rotation.set(Math.PI / 2, 0, e * -0.9);
        const nip = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 6), clawPaint);
        nip.scale.set(size * 0.2, size * 0.1, size * 0.13);
        nip.position.set(e * size * 0.42, size * 0.22, size * 0.52);
        nip.rotation.y = e * 0.7;
        group.add(arm, nip);
        for (let i = 0; i < 4; i++) {
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(size * 0.012, size * 0.035, size * 0.5, 5), shellPaint);
          leg.position.set(e * size * 0.62, size * 0.14, size * (0.12 - i * 0.14));
          leg.rotation.set(0, 0, e * 1.15 + (random() - 0.5) * 0.2);
          leg.rotation.y = -e * (i - 1.5) * 0.3;
          group.add(leg);
        }
      }
      return group;
    };

    /** One trap, standing on y = 0 at its own origin. Returns where the line ties on and how much room it has inside. */
    const pot = (withCatch: boolean) => {
      const group = new THREE.Group();
      const add = <T extends THREE.Object3D>(node: T, at: P3 = [0, 0, 0]) => { node.position.set(...at); node.traverse((c) => { c.castShadow = c.receiveShadow = true; }); group.add(node); return node; };
      const hoop = (radius: number, at: P3, axis: 'x' | 'y', thick = 0.011) => {
        const ring = add(new THREE.Mesh(new THREE.TorusGeometry(radius, thick, 6, 28), frame), at);
        if (axis === 'y') ring.rotation.x = Math.PI / 2; else ring.rotation.y = Math.PI / 2;
        return ring;
      };
      const funnel = (wide: number, narrow: number, depth: number) => {
        const cone = new THREE.Group();
        cone.add(new THREE.Mesh(tile(new THREE.CylinderGeometry(wide, narrow, depth, 20, 1, true), 8, 1.5), weave));
        const throat = new THREE.Mesh(new THREE.CircleGeometry(narrow, 14), hollow);
        throat.rotation.x = Math.PI / 2;
        throat.position.y = -depth / 2;
        const lip = new THREE.Mesh(new THREE.TorusGeometry(narrow, 0.008, 6, 18), pale);
        lip.rotation.x = Math.PI / 2;
        lip.position.y = -depth / 2;
        cone.add(throat, lip);
        return cone;
      };
      let tie: P3 = [0, 0.3, 0], room: [number, number, number] = [0.2, 0.05, 0.2], floor = 0.02;
      if (a.shape === 'dome') {
        const R = 0.31, tall = 0.78;
        const shell = add(new THREE.Mesh(tile(new THREE.SphereGeometry(R, 28, 10, 0, Math.PI * 2, 0.36, Math.PI / 2 - 0.36), 18, 5), weave));
        shell.scale.y = tall;
        add(new THREE.Mesh(tile(new THREE.CircleGeometry(R, 28), 9, 9), weave), [0, 0.012, 0]).rotation.x = -Math.PI / 2;
        hoop(R, [0, 0.012, 0], 'y', 0.015);
        hoop(R * 0.82, [0, R * tall * 0.57, 0], 'y', 0.008);
        const top = R * Math.cos(0.36) * tall, mouth = R * Math.sin(0.36);
        hoop(mouth, [0, top, 0], 'y', 0.012);
        add(funnel(mouth, 0.055, 0.13), [0, top - 0.065, 0]);
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2;
          const rib = add(new THREE.Mesh(new THREE.TorusGeometry(R, 0.007, 5, 14, Math.PI / 2 - 0.36), frame));
          rib.scale.y = tall;
          rib.rotation.y = angle;
        }
        tie = [mouth, top, 0]; room = [0.17, 0.05, 0.17];
      } else if (a.shape === 'barrel' || a.shape === 'cone') {
        const cone = a.shape === 'cone';
        const R = cone ? 0.25 : 0.22, R2 = cone ? 0.07 : 0.22, long = cone ? 0.9 : 0.66;
        const shell = add(new THREE.Mesh(tile(new THREE.CylinderGeometry(R, R2, long, 26, 1, true), 14, cone ? 9 : 7), weave), [0, R, 0]);
        shell.rotation.z = -Math.PI / 2;
        if (cone) shell.rotation.y = 0, shell.position.y = R;
        for (let i = 0; i <= 4; i++) {
          const k = i / 4;
          hoop(mix(R, R2, 1 - k) + 0.004, [mix(-long / 2, long / 2, k), R, 0], 'x', i === 4 || i === 0 ? 0.014 : 0.009);
        }
        for (let i = 0; i < 6; i++) {
          const angle = (i / 6) * Math.PI * 2;
          const from = new THREE.Vector3(-long / 2, R + Math.cos(angle) * R2, Math.sin(angle) * R2);
          const to = new THREE.Vector3(long / 2, R + Math.cos(angle) * R, Math.sin(angle) * R);
          const span = to.clone().sub(from);
          const stave = add(new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, span.length(), 5), frame), from.add(to).multiplyScalar(0.5).toArray() as [number, number, number]);
          stave.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), span.normalize());
        }
        const front = add(funnel(R, 0.06, 0.2), [long / 2 - 0.1, R, 0]);
        front.rotation.z = -Math.PI / 2;
        if (cone) {
          add(new THREE.Mesh(new THREE.SphereGeometry(R2 * 1.05, 10, 8), frame), [-long / 2, R, 0]);
          const cord = add(new THREE.Mesh(new THREE.TorusGeometry(R2 * 0.9, 0.012, 6, 16), rope), [-long / 2 + 0.04, R, 0]);
          cord.rotation.y = Math.PI / 2;
        } else {
          const back = add(funnel(R, 0.06, 0.2), [-long / 2 + 0.1, R, 0]);
          back.rotation.z = Math.PI / 2;
        }
        tie = [0, R * 2, 0]; room = [cone ? 0.16 : 0.2, 0.05, R * 0.55]; floor = 0.04;
      } else {
        const w = 0.62, h = 0.3, d = 0.46;
        add(new THREE.Mesh(tile(new THREE.BoxGeometry(w, h, d), 7, 4), weave), [0, h / 2 + 0.01, 0]);
        for (const x of [-1, 1]) for (const z of [-1, 1]) {
          add(new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, h + 0.04, 6), frame), [x * w / 2, h / 2 + 0.01, z * d / 2]);
        }
        for (const y of [0.01, h + 0.01]) {
          for (const z of [-1, 1]) add(new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, w + 0.04, 6), frame), [0, y, z * d / 2]).rotation.z = Math.PI / 2;
          for (const x of [-1, 1]) add(new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, d + 0.04, 6), frame), [x * w / 2, y, 0]).rotation.x = Math.PI / 2;
        }
        for (let i = 1; i < 5; i++) add(new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, d, 5), pale), [-w / 2 + (i / 5) * w, h + 0.014, 0]).rotation.x = Math.PI / 2;
        const side = add(funnel(0.12, 0.05, 0.18), [w / 2 - 0.09, h / 2 + 0.01, 0]);
        side.rotation.z = -Math.PI / 2;
        const ring = add(new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.011, 6, 20), frame), [w / 2, h / 2 + 0.01, 0]);
        ring.rotation.y = Math.PI / 2;
        // A peg latch on the lid.
        add(new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.1, 5), pale), [0, h + 0.03, d / 2 + 0.01]).rotation.z = 0.5;
        tie = [-w / 2, h + 0.01, d / 2]; room = [0.2, 0.05, 0.14];
      }

      if (withCatch) {
        // Bait on a skewer, always.
        add(new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.2, 4), pale), [0, floor + 0.09, 0]);
        const bait = add(new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), s.material('#c9706a', { roughness: 0.5 })), [0, floor + 0.11, 0]);
        bait.scale.set(0.035, 0.025, 0.02);
        const spot = (): P3 => [(random() - 0.5) * 2 * room[0], floor, (random() - 0.5) * 2 * room[2]];
        if (a.catch === 'mud-crabs' || a.catch === 'blue-crabs') {
          const blue = a.catch === 'blue-crabs';
          const n = blue ? 3 + Math.floor(random() * 2 + mood.density * 2) : 2 + Math.floor(random() * 2);
          for (let i = 0; i < n; i++) {
            const one = add(crab(blue ? 0.11 : 0.15, blue ? '#2f6db8' : '#3d4a2b', blue ? '#e8f2ff' : '#e27224'), spot());
            one.position.y += i * 0.035;
            one.rotation.set((random() - 0.5) * 0.6, random() * 6, (random() - 0.5) * 0.6);
          }
        } else if (a.catch === 'one-giant') {
          const big = add(crab(a.shape === 'dome' ? 0.3 : 0.26, '#7a2f22', '#f08a2c'), [0, floor, 0]);
          big.rotation.y = a.shape === 'dome' ? 0.4 : Math.PI / 2;
        } else if (a.catch === 'fish') {
          const silver = s.material('#c5d0d6', { metalness: 0.6, roughness: 0.3 });
          for (let i = 0; i < 4; i++) {
            const fish = new THREE.Group();
            const body = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 6), silver);
            body.scale.set(0.085, 0.03, 0.014);
            const tail = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.045, 4), silver);
            tail.scale.z = 0.25;
            tail.rotation.z = -Math.PI / 2;
            tail.position.x = -0.095;
            fish.add(body, tail);
            add(fish, spot()).rotation.set(Math.PI / 2 + (random() - 0.5) * 0.5, 0, random() * 6);
            fish.position.y += 0.012 + i * 0.012;
          }
        } else if (a.catch === 'rubbish') {
          const bottle = add(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.18, 10), s.material('#7fd0e8', { roughness: 0.2 })), [0.06, floor + 0.04, 0.03]);
          bottle.rotation.set(Math.PI / 2, 0, random() * 3);
          const flop = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.04, 0.11, 3, 8), s.material('#ef4f8a')), [-0.08, floor + 0.015, -0.03]);
          flop.scale.z = 0.25;
          flop.rotation.set(Math.PI / 2, 0, random() * 3);
          for (let i = 0; i < 5; i++) add(new THREE.Mesh(new THREE.SphereGeometry(1, 6, 5), s.material('#4c6a33')), spot()).scale.set(0.06, 0.012, 0.03);
        }
      }
      return { group, tie };
    };

    const first = pot(true);
    s.root.add(first.group);
    const spanX = a.shape === 'dome' ? 0.62 : a.shape === 'cone' ? 0.9 : a.shape === 'barrel' ? 0.66 : 0.62;
    const tall = a.shape === 'dome' ? 0.24 : a.shape === 'box' ? 0.32 : a.shape === 'cone' ? 0.42 : 0.44;
    const deep = a.shape === 'dome' ? 0.62 : a.shape === 'box' ? 0.46 : a.shape === 'cone' ? 0.5 : 0.44;
    if (a.stack === 'pair') {
      const second = pot(false).group;
      if (a.shape === 'dome') { second.position.set(-0.36, 0.2, -0.36); second.rotation.set(1.05, 0, 0); second.rotation.order = 'YXZ'; second.rotation.y = 0.8; }
      else { second.position.set(-0.1, 0, -deep - 0.04); second.rotation.y = 0.35; }
      s.root.add(second);
    } else if (a.stack === 'stack') {
      const second = pot(false).group, third = pot(false).group;
      second.position.set(0.04, 0, -deep - 0.02);
      second.rotation.y = a.shape === 'dome' ? 1 : 0.06;
      if (a.shape === 'dome') third.position.set(0.02, tall * 0.8, -deep * 0.5);
      else third.position.set(-0.03, tall * (a.shape === 'box' ? 1 : 0.84), -deep * 0.5);
      third.rotation.y = a.shape === 'dome' ? 2 : -0.07;
      s.root.add(second, third);
    }

    // The float and its line.
    const fx = spanX / 2 + 0.26, fz = 0.3;
    const tidy = a.moment === 'baited';
    const line: P3[] = [first.tie];
    line.push([first.tie[0] + 0.1, first.tie[1] * 0.4, first.tie[2] + 0.2]);
    const coilAt: P3 = [spanX / 2 + 0.02, 0.012, 0.36];
    const loops = tidy ? 4 : 2;
    for (let i = 0; i <= loops * 8; i++) {
      const angle = (i / 8) * Math.PI * 2, r = tidy ? 0.1 + (i % 16) * 0.001 : 0.07 + random() * 0.09;
      line.push([coilAt[0] + Math.cos(angle) * r, 0.012 + (tidy ? i * 0.0012 : random() * 0.012), coilAt[2] + Math.sin(angle) * r * (tidy ? 1 : 0.7)]);
    }
    line.push([fx - 0.08, 0.02, fz + 0.02], [fx, 0.06, fz]);
    s.tube(line, 0.007, rope);
    const floatGroup = new THREE.Group();
    floatGroup.position.set(fx, 0, fz);
    s.root.add(floatGroup);
    const put = <T extends THREE.Mesh>(mesh: T, at: P3) => { mesh.position.set(...at); mesh.castShadow = mesh.receiveShadow = true; floatGroup.add(mesh); return mesh; };
    let flagFoot: P3 = [0, 0.1, 0];
    if (a.float === 'bottle') {
      const jug = s.material(mood.cheer > 0.5 ? '#f2d43a' : '#e9ece6', { roughness: 0.35 });
      put(new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.14, 4, 12), jug), [0, 0.075, 0]).rotation.z = Math.PI / 2;
      put(new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.05, 10), jug), [0.165, 0.075, 0]).rotation.z = Math.PI / 2;
      put(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.025, 10), s.material('#d8312a')), [0.2, 0.075, 0]).rotation.z = Math.PI / 2;
      put(new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.012, 6, 14, Math.PI), jug), [0.06, 0.14, 0]);
      flagFoot = [-0.05, 0.14, 0];
    } else if (a.float === 'bamboo') {
      const cane = s.material('#cdb565', { roughness: 0.5 });
      put(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.42, 12), cane), [0, 0.05, 0]).rotation.z = Math.PI / 2;
      for (const x of [-0.21, -0.07, 0.07, 0.21]) put(new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.007, 5, 14), s.material('#7d6a30')), [x, 0.05, 0]).rotation.y = Math.PI / 2;
      flagFoot = [0, 0.1, 0];
    } else if (a.float === 'coconut') {
      put(new THREE.Mesh(new THREE.SphereGeometry(0.095, 12, 8), new THREE.MeshStandardMaterial({ color: '#7a5634', roughness: 1, flatShading: true })), [0, 0.085, 0]).scale.set(1, 0.9, 1.2);
      put(new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.05, 6), s.material('#4a3320')), [0, 0.1, 0.12]).rotation.x = Math.PI / 2;
      flagFoot = [0, 0.17, 0];
    } else if (a.float === 'foam') {
      const block = put(new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.13, 0.15, 2, 2, 2), new THREE.MeshStandardMaterial({ color: '#f1efe7', roughness: 1, flatShading: true })), [0, 0.065, 0]);
      const pos = block.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) pos.setXYZ(i, pos.getX(i) * mix(0.86, 1, random()), pos.getY(i), pos.getZ(i) * mix(0.86, 1, random()));
      block.geometry.computeVertexNormals();
      put(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.134, 0.156), s.material(mood.cheer > 0.5 ? '#e8423a' : '#2f63a8')), [0.02, 0.065, 0]);
      flagFoot = [-0.05, 0.13, 0];
    } else {
      put(new THREE.Mesh(new THREE.SphereGeometry(0.1, 18, 12), new THREE.MeshStandardMaterial({ color: '#3f9a6c', roughness: 0.08, transparent: true, opacity: 0.72, emissive: '#1b5a3a', emissiveIntensity: mix(0.1, 0.5, mood.cheer) })), [0, 0.1, 0]);
      for (let i = 0; i < 3; i++) put(new THREE.Mesh(new THREE.TorusGeometry(0.102, 0.005, 5, 20), rope), [0, 0.1, 0]).rotation.set(i * 1.05, i * 0.7, 0);
      put(new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.005, 5, 16), rope), [0, 0.175, 0]).rotation.x = Math.PI / 2;
      flagFoot = [0, 0.2, 0];
    }
    floatGroup.rotation.y = (random() - 0.5) * 1.6;
    if (a.flag) {
      const top: P3 = [flagFoot[0] + 0.03, flagFoot[1] + 0.42, flagFoot[2]];
      const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.008, 0.44, 5), s.material('#8c744a'));
      put(stick, [(flagFoot[0] + top[0]) / 2, (flagFoot[1] + top[1]) / 2, 0]).rotation.z = -0.07;
      const rag = new THREE.PlaneGeometry(0.16, 0.11, 6, 1);
      const pos = rag.attributes.position;
      for (let i = 0; i < pos.count; i++) pos.setZ(i, Math.sin(pos.getX(i) * 40) * 0.012);
      rag.computeVertexNormals();
      put(new THREE.Mesh(rag, s.material(mood.cheer > 0.45 ? '#e8452c' : '#3a3a3a', { side: THREE.DoubleSide })), [top[0] + 0.085, top[1] - 0.06, 0]);
    }

    if (a.moment === 'hauled') {
      const puddle = s.cylinder(spanX * 0.72, spanX * 0.72, 0.003, [0.04, 0.0015, 0.03], s.material('#5d5346', { roughness: 0.08, metalness: 0.3 }), 28);
      puddle.scale.z = 0.8;
      const weed = s.material('#4f6b2e', { roughness: 0.5, side: THREE.DoubleSide });
      for (let i = 0; i < 6; i++) {
        const x = (random() - 0.5) * spanX * 0.7, z = deep * 0.3 * (random() < 0.5 ? 1 : -1) * mix(0.5, 1, random());
        const top = a.shape === 'dome' ? 0.2 : tall;
        s.tube([[x, top * mix(0.8, 1, random()), z * 0.5], [x + 0.02, top * 0.6, z * 0.95], [x + (random() - 0.5) * 0.1, 0.02, z * 1.5]], 0.012, weed);
      }
    } else if (a.moment === 'mending') {
      const patch = s.mesh(new THREE.CircleGeometry(0.09, 9), hollow, a.shape === 'dome' ? [0.12, 0.17, 0.2] : [-0.08, tall * 0.55, deep / 2 + 0.004]);
      if (a.shape === 'dome') patch.rotation.set(-0.8, 0.5, 0);
      patch.scale.set(1, 0.75, 1);
      for (let i = 0; i < 7; i++) {
        const strip = s.box([0.5 + random() * 0.25, 0.004, 0.014], [-spanX / 2 - 0.16 + i * 0.022, 0.004, 0.36 + (random() - 0.5) * 0.08], pale);
        strip.rotation.y = Math.PI / 2 + (random() - 0.5) * 0.25;
      }
      // The knife left on the strips.
      s.box([0.03, 0.006, 0.18], [-spanX / 2 - 0.1, 0.012, 0.3], s.material('#b9c0c2', { metalness: 0.8, roughness: 0.3 })).rotation.y = 0.9;
      s.cylinder(0.014, 0.014, 0.1, [-spanX / 2 - 0.2, 0.014, 0.39], s.material('#5a3b22')).rotation.set(Math.PI / 2, 0, -0.9);
    } else if (a.moment === 'drying' && mood.wear > 0.4) {
      // Barnacle scabs.
      const scabs = Array.from({ length: 14 }, () => ({ at: [(random() - 0.5) * spanX * 0.8, 0.01 + random() * 0.03, (random() - 0.5) * deep * 0.9] as [number, number, number], size: 0.012 + random() * 0.01 }));
      s.scatter(new THREE.SphereGeometry(1, 6, 4), s.material('#d9d6cc'), scabs);
    }
    return s.finish();
  },
});
