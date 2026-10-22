import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix, noul } from '@conjure/kit';
import { paint, pickSkin, rig, worldOf } from './rig';

export default defineThing({
  questions: {
    move: choice('What is the move?', {
      kick: 'A high kick: one leg thrown up past the shoulder, arms flung wide for balance.',
      header: 'A header: on tiptoe, neck craned, the ball meeting the forehead.',
      chest: 'A chest trap: leaning back, arms out, the ball dropping onto the chest.',
      dive: 'A full-length dive, one hand in the sand, the ball just off the toe.',
    }),
    ball: choice('What kind of ball?', {
      volleyball: 'A white, yellow and blue panelled beach volleyball.',
      football: 'A black and white football.',
      orange: 'A plain orange beach ball, scuffed.',
    }),
    shorts: choice('What colour are the board shorts?', {
      yellow: 'Canary yellow.', green: 'Green.', blue: 'Deep blue.', red: 'Red.', black: 'Black.', floral: 'A loud floral print.',
    }),
    top: choice('What is on top?', {
      bare: 'No shirt, sun on the back.',
      tank: 'A white tank top.',
      rash: 'A long-sleeved dark rash shirt.',
      bikini: 'A bikini top.',
    }),
    hair: choice('What is on their head?', {
      short: 'Short hair.', long: 'Long hair tied back.', cap: 'A cap turned backwards.', bun: 'A high bun.', bandana: 'A bandana knotted at the back.',
    }),
    opponent: noul('Does a second player crouch ready on the other side of the net post?'),
    tally: noul('Is a scoring tally of shells laid out in the sand beside the post?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const skin = pickSkin(random);
    const H = mix(1.68, 1.86, random());
    const headR = H * 0.064;
    const shortsColour = { yellow: '#f2c21c', green: '#2e8b57', blue: '#1f3f8a', red: '#d8262c', black: '#1d1d1f', floral: '#1f6f8a' }[a.shorts];
    const top = a.top === 'bare' ? skin : a.top === 'tank' ? '#f4f1e8' : a.top === 'rash' ? '#20242c' : ['#ee6fa0', '#f2c21c', '#2bb5b0'][Math.floor(random() * 3)];
    const player = figure(s, {
      height: H, build: 'average', style: 'doll', skin, top, bottom: shortsColour, shoes: skin,
      sleeves: a.top === 'rash' ? 'long' : 'short',
      hair: a.hair === 'cap' ? 'cap' : a.hair === 'bandana' ? 'short' : a.hair, hairColor: a.hair === 'cap' ? ['#d8262c', '#1f2a44', '#f4f1e8'][Math.floor(random() * 3)] : '#2a1d16',
      pose: 'standing', gaze: 'ahead',
    });
    s.root.add(player.root);
    const joints = rig(player);
    if (a.hair === 'cap') for (const child of player.head.children) if ((child as THREE.Mesh).geometry?.type === 'BoxGeometry') child.position.z = -child.position.z; // peak to the back
    if (a.hair === 'bandana') {
      const cloth = new THREE.Mesh(new THREE.SphereGeometry(headR * 1.07, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), s.material('#d8262c'));
      cloth.position.y = headR * 0.12;
      const knot = new THREE.Mesh(new THREE.BoxGeometry(headR * 0.5, headR * 0.3, headR * 0.3), s.material('#d8262c'));
      knot.position.set(0, headR * 0.2, -headR * 1.0);
      cloth.castShadow = true;
      player.head.add(cloth, knot);
    }
    if (a.shorts === 'floral') {
      const map = paint(128, 128, (c) => {
        c.fillStyle = shortsColour; c.fillRect(0, 0, 128, 128);
        for (let i = 0; i < 24; i++) { c.fillStyle = ['#f2c21c', '#e85a3a', '#f4f1e8', '#8fd0a8'][i % 4]; c.beginPath(); c.arc(random() * 128, random() * 128, 5 + random() * 6, 0, 7); c.fill(); }
      });
      map.wrapS = map.wrapT = THREE.RepeatWrapping;
      map.repeat.set(3, 3);
      const hips = player.pelvis.children[0] as THREE.Mesh;
      const material = hips.material as THREE.MeshStandardMaterial;
      material.map = map;
      material.needsUpdate = true;
    }

    // The pose, and where the ball hangs.
    let ballAt = new THREE.Vector3(0, H * 1.25, H * 0.2);
    if (a.move === 'kick') {
      joints.leg('right', { forward: mix(118, 138, random()), out: 16, knee: 8, foot: 20 });
      joints.leg('left', { forward: -6, out: 4, knee: 2 });
      joints.arm('left', { forward: -30, out: 70, bend: 25 });
      joints.arm('right', { forward: 40, out: 60, bend: 30 });
      joints.lean(-16);
      joints.bow(-4);
      joints.look(-18, 0);
      joints.settle();
    } else if (a.move === 'header') {
      joints.leg('left', { forward: 10, out: 6, knee: 14, foot: -25 });
      joints.leg('right', { forward: -4, out: 6, knee: 10, foot: -25 });
      joints.arm('left', { forward: -20, out: 45, bend: 40 });
      joints.arm('right', { forward: -20, out: 45, bend: 40 });
      joints.bow(-8);
      joints.look(-28, 0);
      joints.settle();
      const head = worldOf(player.head);
      ballAt = new THREE.Vector3(head.x, head.y + headR * 2.3, head.z + headR * 1.1);
    } else if (a.move === 'chest') {
      joints.leg('left', { forward: 12, out: 10, knee: 20 });
      joints.leg('right', { forward: -12, out: 10, knee: 6 });
      joints.arm('left', { forward: -35, out: 55, bend: 20 });
      joints.arm('right', { forward: -35, out: 55, bend: 20 });
      joints.lean(-14);
      joints.bow(-10);
      joints.look(28, 0);
      joints.settle();
      const chest = worldOf(player.pelvis).add(new THREE.Vector3(0, H * 0.26, H * 0.2));
      ballAt = chest;
    } else {
      // A full-length dive: body nearly flat, one hand down, the ball at the toes.
      joints.arm('left', { forward: 100, out: 10, bend: 10 });
      joints.arm('right', { forward: 150, out: 30, bend: 10 });
      joints.leg('left', { forward: -20, out: 6, knee: 10, foot: 30 });
      joints.leg('right', { forward: -10, out: 14, knee: 30, foot: 30 });
      joints.look(-30, 0);
      player.root.rotation.x = Math.PI * 0.42;
      joints.settle();
    }
    player.root.updateMatrixWorld(true);
    if (a.move === 'kick' || a.move === 'dive') {
      // Put the ball just off the kicking foot.
      const hipR = (player.pelvis.children.filter((c) => (c as THREE.Group).isGroup) as THREE.Group[])[2];
      const knee = hipR.children.find((c) => (c as THREE.Group).isGroup)!;
      const ankle = knee.children.find((c) => (c as THREE.Group).isGroup)!;
      const toe = worldOf(ankle);
      ballAt = a.move === 'kick' ? new THREE.Vector3(toe.x, toe.y + H * 0.16, toe.z + H * 0.02) : new THREE.Vector3(toe.x - H * 0.1, Math.max(0.2, toe.y + H * 0.08), toe.z - H * 0.12);
    }

    // The ball on a thin rod from the sand.
    const ballMap = paint(256, 128, (c) => {
      if (a.ball === 'volleyball') {
        const tones = ['#f4f1e8', '#f2c21c', '#2b6fb8'];
        for (let i = 0; i < 6; i++) { c.fillStyle = tones[i % 3]; c.fillRect(i * 43, 0, 43, 128); }
        c.strokeStyle = 'rgba(40,40,40,0.5)'; c.lineWidth = 2;
        for (let i = 0; i <= 6; i++) { c.beginPath(); c.moveTo(i * 43, 0); c.lineTo(i * 43, 128); c.stroke(); }
        c.beginPath(); c.moveTo(0, 64); c.lineTo(256, 64); c.stroke();
      } else if (a.ball === 'football') {
        c.fillStyle = '#f4f1e8'; c.fillRect(0, 0, 256, 128);
        c.fillStyle = '#1d1d1f';
        for (let i = 0; i < 12; i++) { const x = (i % 6) * 43 + (Math.floor(i / 6) ? 21 : 0), y = Math.floor(i / 6) * 64 + 32; c.beginPath(); for (let p = 0; p < 5; p++) { const t = p * 1.257 - 1.57; c.lineTo(x + Math.cos(t) * 13, y + Math.sin(t) * 13); } c.fill(); }
      } else {
        c.fillStyle = '#f0702a'; c.fillRect(0, 0, 256, 128);
        c.fillStyle = 'rgba(255,255,255,0.25)'; c.fillRect(0, 56, 256, 16);
        for (let i = 0; i < 20; i++) { c.fillStyle = `rgba(90,60,30,${0.1 + random() * 0.2})`; c.beginPath(); c.arc(random() * 256, random() * 128, 3 + random() * 6, 0, 7); c.fill(); }
      }
    });
    const ballR = a.ball === 'football' ? 0.11 : 0.105;
    const ball = s.mesh(new THREE.SphereGeometry(ballR, 24, 16), new THREE.MeshStandardMaterial({ map: ballMap, roughness: 0.55 }), ballAt.toArray() as [number, number, number]);
    ball.rotation.set(random() * 3, random() * 3, 0);
    const rod = s.rod([ballAt.x, 0, ballAt.z], [ballAt.x, ballAt.y - ballR * 0.8, ballAt.z], 0.004, new THREE.MeshStandardMaterial({ color: '#cfd4d6', transparent: true, opacity: 0.6, depthWrite: false }));
    rod.castShadow = false;

    // The court: a line scuffed in the sand and a low net post with a scrap of net.
    const sand = s.material('#c4a874', { roughness: 1 });
    const postX = H * 0.55, postZ = -H * 0.05;
    const line = s.box([2.6, 0.012, 0.05], [postX, 0.004, postZ], sand);
    line.rotation.y = Math.PI / 2;
    const steel = s.material('#9aa0a4', { metalness: 0.6, roughness: 0.4 });
    s.rod([postX, 0, postZ], [postX, H * 1.2, postZ], 0.028, steel);
    s.cylinder(0.08, 0.1, 0.05, [postX, 0.02, postZ], steel, 12);
    const netMap = paint(128, 128, (c) => {
      c.clearRect(0, 0, 128, 128);
      c.strokeStyle = '#1d1d1f'; c.lineWidth = 2;
      for (let i = 0; i <= 128; i += 16) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i, 128); c.stroke(); c.beginPath(); c.moveTo(0, i); c.lineTo(128, i); c.stroke(); }
      c.fillStyle = '#f4f1e8'; c.fillRect(0, 0, 128, 10);
    });
    netMap.wrapS = THREE.RepeatWrapping;
    netMap.repeat.x = 3;
    netMap.repeat.x = 4;
    const net = s.mesh(new THREE.PlaneGeometry(1.6, 0.8), new THREE.MeshStandardMaterial({ map: netMap, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.9 }), [postX, H * 1.2 - 0.4, postZ - 0.81]);
    net.rotation.y = Math.PI / 2;
    net.castShadow = true;
    s.rod([postX, H * 1.2, postZ], [postX, H * 1.2 - 0.03, postZ - 1.62], 0.008, s.material('#f4f1e8'));
    s.rod([postX, H * 1.2 - 0.8, postZ], [postX, H * 1.2 - 0.83, postZ - 1.62], 0.006, s.material('#f4f1e8'));

    if (a.tally) {
      const shells = s.scatter(new THREE.SphereGeometry(1, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), s.material('#f3eadb'), Array.from({ length: 9 }, (_u, i) => ({ at: [postX + 0.25 + (i % 5) * 0.06, 0.003, postZ + 0.12 + Math.floor(i / 5) * 0.1] as const, size: 0.018 })));
      void shells;
      s.rod([postX + 0.2, 0.004, postZ + 0.17], [postX + 0.55, 0.004, postZ + 0.17], 0.004, s.material('#8a7352'));
    }

    // An opponent crouched ready beyond the post.
    let other: ReturnType<typeof figure> | null = null;
    if (a.opponent) {
      const skin2 = pickSkin(random);
      other = figure(s, {
        height: mix(1.66, 1.84, random()), style: 'doll', skin: skin2, top: random() < 0.6 ? skin2 : '#f4f1e8', bottom: ['#1d1d1f', '#2e8b57', '#f2c21c', '#d8262c'][Math.floor(random() * 4)],
        shoes: skin2, sleeves: 'short', hair: (['short', 'cap', 'bun', 'long'] as const)[Math.floor(random() * 4)], pose: 'crouching', gaze: 'ahead',
      });
      other.root.position.set(postX + H * 0.45, 0, postZ - 0.75);
      other.root.rotation.y = -Math.PI / 2 - 0.4;
      s.root.add(other.root);
      const r2 = rig(other);
      r2.arm('left', { forward: 30, out: 40, bend: 40 });
      r2.arm('right', { forward: 30, out: 40, bend: 40 });
      r2.lean(-12);
      r2.look(-20, 0);
      r2.settle(false);
    }

    const energy = mood.energy;
    const spin = mix(0.3, 3, energy);
    return s.finish({
      update: (dt, time) => {
        player.update(dt, time);
        other?.update(dt, time);
        ball.rotation.y += dt * spin;
        ball.position.y = ballAt.y + Math.sin(time * 2.2) * 0.012 * energy;
      },
    });
  },
});
