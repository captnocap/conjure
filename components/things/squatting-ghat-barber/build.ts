import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, type Figure, noul, score } from '@conjure/kit';

type P = [number, number, number];
const RAD = Math.PI / 180;

/** Reach the figure's arm joints through its hands, so the arms can be re-posed after it is built. */
function rig(person: Figure) {
  const arm = (side: 'left' | 'right') => {
    const wrist = person.hands[side].parent!, elbow = wrist.parent!, shoulder = elbow.parent!;
    elbow.rotation.order = 'YXZ';
    return { shoulder, elbow, wrist };
  };
  return { left: arm('left'), right: arm('right') };
}

export default defineThing({
  questions: {
    service: choice('What is being shaved?', {
      head: 'The whole head, for a mourning rite; one side already bare.',
      beard: 'A beard, lather on the jaw, the hair left alone.',
      tonsure: 'A small boy\'s first tonsure, held still on the step.',
      trim: 'A neat trim: scissors and comb, hair falling in tufts.',
    }),
    client: choice('If it is not a child, who sits for the barber?', {
      mourner: 'A grown man in white cloth, come for the rite.',
      pilgrim: 'A pilgrim in saffron with a cloth bag beside him.',
      old: 'An old thin man in a vest, patient as the stone.',
      traveller: 'A backpacker in a t-shirt, a little nervous.',
      worker: 'A labourer in a checked lungi on his way to work.',
    }),
    progress: score('How far along is the shave?', ['Just begun, the hair still thick', 'Half done, one side bare', 'Nearly finished, a last strip left']),
    spread: choice('What is spread on the step beside them?', {
      cloth: 'A folded cloth with a comb, a brush, soap and a spare blade in a row.',
      newspaper: 'A sheet of newspaper weighed down with the soap and brush.',
      tin: 'An open tin box of tools and a cake of soap.',
      nothing: 'Bare stone: the bowl and the mirror only.',
    }),
    queue: choice('Who waits behind?', {
      none: 'Nobody; the barber has one client and the whole morning.',
      one: 'One man squatting a step up, waiting his turn.',
      two: 'Two waiting: one squatting, one standing with a towel over his shoulder.',
    }),
    step: choice('What are they sitting on?', {
      ghat: 'Broad river-worn sandstone steps.',
      kerb: 'A concrete kerb outside a market.',
      temple: 'Red-painted temple steps.',
      plinth: 'A whitewashed plinth under a tree.',
    }),
    lather: noul('Is there lather on the skin and a shaving brush in the bowl?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const child = a.service === 'tonsure';
    const stoneColour = { ghat: '#b3a58d', kerb: '#9d9c94', temple: '#a8362a', plinth: '#ebe6da' }[a.step];
    const stone = s.material(new THREE.Color(stoneColour).lerp(new THREE.Color('#5a5a52'), mood.wear * 0.45), { roughness: 0.92 });
    const dirt = s.material('#4a463c', { roughness: 1 });

    // The client, sitting on the lower step.
    const HC = child ? 1.05 : 1.7;
    const clientLook = child
      ? { top: '#e9d44a', bottom: '#2b3550', sleeves: 'short' as const, skin: '#8a5a3c' }
      : {
          mourner: { top: '#ebe6da', bottom: '#ebe6da', sleeves: 'short' as const, skin: '#6b4a33' },
          pilgrim: { top: '#e07a14', bottom: '#e07a14', sleeves: 'short' as const, skin: '#8a5a3c' },
          old: { top: '#efece2', bottom: '#8a7a5a', sleeves: 'short' as const, skin: '#7a5a46' },
          traveller: { top: '#4a8fcf', bottom: '#5a5a66', sleeves: 'short' as const, skin: '#e0b89a' },
          worker: { top: '#8a5a3c', bottom: '#2f6a6a', sleeves: 'short' as const, skin: '#8a5a3c' },
        }[a.client];
    const clientHair = a.service === 'beard' || a.service === 'trim' ? 'short' : 'none';
    const client = figure(s, { height: HC, build: a.client === 'old' && !child ? 'slight' : 'average', style: 'doll', pose: 'sitting', hair: clientHair, gaze: 'ahead', hairColor: a.client === 'old' && !child ? '#9a948a' : '#2a1d14', ...clientLook });
    s.root.add(client.root);
    client.root.updateMatrixWorld(true);
    const hipsC = client.pelvis.getWorldPosition(new THREE.Vector3());
    const headC = client.head.getWorldPosition(new THREE.Vector3());
    const headR = HC * 0.064;
    const seatY = Math.max(0.12, client.hipHeight - 0.03);

    // Half-shaved head: hair left on one side, its width following the progress of the shave.
    const hairPaint = s.material(a.client === 'old' && !child ? '#9a948a' : '#2a1d14', { roughness: 0.9 });
    if (a.service === 'head' || a.service === 'tonsure') {
      const remaining = Math.max(0.12, 1 - a.progress) * Math.PI;
      const cap = new THREE.Mesh(new THREE.SphereGeometry(headR * 1.06, 16, 10, Math.PI / 2 - remaining / 2 + Math.PI / 2, remaining, 0, Math.PI * 0.55), hairPaint);
      cap.position.y = headR * 0.1;
      cap.scale.y = 1.1;
      cap.castShadow = true;
      client.head.add(cap);
      // Stubble shadow on the shaved side.
      const stubble = new THREE.Mesh(new THREE.SphereGeometry(headR * 1.015, 16, 10, Math.PI / 2 + remaining / 2 + Math.PI / 2, Math.PI * 2 - remaining, 0, Math.PI * 0.5), s.material('#8a7a6a', { roughness: 1 }));
      stubble.position.y = headR * 0.1;
      stubble.scale.y = 1.1;
      client.head.add(stubble);
    }
    if (a.service === 'beard') {
      const beard = new THREE.Mesh(new THREE.SphereGeometry(headR * 0.95, 14, 8, Math.PI * 0.15, Math.PI * (0.7 - a.progress * 0.5), Math.PI * 0.5, Math.PI * 0.4), hairPaint);
      beard.position.y = -headR * 0.05;
      beard.scale.y = 1.1;
      client.head.add(beard);
    }
    if (a.lather) {
      const foam = s.material('#f7f4ec', { roughness: 1 });
      const patch = new THREE.Mesh(new THREE.SphereGeometry(headR * 1.03, 12, 8, a.service === 'beard' ? Math.PI * 0.25 : Math.PI * 1.8, a.service === 'beard' ? Math.PI * 0.5 : Math.PI * 0.35, a.service === 'beard' ? Math.PI * 0.5 : Math.PI * 0.05, Math.PI * 0.4), foam);
      patch.position.y = headR * (a.service === 'beard' ? -0.05 : 0.1);
      patch.scale.y = 1.1;
      client.head.add(patch);
    }
    // A cloth over the client's shoulders.
    const cape = s.mesh(new THREE.ConeGeometry(0.2 * HC / 1.7, 0.3 * HC / 1.7, 18, 1, true), s.material(a.client === 'pilgrim' && !child ? '#ebe6da' : '#d8ccb0', { roughness: 0.95, side: THREE.DoubleSide }), [headC.x, headC.y - headR * 1.5 - 0.12 * HC / 1.7, headC.z - 0.02]);
    cape.scale.z = 0.8;

    // The step the client sits on, the step the barber squats on, and one more behind.
    const stepW = 2.4, stepD = 1.0;
    const z1 = hipsC.z - 0.55;
    const box = (w: number, h: number, d: number, at: P) => s.box([w, h, d], at, stone);
    box(stepW, seatY, stepD, [hipsC.x, seatY / 2, z1 + 0.1]);
    box(stepW, 0.3, 0.8, [hipsC.x, seatY + 0.15, z1 - 0.8]);
    if (mood.wear > 0.35) {
      box(stepW, 0.03, 1.001, [hipsC.x, 0.015, z1 + 0.1]).material = dirt;
      s.box([stepW * 0.8, 0.004, 0.3], [hipsC.x + 0.1, seatY + 0.003, z1 - 0.25], dirt);
    }
    if (a.step === 'plinth') {
      s.cylinder(0.14, 0.17, 2.2, [hipsC.x - 1.0, seatY + 0.3 + 1.1, z1 - 0.9], s.material('#6a4a30', { roughness: 0.95 }), 10);
      s.ball([0.9, 0.5, 0.8], [hipsC.x - 0.9, seatY + 2.5, z1 - 0.9], s.material(mood.cheer > 0.4 ? '#4f7a3a' : '#6a7a4a', { roughness: 0.95 }), 12);
    }

    // The barber crouching on the step behind, leaning over the client's head.
    const HB = 1.7;
    const barber = figure(s, { height: HB, build: 'slight', style: 'doll', pose: 'crouching', hair: 'short', skin: ['#6b4a33', '#8a5a3c', '#5a3a28'][Math.floor(random() * 3)], top: '#efece2', bottom: ['#2b4a8a', '#3a6a4a', '#6a2a2a'][Math.floor(random() * 3)], shoes: '#5a3a22', sleeves: 'short', gaze: 'up' });
    barber.root.position.set(hipsC.x + 0.12, seatY, hipsC.z - 0.52);
    s.root.add(barber.root);
    const joints = rig(barber);
    const arm = (side: 'left' | 'right', forward: number, out: number, bend: number, inward: number) => {
      const sign = side === 'left' ? 1 : -1;
      joints[side].shoulder.rotation.set(-forward * RAD, 0, sign * out * RAD);
      joints[side].elbow.rotation.set(-bend * RAD, -sign * inward * RAD, 0);
    };
    arm('right', 62, 16, 14, 28);
    arm('left', 50, 8, 28, 32);
    // The kit's crouch leans the body back; a barber leans in over the client's head.
    barber.root.children[0].rotation.x = 16 * RAD;
    barber.root.updateMatrixWorld(true);
    // The razor, or scissors, in the right hand, pointing along the fingers.
    const steel = s.material('#cfd3d6', { metalness: 0.85, roughness: 0.25 });
    const tool = new THREE.Group();
    if (a.service === 'trim') {
      for (const side of [-1, 1]) {
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.09, 0.012), steel);
        blade.position.set(side * 0.006, -0.06, 0);
        blade.rotation.z = side * 0.12;
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.014, 0.004, 6, 14), steel);
        ring.position.set(side * 0.014, 0.012, 0);
        tool.add(blade, ring);
      }
    } else {
      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.09, 0.02), s.material('#2a2a2c', { roughness: 0.4 }));
      handle.position.y = -0.03;
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.075, 0.024), steel);
      blade.position.set(0, -0.1, 0.004);
      blade.rotation.z = 0.4;
      tool.add(handle, blade);
    }
    tool.traverse((node) => { (node as THREE.Mesh).castShadow = true; });
    barber.hands.right.add(tool);
    // The comb in the other hand.
    const comb = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.004, 0.022), s.material('#1d1d1f'));
    comb.position.y = -0.01;
    barber.hands.left.add(comb);

    // The mirror propped on the step, the brass bowl, and what is spread beside them.
    const brass = s.material('#c9962e', { metalness: 0.75, roughness: 0.3 });
    const sideX = hipsC.x + (random() < 0.5 ? -0.62 : 0.62);
    const mirror = new THREE.Group();
    mirror.position.set(sideX, seatY + 0.11, z1 - 0.38);
    mirror.rotation.x = -0.35;
    mirror.rotation.y = (random() - 0.5) * 0.6;
    const frame = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.012, 24), s.material('#3a2a1c', { roughness: 0.6 }));
    frame.rotation.x = Math.PI / 2;
    const glass = new THREE.Mesh(new THREE.CircleGeometry(0.095, 24), new THREE.MeshStandardMaterial({ color: '#dfe8ec', metalness: 1, roughness: 0.05 }));
    glass.position.z = 0.007;
    frame.castShadow = true;
    mirror.add(frame, glass);
    s.root.add(mirror);
    const bowlAt: P = [sideX * 0.55 + hipsC.x * 0.45, seatY, z1 - 0.2];
    s.lathe([[0, 0], [0.09, 0], [0.12, 0.04], [0.125, 0.09], [0.115, 0.1], [0.105, 0.1], [0.1, 0.08], [0, 0.06]], brass, bowlAt);
    const waterTop = s.mesh(new THREE.CircleGeometry(0.1, 20), new THREE.MeshStandardMaterial({ color: '#b9d2d6', transparent: true, opacity: 0.6, roughness: 0.1, depthWrite: false }), [bowlAt[0], bowlAt[1] + 0.075, bowlAt[2]]);
    waterTop.rotation.x = -Math.PI / 2;
    waterTop.castShadow = false;
    if (a.lather) {
      const brush = s.rod([bowlAt[0] + 0.05, bowlAt[1] + 0.06, bowlAt[2]], [bowlAt[0] + 0.1, bowlAt[1] + 0.2, bowlAt[2] + 0.03], 0.01, s.material('#d9c9a1'));
      void brush;
      s.ball([0.025, 0.03, 0.025], [bowlAt[0] + 0.04, bowlAt[1] + 0.055, bowlAt[2]], s.material('#f7f4ec'), 8);
    }
    const spreadX = hipsC.x - (sideX - hipsC.x) * 0.85, spreadZ = z1 - 0.1;
    if (a.spread !== 'nothing') {
      if (a.spread === 'cloth') s.box([0.42, 0.012, 0.3], [spreadX, seatY + 0.006, spreadZ], s.material('#b9c2c8', { roughness: 0.95 }));
      if (a.spread === 'newspaper') { s.box([0.4, 0.004, 0.3], [spreadX, seatY + 0.002, spreadZ], s.material('#dcd6c4', { roughness: 0.95 })); for (let i = 0; i < 5; i++) s.box([0.3, 0.001, 0.012], [spreadX, seatY + 0.005, spreadZ - 0.1 + i * 0.05], s.material('#6a6a66')); }
      if (a.spread === 'tin') { s.box([0.3, 0.07, 0.2], [spreadX, seatY + 0.035, spreadZ], s.material('#5a6f8a', { metalness: 0.5, roughness: 0.4 })); const lid = s.box([0.3, 0.004, 0.2], [spreadX, seatY + 0.16, spreadZ - 0.16], s.material('#5a6f8a', { metalness: 0.5, roughness: 0.4 })); lid.rotation.x = -1.2; }
      const y = seatY + (a.spread === 'tin' ? 0.075 : 0.014);
      s.box([0.1, 0.006, 0.024], [spreadX - 0.12, y, spreadZ + 0.04], s.material('#1d1d1f'));
      s.box([0.06, 0.03, 0.04], [spreadX, y + 0.012, spreadZ + 0.04], s.material('#e9e2c8'));
      s.box([0.09, 0.006, 0.014], [spreadX + 0.12, y, spreadZ + 0.04], steel);
      s.cylinder(0.012, 0.012, 0.08, [spreadX + 0.08, y + 0.04, spreadZ - 0.06], s.material('#d9c9a1'), 8);
    }
    // Cut hair on the step and the lower step.
    const tufts = Math.round(6 + a.progress * 18);
    s.scatter(new THREE.SphereGeometry(1, 5, 3), hairPaint, Array.from({ length: tufts }, () => ({ at: [hipsC.x + (random() - 0.5) * 0.7, (random() < 0.5 ? seatY : 0) + 0.006, (random() < 0.5 ? z1 + 0.3 + random() * 0.2 : hipsC.z + 0.1 + random() * 0.4)] as P, size: 0.012 + random() * 0.01 })));

    // Those waiting their turn, one step up.
    const waiting: Figure[] = [];
    if (a.queue !== 'none') {
      const one = figure(s, { height: 1.68, build: 'slight', style: 'doll', pose: 'crouching', hair: 'short', skin: '#8a5a3c', top: '#c9b48a', bottom: '#4a4a52', shoes: '#3a2a20', sleeves: 'short', gaze: 'ahead' });
      one.root.position.set(hipsC.x - 0.75, seatY + 0.3, z1 - 0.8);
      one.root.rotation.y = 0.3;
      s.root.add(one.root);
      waiting.push(one);
    }
    if (a.queue === 'two') {
      const two = figure(s, { height: 1.74, build: 'average', style: 'doll', pose: 'standing', hair: 'cap', hairColor: '#3a3a44', skin: '#6b4a33', top: '#2f6a6a', bottom: '#efece2', shoes: '#3a2a20', sleeves: 'long', gaze: 'ahead' });
      two.root.position.set(hipsC.x + 0.85, seatY + 0.3, z1 - 0.85);
      two.root.rotation.y = -0.4;
      s.root.add(two.root);
      two.root.updateMatrixWorld(true);
      const headT = two.head.getWorldPosition(new THREE.Vector3());
      const towel = s.box([0.09, 0.3, 0.16], [headT.x + 0.1, headT.y - 0.22, headT.z - 0.02], s.material('#e3c9b0', { roughness: 0.95 }));
      towel.rotation.z = -0.1;
      waiting.push(two);
    }

    return s.finish({
      update(dt, time) {
        client.update(dt, time);
        barber.update(dt, time);
        for (const person of waiting) person.update(dt, time);
      },
    });
  },
});
