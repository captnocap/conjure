import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix, noul, score } from '@conjure/kit';
import { anatomy, at, bottleGeometry, garment, glassGeometry, glassMaterial, moustache, paint, pick, pickSkin, reachHand, rig, shirtFront, slick, type P } from './milonga';

const FINISHES = {
  black: 'Black lacquer with mother-of-pearl buttons, the classic.',
  pearl: 'Pearl-white celluloid with chrome corners.',
  red: 'Deep red lacquer with gold trim.',
  green: 'Bottle-green with ivory buttons, an old one.',
} as const;
const FINISH: Record<keyof typeof FINISHES, { box: string; trim: string; button: string; pleat: [string, string] }> = {
  black: { box: '#17161a', trim: '#b89a4a', button: '#f1ece2', pleat: ['#2a2420', '#d9cfb0'] },
  pearl: { box: '#ece7dc', trim: '#c9ccd0', button: '#2a2320', pleat: ['#2a2a30', '#e3dccb'] },
  red: { box: '#6a1a22', trim: '#c9a44a', button: '#f1ece2', pleat: ['#2a1a1a', '#d9c7a8'] },
  green: { box: '#1e3a30', trim: '#b89a4a', button: '#ece0c4', pleat: ['#1f2a24', '#d4ccb2'] },
};

