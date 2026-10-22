import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

const LIVERY = {
  blueyellow: ['#2450a8', '#f6cf2a', '#17233f'],
  redwhite: ['#c3272b', '#fbf8ee', '#c3272b'],
  greencream: ['#2f6f4c', '#f1e6c4', '#1f3d2b'],
  steel: ['#aeb4b6', '#1d1f22', '#f1f1ec'],
  purpleteal: ['#5a3a94', '#3fd0c0', '#1d1630'],
} as const;
const SIGNS = { quick: ['QUICK', 'DROP'], returns: ['VIDEO', 'RETURNS'], hours: ['AFTER HOURS', 'RETURN'], rewind: ['BE KIND', 'REWIND'], allnight: ['24 HR', 'DROP BOX'] } as const;
const NOTICES = {
  none: [], waived: ['LATE FEES', 'WAIVED', 'just bring', 'them back'], keep: ['WE HAVE', 'CLOSED', 'keep the', 'tape'], inside: ['RETURNS', 'INSIDE', 'slot is', 'jammed'], thanks: ['THANK YOU', 'x x x', '1986 -', '2006'],
} as const;

function paint(w: number, h: number, draw: (c: CanvasRenderingContext2D) => void, repeat?: [number, number]) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  if (repeat) { texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(...repeat); }
  return texture;
}

