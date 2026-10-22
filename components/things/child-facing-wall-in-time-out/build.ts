import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix, score } from '@conjure/kit';
import { HAIR_COLOURS, SCHOOL_COLOURS, at, pick, pickSkin, rig, segmentOf } from './pose';
import { wall } from './wall';

export default defineThing({
  questions: {
    hands: choice('What are the child\'s hands doing?', {
      behind: 'Clasped behind the back, the way they were told.',
      hanging: 'Hanging limp at the sides.',
      pockets: 'Shoved in the pockets, sulking.',
      face: 'One hand up wiping the eyes.',
    }),
    hood: choice('What is on their head?', {
      down: 'Hood down, hair a mess.',
      up: 'Coat hood up, hiding in it.',
      cap: 'A school cap, peak pulled down.',
      bobble: 'A woolly bobble hat.',
    }),
    closeness: score('How close to the wall?', ['Nose nearly touching the brick', 'A hand\'s breadth away', 'A full step back, barely facing it']),
    finish: choice('What is the wall?', {
      brick: 'Victorian red brick with a stone coping.',
      painted: 'Brick painted cream, chipped at the corners.',
      plaster: 'A magnolia classroom wall with a skirting board.',
      block: 'Grey breeze block, a sports hall or a yard.',
      fence: 'A close-boarded garden fence.',
    }),
    marks: choice('What marks the wall where others have stood?', {
      none: 'Nothing: a clean wall.',
      scuffs: 'A pale scuffed patch at shoulder height and toe marks low down.',
      chalk: 'Chalk tallies and initials scratched at child height.',
      line: 'A painted line and a faded notice.',
    }),
    size: score('How big is the child?', ['Small for their age, swamped by the coat', 'An ordinary seven-year-old', 'Tall for the class, too old for this']),
    left: choice('What was left on the ground beside them?', {
      nothing: 'Nothing.',
      ball: 'The confiscated football.',
      lunchbox: 'A dropped lunchbox and a juice carton.',
      worksheet: 'A crumpled worksheet.',
      jumper: 'A jumper thrown down in a sulk.',
    }),
    school: choice('What is the school colour?', {
      navy: 'Navy blue.', maroon: 'Maroon.', green: 'Bottle green.', grey: 'Grey.', red: 'Bright red.', royal: 'Royal blue.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const H = mix(1.02, 1.36, a.size);
    const skin = pickSkin(random);
    const school = SCHOOL_COLOURS[a.school];
    const coat = a.hood === 'up';
    const coatColour = pick(random, ['#2a2f3a', '#8a1f2a', '#3a6a3a', '#d85a2a', '#2a4a9a']);

    // ---- the wall: faces +z, the child stands in front of it with their back to the viewer
    const wallWidth = 1.5 + random() * 0.4, wallHeight = 1.6;
    const finish = { brick: 'red-brick', painted: 'painted-brick', plaster: 'plaster', block: 'breeze-block', fence: 'fence' }[a.finish] as 'red-brick' | 'painted-brick' | 'plaster' | 'breeze-block' | 'fence';
    wall(s, {
      width: wallWidth, height: wallHeight, finish, wear: mood.wear, random, at: [0, 0, 0],
      marks(c, w, h) {
        const px = w / wallWidth;
        if (a.marks === 'scuffs') {
          // A pale worn smear at shoulder height where generations have leaned, and toe marks low down.
          const worn = c.createRadialGradient(w / 2, h - 0.85 * px, 0, w / 2, h - 0.85 * px, 0.32 * px);
          worn.addColorStop(0, 'rgba(235,228,210,0.22)');
          worn.addColorStop(1, 'rgba(235,228,210,0)');
          c.fillStyle = worn;
          c.fillRect(w / 2 - 0.4 * px, h - 1.2 * px, 0.8 * px, 0.6 * px);
          c.fillStyle = 'rgba(25,20,15,0.5)';
          for (let i = 0; i < 12; i++) c.fillRect(w / 2 - 0.3 * px + random() * 0.6 * px, h - 0.02 * px - random() * 0.14 * px, 6 + random() * 16, 2 + random() * 2);
        }
        if (a.marks === 'chalk') {
          c.strokeStyle = 'rgba(245,240,230,0.85)'; c.lineWidth = 4; c.lineCap = 'round';
          for (let g = 0; g < 6; g++) {
            const x = w * 0.15 + g * w * 0.12, y = h - (0.7 + random() * 0.5) * px;
            for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(x + i * 9, y); c.lineTo(x + i * 9 + 1, y + 30); c.stroke(); }
            c.beginPath(); c.moveTo(x - 6, y + 6); c.lineTo(x + 32, y + 26); c.stroke();
          }
          c.font = 'bold 26px sans-serif'; c.fillStyle = 'rgba(245,240,230,0.8)';
          for (const [text, x, y] of [['J.B.', 0.2, 0.55], ['WOZ ERE', 0.55, 0.45], ['A+K', 0.75, 0.75]] as const) c.fillText(text, w * x, h - y * px);
        }
        if (a.marks === 'line') {
          c.fillStyle = '#f2d23a'; c.fillRect(0, h - 1.05 * px, w, 0.03 * px);
          c.fillStyle = '#efe9d8'; c.fillRect(w * 0.62, h - 1.45 * px, 0.28 * px, 0.2 * px);
          c.fillStyle = '#4a4a4a'; c.font = 'bold 18px sans-serif'; c.textAlign = 'center';
          c.fillText('QUIET', w * 0.62 + 0.14 * px, h - 1.35 * px); c.fillText('PLEASE', w * 0.62 + 0.14 * px, h - 1.3 * px + 18);
        }
      },
    });

    // ---- the child, facing the wall
    const person = figure(s, {
      height: H, build: a.size < 0.3 ? 'slight' : 'average', style: 'doll', skin,
      hair: a.hood === 'up' ? 'hood' : a.hood === 'cap' ? 'cap' : a.hood === 'bobble' ? 'hat' : 'short',
      hairColor: a.hood === 'cap' ? school : a.hood === 'bobble' ? pick(random, ['#d83a4a', '#2a63c8', '#e8a02a']) : pick(random, HAIR_COLOURS),
      top: coat ? coatColour : school, bottom: '#8a8d93', shoes: '#1d1a18', sleeves: 'long', pose: 'standing', gaze: 'ahead',
    });
    s.root.add(person.root);
    const pose = rig(person);
    if (a.hands === 'behind') {
      pose.arm('left', { forward: -28, out: 6, bend: 72, across: 62 });
      pose.arm('right', { forward: -28, out: 6, bend: 72, across: 62 });
    } else if (a.hands === 'hanging') {
      pose.arm('left', { forward: 2, out: 5, bend: 6 });
      pose.arm('right', { forward: 2, out: 5, bend: 6 });
    } else if (a.hands === 'pockets') {
      pose.arm('left', { forward: 8, out: 4, bend: 28, across: 30 });
      pose.arm('right', { forward: 8, out: 4, bend: 28, across: 30 });
    } else {
      pose.arm('left', { forward: 10, out: 5, bend: 10 });
      pose.arm('right', { forward: 88, out: -6, bend: 148, across: 42 });
    }
    // Shoulders curled, head down, one toe turned in.
    pose.bow(9, 0, 0);
    pose.look(a.hands === 'face' ? 14 : 20, 0, 0);
    const turnedIn = random() < 0.5 ? 'left' : 'right';
    pose.leg(turnedIn, { forward: 0, out: 2, turn: 32, knee: 4 });
    pose.leg(turnedIn === 'left' ? 'right' : 'left', { forward: 0, out: 4, knee: 2 });
    person.settle();
    // Face the wall: the figure's back is to the viewer, its nose a chosen distance from the brick.
    person.root.rotation.y = Math.PI + (random() - 0.5) * 0.12;
    const gap = mix(0.03, 0.45, a.closeness);
    person.root.position.set((random() - 0.5) * 0.2, 0, 0.09 * H + gap);
    person.root.updateMatrixWorld(true);

    if (coat) {
      // A coat hem around the hips, so the hood belongs to something.
      const hip = at(s, person.pelvis);
      const hem = s.mesh(new THREE.CylinderGeometry(0.085 * H, 0.115 * H, 0.2 * H, 16, 1, true), s.material(coatColour, { roughness: 0.9, side: THREE.DoubleSide }), [hip.x, hip.y - 0.04 * H, hip.z]);
      void hem;
    }
    // A scuffed toe: the turned-in shoe gets a pale worn patch.
    const toe = segmentOf(person.joints.ankles[turnedIn]);
    if (toe) toe.material = s.material('#3a3632', { roughness: 1 });

    // ---- what was left on the ground
    const px = person.root.position.x + (random() < 0.5 ? -0.42 : 0.42), pz = person.root.position.z + 0.1;
    if (a.left === 'ball') {
      s.ball([0.1, 0.1, 0.1], [px, 0.1, pz], s.material(mood.wear > 0.5 ? '#9a9890' : '#f0eee8', { roughness: 0.8 }), 14);
      s.ring(0.1, 0.012, [px, 0.1, pz], s.material('#2a2a2e', { roughness: 0.8 })).rotation.y = random();
    }
    if (a.left === 'lunchbox') {
      const box = s.box([0.24, 0.1, 0.17], [px, 0.05, pz], s.material(pick(random, ['#e8402a', '#2a7ad8', '#f2c21c', '#8a4ad8']), { roughness: 0.5 }));
      box.rotation.y = random();
      s.box([0.06, 0.1, 0.04], [px + 0.2, 0.05, pz + 0.12], s.material('#f2f0ea', { roughness: 0.6 })).rotation.z = 0.5;
    }
    if (a.left === 'worksheet') {
      const sheet = s.ball([0.08, 0.05, 0.07], [px, 0.045, pz], s.material('#f4f1e6', { roughness: 1, flatShading: true }), 7);
      sheet.rotation.set(random(), random(), random());
    }
    if (a.left === 'jumper') {
      const wool = s.material(school, { roughness: 0.95 });
      s.ball([0.2, 0.06, 0.15], [px, 0.055, pz], wool, 12);
      s.ball([0.1, 0.045, 0.14], [px + 0.14, 0.04, pz - 0.06], wool, 10);
    }

    // The breathing is all that moves; a sniff now and then when wiping the eyes.
    const baseNeck = person.joints.neck.rotation.x;
    return s.finish({
      update(dt, time) {
        person.update(dt, time);
        person.joints.neck.rotation.x = baseNeck + Math.max(0, Math.sin(time * 1.3)) ** 6 * 0.08 * (0.4 + mood.energy);
      },
    });
  },
});