export default defineThing({
  questions: {
    moment: choice('What is he doing right now?', {
      playing: 'Playing: both hands on the boxes, the bellows working, head bowed over the buttons.',
      held: 'Holding a long note: the bellows pulled as wide as they go, eyes shut, the room waiting.',
      resting: 'Between tunes: the instrument shut on his knee, one hand resting on it, looking at the floor.',
    }),
    bellows: choice('If he is playing, how open is the bellows?', {
      closed: 'Nearly closed, a tight squeeze of pleats.',
      half: 'Half open, a working breath.',
      wide: 'Stretched wide across the knee, a long sighing phrase.',
    }),
    finish: choice('What does the instrument look like?', FINISHES),
    dress: choice('What is he wearing?', {
      suit: 'A dark suit, jacket buttoned, thin tie.',
      waistcoat: 'Shirtsleeves and a dark waistcoat, the jacket on a chair somewhere.',
      shirtsleeves: 'Shirtsleeves rolled to the elbow, braces, collar open.',
      white: 'A white dinner jacket and a bow tie, the orchestra uniform.',
    }),
    vice: choice('What keeps him company?', {
      cigarette: 'A cigarette hanging from the lip, smoke rising.',
      glass: 'A glass of red wine and the bottle on a crate beside the stool.',
      both: 'A cigarette on the lip and a glass on the crate.',
      nothing: 'Nothing but the instrument.',
    }),
    hunch: score('How far does he hunch over it?', ['Sitting tall, playing from the chest', 'Shoulders rounded, chin tucked', 'Folded right over, forehead almost on the boxes']),
    hair: choice('What is on his head?', {
      slicked: 'Dark hair slicked back with pomade.',
      grey: 'Grey hair slicked back, an old hand.',
      bald: 'Bald, the scalp shining under the lights.',
      hat: 'A brimmed hat tipped low.',
    }),
    stand: noul('Is there a music stand beside him with a sheet on it?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const H = mix(1.68, 1.82, random());
    const old = a.hair === 'grey' || a.hair === 'bald';
    const build = old && random() < 0.5 ? 'heavy' : 'average';
    const skin = pickSkin(random);
    const finish = FINISH[a.finish];
    const resting = a.moment === 'resting';
    const open = resting ? 0.07 : a.moment === 'held' ? 0.42 : { closed: 0.1, half: 0.26, wide: 0.4 }[a.bellows];

    // ---- the man, sitting tall on a stool: left foot to the floor, right knee raised with the foot on a rung
    const shirt = '#f3f0e8';
    const suitColour = { suit: '#23232a', waistcoat: '#2b2a31', shirtsleeves: '#3a3a44', white: '#efe9dc' }[a.dress];
    const trousers = a.dress === 'white' ? '#1c1b1f' : suitColour;
    const person = figure(s, {
      height: H, build, style: 'doll', skin, hair: a.hair === 'hat' ? 'hat' : 'none', hairColor: '#2a2320',
      top: a.dress === 'suit' || a.dress === 'white' ? suitColour : shirt, bottom: trousers, shoes: '#141214',
      sleeves: a.dress === 'shirtsleeves' ? 'short' : 'long', pose: 'sitting', gaze: 'down',
    });
    s.root.add(person.root);
    const pose = rig(person);
    pose.leg('left', { forward: 28, out: 8, knee: 26, foot: 'flat' });
    pose.leg('right', { forward: 96, out: 10, knee: 126, foot: -8 });
    const hunch = resting ? 0.25 : a.hunch;
    pose.bow(mix(6, 26, hunch), 0, -5);
    pose.lean(0, 0);
    pose.look(resting ? 20 : mix(26, 38, hunch), resting ? -14 : -16, a.moment === 'held' ? 10 : 4);
    person.settle();
    const hip = at(s, person.pelvis);
    const { limb, headR, torsoL, chestR } = anatomy(H, build);

    // ---- the stool, built to fit him: the seat under the hips, a rung exactly under the raised foot
    const wood = s.material(pick(random, ['#4a3222', '#5a3a26', '#2e2119']), { roughness: 0.6 });
    const seatH = person.hipHeight - limb * 1.1 - 0.012;
    const stoolAt: P = [hip.x, 0, hip.z - 0.07];
    const topR = 0.17, baseR = 0.27;
    s.cylinder(topR + 0.02, topR + 0.02, 0.03, [stoolAt[0], seatH - 0.015, stoolAt[2]], wood, 20);
    for (const [dx, dz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]] as const) {
      s.rod([stoolAt[0] + dx * baseR * 0.7, 0, stoolAt[2] + dz * baseR * 0.7], [stoolAt[0] + dx * topR * 0.7, seatH - 0.02, stoolAt[2] + dz * topR * 0.7], 0.014, wood, 0.012);
    }
    const rightAnkle = at(s, person.joints.ankles.right);
    const soleY = rightAnkle.y - anatomy(H).footL - limb * 0.95;
    const rungR = Math.min(baseR * 0.95, Math.max(topR, Math.hypot(rightAnkle.x - stoolAt[0], rightAnkle.z + limb * 0.6 - stoolAt[2])));
    const rung = s.ring(rungR, 0.012, [stoolAt[0], soleY - 0.012, stoolAt[2]], wood);
    rung.rotation.x = Math.PI / 2;
    const lower = s.ring(topR + (baseR - topR) * (1 - 0.12 / seatH), 0.011, [stoolAt[0], 0.12, stoolAt[2]], wood);
    lower.rotation.x = Math.PI / 2;

    // ---- the bandoneon, resting on the raised thigh: two button boxes and a pleated bellows between them
    const knee = at(s, person.joints.knees.right);
    const boxW = 0.085, face = 0.215;
    const box = s.material(finish.box, { roughness: a.finish === 'pearl' ? 0.35 : 0.25, metalness: 0.05 });
    const trim = s.material(finish.trim, { metalness: 0.7, roughness: 0.3 });
    const instrument = new THREE.Group();
    instrument.position.set(knee.x - 0.03, knee.y + limb * 1.15 + face / 2 - 0.015, knee.z - 0.09);
    instrument.rotation.set(0.1, 0, resting ? 0 : mix(0.06, 0.16, open / 0.42));
    s.root.add(instrument);
    const part = (geometry: THREE.BufferGeometry, material: THREE.Material, at: P) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...at);
      mesh.castShadow = mesh.receiveShadow = true;
      instrument.add(mesh);
      return mesh;
    };
    const buttons = (count: number) => paint(256, 256, (c) => {
      c.fillStyle = finish.box;
      c.fillRect(0, 0, 256, 256);
      c.strokeStyle = finish.trim;
      c.lineWidth = 10;
      c.strokeRect(10, 10, 236, 236);
      c.fillStyle = finish.button;
      const rows = 5, cols = Math.ceil(count / rows);
      for (let r = 0; r < rows; r++) for (let col = 0; col < cols; col++) {
        if (r * cols + col >= count) continue;
        c.beginPath();
        c.arc(42 + col * (172 / (cols - 1)) + (r % 2) * 10, 48 + r * 40, 11, 0, Math.PI * 2);
        c.fill();
      }
    });
    const grid = (count: number, x: number, outward: number) => {
      const plane = part(new THREE.PlaneGeometry(face * 0.96, face * 0.96), new THREE.MeshStandardMaterial({ map: buttons(count), roughness: 0.45 }), [x + outward * 0.001, 0, 0]);
      plane.rotation.y = outward > 0 ? Math.PI / 2 : -Math.PI / 2;
    };
    // The right box sits over the knee; the bellows and left box run out to his left (+x).
    part(new THREE.BoxGeometry(boxW, face, face), box, [0, 0, 0]);
    grid(38, -boxW / 2, -1);
    part(new THREE.BoxGeometry(boxW, face, face), box, [boxW + open, 0, 0]);
    grid(33, boxW * 1.5 + open, 1);
    for (const x of [0, boxW + open]) for (const y of [-1, 1]) for (const z of [-1, 1]) part(new THREE.BoxGeometry(boxW + 0.004, 0.02, 0.02), trim, [x, y * (face / 2 - 0.01), z * (face / 2 - 0.01)]);
    // Hand straps across the outer faces.
    const leather = s.material('#3a2a1e', { roughness: 0.8 });
    part(new THREE.BoxGeometry(0.012, face * 0.9, 0.05), leather, [-boxW / 2 - 0.006, 0, 0.03]);
    part(new THREE.BoxGeometry(0.012, face * 0.9, 0.05), leather, [boxW * 1.5 + open + 0.006, 0, 0.03]);
    const pleats = 18, t = open / pleats;
    const dark: { at: P; size: number }[] = [], light: { at: P; size: number }[] = [];
    for (let i = 0; i < pleats; i++) (i % 2 ? light : dark).push({ at: [boxW / 2 + t * (i + 0.5), 0, 0], size: 1 });
    instrument.add(s.scatter(new THREE.BoxGeometry(Math.max(0.002, t), face * 0.98, face * 0.98), s.material(finish.pleat[0], { roughness: 0.9 }), dark));
    instrument.add(s.scatter(new THREE.BoxGeometry(Math.max(0.002, t), face * 0.9, face * 0.9), s.material(finish.pleat[1], { roughness: 0.95 }), light));
    s.root.updateMatrixWorld(true);

    // ---- hands: on the outer faces when playing; resting, the right hand lies on top of the shut instrument
    const local = (x: number, y: number, z: number) => s.root.worldToLocal(instrument.localToWorld(new THREE.Vector3(x, y, z)));
    if (resting) {
      reachHand(s, person, 'right', local(boxW / 2 + open / 2, face / 2 + 0.04, 0.02), { outMin: -10, outMax: 30, forwardMax: 80 });
      if (a.vice === 'cigarette' || a.vice === 'both') {
        const mouth = at(s, person.head).add(new THREE.Vector3(-0.02, -headR * 0.3, headR * 1.1));
        reachHand(s, person, 'left', mouth.add(new THREE.Vector3(0.06, -0.06, 0.06)), { across: true, outMin: 0, outMax: 70 });
      } else reachHand(s, person, 'left', local(boxW + open + 0.02, -face / 2 - 0.12, 0.05), { outMin: 0, outMax: 40 });
    } else {
      // Elbows stay down by the ribs: the shoulders may not swing the upper arms out into a shrug.
      reachHand(s, person, 'right', local(-boxW / 2 - 0.06, -0.01, 0.045), { outMin: -8, outMax: 28, forwardMax: 70 });
      reachHand(s, person, 'left', local(boxW * 1.5 + open + 0.06, 0.0, 0.045), { outMin: 0, outMax: open > 0.3 ? 62 : 40, forwardMax: 75 });
    }

    // ---- clothes: jacket, waistcoat or braces; hair; a cigarette on the lip
    const hairMat = s.material(a.hair === 'grey' ? pick(random, ['#d9d6cf', '#b5b2ab']) : '#1f1612', { roughness: 0.3 });
    if (a.hair === 'slicked' || a.hair === 'grey') slick(person, H, hairMat);
    if (old || random() < 0.3) moustache(person, H, hairMat);
    if (a.dress === 'suit' || a.dress === 'white') {
      const jacketMat = s.material(suitColour, { roughness: a.dress === 'white' ? 0.7 : 0.85, side: THREE.DoubleSide });
      garment(person, H, build, jacketMat, { grow: 1.12, length: 1.02, open: 36, flare: 1.08, lift: -0.02 });
      for (const side of [-1, 1]) {
        const lapel = new THREE.Mesh(new THREE.BoxGeometry(chestR * 0.34, torsoL * 0.44, 0.012), jacketMat);
        lapel.position.set(side * chestR * 0.42, torsoL * 0.72, chestR * 1.06);
        lapel.rotation.set(0, side * 0.5, side * 0.12);
        person.joints.spine.add(lapel);
      }
      shirtFront(s, person, H, build, { tie: a.dress === 'white' ? 'bow' : 'tie', tieColour: a.dress === 'white' ? '#1c1b1f' : pick(random, ['#7a1f2a', '#1f2a4a', '#2a2a30']) });
    } else if (a.dress === 'waistcoat') {
      garment(person, H, build, s.material('#2b2a31', { roughness: 0.8, side: THREE.DoubleSide }), { grow: 1.1, length: 0.92, open: 44, lift: 0.02 });
      shirtFront(s, person, H, build, { tie: 'tie', tieColour: pick(random, ['#7a1f2a', '#1f2a4a', '#5a3a1a']) });
    } else {
      const brace = s.material('#2a2a30', { roughness: 0.8 });
      for (const side of [-1, 1]) {
        const strap = new THREE.Mesh(new THREE.BoxGeometry(0.03, torsoL * 0.95, 0.008), brace);
        strap.position.set(side * chestR * 0.5, torsoL * 0.5, chestR * 1.0);
        strap.rotation.y = side * 0.25;
        person.joints.spine.add(strap);
      }
    }
    if (a.vice === 'cigarette' || a.vice === 'both') {
      const cig = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.085, 6), s.material('#f4f0e6', { roughness: 0.9 }));
      cig.position.set(headR * 0.25, -headR * 0.32, headR * 0.95 + 0.04);
      cig.rotation.set(Math.PI / 2 + 0.35, 0, -0.15);
      person.head.add(cig);
      const ember = new THREE.Mesh(new THREE.SphereGeometry(0.0045, 6, 5), new THREE.MeshStandardMaterial({ color: '#ff6a2a', emissive: '#ff5a1a', emissiveIntensity: 2.5 }));
      ember.position.set(headR * 0.25 - 0.006, -headR * 0.32 - 0.015, headR * 0.95 + 0.08);
      person.head.add(ember);
      const smokeMat = new THREE.MeshStandardMaterial({ color: '#cfd2d6', transparent: true, opacity: 0.18, depthWrite: false, roughness: 1 });
      const tip = at(s, ember);
      const smoke = s.tube([[tip.x, tip.y, tip.z], [tip.x + 0.03, tip.y + 0.14, tip.z + 0.02], [tip.x - 0.02, tip.y + 0.3, tip.z + 0.05], [tip.x + 0.04, tip.y + 0.46, tip.z + 0.06]], 0.012, smokeMat);
      smoke.castShadow = false;
    }

    // ---- a crate with wine, a music stand with a sheet
    if (a.vice === 'glass' || a.vice === 'both') {
      const crate = s.material('#6b4d33', { roughness: 0.9 });
      const cx = stoolAt[0] + 0.62, cz = stoolAt[2] - 0.1;
      s.box([0.32, 0.3, 0.26], [cx, 0.15, cz], crate);
      for (const dz of [-0.09, 0, 0.09]) s.box([0.33, 0.012, 0.03], [cx, 0.2, cz + dz], s.material('#3a2a1e'));
      const wineMat = glassMaterial('#eef3f0', 0.3);
      s.mesh(glassGeometry('wine'), wineMat, [cx - 0.07, 0.3, cz + 0.04]).castShadow = false;
      s.lathe([[0, 0.078], [0.029, 0.082], [0.034, 0.11], [0, 0.115]], s.material('#5a0f1e', { roughness: 0.3 }), [cx - 0.07, 0.3, cz + 0.04]);
      s.mesh(bottleGeometry(0.3), s.material('#1a2a1e', { roughness: 0.25 }), [cx + 0.07, 0.3, cz - 0.02]);
      s.cylinder(0.038, 0.038, 0.07, [cx + 0.07, 0.42, cz - 0.02], s.material(pick(random, ['#d9c49a', '#b3202c', '#2a3a6a']), { roughness: 0.8 }), 14);
    }
    if (a.stand) {
      const iron = s.material('#2a2a2c', { metalness: 0.6, roughness: 0.4 });
      const sx = stoolAt[0] - 0.55, sz = stoolAt[2] + 0.35;
      for (let i = 0; i < 3; i++) { const angle = i * Math.PI * 2 / 3 + 0.3; s.rod([sx, 0.2, sz], [sx + Math.sin(angle) * 0.2, 0, sz + Math.cos(angle) * 0.2], 0.007, iron); }
      s.cylinder(0.008, 0.01, 0.9, [sx, 0.62, sz], iron, 8);
      const desk = s.box([0.42, 0.32, 0.012], [sx, 1.14, sz - 0.04], iron);
      desk.rotation.set(-0.5, 0, 0);
      desk.rotation.y = 0.5;
      const sheet = s.label('TANGO', 0.3, 0.22, [sx + 0.01, 1.16, sz - 0.03], '#3a3a3a', '#efe8d6');
      sheet.rotation.set(-0.5, 0.5, 0, 'YXZ');
    }

    // ---- a tapping foot, a rocking body, the bellows catching a breath
    const energy = mood.energy;
    const ankleL = person.joints.ankles.left;
    const restAnkle = ankleL.rotation.x;
    const restRoll = person.joints.body.rotation.z;
    const restTilt = instrument.rotation.z;
    return s.finish({
      update(dt, time) {
        person.update(dt, time);
        if (!resting) {
          ankleL.rotation.x = restAnkle - Math.max(0, Math.sin(time * mix(1.5, 4, energy))) * 0.18 * (0.2 + energy);
          const sway = Math.sin(time * mix(0.5, 1.6, energy)) * 0.02 * (0.3 + energy);
          person.joints.body.rotation.z = restRoll + sway;
          instrument.rotation.z = restTilt + sway * 0.6;
        }
      },
    });
  },
});