export default defineThing({
  questions: {
    form: choice('What kind of return box is it?', {
      pedestal: 'A freestanding steel pedestal box with a sloped sign face, bolted by the shop door.',
      wall: 'A slab of brick shopfront wall with a stainless slot plate let into it.',
      kiosk: 'A barrel-topped kerbside box on legs with a pull-down hopper, like a mailbox for tapes.',
      door: 'A glazed aluminium shop door with a letter-flap return slot in its lower panel.',
    }),
    sign: choice('What does the sign above the slot say?', {
      quick: 'QUICK DROP.', returns: 'VIDEO RETURNS.', hours: 'AFTER HOURS RETURN.', rewind: 'BE KIND, REWIND.', allnight: '24 HR DROP BOX.',
    }),
    slot: choice('What is happening at the slot?', {
      posted: 'One tape is half posted through, flap resting on it.',
      shut: 'The flap is shut and nothing is there.',
      jammed: 'It is stuffed full; tapes jut out and more are piled on the ground beneath.',
      note: 'A folded note or envelope is wedged under the flap instead of a tape.',
      sealed: 'The slot has been taped over with a cross of parcel tape: no more returns.',
    }),
    notice: choice('Is a handwritten notice taped up beside it?', {
      none: 'No notice.',
      waived: 'LATE FEES WAIVED, just bring them back.',
      keep: 'WE HAVE CLOSED, keep the tape.',
      inside: 'RETURNS INSIDE, slot is jammed.',
      thanks: 'THANK YOU, with the years the shop was open.',
    }),
    livery: choice('What colours is it in?', {
      blueyellow: 'Chain-store blue with a yellow sign.',
      redwhite: 'Red with a white sign.',
      greencream: 'Dark green and cream, an older independent.',
      steel: 'Bare brushed steel with a black sign.',
      purpleteal: 'Purple and teal, very 1990s.',
    }),
    lamp: noul('Is there a small hooded lamp lit over the slot?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const [bodyHex, signHex, inkHex] = LIVERY[a.livery];
    const body = s.material(bodyHex, { metalness: a.livery === 'steel' ? 0.75 : 0.3, roughness: a.livery === 'steel' ? 0.4 : 0.5 });
    const chrome = s.material('#d5dadc', { metalness: 0.85, roughness: 0.3 });
    const dark = s.material('#111214');
    const black = s.material('#1c1d20', { roughness: 0.5 });

    const signTexture = paint(512, 256, (c) => {
      c.fillStyle = signHex; c.fillRect(0, 0, 512, 256);
      c.strokeStyle = inkHex; c.lineWidth = 10; c.strokeRect(12, 12, 488, 232);
      c.fillStyle = inkHex; c.textAlign = 'center'; c.textBaseline = 'middle';
      const [l1, l2] = SIGNS[a.sign];
      c.font = 'bold 92px Impact, "Arial Black", "DejaVu Sans Condensed", sans-serif';
      c.fillText(l1, 256, 80, 400); c.fillText(l2, 256, 168, 400);
      for (const x of [56, 456]) { c.beginPath(); c.moveTo(x - 26, 196); c.lineTo(x + 26, 196); c.lineTo(x, 232); c.fill(); }
      for (let i = 0; i < mood.wear * 26; i++) {
        const x = random() * 512, y = random() * 120;
        c.strokeStyle = `rgba(110,62,28,${0.1 + random() * 0.25})`; c.lineWidth = 2 + random() * 6;
        c.beginPath(); c.moveTo(x, y); c.lineTo(x + random() * 8 - 4, y + 40 + random() * 150); c.stroke();
      }
    });
    const signMat = new THREE.MeshStandardMaterial({ map: signTexture, roughness: 0.55, emissive: '#ffffff', emissiveMap: signTexture, emissiveIntensity: a.lamp ? 0.25 : 0.04 });
    const sleeveColours = ['#e8382f', '#f6c829', '#2f7fe0', '#3cb563', '#f4f1ea', '#ff8a2a', '#b45ad6'];
    const tape = (sleeved: boolean) => {
      const group = new THREE.Group();
      if (sleeved) {
        const colour = sleeveColours[Math.floor(random() * sleeveColours.length)];
        group.add(s.box([0.118, 0.03, 0.2], [0, 0, 0], s.material(colour)));
        group.add(s.box([0.09, 0.002, 0.05], [0, 0.016, 0.06], s.material('#f6f3e8')));
        group.add(s.box([0.118, 0.031, 0.02], [0, 0, -0.07], s.material('#1b1b1e')));
      } else {
        group.add(s.box([0.103, 0.025, 0.187], [0, 0, 0], black));
        group.add(s.box([0.07, 0.002, 0.11], [0, 0.013, 0], s.material('#f1eee3')));
        group.add(s.box([0.016, 0.026, 0.14], [0.05, 0, 0], s.material('#efece0')));
      }
      s.root.add(group);
      return group;
    };

    // Where each form puts its slot, sign, notice and lamp.
    let slotAt: [number, number, number] = [0, 0.82, 0.2], slotWidth = 0.3;
    let noticeAt: [number, number, number] = [0, 0.45, 0.206], noticeSize = 0.2;
    let lampAt: [number, number, number] = [0, 1.26, 0.1];
    let piledAt = 0.45;

    if (a.form === 'pedestal') {
      const profile = new THREE.Shape();
      ([[-0.2, 0.05], [0.2, 0.05], [0.2, 1.0], [0.08, 1.22], [-0.2, 1.22]] as const).forEach(([x, y], i) => (i ? profile.lineTo(x, y) : profile.moveTo(x, y)));
      const shell = s.mesh(new THREE.ExtrudeGeometry(profile, { depth: 0.5, bevelEnabled: false }), body);
      shell.rotation.y = -Math.PI / 2; shell.position.x = 0.25;
      s.box([0.54, 0.05, 0.44], [0, 0.025, 0], black);
      s.box([0.52, 0.02, 0.3], [0, 1.23, -0.05], black);
      const face = s.mesh(new THREE.PlaneGeometry(0.44, 0.22), signMat, [0, 1.11, 0.143]);
      face.rotation.x = -Math.atan2(0.12, 0.22);
      s.box([0.4, 0.5, 0.008], [0, 0.4, 0.2], s.material(new THREE.Color(bodyHex).multiplyScalar(0.85)));
      s.cylinder(0.014, 0.014, 0.012, [0.15, 0.42, 0.208], chrome, 12).rotation.x = Math.PI / 2;
      for (const x of [-1, 1]) for (const z of [-1, 1]) s.cylinder(0.012, 0.012, 0.012, [x * 0.24, 0.056, z * 0.19], chrome, 8);
      noticeAt = [-0.03, 0.42, 0.206];
      lampAt = [0, 1.3, 0.02];
    } else if (a.form === 'wall') {
      const brick = paint(256, 256, (c) => {
        c.fillStyle = '#b9b2a4'; c.fillRect(0, 0, 256, 256);
        for (let row = 0; row < 8; row++) for (let col = -1; col < 4; col++) {
          const tone = new THREE.Color('#a4553d').offsetHSL((random() - 0.5) * 0.03, (random() - 0.5) * 0.1, (random() - 0.5) * 0.1 - mood.wear * 0.06);
          c.fillStyle = tone.getStyle(); c.fillRect(col * 64 + (row % 2 ? 32 : 0) + 2, row * 32 + 2, 60, 28);
        }
      }, [2.2, 3.3]);
      s.box([1.4, 2.1, 0.22], [0, 1.05, -0.11], new THREE.MeshStandardMaterial({ map: brick, roughness: 0.95 }));
      s.box([1.44, 0.07, 0.26], [0, 2.135, -0.11], s.material('#8d8a82'));
      s.box([1.5, 0.04, 0.5], [0, 0.0, 0.05], s.material('#9c9a93'));
      s.box([0.56, 0.5, 0.02], [0, 1.08, 0.005], chrome);
      s.mesh(new THREE.PlaneGeometry(0.5, 0.25), signMat, [0, 1.19, 0.017]);
      slotAt = [0, 0.98, 0.012];
      noticeAt = [0.46, 1.25, 0.004]; noticeSize = 0.26;
      lampAt = [0, 1.5, 0.12];
      piledAt = 0.22;
    } else if (a.form === 'kiosk') {
      s.box([0.6, 0.95, 0.5], [0, 0.675, 0], body);
      const barrel = s.cylinder(0.25, 0.25, 0.6, [0, 1.15, 0], body, 28);
      barrel.rotation.z = Math.PI / 2;
      for (const x of [-1, 1]) for (const z of [-1, 1]) s.box([0.05, 0.2, 0.05], [x * 0.26, 0.1, z * 0.21], black);
      for (const x of [-1, 1]) s.box([0.09, 0.012, 0.56], [x * 0.26, 0.006, 0], black);
      s.box([0.5, 0.22, 0.03], [0, 1.1, 0.252], s.material(new THREE.Color(bodyHex).multiplyScalar(0.8)));
      s.rod([-0.16, 1.2, 0.29], [0.16, 1.2, 0.29], 0.012, chrome);
      for (const x of [-0.16, 0.16]) s.rod([x, 1.2, 0.26], [x, 1.2, 0.29], 0.008, chrome);
      s.mesh(new THREE.PlaneGeometry(0.5, 0.25), signMat, [0, 0.74, 0.252]);
      slotAt = [0, 1.02, 0.262]; slotWidth = 0.34;
      noticeAt = [0.02, 0.43, 0.252]; noticeSize = 0.2;
      lampAt = [0, 1.43, 0.05];
      piledAt = 0.5;
    } else {
      const alu = s.material('#b3b8ba', { metalness: 0.7, roughness: 0.4 });
      for (const x of [-1, 1]) s.box([0.06, 2.1, 0.05], [x * 0.47, 1.05, 0], alu);
      s.box([1.0, 0.06, 0.05], [0, 2.07, 0], alu);
      s.box([1.0, 0.9, 0.045], [0, 0.45, 0], alu);
      s.box([0.9, 0.3, 0.004], [0, 0.2, 0.024], s.material('#8d9294', { metalness: 0.8, roughness: 0.5 }));
      s.box([1.1, 0.03, 0.12], [0, 0.0, 0], s.material('#6d6f70'));
      s.box([0.88, 1.14, 0.012], [0, 1.47, 0], new THREE.MeshPhysicalMaterial({ color: '#9fb6bd', transparent: true, opacity: 0.32, roughness: 0.08, depthWrite: false }));
      s.box([0.9, 0.03, 0.02], [0, 1.47, 0.0], alu);
      s.rod([-0.36, 1.02, 0.07], [0.36, 1.02, 0.07], 0.016, chrome);
      for (const x of [-0.36, 0.36]) s.rod([x, 1.02, 0.02], [x, 1.02, 0.07], 0.012, chrome);
      s.mesh(new THREE.PlaneGeometry(0.44, 0.22), signMat, [0, 0.76, 0.0235]);
      const closed = s.label(mood.cheer > 0.6 ? 'OPEN' : 'CLOSED', 0.3, 0.12, [0.08, 1.72, 0.012], '#ffffff', mood.cheer > 0.6 ? '#2f8a4c' : '#c3272b');
      closed.rotation.z = (random() - 0.5) * 0.2;
      s.rod([0.08, 1.78, 0.012], [0.08, 1.98, 0.012], 0.003, dark);
      slotAt = [0, 0.56, 0.0235];
      noticeAt = [-0.2, 1.38, 0.012]; noticeSize = 0.26;
      lampAt = [0, 2.14, 0.1];
      piledAt = 0.2;
    }

    // The slot: a dark mouth, a frame, and a top-hinged flap.
    const [sx, sy, sz] = slotAt;
    s.box([slotWidth + 0.04, 0.1, 0.012], [sx, sy, sz + 0.006], chrome);
    s.box([slotWidth, 0.06, 0.016], [sx, sy, sz + 0.007], dark);
    const flap = new THREE.Group();
    flap.position.set(sx, sy + 0.032, sz + 0.02);
    flap.add(s.box([slotWidth, 0.064, 0.007], [0, -0.032, 0], chrome));
    s.root.add(flap);
    const hinge = s.cylinder(0.006, 0.006, slotWidth + 0.02, [sx, sy + 0.034, sz + 0.02], chrome, 8);
    hinge.rotation.z = Math.PI / 2;
    const ground: THREE.Group[] = [];
    if (a.slot === 'posted') {
      flap.rotation.x = -0.75;
      const item = tape(random() < 0.6);
      item.position.set(sx + (random() - 0.5) * 0.06, sy - 0.02, sz + 0.095);
      item.rotation.set(0.22, (random() - 0.5) * 0.3, (random() - 0.5) * 0.1);
    } else if (a.slot === 'jammed') {
      flap.rotation.x = -1.25;
      for (let i = 0; i < 3; i++) {
        const item = tape(random() < 0.5);
        item.position.set(sx + (i - 1) * 0.085 + (random() - 0.5) * 0.02, sy - 0.006 + (random() - 0.5) * 0.012, sz + 0.05 + random() * 0.05);
        item.rotation.set(0.1 + random() * 0.5, (random() - 0.5) * 0.5, (random() - 0.5) * 0.9 + (i === 1 ? 0 : 1.2));
      }
      const count = 4 + Math.round(mood.density * 5 + random() * 2);
      for (let i = 0; i < count; i++) {
        const item = tape(random() < 0.5);
        item.position.set(sx + (random() - 0.5) * 0.55, 0.016 + (i % 3) * 0.028, sz + piledAt * 0.3 + 0.12 + random() * 0.3);
        item.rotation.set((random() - 0.5) * 0.25, random() * Math.PI * 2, (random() - 0.5) * 0.25);
        ground.push(item);
      }
    } else if (a.slot === 'note') {
      flap.rotation.x = -0.18;
      const envelope = s.box([0.16, 0.002, 0.11], [sx + 0.03, sy - 0.022, sz + 0.05], s.material('#fbf9f0'));
      envelope.rotation.set(0.9, 0, (random() - 0.5) * 0.3);
      s.box([0.03, 0.003, 0.025], [sx + 0.03, sy - 0.05, sz + 0.075], s.material('#c3272b')).rotation.x = 0.9;
    } else if (a.slot === 'sealed') {
      const parcel = s.material('#c9a45f', { roughness: 0.35 });
      for (const turn of [-0.42, 0.42]) s.box([slotWidth + 0.22, 0.05, 0.003], [sx, sy, sz + 0.03], parcel).rotation.z = turn;
      s.box([slotWidth + 0.14, 0.05, 0.003], [sx, sy + 0.005, sz + 0.032], parcel);
    }

    const lines = NOTICES[a.notice];
    if (lines.length) {
      const sheet = s.mesh(new THREE.PlaneGeometry(noticeSize, noticeSize * 1.3), new THREE.MeshStandardMaterial({
        roughness: 0.9,
        map: paint(256, 332, (c) => {
          c.fillStyle = mood.wear > 0.6 ? '#ece4c8' : '#fbfaf3'; c.fillRect(0, 0, 256, 332);
          c.textAlign = 'center'; c.textBaseline = 'middle';
          lines.forEach((line, index) => {
            c.fillStyle = index < 2 ? '#c3221c' : '#18233f';
            c.font = `bold ${index < 2 ? 50 : 36}px "Comic Sans MS", "Marker Felt", "DejaVu Sans", sans-serif`;
            c.save(); c.translate(128, 56 + index * 74); c.rotate((random() - 0.5) * 0.08); c.fillText(line, 0, 0, 230); c.restore();
          });
          c.fillStyle = 'rgba(205,190,150,0.9)';
          for (const [x, y] of [[20, 10], [236, 10], [20, 322], [236, 322]]) c.fillRect(x - 22, y - 9, 44, 18);
        }),
      }), [noticeAt[0], noticeAt[1], noticeAt[2] + 0.003]);
      sheet.rotation.z = (random() - 0.5) * 0.14;
    }

    if (a.lamp) {
      const [lx, ly, lz] = lampAt;
      s.tube([[lx, ly, lz - 0.1], [lx, ly + 0.08, lz - 0.04], [lx, ly + 0.07, lz + 0.06]], 0.008, black);
      const shade = s.cylinder(0.02, 0.07, 0.07, [lx, ly + 0.05, lz + 0.09], black, 16);
      shade.rotation.x = 0.5;
      const warm = new THREE.Color().setHSL(mix(0.14, 0.09, mood.warmth), 0.9, 0.7);
      s.ball([0.03, 0.03, 0.03], [lx, ly + 0.02, lz + 0.105], new THREE.MeshStandardMaterial({ color: warm, emissive: warm, emissiveIntensity: 1.6 }), 12);
    }
    // Weeds and wind-blown paper at the foot of a box nobody empties.
    const litter = Math.round(mood.wear * 5);
    for (let i = 0; i < litter; i++) {
      const scrap = s.box([0.07 + random() * 0.06, 0.003, 0.05 + random() * 0.05], [(random() - 0.5) * 0.9, 0.003, 0.3 + random() * 0.35], s.material(random() < 0.5 ? '#ded8c6' : '#a8713a'));
      scrap.rotation.y = random() * 3;
    }
    return s.finish({ footprint: a.form === 'wall' ? 0.75 : a.form === 'door' ? 0.6 : 0.42 });
  },
});
