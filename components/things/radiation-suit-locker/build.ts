import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

const SUITS = {
  yellow: 'Bright yellow rubberised coverall with black cuffs.',
  white: 'White disposable paper coverall, thin and anonymous.',
  orange: 'Heavy orange coverall, high visibility.',
  silver: 'Aluminised silver proximity suit, like a foil astronaut.',
  olive: 'Olive military chemical and radiation suit.',
  lead: 'Thick grey lead-rubber, heavy as a diving suit.',
} as const;
const SUIT_HEX: Record<keyof typeof SUITS, string> = { yellow: '#e6bf1c', white: '#edebe1', orange: '#e0661c', silver: '#c5cacc', olive: '#6b7046', lead: '#6c7275' };
const LOCKER_HEX = { grey: '#8d9698', eau: '#a9c3ad', cream: '#e3dabd', navy: '#2f4664', yellow: '#d9ae24' } as const;

function painted(w: number, h: number, draw: (c: CanvasRenderingContext2D, w: number, h: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  draw(canvas.getContext('2d')!, w, h);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export default defineThing({
  questions: {
    state: choice('What state is the kit in?', {
      ready: 'Ready: suit hanging straight, boots paired, respirator and meter squared on the shelf.',
      gone: 'Gone: the suit, mask and boots are out in use. Only someone\'s ordinary jacket, folded clothes and shoes are left in the locker.',
      stripped: 'Hastily stripped: the suit dumped in a heap on the floor, boots kicked over, mask dropped where it fell.',
      sealed: 'Sealed off: the suit bagged in plastic and tagged, hazard tape crossed over the open locker.',
    }),
    suit: choice('What is the protective suit like?', SUITS),
    mask: choice('What kind of respirator goes with it?', {
      twin: 'A black rubber full-face mask with two round side filters.',
      canister: 'A full-face mask with one big drum canister on the front, gas-mask style.',
      hood: 'An air-fed hood with a wide visor and a corrugated hose.',
    }),
    reading: choice('What does the hand-held radiation meter show?', {
      quiet: 'Background only: needle resting low, a small green lamp.',
      ticking: 'Ticking: the needle halfway up, an amber lamp.',
      pegged: 'Pegged: the needle hard against the stop, the lamp glaring red.',
      off: 'Switched off, needle at rest, no lamp.',
    }),
    bank: choice('How many lockers stand together?', {
      one: 'One locker alone.',
      pair: 'Two: this open one and a closed neighbour.',
      row: 'A row of three, the others shut.',
    }),
    finish: choice('What colour are the lockers?', {
      grey: 'Institutional grey.', eau: 'Pale hospital green.', cream: 'Cream enamel.', navy: 'Navy blue.', yellow: 'Safety yellow.',
    }),
    door: choice('What is on the inside of the open door?', {
      trefoil: 'A yellow radiation trefoil warning sign.',
      checklist: 'A dressing checklist on a clipboard.',
      photo: 'A snapshot taped up: somebody\'s family.',
      none: 'Nothing but the dosimeter rack.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const steel = s.material(LOCKER_HEX[a.finish], { roughness: 0.5, metalness: 0.2 });
    const inside = s.material(new THREE.Color(LOCKER_HEX[a.finish]).multiplyScalar(0.62), { roughness: 0.7 });
    const dark = s.material('#1d2022', { roughness: 0.55 });
    const chrome = s.material('#d2d6d7', { metalness: 0.85, roughness: 0.25 });
    const rubber = s.material('#202325', { roughness: 0.4 });
    const suitHex = SUIT_HEX[a.suit];
    const cloth = s.material(suitHex, { roughness: a.suit === 'silver' ? 0.3 : a.suit === 'white' ? 0.95 : 0.55, metalness: a.suit === 'silver' ? 0.7 : 0 });
    const W = 0.64, H = 1.92, D = 0.52, wall = 0.02, shelfY = 1.62;

    // The carcass.
    s.box([W, H - 0.08, wall], [0, 0.08 + (H - 0.08) / 2, -D / 2 + wall / 2], inside);
    for (const side of [-1, 1]) s.box([wall, H - 0.08, D], [side * (W / 2 - wall / 2), 0.08 + (H - 0.08) / 2, 0], steel);
    s.box([W, wall, D], [0, H - wall / 2, 0], steel);
    s.box([W, wall, D], [0, 0.09, 0], steel);
    s.box([W - 0.04, 0.08, D - 0.06], [0, 0.04, 0], dark);
    s.box([W - 0.04, 0.016, D - 0.04], [0, shelfY, 0], steel);
    s.rod([-W / 2 + 0.02, shelfY - 0.07, 0], [W / 2 - 0.02, shelfY - 0.07, 0], 0.01, chrome);
    const floorY = 0.1;

    // The open door.
    const swing = a.state === 'stripped' ? 2.1 + random() * 0.4 : a.state === 'sealed' ? 1.75 : 1.85 + random() * 0.25;
    const door = new THREE.Group();
    door.position.set(-W / 2, 0, D / 2);
    door.rotation.y = -swing;
    s.root.add(door);
    const hang = <T extends THREE.Object3D>(child: T) => { door.add(child); return child; };
    hang(s.box([W, H - 0.1, 0.018], [W / 2, 0.1 + (H - 0.1) / 2, 0], steel));
    for (let i = 0; i < 4; i++) hang(s.box([W * 0.5, 0.012, 0.022], [W / 2, H - 0.16 - i * 0.03, 0], dark));
    hang(s.box([0.03, 0.12, 0.05], [W - 0.07, 1.0, 0.02], chrome));
    const face = (mesh: THREE.Mesh) => { mesh.rotation.y = Math.PI; mesh.castShadow = false; return hang(mesh); };
    if (a.door === 'trefoil') {
      const sign = painted(256, 256, (c) => {
        c.fillStyle = '#f2c81e'; c.fillRect(0, 0, 256, 256);
        c.strokeStyle = '#17191a'; c.lineWidth = 8; c.strokeRect(6, 6, 244, 244);
        c.fillStyle = '#17191a';
        for (let i = 0; i < 3; i++) { const q = -Math.PI / 2 + i * 2.094; c.beginPath(); c.arc(128, 128, 96, q - 0.52, q + 0.52); c.arc(128, 128, 30, q + 0.52, q - 0.52, true); c.fill(); }
        c.beginPath(); c.arc(128, 128, 18, 0, 7); c.fill();
      });
      face(s.mesh(new THREE.PlaneGeometry(0.34, 0.34), new THREE.MeshStandardMaterial({ map: sign, roughness: 0.6 }), [W / 2, 1.38, -0.011]));
    } else if (a.door === 'checklist') {
      const list = painted(256, 360, (c) => {
        c.fillStyle = '#f3efe0'; c.fillRect(0, 0, 256, 360);
        for (let i = 0; i < 9; i++) { c.strokeStyle = '#30363a'; c.lineWidth = 4; c.strokeRect(22, 50 + i * 32, 18, 18); c.fillStyle = '#30363a'; c.fillRect(56, 56 + i * 32, 110 + random() * 70, 6); if (i < 6 || a.state === 'ready') { c.strokeStyle = '#c0261c'; c.beginPath(); c.moveTo(22, 58 + i * 32); c.lineTo(30, 68 + i * 32); c.lineTo(46, 44 + i * 32); c.stroke(); } }
        c.fillStyle = '#30363a'; c.fillRect(22, 16, 150, 14);
      });
      hang(s.box([0.3, 0.42, 0.01], [W / 2, 1.34, -0.012], s.material('#7a5a3a', { roughness: 0.8 })));
      face(s.mesh(new THREE.PlaneGeometry(0.26, 0.365), new THREE.MeshStandardMaterial({ map: list, roughness: 0.9 }), [W / 2, 1.33, -0.019]));
      hang(s.box([0.1, 0.03, 0.02], [W / 2, 1.53, -0.02], chrome));
    } else if (a.door === 'photo') {
      const photo = painted(200, 160, (c) => {
        c.fillStyle = '#f6f2e6'; c.fillRect(0, 0, 200, 160);
        c.fillStyle = '#9cc3d8'; c.fillRect(12, 12, 176, 80); c.fillStyle = '#7fa468'; c.fillRect(12, 92, 176, 40);
        const people: [number, number, string][] = [[70, 46, '#b0543a'], [110, 42, '#2f4a7a'], [92, 26, '#d9a514']];
        for (const [x, tall, hex] of people) { c.fillStyle = hex; c.fillRect(x - 11, 132 - tall, 22, tall); c.fillStyle = '#e8c4a0'; c.beginPath(); c.arc(x, 132 - tall - 10, 10, 0, 7); c.fill(); }
      });
      const snap = face(s.mesh(new THREE.PlaneGeometry(0.25, 0.2), new THREE.MeshStandardMaterial({ map: photo, roughness: 0.6 }), [W / 2 + 0.02, 1.4, -0.011]));
      snap.rotation.z = (random() - 0.5) * 0.3;
    }
    // Dosimeter rack on the door.
    hang(s.box([0.34, 0.03, 0.02], [W / 2, 1.02, -0.016], dark));
    const badges = a.state === 'gone' ? 2 : 3;
    for (let i = 0; i < badges; i++) {
      hang(s.box([0.055, 0.085, 0.012], [W / 2 - 0.11 + i * 0.11, 0.97, -0.022], s.material(i === 1 && a.reading === 'pegged' ? '#2a2420' : '#2f6fb0', { roughness: 0.5 })));
      hang(s.box([0.04, 0.03, 0.004], [W / 2 - 0.11 + i * 0.11, 0.985, -0.03], s.material('#f1ecdc')));
    }

    // Parts of the kit.
    const suit = () => {
      const g = new THREE.Group();
      g.add(s.box([0.4, 0.016, 0.02], [0, -0.05, 0], chrome), s.ring(0.03, 0.006, [0, -0.02, 0], chrome, Math.PI));
      const hood = s.ball([0.125, 0.12, 0.1], [0, -0.15, 0.04], cloth, 16); hood.rotation.x = 0.35;
      const torso = s.cylinder(0.19, 0.175, 0.52, [0, -0.47, 0], cloth, 18); torso.scale.z = 0.45;
      const shoulders = s.ball([0.215, 0.075, 0.095], [0, -0.21, 0], cloth, 16);
      g.add(hood, torso, shoulders);
      for (const side of [-1, 1]) {
        const arm = s.cylinder(0.058, 0.066, 0.56, [side * 0.225, -0.5, 0.01], cloth, 12); arm.rotation.z = side * 0.07;
        const cuff = s.cylinder(0.07, 0.07, 0.05, [side * 0.243, -0.76, 0.01], rubber, 12);
        const glove = s.ball([0.062, 0.1, 0.045], [side * 0.247, -0.86, 0.015], rubber, 10);
        const leg = s.cylinder(0.09, 0.08, 0.56, [side * 0.092, -0.98 + (side > 0 ? random() * 0.03 : 0), 0], cloth, 12); leg.scale.z = 0.6;
        g.add(arm, cuff, glove, leg);
      }
      g.add(s.box([0.014, 0.5, 0.006], [0, -0.47, 0.086], dark));
      g.add(s.box([0.06, 0.08, 0.008], [0.1, -0.33, 0.085], s.material('#2f6fb0')), s.box([0.045, 0.03, 0.004], [0.1, -0.315, 0.09], s.material('#f1ecdc')));
      if (a.suit === 'yellow' || a.suit === 'orange') for (const y of [-0.6]) { const band = s.cylinder(0.193, 0.193, 0.045, [0, y, 0], s.material('#d9dcdc', { metalness: 0.6, roughness: 0.3 }), 18); band.scale.z = 0.46; g.add(band); }
      if (a.mask === 'hood') { const visor = s.box([0.17, 0.09, 0.02], [0, -0.14, 0.13], s.material('#31485c', { roughness: 0.1, metalness: 0.5 })); visor.rotation.x = 0.35; g.add(visor); }
      return g;
    };
    const respirator = () => {
      const g = new THREE.Group();
      if (a.mask === 'hood') {
        // The hood belongs to the suit: on the shelf sit the air hose and regulator.
        g.add(s.cylinder(0.06, 0.06, 0.09, [0, 0.045, 0], s.material('#3d6a8a', { metalness: 0.5, roughness: 0.4 }), 16));
        const hose = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.022, 8, 24), rubber); hose.rotation.x = Math.PI / 2; hose.position.y = 0.022; hose.castShadow = true;
        g.add(hose);
        return g;
      }
      g.add(s.ball([0.085, 0.1, 0.08], [0, 0.1, 0], rubber, 16));
      const lens = s.material('#9fc0c9', { roughness: 0.08, metalness: 0.5 });
      for (const side of [-1, 1]) { const eye = s.cylinder(0.03, 0.03, 0.012, [side * 0.037, 0.125, 0.068], lens, 14); eye.rotation.x = Math.PI / 2 - 0.2; g.add(eye); }
      const filter = s.material('#5c6a45', { roughness: 0.5, metalness: 0.3 });
      if (a.mask === 'twin') for (const side of [-1, 1]) { const can = s.cylinder(0.045, 0.045, 0.035, [side * 0.085, 0.055, 0.045], filter, 16); can.rotation.set(Math.PI / 2, 0, -side * 0.7); g.add(can); }
      else { const can = s.cylinder(0.055, 0.055, 0.08, [0, 0.045, 0.1], filter, 18); can.rotation.x = Math.PI / 2 - 0.3; g.add(can); }
      g.add(s.ring(0.085, 0.008, [0, 0.12, -0.02], dark, Math.PI));
      return g;
    };
    const boot = () => {
      const g = new THREE.Group();
      const hue = a.suit === 'white' ? s.material('#edebe1', { roughness: 0.5 }) : a.suit === 'yellow' ? s.material('#d6b21c', { roughness: 0.45 }) : rubber;
      g.add(s.box([0.1, 0.07, 0.27], [0, 0.035, 0.03], hue), s.cylinder(0.06, 0.052, 0.3, [0, 0.2, -0.04], hue, 14), s.box([0.105, 0.02, 0.28], [0, 0.01, 0.03], dark));
      return g;
    };
    const meter = () => {
      const g = new THREE.Group();
      const paint = s.material('#e2b81c', { roughness: 0.45 });
      g.add(s.box([0.24, 0.12, 0.13], [0, 0.06, 0], paint));
      g.add(s.tube([[-0.09, 0.12, 0], [-0.08, 0.17, 0], [0.08, 0.17, 0], [0.09, 0.12, 0]], 0.01, chrome));
      const value = { quiet: 0.1, ticking: 0.5, pegged: 1, off: 0 }[a.reading];
      const dial = painted(128, 96, (c) => {
        c.fillStyle = '#f3efe0'; c.fillRect(0, 0, 128, 96);
        c.lineWidth = 8; c.strokeStyle = '#3d9a52'; c.beginPath(); c.arc(64, 96, 70, Math.PI * 1.15, Math.PI * 1.5); c.stroke();
        c.strokeStyle = '#cf2a1e'; c.beginPath(); c.arc(64, 96, 70, Math.PI * 1.5, Math.PI * 1.85); c.stroke();
        const q = Math.PI * (1.15 + value * 0.7);
        c.strokeStyle = '#17191a'; c.lineWidth = 5; c.beginPath(); c.moveTo(64, 96); c.lineTo(64 + Math.cos(q) * 76, 96 + Math.sin(q) * 76); c.stroke();
      });
      const plate = s.mesh(new THREE.PlaneGeometry(0.11, 0.08), new THREE.MeshStandardMaterial({ map: dial, roughness: 0.4 }), [-0.045, 0.065, 0.066]); plate.castShadow = false;
      const lampHex = { quiet: '#35e070', ticking: '#ffab1f', pegged: '#ff2a12', off: '#4a4f4b' }[a.reading];
      const lamp = s.ball([0.02, 0.02, 0.014], [0.065, 0.085, 0.066], new THREE.MeshStandardMaterial({ color: lampHex, emissive: lampHex, emissiveIntensity: a.reading === 'off' ? 0 : a.reading === 'pegged' ? 1.8 : 1, roughness: 0.4 }), 10);
      lamp.name = 'lamp';
      const knob = s.cylinder(0.018, 0.02, 0.016, [0.065, 0.04, 0.07], dark, 12); knob.rotation.x = Math.PI / 2;
      // Probe wand on a cord.
      const wand = s.cylinder(0.016, 0.016, 0.19, [0, 0.14, 0.05], chrome, 12); wand.rotation.z = Math.PI / 2;
      g.add(plate, lamp, knob, wand, s.tube([[0.095, 0.14, 0.05], [0.15, 0.1, 0.07], [0.14, 0.03, 0.03], [0.11, 0.05, -0.02]], 0.005, dark));
      return g;
    };
    const place = (g: THREE.Object3D, x: number, y: number, z: number) => { g.position.set(x, y, z); s.root.add(g); return g; };

    let meterNode: THREE.Object3D;
    if (a.state === 'ready' || a.state === 'sealed') {
      const hung = place(suit(), 0, shelfY - 0.07, 0.02);
      hung.rotation.y = (random() - 0.5) * 0.15;
      for (const side of [-1, 1]) place(boot(), side * 0.085 + 0.14, floorY, 0.05).rotation.y = side * 0.06;
      if (a.mask === 'hood') place(respirator(), -0.15, shelfY + 0.008, 0.02);
      else place(respirator(), -0.15, shelfY + 0.008, 0.06).rotation.y = 0.2;
      meterNode = place(meter(), 0.14, shelfY + 0.008, 0.12);
      if (a.state === 'sealed') {
        const film = new THREE.MeshStandardMaterial({ color: '#e9f3f2', transparent: true, opacity: 0.32, roughness: 0.1, depthWrite: false, side: THREE.DoubleSide });
        const bag = s.ball([0.3, 0.66, 0.16], [0, 0.92, 0.03], film, 18); bag.castShadow = false;
        s.box([0.1, 0.16, 0.004], [0.08, 1.18, 0.2], s.material('#c8261c', { roughness: 0.8 })).rotation.z = 0.15;
        const stripes = painted(256, 32, (c) => {
          c.fillStyle = '#f2c81e'; c.fillRect(0, 0, 256, 32); c.fillStyle = '#17191a';
          for (let i = -1; i < 10; i++) { c.beginPath(); c.moveTo(i * 32, 0); c.lineTo(i * 32 + 16, 0); c.lineTo(i * 32 + 48, 32); c.lineTo(i * 32 + 32, 32); c.fill(); }
        });
        stripes.wrapS = THREE.RepeatWrapping; stripes.repeat.x = 3;
        const tape = new THREE.MeshStandardMaterial({ map: stripes, roughness: 0.6, side: THREE.DoubleSide });
        const length = Math.hypot(W, 1.3);
        for (const side of [-1, 1]) { const strip = s.box([length, 0.075, 0.004], [0, 0.98, D / 2 + 0.008], tape); strip.rotation.z = side * Math.atan2(1.3, W); }
      }
    } else if (a.state === 'gone') {
      // Civilian things left behind.
      const jacket = new THREE.Group();
      const tweed = s.material(mood.cheer > 0.5 ? '#3c5a84' : '#4a4038', { roughness: 0.9 });
      const body = s.cylinder(0.19, 0.17, 0.5, [0, -0.38, 0], tweed, 16); body.scale.z = 0.4;
      jacket.add(s.box([0.4, 0.016, 0.02], [0, -0.05, 0], chrome), s.ring(0.03, 0.006, [0, -0.02, 0], chrome, Math.PI), body, s.ball([0.21, 0.07, 0.085], [0, -0.14, 0], tweed, 14));
      for (const side of [-1, 1]) { const sleeve = s.cylinder(0.05, 0.055, 0.5, [side * 0.22, -0.4, 0], tweed, 10); sleeve.rotation.z = side * 0.06; jacket.add(sleeve); }
      place(jacket, -0.06, shelfY - 0.07, 0.02).rotation.y = 0.2;
      const bare = new THREE.Group();
      bare.add(s.box([0.4, 0.016, 0.02], [0, -0.05, 0], chrome), s.ring(0.03, 0.006, [0, -0.02, 0], chrome, Math.PI));
      place(bare, 0.14, shelfY - 0.07, -0.08).rotation.set(0, 1.2, 0.12);
      const folds = ['#b9b3a2', '#7f8fa3', '#d9d2bd'];
      folds.forEach((hex, i) => s.box([0.32 - i * 0.02, 0.045, 0.26], [(random() - 0.5) * 0.03, shelfY + 0.03 + i * 0.046, 0.02], s.material(hex, { roughness: 0.95 })));
      for (const side of [-1, 1]) { const shoe = s.ball([0.05, 0.04, 0.13], [side * 0.07, floorY + 0.04, 0.08], s.material('#5a3a22', { roughness: 0.4 }), 12); shoe.rotation.y = side * 0.1; }
      s.box([0.26, 0.03, 0.2], [0.1, floorY + 0.015, -0.1], s.material('#30363a'));
      meterNode = new THREE.Group();
    } else {
      // Stripped in a hurry: everything on the floor in front.
      const fz = D / 2 + 0.42, fx = 0.12 + (random() - 0.5) * 0.2;
      for (let i = 0; i < 7; i++) {
        const lump = s.ball([0.16 + random() * 0.14, 0.05 + random() * 0.07, 0.14 + random() * 0.12], [fx + (random() - 0.5) * 0.4, 0.05 + random() * 0.05, fz + (random() - 0.5) * 0.3], cloth, 12);
        lump.rotation.y = random() * 3;
      }
      const sleeve = s.tube([[fx - 0.1, 0.08, fz], [fx - 0.34, 0.06, fz + 0.14], [fx - 0.5, 0.04, fz + 0.02]], 0.055, cloth);
      sleeve.scale.y = 0.6;
      s.ball([0.062, 0.035, 0.1], [fx - 0.56, 0.035, fz], rubber, 10);
      const legTube = s.tube([[fx + 0.1, 0.08, fz - 0.05], [fx + 0.3, 0.06, fz - 0.26], [fx + 0.28, 0.2, fz - 0.4], [fx + 0.2, 0.34, fz - 0.42]], 0.07, cloth);
      legTube.scale.y = 0.8;
      s.box([0.014, 0.004, 0.3], [fx, 0.15, fz], dark).rotation.y = 0.5;
      const b1 = place(boot(), fx - 0.42, 0.06, fz + 0.3); b1.rotation.set(0, random() * 6, Math.PI / 2);
      const b2 = place(boot(), fx + 0.4, 0, fz + 0.2); b2.rotation.y = random() * 6;
      if (a.mask !== 'hood') { const m = place(respirator(), fx + 0.1, 0.0, fz + 0.36); m.rotation.set(-1.2, random() * 6, 0); m.position.y = 0.07; }
      else place(respirator(), -0.15, shelfY + 0.008, 0.02);
      const bare = new THREE.Group();
      bare.add(s.box([0.4, 0.016, 0.02], [0, -0.05, 0], chrome), s.ring(0.03, 0.006, [0, -0.02, 0], chrome, Math.PI));
      place(bare, 0.05, shelfY - 0.07, 0).rotation.set(0, 0.5, 0.2);
      meterNode = place(meter(), 0.12, shelfY + 0.008, 0.12);
      meterNode.rotation.y = -0.3;
    }
    const lamp = meterNode.getObjectByName('lamp') as THREE.Mesh | undefined;

    // Neighbouring closed lockers.
    const extra = { one: 0, pair: 1, row: 2 }[a.bank];
    for (let i = 1; i <= extra; i++) {
      const x = i * (W + 0.006);
      s.box([W, H - 0.08, D], [x, 0.08 + (H - 0.08) / 2, 0], steel);
      s.box([W - 0.04, 0.08, D - 0.06], [x, 0.04, 0], dark);
      const ajar = mood.wear > 0.5 && random() < 0.35;
      const leaf = s.box([W - 0.03, H - 0.12, 0.016], [x, 0.1 + (H - 0.1) / 2, D / 2 + 0.006], s.material(LOCKER_HEX[a.finish], { roughness: 0.6 }));
      if (ajar) { leaf.rotation.y = -0.3; leaf.position.z += 0.08; leaf.position.x -= 0.02; }
      else {
        for (let k = 0; k < 4; k++) s.box([W * 0.5, 0.012, 0.01], [x, H - 0.16 - k * 0.03, D / 2 + 0.016], dark);
        s.box([0.03, 0.12, 0.03], [x + W / 2 - 0.07, 1.0, D / 2 + 0.028], chrome);
        s.label(String(Math.floor(random() * 80) + 11), 0.1, 0.06, [x, 1.5, D / 2 + 0.016], '#1d2022', '#e9e4d2').castShadow = false;
      }
    }
    // On top: a hard hat or a box, when the room is busy.
    if (mood.density > 0.35) {
      const hx = extra ? W : 0;
      s.ball([0.13, 0.1, 0.15], [hx - 0.1, H + 0.02, 0], s.material(a.suit === 'white' ? '#e9e6da' : '#e9e6da', { roughness: 0.35 }), 16);
      s.cylinder(0.16, 0.16, 0.012, [hx - 0.1, H + 0.02, 0.02], s.material('#e9e6da', { roughness: 0.35 }), 20);
      if (mood.density > 0.7) s.box([0.3, 0.18, 0.3], [hx + 0.2, H + 0.09, -0.05], s.material('#b08a5a', { roughness: 0.9 })).rotation.y = random() * 0.5;
    }

    const rate = mix(3, 14, mood.energy);
    return s.finish({
      update: (_dt, time) => {
        if (lamp && a.reading !== 'off') (lamp.material as THREE.MeshStandardMaterial).emissiveIntensity = a.reading === 'pegged' ? (Math.sin(time * rate) > 0 ? 2 : 0.5) : a.reading === 'ticking' ? (Math.sin(time * rate * 0.5) > 0.6 ? 1.6 : 0.6) : 1;
      },
    });
  },
});
