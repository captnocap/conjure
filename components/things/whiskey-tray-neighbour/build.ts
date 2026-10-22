import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix, noul, score } from '@conjure/kit';
import { at, ground, joints, poseArm } from './pose';

/** A striped or plain apron cloth painted on a canvas. */
function apronCloth(base: string, stripe: string | null) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 128, 128);
  if (stripe) {
    ctx.fillStyle = stripe;
    for (let x = 4; x < 128; x += 16) ctx.fillRect(x, 0, 6, 128);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  return texture;
}

export default defineThing({
  questions: {
    tray: choice('What is on the tray?', {
      whiskey: 'A bottle of whiskey and five or six small glasses.',
      tea: 'Cups of tea on saucers and a brown teapot.',
      stout: 'Bottles of stout and a glass with a cream head.',
      cake: 'A fruit cake cut into slices on a plate, with a knife.',
    }),
    bottle: score('If there is a bottle, how full is it?', ['Nearly empty, the last of it', 'About half', 'Full, the seal just broken']),
    round: choice('Where is he in the round?', {
      setting: 'Just setting out from the kitchen, every glass full.',
      halfway: 'Half-way round the room, half the glasses already taken.',
      empties: 'Coming back with the empties, glasses tipped over on the tray.',
    }),
    dress: choice('What is he wearing?', {
      shirtsleeves: 'White shirtsleeves rolled up, a loosened black tie, the jacket long since taken off.',
      apron: 'A striped kitchen apron pulled on over his shirt and tie.',
      jacket: 'His dark suit jacket still on, the tie pulled loose.',
    }),
    motion: choice('What is he doing right now?', {
      step: 'Mid-step, crossing the room.',
      stopped: 'Stopped, holding the tray out to someone.',
      turned: 'Stopped, looking back over his shoulder at someone calling him.',
    }),
    head: choice('What about his head?', {
      combed: 'Short dark hair combed flat with water.',
      bald: 'Bald, a shine on top.',
      cap: 'A flat cap pushed back off his forehead.',
    }),
    second: noul('Does a second loaded tray wait on a kitchen chair behind him?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pick = <T>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const H = mix(1.7, 1.86, random());
    const build = random() < 0.35 ? 'heavy' : 'average';
    const shirt = pick(['#f1efe6', '#e6e8e2', '#dfe4ea']);
    const suit = pick(['#2a2a30', '#1f2228', '#3a3028']);
    const skin = pick(['#e3c2a4', '#d9b08c', '#c99a78', '#e8c9ad', '#b8835f']);
    const rolled = a.dress === 'shirtsleeves' && random() < 0.7;
    const person = figure(s, {
      height: H, build, style: 'doll', pose: a.motion === 'step' ? 'walking' : 'standing', skin,
      gaze: a.motion === 'turned' ? 'over-shoulder' : random() < 0.5 ? 'down' : 'ahead',
      hair: a.head === 'cap' ? 'cap' : a.head === 'bald' ? 'none' : 'short',
      hairColor: a.head === 'cap' ? pick(['#5a4a38', '#44403a']) : '#2a1f18',
      top: a.dress === 'jacket' ? suit : shirt, bottom: suit, shoes: '#1d1a18', sleeves: rolled ? 'short' : 'long',
    });
    s.root.add(person.root);
    // Both forearms level at chest height, the tray across them.
    const carry = { forward: 28, out: 2, bend: 62, inward: 4 };
    poseArm(person, 'left', carry);
    poseArm(person, 'right', carry);
    const { spine } = joints(person, 'left');
    if (a.motion === 'stopped') spine.rotation.x = -0.08;
    ground(person);
    const hl = at(person.hands.left), hr = at(person.hands.right);
    const hands = hl.clone().add(hr).multiplyScalar(0.5);
    const limb = H * 0.036 * (build === 'heavy' ? 1.3 : 1);
    const torsoL = H * 0.28;
    const front = limb * 1.35 * (build === 'heavy' ? 1.25 : 1);

    // ---- collar, loosened tie, apron bib and skirt
    const white = s.material('#f3f1ea', { roughness: 0.8 });
    const collar = new THREE.Mesh(new THREE.TorusGeometry(limb * 1.0, 0.009, 6, 18), white);
    collar.rotation.x = Math.PI / 2;
    collar.position.y = torsoL + 0.004;
    spine.add(collar);
    if (a.dress === 'jacket') {
      const vee = new THREE.Mesh(new THREE.BoxGeometry(0.07, torsoL * 0.4, 0.008), white);
      vee.position.set(0, torsoL * 0.78, front - 0.002);
      spine.add(vee);
    }
    const tieColour = pick(['#141416', '#3a1d22', '#1d2a3a', '#5a4a1a']);
    const tie = new THREE.Mesh(new THREE.BoxGeometry(0.038, torsoL * 0.62, 0.008), s.material(tieColour, { roughness: 0.6 }));
    tie.position.set(0.012, torsoL * 0.56, front + 0.006);
    tie.rotation.z = 0.08 + random() * 0.08;
    const knot = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.036, 0.018), tie.material);
    knot.position.set(0.02, torsoL * 0.88, front + 0.006);
    knot.rotation.z = 0.25;
    spine.add(tie, knot);
    if (a.dress === 'apron') {
      const cloth = s.material('#ffffff', { map: apronCloth(pick(['#e8e3d4', '#dfe5ea']), pick(['#3f6a9a', '#a04a44', '#4a7a5a', null])), roughness: 0.95, side: THREE.DoubleSide });
      const bib = new THREE.Mesh(new THREE.BoxGeometry(0.2, torsoL * 0.55, 0.008), cloth);
      bib.position.set(0, torsoL * 0.45, front + 0.012);
      spine.add(bib);
      const skirt = new THREE.Mesh(new THREE.BoxGeometry(0.34, H * 0.3, 0.01), cloth);
      skirt.position.set(0, -H * 0.13, limb * 1.6 + 0.012);
      person.pelvis.add(skirt);
    }

    // ---- the tin tray and what is on it
    const tin = s.material(pick(['#a9adb0', '#8f8a7a', '#b89550']), { metalness: 0.7, roughness: 0.35 });
    const trayY = hands.y + 0.02;
    const tray = new THREE.Group();
    tray.position.set(hands.x, trayY, hands.z + 0.03);
    s.root.add(tray);
    const oblong = random() < 0.5;
    const trayGeo = oblong ? new THREE.BoxGeometry(0.46, 0.008, 0.3) : new THREE.CylinderGeometry(0.22, 0.22, 0.008, 28);
    const base = new THREE.Mesh(trayGeo, tin);
    base.castShadow = base.receiveShadow = true;
    tray.add(base);
    if (oblong) {
      for (const [w, d, x, z] of [[0.46, 0.012, 0, 0.144], [0.46, 0.012, 0, -0.144], [0.012, 0.3, 0.224, 0], [0.012, 0.3, -0.224, 0]]) {
        const edge = new THREE.Mesh(new THREE.BoxGeometry(w, 0.018, d), tin);
        edge.position.set(x, 0.01, z);
        tray.add(edge);
      }
    } else {
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.215, 0.009, 6, 32), tin);
      rim.rotation.x = Math.PI / 2;
      rim.position.y = 0.008;
      tray.add(rim);
    }
    const glass = new THREE.MeshPhysicalMaterial({ color: '#ffffff', transparent: true, opacity: 0.22, roughness: 0.05, depthWrite: false });
    const amber = s.material('#c8832c', { roughness: 0.2, emissive: '#5a2e08', emissiveIntensity: mix(0.1, 0.35, mood.warmth) });
    const spots = (count: number, radius: number) => Array.from({ length: count }, (_, i) => {
      const angle = (i / count) * Math.PI * 2 + 0.4;
      return new THREE.Vector3(Math.cos(angle) * radius * (oblong ? 1.25 : 1), 0, Math.sin(angle) * radius * 0.8);
    });
    const kept = a.round === 'setting' ? 1 : a.round === 'halfway' ? 0.5 : 0;
    const put = (mesh: THREE.Mesh, p: THREE.Vector3, y: number) => { mesh.position.set(p.x, y, p.z); mesh.castShadow = true; tray.add(mesh); return mesh; };
    if (a.tray === 'whiskey') {
      const bottleAt = new THREE.Vector3(oblong ? -0.14 : -0.08, 0, -0.04);
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.036, 0.19, 16), glass);
      put(body, bottleAt, 0.1);
      const fill = 0.04 + a.bottle * 0.14;
      put(new THREE.Mesh(new THREE.CylinderGeometry(0.031, 0.033, fill, 16), amber), bottleAt, 0.006 + fill / 2);
      put(new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.02, 0.07, 12), glass), bottleAt, 0.23);
      put(new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.02, 12), s.material('#2a1a10')), bottleAt, 0.275);
      const label = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.07), s.material(pick(['#f1e6c8', '#d9c9a1', '#2b4a38']), { roughness: 0.9 }));
      label.position.set(bottleAt.x, 0.1, bottleAt.z + 0.0365);
      tray.add(label);
      const count = 5 + Math.round(random());
      spots(count, 0.13).forEach((p, i) => {
        const q = p.clone().add(new THREE.Vector3(0.05, 0, 0.02));
        const tipped = kept < 1 && (a.round === 'empties' ? i % 3 !== 0 : i % 2 === 1);
        const g = put(new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.016, 0.05, 12), glass), q, tipped ? 0.022 : 0.03);
        if (tipped) { g.rotation.z = Math.PI / 2; g.rotation.y = random() * Math.PI; g.position.y = 0.025; }
        else if (a.round !== 'empties' && (a.round === 'setting' || i % 2 === 0)) put(new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.014, 0.022, 12), amber), q, 0.02);
      });
    } else if (a.tray === 'tea') {
      const china = s.material(pick(['#f1ece0', '#e8eef0']), { roughness: 0.4 });
      const tea = s.material('#8a5a2c', { roughness: 0.3 });
      const count = 4 + Math.round(random());
      spots(count, 0.14).forEach((p, i) => {
        const q = p.clone().add(new THREE.Vector3(0.03, 0, 0.02));
        put(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.005, 18), china), q, 0.008);
        if (a.round === 'empties' && i % 2) return;
        put(new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.026, 0.05, 14), china), q, 0.035);
        if (a.round !== 'empties') put(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.004, 14), tea), q, 0.056);
      });
      const brown = s.material('#6e3b2a', { roughness: 0.45 });
      const potAt = new THREE.Vector3(oblong ? -0.15 : -0.09, 0, -0.03);
      put(new THREE.Mesh(new THREE.SphereGeometry(0.07, 18, 12), brown), potAt, 0.075).scale.y = 0.85;
      put(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.02, 12), brown), potAt, 0.14);
      const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.014, 0.09, 8), brown);
      spout.position.set(potAt.x + 0.08, 0.1, potAt.z);
      spout.rotation.z = -0.9;
      tray.add(spout);
      const handle = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.008, 6, 14, Math.PI), brown);
      handle.position.set(potAt.x - 0.07, 0.08, potAt.z);
      handle.rotation.z = Math.PI / 2;
      tray.add(handle);
    } else if (a.tray === 'stout') {
      const bottle = s.material('#2a1a12', { roughness: 0.25 });
      const count = 4 + Math.round(random() * 2);
      spots(count, 0.12).forEach((p, i) => {
        const standing = a.round === 'setting' || i % 2 === 0;
        if (a.round === 'empties' && i % 3 === 0) return;
        const b = put(new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.028, 0.18, 12), bottle), p, 0.1);
        if (!standing) { b.rotation.z = Math.PI / 2; b.rotation.y = random() * 2; b.position.y = 0.03; }
        else {
          put(new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.016, 0.07, 10), bottle), p, 0.22);
          const cap = put(new THREE.Mesh(new THREE.PlaneGeometry(0.04, 0.05), s.material(pick(['#d9b24a', '#f1e6c8']), { roughness: 0.9 })), p, 0.1);
          cap.position.z += 0.029;
        }
      });
      put(new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.028, 0.13, 14), glass), new THREE.Vector3(0.1, 0, 0.06), 0.07);
      put(new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.027, 0.09, 14), s.material('#15100e', { roughness: 0.25 })), new THREE.Vector3(0.1, 0, 0.06), 0.05);
      put(new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.02, 14), s.material('#f1e6cd', { roughness: 0.8 })), new THREE.Vector3(0.1, 0, 0.06), 0.105);
    } else {
      const china = s.material('#f1ece0', { roughness: 0.4 });
      put(new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.13, 0.01, 24), china), new THREE.Vector3(0, 0, 0), 0.01);
      const cakeMat = s.material('#5a3a22', { roughness: 0.95 });
      const icing = s.material('#f3eadc', { roughness: 0.8 });
      const slices = a.round === 'setting' ? 8 : a.round === 'halfway' ? 4 : 1;
      for (let i = 0; i < slices; i++) {
        const wedge = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.05, 8, 1, false, (i / 8) * Math.PI * 2, Math.PI / 4), cakeMat);
        wedge.position.y = 0.04;
        wedge.castShadow = true;
        tray.add(wedge);
        const top = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.012, 8, 1, false, (i / 8) * Math.PI * 2, Math.PI / 4), icing);
        top.position.y = 0.07;
        tray.add(top);
      }
      const knife = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.004, 0.018), tin);
      knife.position.set(0.0, 0.016, oblong ? 0.12 : 0.17);
      tray.add(knife);
      for (let i = 0; i < 3; i++) put(new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.005, 16), china), new THREE.Vector3(oblong ? 0.17 : 0.13, 0, -0.06 + i * 0.012), 0.012 + i * 0.006);
    }

    // ---- a second tray on a kitchen chair behind him
    if (a.second) {
      const wood = s.material(pick(['#6b4a2e', '#8a6a44']), { roughness: 0.7 });
      const cx = (random() < 0.5 ? -1 : 1) * 0.55, cz = -0.55, seat = 0.46;
      for (const x of [-1, 1]) for (const z of [-1, 1]) s.box([0.035, seat, 0.035], [cx + x * 0.19, seat / 2, cz + z * 0.19], wood);
      s.box([0.44, 0.03, 0.44], [cx, seat + 0.015, cz], wood);
      for (const x of [-1, 1]) s.box([0.035, 0.5, 0.035], [cx + x * 0.19, seat + 0.25, cz - 0.19], wood);
      for (let i = 0; i < 3; i++) s.box([0.36, 0.05, 0.02], [cx, seat + 0.17 + i * 0.14, cz - 0.19], wood);
      s.cylinder(0.2, 0.2, 0.008, [cx, seat + 0.034, cz], tin, 24);
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        s.cylinder(0.02, 0.016, 0.05, [cx + Math.cos(angle) * 0.11, seat + 0.063, cz + Math.sin(angle) * 0.11], glass, 12);
        s.cylinder(0.017, 0.014, 0.022, [cx + Math.cos(angle) * 0.11, seat + 0.05, cz + Math.sin(angle) * 0.11], amber, 12);
      }
    }

    return s.finish({ update: (dt, time) => person.update(dt, time) });
  },
});
