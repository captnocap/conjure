import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix, noul } from '@conjure/kit';
import { bucketHat, glow, paint, pick, pickSkin, rig, worldOf } from './rig';

const GLOWS = { green: '#5aff2a', pink: '#ff3fb0', blue: '#3c8cff', orange: '#ff8c1a', mixed: '' } as const;

export default defineThing({
  questions: {
    dance: choice('How are they dancing?', {
      'arms-up': 'Both arms straight up, head back, lost in it.',
      bent: 'Bent double, hands near the knees, stomping.',
      swaying: 'Arms out wide, swaying, eyes shut.',
      spinning: 'Mid-spin, one arm up, one out, a foot off the floor.',
      stomp: 'Knee up, fists pumping, a big stomp.',
    }),
    outfit: choice('What are they wearing?', {
      shellsuit: 'A shiny purple and teal shell suit.',
      vest: 'A neon yellow vest and baggy jeans.',
      fur: 'A huge fluffy fur coat over everything.',
      shirtless: 'Shirtless, jeans, sweat shining.',
      smiley: 'A yellow smiley T-shirt and combat trousers.',
      tiedye: 'A tie-dye T-shirt and wide striped trousers.',
    }),
    head: choice('What is on their head?', {
      bucket: 'A bucket hat.',
      bare: 'Bare head, short hair plastered down.',
      long: 'Long hair flying.',
      cap: 'A cap on backwards.',
      shades: 'Short hair and sunglasses at three in the morning.',
    }),
    holding: choice('What is in their hand or mouth?', {
      water: 'A bottle of water held high.',
      cigarette: 'A cigarette in the mouth.',
      whistle: 'The whistle in the mouth, cord stretched tight.',
      nothing: 'Nothing: hands open, fingers spread.',
    }),
    glow: choice('What colour are the glowsticks?', {
      green: 'Acid green.',
      pink: 'Hot pink.',
      blue: 'Electric blue.',
      orange: 'Orange.',
      mixed: 'Every colour at once.',
    }),
    friend: noul('Does a smaller friend lean on them, an arm round their shoulders?'),
    moment: choice('What moment is it?', {
      peak: 'The peak of the night: the drop, everyone on their toes.',
      lull: 'A lull between tunes, catching breath, grinning at nobody.',
      dawn: 'Dawn: still going, slower, the glowsticks fading.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const H = mix(1.6, 1.88, random());
    const headR = H * 0.064;
    const skin = pickSkin(random);
    const fade = a.moment === 'dawn' ? 0.45 : 1;
    const stickColour = () => (a.glow === 'mixed' ? pick(random, ['#5aff2a', '#ff3fb0', '#3c8cff', '#ff8c1a', '#ffe13c']) : GLOWS[a.glow]);
    const stick = (colour: string) => glow(colour, 2.2 * fade);

    const outfit = {
      shellsuit: { top: '#6a2fb3', bottom: '#2bb5b0', sleeves: 'long' as const, build: 'average' as const },
      vest: { top: '#e8ff2a', bottom: '#3c4e7a', sleeves: 'short' as const, build: 'slight' as const },
      fur: { top: '#eadfce', bottom: '#1d1d1f', sleeves: 'long' as const, build: 'heavy' as const },
      shirtless: { top: skin, bottom: '#2a3a5a', sleeves: 'short' as const, build: 'average' as const },
      smiley: { top: '#f2e21c', bottom: '#4a5a3a', sleeves: 'short' as const, build: 'average' as const },
      tiedye: { top: '#d9a8e0', bottom: '#2b6cc4', sleeves: 'short' as const, build: 'slight' as const },
    }[a.outfit];
    const hair = ({ bucket: 'none', bare: 'short', long: 'long', cap: 'cap', shades: 'short' } as const)[a.head];
    const raver = figure(s, {
      height: H, style: 'doll', skin, hair, hairColor: a.head === 'cap' ? pick(random, ['#1d1d1f', '#d8262c', '#f4f1e8']) : pick(random, ['#1d1d1f', '#3b2a22', '#c9b071', '#8a3a2a', '#ff6a1a']),
      pose: 'standing', gaze: 'up', shoes: pick(random, ['#f4f1e8', '#1d1d1f', '#d8262c']), top: outfit.top, bottom: outfit.bottom, sleeves: outfit.sleeves, build: outfit.build,
    });
    s.root.add(raver.root);
    const joints = rig(raver);
    if (a.head === 'cap') for (const child of raver.head.children) if ((child as THREE.Mesh).geometry?.type === 'BoxGeometry') child.position.z = -child.position.z;
    if (a.head === 'bucket') bucketHat(s, raver, headR, pick(random, ['#e8e2d0', '#1d1d1f', '#5a7a3a', '#ff8c1a', '#2b6cc4', '#ff3fb0']));
    if (a.head === 'shades') {
      const band = new THREE.Mesh(new THREE.BoxGeometry(headR * 1.56, headR * 0.36, headR * 0.5), s.material('#1f2124', { roughness: 0.3 }));
      band.position.set(0, headR * 0.14, headR * 0.78);
      raver.head.add(band);
    }
    // The shell suit's stripe, the smiley, the tie-dye: painted onto the torso.
    const torso = joints.spine.children.find((c) => (c as THREE.Mesh).isMesh) as THREE.Mesh | undefined;
    if (torso && (a.outfit === 'smiley' || a.outfit === 'tiedye' || a.outfit === 'shellsuit')) {
      const map = paint(256, 256, (c, w, h) => {
        if (a.outfit === 'smiley') {
          c.fillStyle = '#f2e21c'; c.fillRect(0, 0, w, h);
          c.fillStyle = '#1d1d1f'; c.beginPath(); c.arc(w * 0.5, h * 0.5, 60, 0, 7); c.fill();
          c.fillStyle = '#f2e21c'; c.beginPath(); c.arc(w * 0.5 - 20, h * 0.5 - 14, 8, 0, 7); c.arc(w * 0.5 + 20, h * 0.5 - 14, 8, 0, 7); c.fill();
          c.strokeStyle = '#f2e21c'; c.lineWidth = 7; c.beginPath(); c.arc(w * 0.5, h * 0.5 + 2, 36, 0.4, Math.PI - 0.4); c.stroke();
        } else if (a.outfit === 'tiedye') {
          c.fillStyle = '#f4f1e8'; c.fillRect(0, 0, w, h);
          for (let r = 120; r > 0; r -= 14) { c.strokeStyle = ['#ff3fb0', '#3c8cff', '#5aff2a', '#f2e21c', '#ff8c1a', '#8a2be2'][Math.floor(r / 14) % 6]; c.lineWidth = 9; c.beginPath(); for (let t = 0; t <= 6.4; t += 0.2) { const rr = r + Math.sin(t * 7 + r) * 5; c.lineTo(w / 2 + Math.cos(t) * rr, h / 2 + Math.sin(t) * rr); } c.stroke(); }
        } else {
          c.fillStyle = '#6a2fb3'; c.fillRect(0, 0, w, h);
          c.fillStyle = '#2bb5b0'; c.beginPath(); c.moveTo(0, h * 0.3); c.lineTo(w, h * 0.55); c.lineTo(w, h * 0.72); c.lineTo(0, h * 0.47); c.fill();
          c.fillStyle = '#f2e21c'; c.beginPath(); c.moveTo(0, h * 0.47); c.lineTo(w, h * 0.72); c.lineTo(w, h * 0.78); c.lineTo(0, h * 0.53); c.fill();
        }
      });
      const material = (torso.material as THREE.MeshStandardMaterial).clone();
      material.map = map;
      material.color.set('#ffffff');
      material.needsUpdate = true;
      torso.material = material;
      // Capsule UVs put the seam at the back; rotate the map so the smiley faces +z.
      map.wrapS = THREE.RepeatWrapping;
      map.offset.x = a.outfit === 'smiley' ? 0.25 : 0;
    }
    if (a.outfit === 'fur') {
      // The fur coat as a shaggy over-layer on the torso and arms.
      const fur = s.material('#eadfce', { roughness: 1 });
      const fluff: { at: [number, number, number]; size: number }[] = [];
      for (let i = 0; i < 70; i++) {
        const t = random() * Math.PI * 2, y = random() * H * 0.3;
        fluff.push({ at: [Math.cos(t) * H * 0.075, y, Math.sin(t) * H * 0.045], size: H * 0.02 + random() * H * 0.012 });
      }
      const shag = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 6, 4), fur, fluff.length);
      const m = new THREE.Matrix4();
      fluff.forEach((f, i) => { m.makeScale(f.size, f.size, f.size).setPosition(...f.at); shag.setMatrixAt(i, m); });
      shag.castShadow = true;
      joints.spine.add(shag);
    }

    // The dance.
    const side = random() < 0.5 ? 1 : -1;
    const up: 'left' | 'right' = side > 0 ? 'left' : 'right';
    const out: 'left' | 'right' = side > 0 ? 'right' : 'left';
    if (a.dance === 'arms-up') {
      joints.arm('left', { forward: 168, out: 22, bend: 10 });
      joints.arm('right', { forward: 172, out: 18, bend: 6 });
      joints.leg('left', { out: 12, forward: 0 });
      joints.leg('right', { out: 12, forward: 0 });
      joints.lean(-6); joints.look(-32, 0);
    } else if (a.dance === 'bent') {
      joints.bow(62); joints.lean(8); joints.look(-10, 0);
      joints.arm('left', { forward: 20, out: 14, bend: 30 });
      joints.arm('right', { forward: 10, out: 18, bend: 40 });
      joints.leg('left', { forward: 12, knee: 24, out: 12 });
      joints.leg('right', { forward: 12, knee: 24, out: 12 });
    } else if (a.dance === 'swaying') {
      joints.arm('left', { forward: 15, out: 84, bend: 12 });
      joints.arm('right', { forward: 15, out: 84, bend: 12 });
      joints.tilt(10); joints.look(-20, 0, 12);
      joints.leg('left', { out: 16, forward: 4, knee: 10 });
      joints.leg('right', { out: 10, forward: -4 });
    } else if (a.dance === 'spinning') {
      joints.arm(up, { forward: 165, out: 30, bend: 15 });
      joints.arm(out, { forward: 30, out: 80, bend: 30 });
      joints.leg(up, { forward: 30, out: 28, knee: 50, foot: 20 });
      joints.leg(out, { forward: -6, out: 6 });
      joints.lean(-8); joints.tilt(-6 * side); joints.look(-12, side * 35);
    } else {
      joints.arm('left', { forward: 60, out: 20, bend: 110, across: 10 });
      joints.arm('right', { forward: 95, out: 30, bend: 100, across: 20 });
      joints.leg(up, { forward: 78, out: 12, knee: 96, foot: 20 });
      joints.leg(out, { forward: -4, out: 8 });
      joints.lean(4); joints.look(-8, 0);
    }
    joints.settle();
    raver.root.updateMatrixWorld(true);

    // Glowsticks: rings round each wrist with a couple of sticks dangling, and a ring round the neck.
    const sticks: THREE.MeshStandardMaterial[] = [];
    for (const hand of ['left', 'right'] as const) {
      const wrist = raver.hands[hand].parent!;
      const ringColour = stickColour();
      const ring = new THREE.Mesh(new THREE.TorusGeometry(H * 0.036, H * 0.008, 8, 18), stick(ringColour));
      ring.rotation.x = Math.PI / 2;
      ring.position.y = -H * 0.01;
      sticks.push(ring.material as THREE.MeshStandardMaterial);
      wrist.add(ring);
      for (let i = 0; i < 3; i++) {
        const c = stickColour();
        const rod = new THREE.Mesh(new THREE.CapsuleGeometry(H * 0.007, H * 0.1, 3, 6), stick(c));
        rod.position.set(Math.cos(i * 2.1 + random()) * H * 0.036, H * 0.035, Math.sin(i * 2.1 + random()) * H * 0.036);
        rod.rotation.set((random() - 0.5) * 0.6, 0, (random() - 0.5) * 0.6);
        sticks.push(rod.material as THREE.MeshStandardMaterial);
        wrist.add(rod);
      }
    }
    const neckRing = new THREE.Mesh(new THREE.TorusGeometry(H * 0.058, H * 0.008, 8, 20), stick(stickColour()));
    neckRing.rotation.x = Math.PI / 2 + 0.35;
    neckRing.position.set(0, H * 0.28 - H * 0.01, H * 0.015);
    sticks.push(neckRing.material as THREE.MeshStandardMaterial);
    joints.spine.add(neckRing);
    // The whistle on its cord.
    const cord = new THREE.Mesh(new THREE.TorusGeometry(H * 0.06, H * 0.0025, 6, 20), s.material('#f2e21c', { roughness: 1 }));
    cord.rotation.x = Math.PI / 2 + 1.2;
    cord.position.set(0, H * 0.25, H * 0.02);
    joints.spine.add(cord);
    const whistleMat = s.material(pick(random, ['#d8262c', '#2b6fb8', '#f4f1e8', '#f2e21c']), { roughness: 0.5 });
    if (a.holding === 'whistle') {
      const whistle = new THREE.Mesh(new THREE.BoxGeometry(H * 0.012, H * 0.014, H * 0.03), whistleMat);
      whistle.position.set(0, -headR * 0.3, headR * 1.1);
      raver.head.add(whistle);
      const headAt = worldOf(raver.head), chest = worldOf(joints.spine);
      s.rod([chest.x, chest.y + H * 0.2, chest.z + H * 0.03], [headAt.x, headAt.y - headR * 0.3, headAt.z + headR * 1.0], H * 0.0025, s.material('#f2e21c', { roughness: 1 }));
    } else {
      const whistle = new THREE.Mesh(new THREE.BoxGeometry(H * 0.012, H * 0.014, H * 0.03), whistleMat);
      whistle.position.set(H * 0.01, H * 0.19, H * 0.055);
      whistle.rotation.x = 0.4;
      joints.spine.add(whistle);
    }
    if (a.holding === 'water') {
      const bottle = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.2, 12), new THREE.MeshPhysicalMaterial({ color: '#d7ecff', transparent: true, opacity: 0.5, roughness: 0.1, depthWrite: false }));
      const water = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.09, 12), new THREE.MeshPhysicalMaterial({ color: '#8cc4ff', transparent: true, opacity: 0.6, roughness: 0.2, depthWrite: false }));
      water.position.y = -0.05;
      const capMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.02, 10), s.material('#2b6cc4'));
      capMesh.position.y = 0.11;
      bottle.add(body, water, capMesh);
      bottle.position.y = -0.02;
      const handFor = a.dance === 'bent' ? 'right' : up;
      raver.hands[handFor].add(bottle);
    }
    if (a.holding === 'cigarette') {
      const cig = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.08, 8), s.material('#f4f1e8'));
      cig.rotation.x = Math.PI / 2 - 0.4;
      cig.position.set(headR * 0.2, -headR * 0.28, headR * 1.05);
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.0045, 6, 4), glow('#ff6a1a', 2));
      tip.position.y = 0.04;
      cig.add(tip);
      raver.head.add(cig);
    }

    // The smaller friend, leaning in with an arm over the shoulders.
    let friend: ReturnType<typeof figure> | null = null;
    if (a.friend) {
      const H2 = H * mix(0.82, 0.92, random());
      const fSkin = pickSkin(random);
      const fTop = pick(random, ['#ff3fb0', '#f4f1e8', '#2bb5b0', '#1d1d1f', '#f2e21c']);
      friend = figure(s, {
        height: H2, style: 'doll', skin: fSkin, hair: pick(random, ['short', 'long', 'bun', 'cap', 'hood'] as const), hairColor: pick(random, ['#1d1d1f', '#3b2a22', '#c9b071', '#ff6a1a']),
        pose: 'standing', gaze: 'up', top: fTop, bottom: pick(random, ['#2a3a5a', '#1d1d1f', '#8a2be2']), sleeves: 'short', build: 'slight',
      });
      const fs = -side; // on the opposite side from the raised arm
      friend.root.position.set(fs * H * 0.27, 0, H * 0.02);
      friend.root.rotation.y = -fs * 0.35;
      s.root.add(friend.root);
      const fr = rig(friend);
      const near: 'left' | 'right' = fs > 0 ? 'left' : 'right';
      const far: 'left' | 'right' = fs > 0 ? 'right' : 'left';
      fr.arm(near, { forward: 40, out: 125, bend: 60, across: -30 });
      fr.arm(far, { forward: 140, out: 25, bend: 20 });
      fr.tilt(-fs * 14);
      fr.look(-18, fs * 25, fs * 10);
      fr.leg(near, { out: 18, forward: 4 });
      fr.leg(far, { out: 8, forward: -4 });
      fr.settle(false);
      const ringColour = stickColour();
      for (const hand of ['left', 'right'] as const) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(H2 * 0.034, H2 * 0.006, 8, 18), stick(ringColour));
        ring.rotation.x = Math.PI / 2;
        sticks.push(ring.material as THREE.MeshStandardMaterial);
        friend.hands[hand].parent!.add(ring);
      }
    }

    // A faint pool of light on the floor from the sticks, when it is dark enough to show.
    const pool = s.mesh(new THREE.CircleGeometry(H * 0.35, 24), new THREE.MeshBasicMaterial({ color: a.glow === 'mixed' ? '#8cff9a' : GLOWS[a.glow], transparent: true, opacity: 0.08 * fade, depthWrite: false, blending: THREE.AdditiveBlending }), [0, 0.004, 0]);
    pool.rotation.x = -Math.PI / 2;
    pool.castShadow = false;

    const energy = mood.energy * (a.moment === 'dawn' ? 0.5 : a.moment === 'lull' ? 0.7 : 1);
    const tempo = mix(1.6, 3.4, energy);
    const bounce = mix(0.004, 0.03, energy);
    const baseY = raver.root.position.y;
    const friendY = friend?.root.position.y ?? 0;
    return s.finish({
      update: (dt, time) => {
        raver.update(dt, time);
        friend?.update(dt, time);
        const beat = Math.abs(Math.sin(time * tempo * Math.PI));
        raver.root.position.y = baseY + beat * bounce;
        if (friend) friend.root.position.y = friendY + Math.abs(Math.sin(time * tempo * Math.PI + 0.6)) * bounce;
        if (a.dance === 'spinning') raver.root.rotation.y = Math.sin(time * 1.2) * 0.4 * energy;
        if (a.dance === 'swaying') joints.body.rotation.z = Math.sin(time * 1.1) * 0.14;
        for (const [i, m] of sticks.entries()) m.emissiveIntensity = (1.9 + Math.sin(time * 2 + i) * 0.3) * fade;
      },
    });
  },
});
