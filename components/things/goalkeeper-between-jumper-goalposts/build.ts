import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix, noul, score } from '@conjure/kit';
import { HAIR_COLOURS, type P, SCHOOL_COLOURS, at, paint, pick, pickSkin, rig, segmentOf } from './pose';

export default defineThing({
  questions: {
    stance: choice('What is the keeper doing?', {
      set: 'Set in a crouch between the posts: knees bent, arms wide, palms out, eyes on the ball.',
      diving: 'Diving full stretch to one side, one knee down, both arms out.',
      bored: 'Standing upright with arms folded, the game at the other end.',
      caught: 'Hugging the ball to the chest, just saved it.',
    }),
    shot: choice('Where is the ball?', {
      ready: 'On the ground a metre in front of the keeper.',
      incoming: 'In the air, flying at the goal.',
      scored: 'In the back of the net: past the keeper, behind the line.',
      far: 'Nowhere near: away up the other end of the yard.',
    }),
    ball: choice('What is the ball like?', {
      new: 'A new white ball with black panels.',
      old: 'An old grey ball, the panels worn smooth and the leather scuffed.',
      orange: 'A bright orange plastic ball from the pound shop.',
      tennis: 'A tennis ball: the real ball was confiscated.',
      sponge: 'A soft yellow sponge ball, the only kind allowed.',
    }),
    jumpers: choice('What are the goalposts?', {
      navy: 'Two rolled-up navy school jumpers.',
      green: 'Two bottle-green jumpers in a heap.',
      maroon: 'Two maroon jumpers.',
      mixed: 'One jumper and one coat, nothing matching.',
      bags: 'Two school bags dumped down as posts.',
    }),
    width: score('How far apart are the posts?', ['Two metres, a tight goal', 'Three metres, about right', 'Four metres, hopelessly wide']),
    gloves: noul('Is the keeper wearing proper goalie gloves?'),
    legs: choice('Shorts or trousers?', {
      shorts: 'PE shorts, bare knees, socks down.',
      trousers: 'School trousers, knees worn grey.',
      tracksuit: 'Tracksuit bottoms tucked into socks.',
    }),
    school: choice('What is the school colour?', {
      navy: 'Navy blue.', maroon: 'Maroon.', green: 'Bottle green.', grey: 'Grey.', red: 'Bright red.', royal: 'Royal blue.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const H = mix(1.12, 1.34, random());
    const skin = pickSkin(random);
    const school = SCHOOL_COLOURS[a.school];
    const W = mix(2, 4, a.width);
    const diveSide = random() < 0.5 ? 1 : -1;

    // ---- the keeper
    const legColour = a.legs === 'shorts' ? school : a.legs === 'trousers' ? '#5a5d63' : pick(random, ['#2a2f3a', '#1d1a18', '#3a4a6a']);
    const top = a.stance === 'bored' && random() < 0.5 ? pick(random, ['#f2f0ea', '#e8e0a0']) : pick(random, ['#f2f0ea', school, '#2aa0c8', '#e8c22a']);
    const person = figure(s, {
      height: H, build: random() < 0.3 ? 'slight' : 'average', style: 'doll', skin,
      hair: pick(random, ['short', 'long', 'cap', 'bun', 'short'] as const), hairColor: pick(random, HAIR_COLOURS),
      top, bottom: legColour, shoes: pick(random, ['#1d1a18', '#f2f0ea', '#c8322a', '#2a63c8']), sleeves: a.legs === 'shorts' ? 'short' : 'long',
      pose: a.stance === 'bored' ? 'arms-crossed' : 'standing', gaze: 'ahead',
    });
    s.root.add(person.root);
    const pose = rig(person);
    if (a.stance === 'set') {
      // The ready crouch: feet wide, knees well bent, bottom back, hands spread at shoulder height with palms out.
      pose.leg('left', { forward: 62, out: 22, knee: 95 });
      pose.leg('right', { forward: 62, out: 22, knee: 95 });
      pose.lean(30);
      pose.bow(4);
      pose.arm('left', { forward: 40, out: 62, bend: 70, across: -20 });
      pose.arm('right', { forward: 40, out: 62, bend: 70, across: -20 });
      pose.look(-32, 0);
    } else if (a.stance === 'diving') {
      // Full stretch: laid out on one side along the goal line, both arms flung past the head after the ball,
      // the underneath leg straight and the top leg drawn up, landing on the tarmac.
      // A body roll of -78 degrees tips the head toward +x, so the figure's left side ends up underneath.
      const low = diveSide > 0 ? 'left' : 'right', high = diveSide > 0 ? 'right' : 'left';
      pose.leg(low, { forward: 8, out: 4, knee: 12 });
      pose.leg(high, { forward: 42, out: 14, knee: 64 });
      pose.arm(low, { forward: 168, out: 8, bend: 6 });
      pose.arm(high, { forward: 150, out: -6, bend: 14 });
      pose.bow(-6, diveSide * 8, 0);
      pose.look(-18, 0, diveSide * 10);
      pose.lean(-4, -diveSide * 80);
    } else if (a.stance === 'caught') {
      pose.leg('left', { forward: 18, out: 8, knee: 30 });
      pose.leg('right', { forward: 18, out: 8, knee: 30 });
      pose.lean(10);
      pose.arm('left', { forward: 70, out: -4, bend: 110, across: 40 });
      pose.arm('right', { forward: 70, out: -4, bend: 110, across: 40 });
      pose.look(26, 0);
    } else {
      pose.leg('left', { out: 10 });
      pose.leg('right', { out: 6, forward: -4 });
      pose.look(2, 60);
    }
    person.settle();
    person.root.rotation.y = a.stance === 'bored' ? 0.5 : 0;
    person.root.updateMatrixWorld(true);
    // Gloves: big bright hands. Shorts: bare shins.
    if (a.gloves) {
      const glove = s.material(pick(random, ['#f2f2f2', '#f2c21c', '#2aa0c8', '#9ae82a']), { roughness: 0.6 });
      for (const side of ['left', 'right'] as const) {
        const hand = segmentOf(person.hands[side].parent!);
        if (hand) { hand.material = glove; hand.scale.set(1.9, 1.25, 1.5); }
      }
    }
    if (a.legs === 'shorts') for (const side of ['left', 'right'] as const) { const shin = segmentOf(person.joints.knees[side]); if (shin) shin.material = s.material(skin, { roughness: 0.45 }); }

    // ---- the jumper goalposts
    const woolColours = { navy: ['#243352', '#243352'], green: ['#2f5a3a', '#2f5a3a'], maroon: ['#6e1f2e', '#6e1f2e'], mixed: ['#243352', '#d85a2a'], bags: ['#d83a7a', '#2a63c8'] }[a.jumpers];
    for (const [index, sx] of [-1, 1].entries()) {
      const x = sx * W / 2 + (random() - 0.5) * 0.15, z = (random() - 0.5) * 0.2;
      const colour = woolColours[index];
      if (a.jumpers === 'bags') {
        const bag = s.box([0.28, 0.3, 0.16], [x, 0.15, z], s.material(colour, { roughness: 0.8 }));
        bag.rotation.set(0.25 * sx, random() * 0.6, -0.15);
        s.box([0.16, 0.14, 0.05], [x + 0.03, 0.1, z + 0.1], s.material('#1d1a18', { roughness: 0.8 })).rotation.y = 0.3;
      } else {
        const wool = s.material(colour, { roughness: 0.95 });
        const big = a.jumpers === 'mixed' && index === 1;
        const k = big ? 1.3 : 1;
        // A rolled jumper: a soft lumpy bundle with both sleeves trailing out of it and a pale cuff on each.
        s.ball([0.23 * k, 0.12 * k, 0.2 * k], [x, 0.11 * k, z], wool, 12).rotation.y = random() * 3;
        s.ball([0.13 * k, 0.08 * k, 0.15 * k], [x + 0.15 * k, 0.07 * k, z + 0.08 * k], wool, 10);
        s.ball([0.1 * k, 0.06 * k, 0.11 * k], [x - 0.14 * k, 0.05 * k, z - 0.07 * k], wool, 10);
        const cuff = s.material(colour === '#243352' || colour === '#2f5a3a' || colour === '#6e1f2e' ? '#d8d3c4' : '#f2f0ea', { roughness: 0.9 });
        for (const [dx, dz, turn] of [[0.26 * k, -0.1 * k, 0.5 * sx], [-0.2 * k, 0.16 * k, -1.1 * sx]] as const) {
          const sleeve = s.cylinder(0.04 * k, 0.035 * k, 0.3 * k, [x + dx, 0.04 * k, z + dz], wool, 10);
          sleeve.rotation.set(Math.PI / 2, 0, turn);
          const end = s.cylinder(0.042 * k, 0.042 * k, 0.05 * k, [x + dx + Math.sin(turn) * 0.16 * k, 0.04 * k, z + dz - Math.cos(turn) * 0.16 * k], cuff, 10);
          end.rotation.set(Math.PI / 2, 0, turn);
        }
      }
    }

    // ---- the ball
    const R = a.ball === 'tennis' ? 0.034 : a.ball === 'sponge' ? 0.09 : 0.11;
    let ballMat: THREE.Material;
    if (a.ball === 'new' || a.ball === 'old') {
      const old = a.ball === 'old';
      const map = paint(256, 128, (c) => {
        c.fillStyle = old ? '#a8a49a' : '#f4f2ec'; c.fillRect(0, 0, 256, 128);
        c.fillStyle = old ? '#4a4a48' : '#1d1d1f';
        for (let i = 0; i < 12; i++) {
          const cx = (i % 4) * 64 + (i >= 4 && i < 8 ? 32 : 0) + 16, cy = 20 + Math.floor(i / 4) * 44;
          c.beginPath();
          for (let k = 0; k < 5; k++) { const ang = k * Math.PI * 2 / 5 - Math.PI / 2; c.lineTo(cx + Math.cos(ang) * 13, cy + Math.sin(ang) * 13); }
          c.closePath(); c.fill();
        }
        if (old) for (let i = 0; i < 80; i++) { c.fillStyle = `rgba(60,50,40,${0.1 + random() * 0.25})`; c.fillRect(random() * 256, random() * 128, 2 + random() * 8, 1 + random() * 4); }
      });
      ballMat = new THREE.MeshStandardMaterial({ map, roughness: old ? 0.95 : 0.55 });
    } else if (a.ball === 'tennis') ballMat = s.material('#d8e83a', { roughness: 1 });
    else if (a.ball === 'sponge') ballMat = s.material('#f2d23a', { roughness: 1 });
    else ballMat = s.material('#ff7a1a', { roughness: 0.35 });
    const ballMesh = new THREE.Mesh(new THREE.SphereGeometry(R, 18, 12), ballMat);
    ballMesh.castShadow = ballMesh.receiveShadow = true;
    s.root.add(ballMesh);
    let ballAt: P;
    if (a.stance === 'caught') {
      const chest = at(s, person.joints.neck);
      ballAt = [chest.x, chest.y - 0.15 * H, chest.z + 0.1 * H + R * 0.5];
    } else if (a.stance === 'diving' && a.shot !== 'far') {
      // Just beyond the fingertips: saved by a fingernail, or not quite.
      const hand = at(s, person.hands[diveSide > 0 ? 'left' : 'right']);
      ballAt = a.shot === 'scored' ? [hand.x + diveSide * 0.25, R, hand.z - 0.7 - random() * 0.4] : [hand.x + diveSide * (R + 0.06), Math.max(R, hand.y + R * 0.6 + random() * 0.25), hand.z + (random() - 0.3) * 0.2];
    } else if (a.shot === 'incoming') ballAt = [diveSide * mix(0.3, 0.9, random()), mix(0.3, 1.1, random()), 0.9 + random() * 0.6];
    else if (a.shot === 'scored') ballAt = [(random() - 0.5) * W * 0.6, R, -0.9 - random() * 0.6];
    else if (a.shot === 'far') ballAt = [(random() - 0.5) * 1.5, R, 2.2 + random() * 0.6];
    else ballAt = [(random() - 0.5) * 0.4, R, 1 + random() * 0.3];
    ballMesh.position.set(...ballAt);
    ballMesh.rotation.set(random() * 3, random() * 3, 0);
    if (a.ball === 'tennis') { const seam = s.ring(R * 0.95, R * 0.07, ballAt, s.material('#f2f0ea', { roughness: 1 })); seam.rotation.set(random(), random(), 0.6); }
    {
      // A chalked goal line between the posts, fainter the more the yard is worn, and the ball well past it when scored.
      const line = s.mesh(new THREE.PlaneGeometry(W - 0.3, 0.06), new THREE.MeshStandardMaterial({ color: '#eee9dc', roughness: 1, transparent: true, opacity: mix(0.75, 0.3, mood.wear), depthWrite: false }), [0, 0.003, -0.2]);
      line.rotation.x = -Math.PI / 2;
      line.castShadow = false;
    }

    // ---- motion: the set keeper bounces on the balls of the feet, the incoming ball spins
    const phase = random() * Math.PI * 2;
    const baseY = person.root.position.y;
    return s.finish({
      update(dt, time) {
        person.update(dt, time);
        if (a.stance === 'set') person.root.position.y = baseY + Math.abs(Math.sin(time * mix(2, 6, mood.energy) + phase)) * 0.015 * mood.energy;
        if (a.shot === 'incoming' && a.stance !== 'caught') ballMesh.rotation.x += dt * mix(0.5, 6, mood.energy);
      },
    });
  },
});
