import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

const FUR = {
  honey: 'Golden honey mohair, the classic old bear.',
  chocolate: 'Dark chocolate brown plush.',
  grey: 'Dull mouse-grey wool, wartime and thrifty.',
  cream: 'Cream that has yellowed like old piano keys.',
  pink: 'Faded nursery pink, once a christening gift.',
  black: 'A black mourning bear with a pale muzzle.',
} as const;
const FUR_COLOUR: Record<keyof typeof FUR, string> = {
  honey: '#c08a3a', chocolate: '#5e3c26', grey: '#8d8b86', cream: '#dccfa6', pink: '#d59aa2', black: '#2f2b2c',
};
const NAMES = { edith: 'EDITH', arthur: 'ARTHUR', mine: 'MINE', wait: 'WAIT FOR ME', return: 'RETURN TO', nobody: '?' } as const;

export default defineThing({
  questions: {
    fur: choice('What colour is its fur?', FUR),
    wrong: choice('Besides the hanging eye, what else is wrong with it?', {
      nothing: 'Only the eye: otherwise an ordinary, tired bear.',
      'missing-ear': 'One ear has been torn off, leaving a tuft of stuffing.',
      'stitched-mouth': 'Its mouth has been sewn shut with a row of black cross stitches.',
      'two-bears': 'It has been resewn from two different bears, split down the middle with a ladder of stitches.',
      'real-tooth': 'A real human tooth has been sewn into its muzzle.',
      'torn-arm': 'One arm hangs off by a few threads, stuffing spilling from the shoulder.',
    }),
    posture: choice('How is it sitting or lying?', {
      slumped: 'Slumped forward, head dropped onto its chest, abandoned.',
      neat: 'Sat up very neatly with paws on its knees, as if someone posed it just now.',
      'arms-out': 'Arms held out and up, asking to be picked up.',
      'face-down': 'Lying face-down on the floor where it was dropped.',
      toppled: 'Fallen over onto its side, staring across the floor.',
    }),
    eyes: choice('What kind of eyes does it have?', {
      'boot-button': 'Glossy black boot buttons.',
      mismatched: 'Mismatched: one black, and the hanging one a pale four-hole shirt button.',
      amber: 'Amber glass eyes with black pupils.',
      red: 'Small red glass eyes that catch the light.',
    }),
    wears: choice('What is it wearing?', {
      nothing: 'Nothing at all.',
      ribbon: 'A satin ribbon tied in a bow at its neck.',
      armband: 'A black mourning band sewn round one arm.',
      'name-tag': 'A card luggage tag on a string round its neck with a name inked on it.',
      scarf: 'A hand-knitted striped scarf.',
    }),
    name: choice('If it has a name tag, what is written on it?', {
      edith: 'EDITH, a child\'s name in careful capitals.',
      arthur: 'ARTHUR.',
      mine: 'MINE, possessive and a little threatening.',
      wait: 'WAIT FOR ME.',
      return: 'RETURN TO, with the rest torn away.',
      nobody: 'A single question mark.',
    }),
    history: choice('Where has it been all this time?', {
      loved: 'On a pillow: clean, hugged flat, the fur rubbed pale on the tummy and nose.',
      damp: 'Left in the damp: dark blooms of mould and a sodden sag.',
      attic: 'In the attic: a grey blanket of dust on every upward surface.',
      fire: 'Pulled from a fire: one side singed black.',
      mended: 'Mended again and again with gingham and flannel patches.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const wear = mood.wear;

    const furTexture = (base: string, seedShift: number) => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 256;
      const ctx = canvas.getContext('2d')!;
      const colour = new THREE.Color(base);
      if (a.history === 'damp') colour.multiplyScalar(0.78);
      ctx.fillStyle = `#${colour.getHexString()}`;
      ctx.fillRect(0, 0, 256, 256);
      const light = colour.clone().lerp(new THREE.Color('#fff4d8'), 0.35).getStyle();
      const dark = colour.clone().multiplyScalar(0.62).getStyle();
      for (let i = 0; i < 2600; i++) {
        const x = random() * 256, y = random() * 256, angle = random() * Math.PI;
        ctx.strokeStyle = random() < 0.5 ? light : dark;
        ctx.globalAlpha = 0.35;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(angle) * 5, y + Math.sin(angle) * 5);
        ctx.stroke();
      }
      // Threadbare patches where the pile has been loved or rotted away to the backing cloth.
      const bald = Math.round(mix(2, 11, wear) + seedShift);
      for (let i = 0; i < bald; i++) {
        const x = random() * 256, y = random() * 256, r = mix(10, 34, random());
        const patch = ctx.createRadialGradient(x, y, 0, x, y, r);
        patch.addColorStop(0, 'rgba(214,196,160,0.85)');
        patch.addColorStop(1, 'rgba(214,196,160,0)');
        ctx.globalAlpha = 1;
        ctx.fillStyle = patch;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
      }
      const blot = (count: number, rgb: string, size: number) => {
        for (let i = 0; i < count; i++) {
          const x = random() * 256, y = random() * 256, r = mix(size * 0.4, size, random());
          const patch = ctx.createRadialGradient(x, y, 0, x, y, r);
          patch.addColorStop(0, `rgba(${rgb},0.9)`);
          patch.addColorStop(0.6, `rgba(${rgb},0.55)`);
          patch.addColorStop(1, `rgba(${rgb},0)`);
          ctx.fillStyle = patch;
          ctx.fillRect(x - r, y - r, r * 2, r * 2);
        }
      };
      if (a.history === 'damp') { blot(16, '38,52,40', 30); blot(10, '20,24,22', 16); }
      if (a.history === 'fire') { ctx.fillStyle = 'rgba(16,13,12,0.9)'; ctx.fillRect(0, 0, 46, 256); blot(7, '16,13,12', 34); blot(8, '70,40,18', 22); }
      if (a.history === 'attic') { ctx.globalAlpha = 0.4; ctx.fillStyle = '#b9bbbd'; ctx.fillRect(0, 0, 256, 100); ctx.globalAlpha = 1; }
      if (a.history === 'mended') {
        for (let i = 0; i < 7; i++) {
          const x = random() * 220, y = random() * 220, w = mix(26, 52, random()), h = mix(22, 44, random());
          const check = ['#b8433e', '#3f6c93', '#557a4c', '#c9a14a'][Math.floor(random() * 4)];
          ctx.fillStyle = '#efe8d6';
          ctx.fillRect(x, y, w, h);
          ctx.fillStyle = check;
          ctx.globalAlpha = 0.7;
          for (let k = 0; k < w; k += 8) ctx.fillRect(x + k, y, 4, h);
          for (let k = 0; k < h; k += 8) ctx.fillRect(x, y + k, w, 4);
          ctx.globalAlpha = 1;
          ctx.strokeStyle = '#1d1a18';
          ctx.setLineDash([4, 3]);
          ctx.lineWidth = 2;
          ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);
          ctx.setLineDash([]);
        }
      }
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      return new THREE.MeshStandardMaterial({ map: texture, roughness: 0.96 });
    };

    const keys = Object.keys(FUR) as (keyof typeof FUR)[];
    const other = keys.filter((key) => key !== a.fur)[Math.floor(random() * (keys.length - 1))];
    const furA = furTexture(FUR_COLOUR[a.fur], 0);
    const furB = a.wrong === 'two-bears' ? furTexture(FUR_COLOUR[other], 2) : furA;
    const pad = s.material(a.fur === 'black' ? '#b7a58c' : '#d9c39a', { roughness: 0.9 });
    const thread = s.material('#17130f', { roughness: 0.8 });
    const fluff = new THREE.MeshStandardMaterial({ color: a.history === 'damp' ? '#b7b6a3' : a.history === 'fire' ? '#8d8880' : '#f2efe4', roughness: 1 });

    const add = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, at: [number, number, number], size: [number, number, number] = [1, 1, 1]) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...at);
      mesh.scale.set(...size);
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    const sphere = new THREE.SphereGeometry(1, 28, 18);
    const halfRight = new THREE.SphereGeometry(1, 16, 18, Math.PI / 2, Math.PI);
    const halfLeft = new THREE.SphereGeometry(1, 16, 18, Math.PI * 1.5, Math.PI);
    /** A fur ball, or two half balls of different bears when it has been resewn. */
    const ball = (parent: THREE.Object3D, at: [number, number, number], size: [number, number, number]) => {
      if (furA === furB) return void add(parent, sphere, furA, at, size);
      add(parent, halfLeft, furA, at, size);
      add(parent, halfRight, furB, at, size);
      // A ladder of stitches down the join.
      for (let i = 0; i < 9; i++) {
        const t = mix(-1.25, 1.25, i / 8);
        const stitch = add(parent, new THREE.BoxGeometry(size[0] * 0.26, 0.006, 0.006), thread, [at[0], at[1] + Math.sin(t) * size[1] * 1.005, at[2] + Math.cos(t) * size[2] * 1.005]);
        stitch.rotation.z = (random() - 0.5) * 0.5;
      }
    };
    const puff = (parent: THREE.Object3D, at: [number, number, number], amount: number) => {
      const count = Math.round(amount);
      for (let i = 0; i < count; i++) {
        const r = mix(0.012, 0.03, random());
        add(parent, new THREE.IcosahedronGeometry(1, 1), fluff, [at[0] + (random() - 0.5) * 0.05, at[1] + (random() - 0.5) * 0.04, at[2] + (random() - 0.5) * 0.05], [r, r * mix(0.7, 1.1, random()), r]);
      }
    };

    const pose = {
      slumped: { tilt: 0.32, headX: 0.62, headZ: 0.28, headY: 0, armX: -0.25, armZ: 0.22, legX: 0, spread: 0.42 },
      neat: { tilt: 0, headX: 0.04, headZ: 0, headY: 0, armX: -0.95, armZ: 0.05, legX: 0, spread: 0.2 },
      'arms-out': { tilt: -0.08, headX: -0.2, headZ: 0.08, headY: 0, armX: -1.9, armZ: 0.75, legX: 0, spread: 0.34 },
      'face-down': { tilt: 0, headX: -0.15, headZ: 0, headY: 1.15, armX: -2.6, armZ: 0.8, legX: 1.5, spread: 0.3 },
      toppled: { tilt: 0.1, headX: 0.1, headZ: 0.2, headY: 0, armX: -0.7, armZ: 0.3, legX: 0.2, spread: 0.3 },
    }[a.posture];
    const sag = a.history === 'damp' ? 0.88 : 1;

    const bear = new THREE.Group();
    s.root.add(bear);
    const torso = new THREE.Group();
    torso.position.set(0, 0.06, 0);
    torso.rotation.x = pose.tilt;
    bear.add(torso);
    ball(torso, [0, 0.12 * sag, 0], [0.13, 0.155 * sag, 0.112]);
    // A paler tummy panel with a centre seam.
    add(torso, sphere, pad, [0, 0.105 * sag, 0.05], [0.085, 0.1 * sag, 0.07]);
    add(torso, new THREE.BoxGeometry(0.004, 0.17 * sag, 0.004), thread, [0, 0.11 * sag, 0.121]);

    const head = new THREE.Group();
    head.position.set(0, 0.3 * sag, 0.005);
    head.rotation.set(pose.headX, pose.headY, pose.headZ + (random() - 0.5) * 0.12);
    torso.add(head);
    ball(head, [0, 0.085, 0], [0.118, 0.105, 0.105]);
    add(head, sphere, pad, [0, 0.052, 0.085], [0.054, 0.044, 0.05]);
    add(head, sphere, thread, [0, 0.073, 0.131], [0.02, 0.014, 0.012]);
    for (const side of [-1, 1]) {
      if (side === -1 && a.wrong === 'missing-ear') {
        add(head, new THREE.TorusGeometry(0.03, 0.006, 6, 14), thread, [side * 0.085, 0.165, 0]).rotation.set(Math.PI / 2 - 0.5, 0, side * 0.6);
        puff(head, [side * 0.09, 0.175, 0], 6);
        continue;
      }
      add(head, sphere, side === 1 ? furB : furA, [side * 0.088, 0.172, -0.005], [0.046, 0.046, 0.022]);
      add(head, sphere, pad, [side * 0.088, 0.171, 0.01], [0.028, 0.028, 0.012]);
    }
    // Mouth: an embroidered Y, cross stitches, or a tooth.
    add(head, new THREE.BoxGeometry(0.004, 0.026, 0.004), thread, [0, 0.05, 0.134]);
    if (a.wrong === 'stitched-mouth') {
      add(head, new THREE.BoxGeometry(0.075, 0.005, 0.005), thread, [0, 0.034, 0.128]);
      for (let i = 0; i < 6; i++)
        for (const lean of [-1, 1]) add(head, new THREE.BoxGeometry(0.004, 0.024, 0.004), thread, [-0.031 + i * 0.0125, 0.034, 0.131 - Math.abs(i - 2.5) * 0.004]).rotation.z = lean * 0.6;
    } else {
      for (const side of [-1, 1]) add(head, new THREE.BoxGeometry(0.03, 0.004, 0.004), thread, [side * 0.013, 0.034, 0.13]).rotation.z = side * (mood.cheer > 0.55 ? 0.5 : -0.45);
      if (a.wrong === 'real-tooth') {
        const enamel = new THREE.MeshStandardMaterial({ color: '#f3ead0', roughness: 0.3 });
        add(head, new THREE.SphereGeometry(1, 12, 8), new THREE.MeshStandardMaterial({ color: '#7a2f33', roughness: 0.7 }), [0.004, 0.026, 0.126], [0.022, 0.012, 0.01]);
        add(head, new THREE.CapsuleGeometry(0.0085, 0.016, 4, 10), enamel, [0.004, 0.018, 0.134]).rotation.z = 0.12;
        add(head, new THREE.BoxGeometry(0.03, 0.003, 0.003), thread, [0.004, 0.026, 0.142]).rotation.z = 0.5;
        add(head, new THREE.BoxGeometry(0.03, 0.003, 0.003), thread, [0.004, 0.026, 0.142]).rotation.z = -0.5;
      }
    }

    const eyeColour = { 'boot-button': '#0d0c0c', mismatched: '#0d0c0c', amber: '#c97a12', red: '#c21d1d' }[a.eyes];
    const glass = a.eyes === 'amber' || a.eyes === 'red';
    const eyeMaterial = new THREE.MeshStandardMaterial({ color: eyeColour, roughness: 0.15, metalness: 0.1, emissive: a.eyes === 'red' ? '#7a0c0c' : '#000000', emissiveIntensity: a.eyes === 'red' ? 0.7 : 0 });
    const makeEye = (material: THREE.Material, holes: boolean) => {
      const eye = new THREE.Group();
      eye.scale.setScalar(1.45);
      const disc = new THREE.Mesh(glass ? new THREE.SphereGeometry(0.019, 16, 10) : new THREE.CylinderGeometry(0.019, 0.019, 0.008, 18), material);
      if (glass) disc.scale.z = 0.6; else disc.rotation.x = Math.PI / 2;
      disc.castShadow = true;
      eye.add(disc);
      if (glass) add(eye, new THREE.SphereGeometry(0.009, 10, 8), thread, [0, 0, 0.008], [1, 1, 0.5]);
      else if (holes) for (const [x, y] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) add(eye, new THREE.CylinderGeometry(0.0028, 0.0028, 0.01, 6), thread, [x * 0.006, y * 0.006, 0]).rotation.x = Math.PI / 2;
      else add(eye, new THREE.TorusGeometry(0.013, 0.003, 6, 16), new THREE.MeshStandardMaterial({ color: '#3a3836', roughness: 0.2 }), [0, 0, 0.004]);
      return eye;
    };
    const eyeAt = (side: number) => new THREE.Vector3(side * 0.047, 0.108, 0.094);
    const fixed = makeEye(eyeMaterial, false);
    fixed.position.copy(eyeAt(-1));
    fixed.lookAt(fixed.position.clone().multiplyScalar(2).sub(new THREE.Vector3(0, 0.085, 0)));
    head.add(fixed);
    // The empty socket: a darker hollow and the stubs of broken thread.
    add(head, sphere, new THREE.MeshStandardMaterial({ color: '#5b4a3a', roughness: 1 }), eyeAt(1).toArray(), [0.024, 0.024, 0.008]);
    for (let i = 0; i < 4; i++) add(head, new THREE.BoxGeometry(0.003, 0.026, 0.003), thread, [0.047 + (random() - 0.5) * 0.02, 0.108 + (random() - 0.5) * 0.02, 0.104]).rotation.z = random() * 3;

    const limbGeometry = new THREE.CapsuleGeometry(0.041, 0.1, 6, 14);
    const arms: THREE.Group[] = [];
    for (const side of [-1, 1]) {
      const arm = new THREE.Group();
      const torn = side === -1 && a.wrong === 'torn-arm';
      arm.position.set(side * 0.118, (torn ? 0.2 : 0.235) * sag, 0.015);
      arm.rotation.set(torn ? 0.15 : pose.armX + (random() - 0.5) * 0.25, 0, side * (torn ? 0.05 : pose.armZ));
      torso.add(arm);
      const fur = side === 1 ? furB : furA;
      add(arm, limbGeometry, fur, [side * (torn ? 0.03 : 0), -0.085, 0]);
      add(arm, sphere, pad, [side * (torn ? 0.03 : 0), -0.15, 0.022], [0.026, 0.03, 0.022]);
      if (torn) {
        puff(torso, [side * 0.125, 0.25 * sag, 0.015], 9);
        for (let i = 0; i < 3; i++) add(torso, new THREE.BoxGeometry(0.0025, 0.06, 0.0025), thread, [side * (0.125 + i * 0.012), 0.225 * sag, 0.02 + (i - 1) * 0.02]).rotation.z = side * 0.3;
      }
      if (a.wears === 'armband' && side === 1) add(arm, new THREE.CylinderGeometry(0.0435, 0.0435, 0.04, 18), new THREE.MeshStandardMaterial({ color: '#0e0d0f', roughness: 0.75 }), [0, -0.06, 0]);
      arms.push(arm);
    }
    for (const side of [-1, 1]) {
      const leg = new THREE.Group();
      leg.position.set(side * 0.078, 0.048, 0.045);
      leg.rotation.set(pose.legX, side * (pose.spread + (random() - 0.5) * 0.2), 0, 'YXZ');
      bear.add(leg);
      const fur = side === 1 ? furB : furA;
      add(leg, new THREE.CapsuleGeometry(0.047, 0.1, 6, 14), fur, [0, 0, 0.085]).rotation.x = Math.PI / 2;
      add(leg, sphere, fur, [0, 0.016, 0.168], [0.05, 0.062, 0.042]);
      add(leg, sphere, pad, [0, 0.016, 0.2], [0.033, 0.043, 0.014]);
    }
    add(bear, sphere, furA, [0, 0.09, -0.11], [0.03, 0.03, 0.028]);

    // Stuffing leaking from the seams; more of it the more worn the scene is.
    puff(torso, [0.02, 0.07 * sag, 0.115], mix(1, 7, wear));
    puff(torso, [0.115, 0.2 * sag, 0.02], mix(0, 5, wear));
    if (wear > 0.45) puff(bear, [-0.06, 0.03, 0.07], mix(0, 6, wear));

    const neck: [number, number, number] = [0, 0.262 * sag, 0.01];
    if (a.wears === 'ribbon') {
      const satin = new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(mix(0.6, 0.98, mood.warmth), 0.55, mix(0.3, 0.55, mood.cheer)), roughness: 0.35, side: THREE.DoubleSide });
      add(torso, new THREE.TorusGeometry(0.083, 0.013, 8, 28), satin, neck).rotation.x = Math.PI / 2;
      for (const side of [-1, 1]) {
        add(torso, new THREE.TorusGeometry(0.03, 0.012, 8, 18), satin, [side * 0.04, neck[1] + 0.005, 0.1], [1, 0.62, 0.5]).rotation.z = side * 0.25;
        add(torso, new THREE.BoxGeometry(0.024, 0.085, 0.004), satin, [side * 0.022, neck[1] - 0.05, 0.11]).rotation.z = side * 0.3;
      }
      add(torso, sphere, satin, [0, neck[1], 0.103], [0.016, 0.016, 0.012]);
    }
    if (a.wears === 'scarf') {
      const stripes = document.createElement('canvas');
      stripes.width = 64; stripes.height = 8;
      const ctx = stripes.getContext('2d')!;
      ['#8f2f2b', '#d7c9a0', '#2f4a5e', '#d7c9a0'].forEach((colour, i) => { ctx.fillStyle = colour; for (let k = i * 8; k < 64; k += 32) ctx.fillRect(k, 0, 8, 8); });
      const texture = new THREE.CanvasTexture(stripes);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = THREE.RepeatWrapping;
      const wool = new THREE.MeshStandardMaterial({ map: texture, roughness: 1 });
      add(torso, new THREE.TorusGeometry(0.086, 0.022, 8, 28), wool, neck, [1, 1, 1.5]).rotation.x = Math.PI / 2;
      add(torso, new THREE.BoxGeometry(0.05, 0.15, 0.014), wool, [0.05, neck[1] - 0.085, 0.108]).rotation.z = 0.12;
    }
    if (a.wears === 'name-tag') {
      add(torso, new THREE.TorusGeometry(0.08, 0.003, 6, 28), new THREE.MeshStandardMaterial({ color: '#b9a57e', roughness: 1 }), neck).rotation.x = Math.PI / 2;
      const tag = s.label(NAMES[a.name], 0.15, 0.07, [0, 0, 0], '#2a211a', a.history === 'damp' ? '#b9ab83' : '#e2d2a8');
      torso.add(tag);
      tag.position.set(0.012, neck[1] - 0.085, 0.127);
      tag.rotation.set(-0.12, 0, -0.14 + (random() - 0.5) * 0.2);
    }

    if (a.posture === 'face-down') bear.rotation.x = Math.PI / 2 - 0.06;
    if (a.posture === 'toppled') { bear.rotation.z = -Math.PI / 2 + 0.22; bear.rotation.y = 0.25; }
    bear.rotation.y += (random() - 0.5) * 0.3;

    // The hanging eye is hung in world space so the thread always falls straight down.
    s.root.updateMatrixWorld(true);
    const floorY = new THREE.Box3().setFromObject(bear).min.y;
    const socket = head.localToWorld(eyeAt(1).add(new THREE.Vector3(0.006, 0, 0.014)));
    const reach = Math.max(0.012, Math.min(mix(0.06, 0.085, random()), socket.y - floorY - 0.03));
    const pendulum = new THREE.Group();
    pendulum.position.copy(socket);
    s.root.add(pendulum);
    add(pendulum, new THREE.CylinderGeometry(0.0028, 0.0028, reach, 5), thread, [0, -reach / 2, 0]);
    const hanging = makeEye(a.eyes === 'mismatched' ? new THREE.MeshStandardMaterial({ color: '#e9e2cf', roughness: 0.35 }) : eyeMaterial, a.eyes === 'mismatched');
    hanging.position.set(0, -reach - 0.024, 0.004);
    hanging.rotation.set(0.2, (random() - 0.5) * 0.9, 0);
    hanging.traverse((node) => { node.castShadow = true; });
    pendulum.add(hanging);

    const swing = mix(0.02, 0.5, mood.energy);
    const phase = random() * 6;
    return s.finish({
      update: (_dt, time) => {
        pendulum.rotation.z = Math.sin(time * 2.6 + phase) * swing;
        pendulum.rotation.x = Math.sin(time * 1.9 + phase) * swing * 0.25;
      },
    });
  },
});
