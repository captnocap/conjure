import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

type V = THREE.Vector3;
const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

const SUIT = {
  silver: { say: 'Quilted silver foil, the classic rocket-man suit.', c: '#c5ccd1', rib: '#8e979e', trim: '#c9302a' },
  orange: { say: 'Bright rescue orange with black ribbing.', c: '#ee7a22', rib: '#2b2b2e', trim: '#f4f0e4' },
  white: { say: 'Clean white with blue trim, a space-agency hero.', c: '#f0eee6', rib: '#9aa3ad', trim: '#2a5fc0' },
  red: { say: 'Tomato red with yellow ribbing, a serial villain or a toy.', c: '#cf3428', rib: '#f0c12a', trim: '#f0c12a' },
  mustard: { say: 'Mustard yellow canvas with brown leather joints, an early explorer.', c: '#d2a72e', rib: '#6b4a2c', trim: '#6b4a2c' },
  teal: { say: 'Deep teal with copper ribbing, an undersea diver gone to space.', c: '#2f8f8a', rib: '#b9763f', trim: '#b9763f' },
} as const;

export default defineThing({
  questions: {
    pose: choice('How has the empty suit been left?', {
      propped: 'Standing upright, propped on a stake like a scarecrow, arms hanging.',
      waving: 'Standing on its own with one arm raised, as if still occupied and saying hello.',
      slumped: 'Sitting slumped against a rock, legs out, helmet lolling to one side.',
      fallen: 'Flat on its back where it fell, limbs sprawled.',
    }),
    inside: choice('The wearer is gone. What is inside the helmet now?', {
      nothing: 'Nothing at all: clear glass and an empty collar.',
      skull: 'A clean white skull, still looking out.',
      plant: 'A green alien plant that has grown up through the neck and filled the bowl.',
      fish: 'Water and a goldfish: it is a fishbowl after all.',
      creature: 'A small local creature with eyes on stalks that has moved in.',
      gas: 'A slowly churning coloured gas.',
      nest: 'A nest of straw with three speckled eggs.',
      light: 'A hovering ball of light, as if the wearer became something else.',
    }),
    visor: choice('What state is the glass in?', {
      clear: 'Clear and unbroken.',
      cracked: 'Cracked across the front but holding.',
      shattered: 'Smashed open at the front, jagged edges.',
      fogged: 'Fogged white from the inside, nearly opaque.',
    }),
    colour: choice('What colour is the suit?', Object.fromEntries(Object.entries(SUIT).map(([k, s]) => [k, s.say])) as Record<keyof typeof SUIT, string>),
    pack: choice('What is on its back?', {
      tanks: 'Twin air tanks with a hose to the collar.',
      radio: 'A boxy radio set with dials.',
      jet: 'A finned jet pack with two nozzles.',
      torn: 'Only torn straps and a dangling hose: the pack is gone.',
    }),
    aerial: choice('What kind of antenna does it carry?', {
      spring: 'A springy rod with a ball on top, rising from the helmet collar.',
      ears: 'Two short ear antennae, one each side of the helmet.',
      dish: 'A little dish on a stalk.',
      loop: 'A wire loop aerial.',
    }),
    chest: choice('What is on the chest?', {
      panel: 'A control panel of coloured buttons and a dial.',
      star: 'A big star badge.',
      number: 'A stencilled crew number.',
      heart: 'A hand-painted heart.',
    }),
    beside: choice('What lies with it?', {
      nothing: 'Nothing.',
      flag: 'A small flag planted beside it.',
      raygun: 'A raygun dropped by its glove.',
      flowers: 'Alien flowers growing up around its boots.',
      prints: 'Bare footprints leading away from it.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const suit = SUIT[a.colour];
    const cloth = s.material(suit.c, { roughness: 0.55, metalness: a.colour === 'silver' ? 0.3 : 0 });
    const rib = s.material(suit.rib, { roughness: 0.6 });
    const trim = s.material(suit.trim, { roughness: 0.5 });
    const steel = s.material('#b6bdc3', { metalness: 0.45, roughness: 0.3 });
    const dark = s.material('#26282c', { roughness: 0.7 });

    const fig = new THREE.Group();
    s.root.add(fig);
    const add = <T extends THREE.Object3D>(o: T, to: THREE.Object3D = fig) => { to.add(o); return o; };
    const part = (geometry: THREE.BufferGeometry, material: THREE.Material, to: THREE.Object3D = fig) => { const m = new THREE.Mesh(geometry, material); m.castShadow = m.receiveShadow = true; to.add(m); return m; };
    const UP = v(0, 1, 0), FWD = v(0, 0, 1);

    // ---- Pose ----
    const lean = (random() - 0.5) * 0.08;
    let headTilt = v(0, 0, 0);
    if (a.pose === 'propped') { fig.position.set(0, 0.99, 0); fig.rotation.set(0.06, 0, lean); headTilt = v(0.25, 0, 0.12); }
    if (a.pose === 'waving') { fig.position.set(0, 0.99, 0); fig.rotation.set(0, 0, lean * 0.5); headTilt = v(-0.08, 0.2, 0); }
    if (a.pose === 'slumped') { fig.position.set(0, 0.15, 0); fig.rotation.set(-0.42, 0, 0.1 + lean); headTilt = v(0.3, 0, 0.38); }
    if (a.pose === 'fallen') { fig.position.set(0, 0.33, 0.2); fig.rotation.set(-Math.PI / 2 + 0.06, 0, 0.5 + lean * 3); headTilt = v(0, 0.5, 0); }
    s.root.updateMatrixWorld(true);
    const local = (x: number, y: number, z: number) => fig.worldToLocal(v(x, y, z));

    // ---- A ribbed limb: cloth tubes between joints, accordion rings at each joint ----
    const limb = (points: V[], radius: number) => {
      points.forEach((p, i) => {
        if (i === 0) return;
        const from = points[i - 1], dir = p.clone().sub(from), length = dir.length();
        dir.normalize();
        const tube = part(new THREE.CylinderGeometry(radius * 0.92, radius, length, 12), cloth);
        tube.position.copy(from).addScaledVector(dir, length / 2); tube.quaternion.setFromUnitVectors(UP, dir);
        for (const k of [0.1, 0.2, 0.3, 0.76, 0.88]) {
          const ring = part(new THREE.TorusGeometry(radius * 1.12, radius * 0.24, 6, 14), rib);
          ring.position.copy(from).addScaledVector(dir, length * k); ring.quaternion.setFromUnitVectors(FWD, dir);
        }
      });
      for (const p of points.slice(0, -1)) part(new THREE.SphereGeometry(radius * 1.12, 12, 8), rib).position.copy(p);
    };
    const boot = (ankle: V, toe: V) => {
      part(new THREE.SphereGeometry(0.105, 12, 8), dark).position.copy(ankle);
      const front = part(new THREE.SphereGeometry(0.1, 12, 8), dark); front.position.copy(ankle).addScaledVector(toe.clone().normalize(), 0.13); front.scale.set(1, 0.8, 1);
      part(new THREE.TorusGeometry(0.1, 0.03, 6, 14), trim).position.copy(ankle);
    };
    const glove = (wrist: V, from: V) => {
      const dir = wrist.clone().sub(from).normalize();
      const hand = part(new THREE.SphereGeometry(0.085, 12, 8), dark); hand.position.copy(wrist).addScaledVector(dir, 0.07); hand.scale.set(1, 1.2, 0.8);
      const cuff = part(new THREE.TorusGeometry(0.075, 0.028, 6, 14), trim); cuff.position.copy(wrist); cuff.quaternion.setFromUnitVectors(FWD, dir);
      return hand.position.clone();
    };

    // ---- Legs ----
    const hips = [v(-0.12, -0.02, 0), v(0.12, -0.02, 0)];
    const legs: [V, V, V][] = hips.map((hip, i) => {
      const side = i ? 1 : -1;
      if (a.pose === 'slumped') { const h = fig.localToWorld(hip.clone()); return [local(h.x + side * (0.1 + random() * 0.08), 0.2 + (i ? 0.1 : 0), h.z + 0.44), local(h.x + side * 0.22, 0.1, h.z + 0.9), local(side * 0.3, 0.5, 2)]; }
      if (a.pose === 'fallen') return [v(side * 0.17, -0.46, -0.1), v(side * (0.2 + random() * 0.16), -0.92, -0.2), v(side * 0.4, -1.2, 0.6)];
      return [v(side * 0.14, -0.46, 0.03), v(side * 0.16, -0.9, 0), v(side * 0.25, -0.9, 1)];
    });
    legs.forEach(([knee, ankle, toward], i) => { limb([hips[i], knee, ankle], 0.095); boot(ankle, toward.clone().sub(ankle)); });

    // ---- Arms ----
    const shoulders = [v(-0.28, 0.5, 0), v(0.28, 0.5, 0)];
    const hands: V[] = [];
    shoulders.forEach((shoulder, i) => {
      const side = i ? 1 : -1;
      let elbow = v(side * 0.37, 0.2, 0.03), wrist = v(side * 0.39, -0.08, 0.1);
      if (a.pose === 'waving' && i) { elbow = v(0.56, 0.55, 0.06); wrist = v(0.66, 0.92, 0.12); }
      if (a.pose === 'slumped') { elbow = v(side * 0.4, 0.2, 0.1); wrist = i ? v(0.5, -0.05, 0.3) : v(-0.2, 0.02, 0.33); }
      if (a.pose === 'fallen') { elbow = i ? v(0.6, 0.62, -0.05) : v(-0.55, 0.3, -0.08); wrist = i ? v(0.72, 0.95, -0.14) : v(-0.82, 0.12, -0.16); }
      limb([shoulder, elbow, wrist], 0.078);
      hands.push(fig.localToWorld(glove(wrist, elbow)));
    });

    // ---- Torso ----
    const torso = part(new THREE.LatheGeometry([[0.001, -0.14], [0.17, -0.1], [0.2, 0.02], [0.19, 0.16], [0.235, 0.34], [0.25, 0.48], [0.2, 0.58], [0.15, 0.62]].map(([x, y]) => new THREE.Vector2(x, y)), 20), cloth);
    torso.scale.z = 0.82;
    const belt = part(new THREE.TorusGeometry(0.2, 0.035, 6, 20), trim); belt.rotation.x = Math.PI / 2; belt.position.y = 0.04; belt.scale.y = 0.82;
    part(new THREE.BoxGeometry(0.09, 0.08, 0.04), steel).position.set(0, 0.04, 0.2);
    for (const y of [0.14, 0.2]) { const fold = part(new THREE.TorusGeometry(0.2, 0.022, 6, 20), rib); fold.rotation.x = Math.PI / 2; fold.position.y = y; fold.scale.y = 0.82; }
    if (a.chest === 'panel') {
      part(new THREE.BoxGeometry(0.22, 0.16, 0.05), steel).position.set(0, 0.38, 0.2);
      ['#e23a2e', '#f2c12a', '#3fb86a'].forEach((c, i) => part(new THREE.SphereGeometry(0.02, 8, 6), new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.8 })).position.set(-0.06 + i * 0.045, 0.41, 0.23));
      part(new THREE.CylinderGeometry(0.035, 0.035, 0.02, 12), dark).position.set(0.06, 0.35, 0.23); fig.children[fig.children.length - 1].rotation.x = Math.PI / 2;
    } else {
      const badge = document.createElement('canvas'); badge.width = badge.height = 128;
      const b = badge.getContext('2d')!;
      b.fillStyle = suit.trim === '#f4f0e4' ? '#1c1c20' : suit.trim; b.textAlign = 'center'; b.textBaseline = 'middle';
      if (a.chest === 'star') { b.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 24 : 60, t = -Math.PI / 2 + i * Math.PI / 5; b.lineTo(64 + Math.cos(t) * r, 66 + Math.sin(t) * r); } b.fill(); }
      if (a.chest === 'number') { b.font = 'bold 96px monospace'; b.fillText(String(2 + Math.floor(random() * 8)), 64, 70); }
      if (a.chest === 'heart') { b.fillStyle = '#d8262c'; b.beginPath(); b.moveTo(64, 112); b.bezierCurveTo(-20, 50, 30, -6, 64, 36); b.bezierCurveTo(98, -6, 148, 50, 64, 112); b.fill(); }
      const map = new THREE.CanvasTexture(badge); map.colorSpace = THREE.SRGBColorSpace;
      const plate = part(new THREE.CylinderGeometry(0.246, 0.24, 0.2, 10, 1, true, -0.45, 0.9), new THREE.MeshStandardMaterial({ map, transparent: true, alphaTest: 0.4, roughness: 0.7 }));
      plate.position.y = 0.4; plate.scale.z = 0.84;
    }

    // ---- Backpack ----
    const back = new THREE.Group(); back.position.set(0, 0.34, -0.25); fig.add(back);
    if (a.pack === 'tanks') {
      for (const x of [-0.1, 0.1]) { part(new THREE.CapsuleGeometry(0.085, 0.3, 4, 12), steel, back).position.set(x, 0, 0); part(new THREE.CylinderGeometry(0.03, 0.03, 0.06, 8), dark, back).position.set(x, 0.26, 0); }
      part(new THREE.BoxGeometry(0.34, 0.05, 0.1), trim, back).position.set(0, -0.02, 0.04);
    } else if (a.pack === 'radio') {
      part(new THREE.BoxGeometry(0.38, 0.42, 0.17), steel, back);
      for (const x of [-0.1, 0.1]) { const dial = part(new THREE.CylinderGeometry(0.05, 0.05, 0.02, 12), dark, back); dial.rotation.x = Math.PI / 2; dial.position.set(x, 0.08, -0.09); }
      part(new THREE.BoxGeometry(0.26, 0.08, 0.02), trim, back).position.set(0, -0.1, -0.09);
    } else if (a.pack === 'jet') {
      part(new THREE.BoxGeometry(0.3, 0.3, 0.12), trim, back);
      for (const x of [-0.17, 0.17]) {
        part(new THREE.CapsuleGeometry(0.075, 0.34, 4, 12), steel, back).position.set(x, 0.02, -0.03);
        part(new THREE.ConeGeometry(0.075, 0.16, 12), trim, back).position.set(x, 0.35, -0.03);
        part(new THREE.CylinderGeometry(0.05, 0.085, 0.1, 12), dark, back).position.set(x, -0.28, -0.03);
        const fin = part(new THREE.BoxGeometry(0.015, 0.2, 0.16), trim, back); fin.position.set(x + Math.sign(x) * 0.09, -0.12, -0.03); fin.rotation.z = Math.sign(x) * 0.25;
      }
    } else {
      for (const x of [-0.12, 0.12]) part(new THREE.BoxGeometry(0.04, 0.3, 0.02), dark, back).position.set(x, 0.02, 0.06);
    }
    if (a.pack !== 'jet') {
      const end = a.pack === 'torn' ? v(0.34, -0.42, -0.2) : v(0.16, 0.66, -0.12);
      const hose = part(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([v(0.12, 0.5, -0.24), v(0.3, a.pack === 'torn' ? 0.3 : 0.72, -0.26), end]), 20, 0.022, 6), rib);
      hose.castShadow = true;
    }

    // ---- Collar and helmet ----
    const head = new THREE.Group(); head.position.y = 0.64; head.rotation.set(headTilt.x, headTilt.y, headTilt.z); fig.add(head);
    const collar = part(new THREE.TorusGeometry(0.2, 0.045, 8, 24), steel, head); collar.rotation.x = Math.PI / 2;
    part(new THREE.CylinderGeometry(0.2, 0.17, 0.06, 20), dark, head).position.y = -0.02;
    const HR = 0.33, hc = 0.3;
    const fogged = a.visor === 'fogged';
    const glassMat = fogged
      ? new THREE.MeshStandardMaterial({ color: '#eef3f2', transparent: true, opacity: 0.82, roughness: 0.6 })
      : new THREE.MeshStandardMaterial({ color: '#c9eef7', transparent: true, opacity: 0.26, roughness: 0.05, depthWrite: false });
    const bowl = a.visor === 'shattered'
      ? new THREE.SphereGeometry(HR, 28, 18, Math.PI / 2 + 0.75, Math.PI * 2 - 1.5, 0, Math.PI * 0.88)
      : new THREE.SphereGeometry(HR, 28, 18, 0, Math.PI * 2, 0, Math.PI * 0.88);
    const glass = new THREE.Mesh(bowl, glassMat); glass.material.side = THREE.DoubleSide; glass.position.y = hc; glass.renderOrder = 2; head.add(glass);
    const shine = new THREE.Mesh(new THREE.SphereGeometry(HR * 1.01, 10, 8, 2.2, 0.5, 0.5, 0.75), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.7, depthWrite: false }));
    shine.position.y = hc; shine.renderOrder = 3; head.add(shine);
    const rimLine = new THREE.Mesh(new THREE.TorusGeometry(HR, 0.008, 4, 40), new THREE.MeshBasicMaterial({ color: '#5f8794', transparent: true, opacity: 0.8, depthWrite: false }));
    rimLine.position.y = hc; rimLine.rotation.y = Math.PI / 2; head.add(rimLine);
    if (a.visor === 'cracked' || (a.visor === 'clear' && mood.wear > 0.75)) {
      const crack = new THREE.LineBasicMaterial({ color: '#ffffff' });
      const origin = v(0.08, hc + 0.05, 0).normalize();
      for (let i = 0; i < 7; i++) {
        const pts: V[] = []; let t = random() * Math.PI * 2, x = 0.08, y = 0.05;
        for (let k = 0; k < 5; k++) { const z = Math.sqrt(Math.max(0.0001, HR * HR - x * x - y * y)); pts.push(v(x, hc + y, z + 0.004)); t += (random() - 0.5) * 1.2; x += Math.cos(t) * 0.05; y += Math.sin(t) * 0.05; }
        head.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), crack));
      }
      void origin;
    }
    if (a.visor === 'shattered') for (let i = 0; i < 9; i++) {
      const t = -0.75 + (i % 2 ? 1.5 : 0), lat = 0.25 + (i / 9) * 2.2, p = v(Math.sin(t) * Math.sin(lat), Math.cos(lat), Math.cos(t) * Math.sin(lat)).multiplyScalar(HR);
      const shard = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.12 + random() * 0.08, 3), new THREE.MeshStandardMaterial({ color: '#dff6fb', transparent: true, opacity: 0.75, roughness: 0.1 }));
      shard.position.set(p.x, hc + p.y, p.z); shard.quaternion.setFromUnitVectors(UP, v(t > 0 ? -1 : 1, 0, 0.5).normalize()); head.add(shard);
    }

    // ---- What is in the helmet ----
    const inside = new THREE.Group(); inside.position.y = hc; head.add(inside);
    let bob: THREE.Object3D | null = null, glowMat: THREE.MeshStandardMaterial | null = null;
    if (a.inside === 'skull') {
      const bone = s.material('#efe9d8', { roughness: 0.6 }), hole = new THREE.MeshStandardMaterial({ color: '#141210', roughness: 1 });
      part(new THREE.SphereGeometry(0.17, 16, 12), bone, inside).position.set(0, -0.02, -0.02);
      part(new THREE.BoxGeometry(0.17, 0.11, 0.14), bone, inside).position.set(0, -0.17, 0.05);
      for (const x of [-0.065, 0.065]) part(new THREE.SphereGeometry(0.048, 10, 8), hole, inside).position.set(x, -0.03, 0.135);
      part(new THREE.ConeGeometry(0.022, 0.05, 4), hole, inside).position.set(0, -0.1, 0.145);
      for (let i = 0; i < 5; i++) part(new THREE.BoxGeometry(0.008, 0.05, 0.01), hole, inside).position.set(-0.056 + i * 0.028, -0.19, 0.123);
      inside.rotation.set(0.1, (random() - 0.5) * 0.6, (random() - 0.5) * 0.3);
    } else if (a.inside === 'plant') {
      const leaf = s.material('#4fae45', { roughness: 0.6, side: THREE.DoubleSide }), bloom = s.material('#e8459a', { emissive: '#e8459a', emissiveIntensity: 0.3 });
      for (let i = 0; i < 9; i++) {
        const t = i / 9 * Math.PI * 2 + random(), r = 0.1 + random() * 0.12, top = (a.visor === 'shattered' && i < 3) ? 0.36 : 0.08 + random() * 0.14;
        const frond = part(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([v(0, -0.3, 0), v(Math.sin(t) * r * 0.5, -0.1, Math.cos(t) * r * 0.5), v(Math.sin(t) * r, top, Math.cos(t) * r + (top > 0.3 ? 0.25 : 0))]), 10, 0.016, 5), leaf, inside);
        frond.castShadow = false;
        const blade = part(new THREE.SphereGeometry(0.06, 8, 6), i % 3 ? leaf : bloom, inside); blade.position.set(Math.sin(t) * r, top, Math.cos(t) * r + (top > 0.3 ? 0.25 : 0)); blade.scale.set(1, 0.45, 0.7); blade.rotation.set(random(), t, random());
      }
    } else if (a.inside === 'fish') {
      const water = new THREE.Mesh(new THREE.SphereGeometry(HR * 0.95, 24, 12, 0, Math.PI * 2, Math.PI * 0.42, Math.PI * 0.46), new THREE.MeshStandardMaterial({ color: '#3fa7e0', transparent: true, opacity: 0.6, roughness: 0.1 }));
      inside.add(water);
      const top = new THREE.Mesh(new THREE.CircleGeometry(HR * 0.92, 24), new THREE.MeshStandardMaterial({ color: '#8fd3f2', transparent: true, opacity: 0.75, side: THREE.DoubleSide })); top.rotation.x = -Math.PI / 2; top.position.y = HR * 0.24; inside.add(top);
      const fish = new THREE.Group(), gold = new THREE.MeshStandardMaterial({ color: '#ff8a1e', emissive: '#ff6a00', emissiveIntensity: 0.5 });
      const body = part(new THREE.SphereGeometry(0.075, 12, 8), gold, fish); body.scale.set(1.5, 1, 0.6);
      const tail = part(new THREE.ConeGeometry(0.06, 0.1, 4), gold, fish); tail.rotation.z = -Math.PI / 2; tail.position.x = -0.14; tail.scale.z = 0.3;
      part(new THREE.SphereGeometry(0.015, 6, 4), dark, fish).position.set(0.07, 0.02, 0.035);
      fish.position.set(0, -0.06, 0.12); inside.add(fish); bob = fish;
    } else if (a.inside === 'creature') {
      const skin = s.material('#8fc04a', { roughness: 0.5 });
      part(new THREE.SphereGeometry(0.15, 14, 10), skin, inside).position.set(0, -0.14, 0.02);
      const eyeMat = new THREE.MeshStandardMaterial({ color: '#fffbe0', emissive: '#fff2a0', emissiveIntensity: 0.6 });
      const stalks = new THREE.Group(); inside.add(stalks);
      for (const x of [-0.08, 0.08]) {
        const stalk = part(new THREE.CylinderGeometry(0.014, 0.02, 0.2, 6), skin, stalks); stalk.position.set(x, 0.02, 0.06); stalk.rotation.z = -x * 2;
        part(new THREE.SphereGeometry(0.055, 10, 8), eyeMat, stalks).position.set(x * 1.4, 0.13, 0.07);
        part(new THREE.SphereGeometry(0.024, 8, 6), dark, stalks).position.set(x * 1.4, 0.13, 0.118);
      }
      for (let i = 0; i < 4; i++) { const t = -0.9 + i * 0.6; part(new THREE.SphereGeometry(0.035, 8, 6), skin, inside).position.set(Math.sin(t) * 0.2, -0.2, Math.cos(t) * 0.2); }
      bob = stalks;
    } else if (a.inside === 'gas') {
      const hue = new THREE.Color().setHSL(mix(0.42, 0.9, mood.warmth), 0.8, 0.55);
      glowMat = new THREE.MeshStandardMaterial({ color: hue, emissive: hue, emissiveIntensity: 0.7, transparent: true, opacity: 0.7, roughness: 1 });
      const swirl = new THREE.Group(); inside.add(swirl);
      for (let i = 0; i < 7; i++) { const blob = new THREE.Mesh(new THREE.IcosahedronGeometry(0.1 + random() * 0.08, 1), glowMat); blob.position.set((random() - 0.5) * 0.3, (random() - 0.6) * 0.3, (random() - 0.5) * 0.3); swirl.add(blob); }
      bob = swirl;
    } else if (a.inside === 'nest') {
      const straw = s.material('#b89546', { roughness: 1 });
      const ring = part(new THREE.TorusGeometry(0.15, 0.06, 6, 16), straw, inside); ring.rotation.x = Math.PI / 2; ring.position.y = -0.18;
      for (let i = 0; i < 12; i++) { const t = random() * 6.3; const twig = part(new THREE.CylinderGeometry(0.006, 0.006, 0.22, 4), straw, inside); twig.position.set(Math.sin(t) * 0.16, -0.15, Math.cos(t) * 0.16); twig.rotation.set(random() * 3, random() * 3, 1.2); }
      const shell = s.material('#bfe3dc', { roughness: 0.4 });
      for (let i = 0; i < 3; i++) { const egg = part(new THREE.SphereGeometry(0.06, 10, 8), shell, inside); egg.scale.y = 1.3; egg.position.set(Math.sin(i * 2.1) * 0.06, -0.1, Math.cos(i * 2.1) * 0.06); egg.rotation.z = (random() - 0.5) * 0.8; }
    } else if (a.inside === 'light') {
      glowMat = new THREE.MeshStandardMaterial({ color: '#fff6c8', emissive: '#ffe27a', emissiveIntensity: 2.4 });
      const orb = new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 10), glowMat); inside.add(orb);
      const halo = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 10), new THREE.MeshBasicMaterial({ color: '#ffe89a', transparent: true, opacity: 0.35, depthWrite: false })); orb.add(halo);
      bob = orb;
    }

    // ---- Antenna ----
    let whip: THREE.Object3D | null = null;
    if (a.aerial === 'spring') {
      whip = new THREE.Group(); whip.position.set(-0.2, 0, -0.08); head.add(whip);
      const coil = Array.from({ length: 40 }, (_u, i) => v(Math.sin(i * 1.3) * 0.018, i * 0.016, Math.cos(i * 1.3) * 0.018));
      part(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(coil), 80, 0.006, 4), steel, whip);
      part(new THREE.SphereGeometry(0.04, 10, 8), trim, whip).position.y = 0.66;
    } else if (a.aerial === 'ears') for (const x of [-1, 1]) {
      const stalk = part(new THREE.CylinderGeometry(0.008, 0.014, 0.34, 6), steel, head); stalk.position.set(x * 0.3, 0.2, 0); stalk.rotation.z = -x * 0.6;
      part(new THREE.SphereGeometry(0.032, 8, 6), trim, head).position.set(x * 0.4, 0.34, 0);
      part(new THREE.CylinderGeometry(0.05, 0.05, 0.05, 10), steel, head).position.set(x * 0.21, 0.03, 0);
    } else if (a.aerial === 'dish') {
      const stalk = part(new THREE.CylinderGeometry(0.01, 0.014, 0.6, 6), steel, head); stalk.position.set(-0.22, 0.3, -0.1);
      const dish = part(new THREE.SphereGeometry(0.12, 14, 6, 0, Math.PI * 2, 0, 1.1), s.material('#d8dde0', { side: THREE.DoubleSide, metalness: 0.3 }), head); dish.position.set(-0.22, 0.72, -0.1); dish.rotation.x = Math.PI - 0.7;
    } else {
      const stalk = part(new THREE.CylinderGeometry(0.01, 0.014, 0.42, 6), steel, head); stalk.position.set(-0.22, 0.21, -0.1);
      const loop = part(new THREE.TorusGeometry(0.11, 0.012, 6, 20), steel, head); loop.position.set(-0.22, 0.53, -0.1); loop.rotation.y = 0.6;
    }

    // ---- Props and the ground around it ----
    const rock = s.material('#77707a', { roughness: 1, flatShading: true });
    if (a.pose === 'propped') {
      s.rod([0, 0, -0.32], [0, 2.05, -0.36], 0.035, s.material('#7a5a3a', { roughness: 0.9 }));
      s.rod([-0.42, 1.5, -0.34], [0.42, 1.5, -0.34], 0.03, s.material('#7a5a3a', { roughness: 0.9 }));
    }
    if (a.pose === 'slumped') {
      const stone = s.mesh(new THREE.DodecahedronGeometry(0.55, 1), rock, [0.03, 0.3, -0.62]); stone.scale.set(1.25, 1.1, 0.75); stone.rotation.y = random();
    }
    const offX = a.pose === 'fallen' ? -1.0 : 0.7;
    if (a.beside === 'flag') {
      s.rod([offX, 0, 0.25], [offX, 1.25, 0.25], 0.014, steel);
      const flag = s.mesh(new THREE.PlaneGeometry(0.42, 0.26, 6, 1), s.material(suit.trim, { side: THREE.DoubleSide }), [offX + 0.22, 1.1, 0.25]);
      const p = flag.geometry.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 14) * 0.03); flag.geometry.computeVertexNormals();
    }
    if (a.beside === 'raygun') {
      const h = hands[1], g = new THREE.Group(); g.position.set(h.x + 0.16, Math.max(0.05, a.pose === 'waving' ? 0.05 : h.y - 0.02), h.z + 0.14); g.rotation.set(Math.PI / 2 - 0.2, 0, random() * 2); s.root.add(g);
      const red = s.material('#c8302a', { roughness: 0.4 });
      const body = part(new THREE.SphereGeometry(0.07, 12, 8), red, g); body.scale.set(1.9, 1, 1);
      const barrel = part(new THREE.CylinderGeometry(0.02, 0.03, 0.26, 8), steel, g); barrel.rotation.z = -Math.PI / 2; barrel.position.x = 0.22;
      for (let i = 0; i < 3; i++) { const ring = part(new THREE.TorusGeometry(0.05 - i * 0.008, 0.012, 6, 12), steel, g); ring.rotation.y = Math.PI / 2; ring.position.x = 0.16 + i * 0.07; }
      const grip = part(new THREE.BoxGeometry(0.06, 0.16, 0.05), dark, g); grip.position.set(-0.05, -0.11, 0); grip.rotation.z = 0.3;
    }
    if (a.beside === 'flowers') {
      const stem = s.material('#3f9a52'), petals = ['#f04fa0', '#ffd23a', '#7a5cff'];
      for (let i = 0; i < Math.round(mix(5, 14, mood.density)); i++) {
        const t = random() * Math.PI * 2, r = 0.25 + random() * 0.65, h = 0.15 + random() * 0.35, x = Math.sin(t) * r, z = Math.cos(t) * r + 0.2;
        s.rod([x, 0, z], [x + (random() - 0.5) * 0.08, h, z], 0.012, stem);
        s.ball([0.06, 0.035, 0.06], [x, h, z], s.material(petals[i % 3], { emissive: petals[i % 3], emissiveIntensity: 0.25 }), 8);
      }
    }
    if (a.beside === 'prints') {
      const mud = new THREE.MeshStandardMaterial({ color: '#4a4040', roughness: 1 });
      for (let i = 0; i < 7; i++) {
        const side = i % 2 ? 1 : -1, x = 0.5 + i * 0.3, z = 0.5 + i * 0.26 + side * 0.09;
        const print = s.mesh(new THREE.CircleGeometry(0.06, 10), mud, [x, 0.008, z]); print.rotation.set(-Math.PI / 2, 0, 0.8); print.scale.set(0.75, 1.7, 1); print.castShadow = false;
        for (let k = 0; k < 4; k++) { const toe = s.mesh(new THREE.CircleGeometry(0.018, 6), mud, [x + 0.07 + (k - 1.5) * 0.02, 0.008, z + 0.1 - (k - 1.5) * 0.022]); toe.rotation.x = -Math.PI / 2; toe.castShadow = false; }
      }
    }
    // Dust and moss creep over a long-abandoned suit.
    if (mood.wear > 0.55) {
      const moss = s.material('#5e7d3c', { roughness: 1 });
      for (let i = 0; i < Math.round((mood.wear - 0.5) * 30); i++) {
        const p = v((random() - 0.5) * 0.5, random() * 0.6, (random() - 0.5) * 0.4); const m = part(new THREE.SphereGeometry(0.035 + random() * 0.035, 6, 4), moss); m.position.copy(p).setLength(Math.max(0.2, p.length())); m.position.y = p.y; m.scale.y = 0.5;
      }
    }

    const speed = mix(0.4, 2.2, mood.energy);
    return s.finish({
      update: (_dt, time) => {
        if (whip) { whip.rotation.z = Math.sin(time * speed * 2.2) * 0.12; whip.rotation.x = Math.cos(time * speed * 1.7) * 0.08; }
        if (bob) {
          if (a.inside === 'fish') { bob.position.x = Math.sin(time * speed) * 0.1; bob.rotation.y = Math.cos(time * speed) > 0 ? 0 : Math.PI; }
          else if (a.inside === 'gas') bob.rotation.y = time * speed * 0.6;
          else if (a.inside === 'creature') bob.rotation.y = Math.sin(time * speed) * 0.5;
          else bob.position.y = Math.sin(time * speed * 1.4) * 0.04;
        }
        if (glowMat) glowMat.emissiveIntensity = (a.inside === 'light' ? 2 : 0.6) + Math.sin(time * speed * 2) * 0.35;
      },
    });
  },
});
