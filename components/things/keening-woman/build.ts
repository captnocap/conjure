import * as THREE from 'three';
import { type Figure, Sculpture, choice, defineThing, figure, mix, noul } from '@conjure/kit';
import { at, ground, joints, poseArm, poseLeg } from './pose';

/** A woollen check painted on a canvas, so a patterned shawl needs no image file. */
function tartan(base: string, lines: string[]) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 128, 128);
  lines.forEach((colour, index) => {
    ctx.fillStyle = colour;
    ctx.globalAlpha = 0.55;
    const width = 6 + index * 4;
    for (let p = 8 + index * 20; p < 128; p += 44) {
      ctx.fillRect(p, 0, width, 128);
      ctx.fillRect(0, p, 128, width);
    }
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 3);
  return texture;
}

type Grief = 'face' | 'thrown' | 'floor' | 'clasped';

export default defineThing({
  questions: {
    grief: choice('How does she grieve?', {
      face: 'Hands pressed to the sides of her face, head thrown back, mouth open in the cry.',
      thrown: 'Both arms thrown up and wide to the sky.',
      floor: 'Bent forward to the floor, forehead nearly on the ground, arms stretched out before her.',
      clasped: 'Hands clasped tight under her chin, rocking.',
    }),
    companion: noul('Does a second woman kneel at her shoulder with a hand on her back?'),
    shawl: choice('What is the shawl over her head?', {
      black: 'Plain black wool.',
      grey: 'A grey knitted shawl, the everyday one.',
      tartan: 'A red and green woollen check, the good shawl.',
      brown: 'A rough brown homespun, old and patched.',
    }),
    facing: choice('Which way does she face?', {
      viewer: 'Facing out, her grief shown to the room.',
      side: 'Side on, in profile, bent toward whatever she mourns.',
      away: 'Turned away, her back to the room.',
    }),
    candle: noul('Does a candle stand on the floor beside her?'),
    before: choice('What lies on the floor in front of her?', {
      nothing: 'Nothing, bare floor.',
      cap: 'A man\'s flat cap, set down carefully.',
      photograph: 'A small framed photograph laid face up.',
      cross: 'A small wooden cross and a scatter of loose earth.',
      flowers: 'A bunch of wildflowers tied with string.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pick = <T>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const scene = new THREE.Group();
    s.root.add(scene);
    scene.rotation.y = { viewer: 0, side: Math.PI / 2, away: Math.PI }[a.facing];
    const skin = pick(['#e3c2a4', '#d9b08c', '#c99a78', '#b8835f']);
    const shawlColour = { black: '#1c1b1f', grey: '#6a6a68', tartan: '#ffffff', brown: '#5e4632' }[a.shawl];
    const shawlMat = a.shawl === 'tartan'
      ? s.material('#ffffff', { map: tartan('#7a2e2a', ['#2f5a3a', '#1a1a1a', '#d9b24a']), roughness: 0.95, side: THREE.DoubleSide })
      : s.material(shawlColour, { roughness: 1, side: THREE.DoubleSide });
    const skirtColour = pick(['#1f1d22', '#2a2330', '#23282a', '#302424']);
    const skirtMat = s.material(skirtColour, { roughness: 0.95, side: THREE.DoubleSide });

    /** A kneeling woman: thighs down, shins flat behind, a long skirt pooled over them. */
    const kneeler = (H: number, hooded: boolean, bend: number, thigh: number) => {
      const person = figure(s, {
        height: H, build: random() < 0.4 ? 'heavy' : 'average', style: 'doll', pose: 'kneeling', gaze: 'down', skin, sleeves: 'short',
        hair: hooded ? 'short' : 'bun', hairColor: pick(['#3b2a22', '#6b4a2e', '#8a8378', '#1f1a18']),
        top: hooded ? skirtColour : pick(['#3a3540', '#4a3a3a']), bottom: skirtColour, shoes: '#1a1a1c',
      });
      poseLeg(person, 'left', { forward: thigh, knee: 90 + thigh, out: 4 });
      poseLeg(person, 'right', { forward: thigh, knee: 90 + thigh, out: 4 });
      const { spine } = joints(person, 'left');
      spine.rotation.x = -bend;
      scene.add(person.root);
      ground(person);
      const hipY = at(person.pelvis).y - person.root.position.y;
      const headR = H * 0.064;
      // Skirt: a lathe from the hips to the floor, spread wider behind where the shins lie.
      const hipW = H * 0.075;
      const skirt = new THREE.Mesh(new THREE.LatheGeometry([
        new THREE.Vector2(hipW * 1.15, 0.01), new THREE.Vector2(hipW * 1.3, -hipY * 0.3), new THREE.Vector2(H * 0.13, -hipY * 0.75),
        new THREE.Vector2(H * 0.19, -hipY + 0.012), new THREE.Vector2(0.001, -hipY + 0.012),
      ], 22), skirtMat);
      skirt.scale.z = 1.35;
      skirt.position.z = -0.04 * H;
      skirt.castShadow = skirt.receiveShadow = true;
      person.pelvis.add(skirt);
      if (hooded) {
        const crown = new THREE.Mesh(new THREE.SphereGeometry(headR * 1.16, 18, 8, 0, Math.PI * 2, 0, Math.PI * 0.36), shawlMat);
        const drape = new THREE.Mesh(new THREE.SphereGeometry(headR * 1.16, 18, 12, Math.PI * 0.76, Math.PI * 1.48, 0, Math.PI * 0.9), shawlMat);
        crown.castShadow = drape.castShadow = true;
        person.head.add(crown, drape);
        // The shawl falls from the head over the shoulders and down the back as a narrow cloak.
        const { shoulder } = joints(person, 'left');
        const sy = shoulder.position.y;
        const cloak = new THREE.Mesh(new THREE.LatheGeometry([
          new THREE.Vector2(H * 0.055, sy + 0.05 * H), new THREE.Vector2(H * 0.1, sy + 0.015 * H), new THREE.Vector2(H * 0.15, sy - 0.07 * H), new THREE.Vector2(H * 0.155, sy - 0.13 * H),
        ], 20), shawlMat);
        cloak.position.z = -0.015 * H;
        cloak.castShadow = true;
        spine.add(cloak);
      }
      return person;
    };

    const H = mix(1.55, 1.68, random());
    const bend: Record<Grief, number> = { face: -0.25, thrown: -0.15, floor: 1.45, clasped: 0.2 };
    const thigh: Record<Grief, number> = { face: 10, thrown: 5, floor: 65, clasped: 25 };
    const woman = kneeler(H, true, bend[a.grief], thigh[a.grief]);
    const arms: Record<Grief, Parameters<typeof poseArm>[2]> = {
      face: { forward: 105, out: 8, bend: 135, inward: 28 },
      thrown: { forward: 155, out: 40, bend: 12 },
      floor: { forward: 150, out: 15, bend: 0 },
      clasped: { forward: 50, bend: 130, inward: 46 },
    };
    poseArm(woman, 'left', arms[a.grief]);
    poseArm(woman, 'right', arms[a.grief]);
    const { neck, spine } = joints(woman, 'left');
    neck.rotation.x = { face: 0.55, thrown: 0.45, floor: -0.3, clasped: -0.2 }[a.grief];
    ground(woman);

    let friend: Figure | null = null;
    if (a.companion) {
      const side = random() < 0.5 ? -1 : 1;
      friend = kneeler(H * 0.97, random() < 0.5, 0.25, 30);
      // She kneels a little behind and to one side, reaching a hand to the keener's back.
      friend.root.position.set(side * 0.5 * H, friend.root.position.y, -0.22 * H);
      friend.root.rotation.y = -side * 0.75;
      poseArm(friend, side > 0 ? 'left' : 'right', { forward: 55, out: 35, bend: 20 });
      poseArm(friend, side > 0 ? 'right' : 'left', { forward: 15, bend: 30, inward: 20 });
      ground(friend);
    }

    // ---- what stands and lies on the floor around her
    const wood = s.material('#6b4a2e', { roughness: 0.6 });
    const front = 0.36 * H;
    const place = (mesh: THREE.Object3D, x: number, y: number, z: number) => { mesh.position.set(x, y, z); scene.add(mesh); return mesh; };
    let flame: THREE.Mesh | null = null;
    if (a.candle) {
      const cx = (random() < 0.5 ? -1 : 1) * 0.32 * H, cz = 0.1 * H;
      const saucer = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.012, 18), s.material('#ece5d2', { roughness: 0.5 }));
      const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.018, 0.14, 12), s.material('#f1e8d0', { roughness: 0.7 }));
      saucer.castShadow = candle.castShadow = true;
      place(saucer, cx, 0.006, cz);
      place(candle, cx, 0.082, cz);
      flame = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshStandardMaterial({ color: '#fff2c4', emissive: new THREE.Color().setHSL(mix(0.13, 0.06, mood.warmth), 1, 0.6), emissiveIntensity: mix(0.7, 1.7, mood.warmth), transparent: true, opacity: 0.9, depthWrite: false }));
      flame.scale.set(0.012, 0.03, 0.012);
      place(flame, cx, 0.17, cz);
    }
    if (a.before === 'cap') {
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.42), s.material(pick(['#4a3f33', '#5a5248', '#3a3a3c']), { roughness: 0.95 }));
      cap.castShadow = true;
      place(cap, 0.08, 0.002, front).scale.y = 0.5;
      const peak = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.01, 0.09), cap.material);
      place(peak, 0.08, 0.012, front + 0.12);
    } else if (a.before === 'photograph') {
      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.012, 0.16), s.material('#3e2a1c', { roughness: 0.45 }));
      frame.castShadow = true;
      place(frame, 0, 0.006, front).rotation.y = 0.3;
      const print = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.13), s.material('#9c7f62', { roughness: 0.8 }));
      print.rotation.x = -Math.PI / 2;
      print.position.y = 0.0065;
      frame.add(print);
    } else if (a.before === 'cross') {
      const upright = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.34, 0.03), wood);
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.03, 0.03), wood);
      upright.castShadow = bar.castShadow = true;
      place(upright, 0, 0.17, front + 0.05).rotation.x = -0.12;
      place(bar, 0, 0.26, front + 0.035).rotation.x = -0.12;
      const earth = s.material('#4a3828', { roughness: 1 });
      scene.add(s.scatter(new THREE.SphereGeometry(1, 6, 5), earth, Array.from({ length: 24 }, () => ({ at: [(random() - 0.5) * 0.3, 0.012, front + (random() - 0.5) * 0.2] as [number, number, number], size: 0.008 + random() * 0.012 }))));
    } else if (a.before === 'flowers') {
      const stem = s.material('#5a7a3a', { roughness: 0.9 });
      const bunch = new THREE.Group();
      for (let i = 0; i < 7; i++) {
        const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.004, 0.22, 6), stem);
        stalk.rotation.set(Math.PI / 2 + (random() - 0.5) * 0.2, 0, (random() - 0.5) * 0.5);
        stalk.position.set((random() - 0.5) * 0.04, 0.012 + i * 0.004, 0);
        bunch.add(stalk);
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 6), s.material(pick(['#f1e36b', '#f4f1e6', '#b75a9a', '#e8863a']), { roughness: 0.8 }));
        head.position.set(stalk.position.x + Math.sin(stalk.rotation.z) * -0.1, stalk.position.y + 0.012, 0.11 + (random() - 0.5) * 0.03);
        bunch.add(head);
      }
      const tie = new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.004, 6, 12), s.material('#d9c9a1'));
      tie.rotation.x = Math.PI / 2;
      tie.position.set(0, 0.014, -0.05);
      bunch.add(tie);
      bunch.rotation.y = 0.4;
      place(bunch, 0, 0, front - 0.02);
    }

    // The body rocks on the knees; the scene's energy sets how hard.
    const amplitude = mix(0.025, 0.2, mood.energy);
    const rate = mix(1.1, 3.4, mood.energy);
    const phase = random() * Math.PI * 2;
    const restSpine = spine.rotation.x, restNeck = neck.rotation.x;
    const flicker = mix(0.03, 0.22, mood.energy);
    return s.finish({
      update(dt, time) {
        woman.update(dt, time);
        friend?.update(dt, time);
        const rock = Math.sin(time * rate + phase);
        spine.rotation.x = restSpine + rock * amplitude;
        neck.rotation.x = restNeck - rock * amplitude * 0.5;
        if (flame) flame.scale.y = 0.03 * (1 + Math.sin(time * 17) * flicker + Math.sin(time * 7.3) * flicker * 0.5);
      },
    });
  },
});
