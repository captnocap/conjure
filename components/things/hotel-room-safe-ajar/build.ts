import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

type G = CanvasRenderingContext2D;
function paint(width: number, height: number, draw: (g: G, w: number, h: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d')!, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export default defineThing({
  questions: {
    inside: choice('What is inside the safe?', {
      passport: 'A passport and two banded stacks of cash.',
      pistol: 'A pistol lying on its side.',
      parcel: 'A brown-paper parcel tied with string.',
      ring: 'A wedding ring in an open ring box.',
      laptop: 'A laptop and a phone.',
      empty: 'Nothing: the empty steel floor.',
    }),
    door: choice('What is the door doing?', {
      open: 'Swung wide open.',
      ajar: 'Open a hand\'s width, as if just unlocked.',
      shut: 'Shut, the keypad glowing in the dark of the cubby.',
    }),
    setting: choice('Where is the safe set?', {
      cubby: 'In the bottom cubby of a hotel wardrobe, a hanging rail above.',
      shelf: 'On an open shelf against a wall panel.',
    }),
    shelf: choice('What is on the shelf above it?', {
      towels: 'A stack of folded white towels.',
      pillow: 'A spare pillow in a plastic sleeve.',
      dryer: 'A hairdryer in its cloth bag, cord trailing.',
      nothing: 'Nothing.',
    }),
    bag: noul('Does a laundry bag hang off the edge beside it?'),
    beside: choice('What sits on the floor of the cubby beside the safe?', {
      shoes: 'A pair of polished black shoes, toes to the wall.',
      shoebox: 'A shoebox with the lid half off.',
      umbrella: 'A folded umbrella.',
      book: 'A small dark book nobody opens.',
      nothing: 'Nothing.',
    }),
    finish: choice('What finish is the safe?', {
      graphite: 'Dark graphite steel.',
      cream: 'Cream enamel, older and chipped.',
      steel: 'Brushed stainless steel.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const multi = (geometry: THREE.BufferGeometry, materials: THREE.Material[], at: [number, number, number]) => {
      const mesh = new THREE.Mesh(geometry, materials);
      mesh.position.set(...at);
      mesh.castShadow = mesh.receiveShadow = true;
      s.root.add(mesh);
      return mesh;
    };
    const laminate = s.material(['#c6ad82', '#6b4b36', '#d8cdb8'][Math.floor(random() * 3)], { roughness: 0.55 });
    const safeTone = { graphite: '#3a3d42', cream: '#e3dac4', steel: '#aeb3b7' }[a.finish];
    const steel = s.material(safeTone, { metalness: a.finish === 'cream' ? 0.1 : 0.7, roughness: a.finish === 'cream' ? 0.5 : 0.35 });
    const inner = s.material('#2a2c30', { roughness: 0.8 });
    const dark = s.material('#1a1b1e', { roughness: 0.6 });
    const white = s.material('#f3f1ea', { roughness: 0.95 });
    const chrome = s.material('#d4d8db', { metalness: 0.9, roughness: 0.25 });

    // ---- the cubby or the shelf ------------------------------------------------------
    const W = 0.76, DEEP = 0.52;
    let floorY = 0.03, shelfY = 0.5;
    if (a.setting === 'cubby') {
      const H = 1.3;
      s.box([W, 0.02, DEEP], [0, H - 0.01, 0], laminate);
      s.box([W, 0.03, DEEP], [0, 0.015, 0], laminate);
      s.box([W, H, 0.02], [0, H / 2, -DEEP / 2 + 0.01], laminate);
      for (const x of [-1, 1]) s.box([0.02, H, DEEP], [x * (W / 2 - 0.01), H / 2, 0], laminate);
      s.box([W - 0.04, 0.02, DEEP - 0.02], [0, shelfY, 0.01], laminate);
      // The hanging rail and a couple of hangers above the shelf.
      s.cylinder(0.012, 0.012, W - 0.04, [0, H - 0.14, -0.02], chrome, 10).rotation.z = Math.PI / 2;
      for (let i = 0; i < 2 + Math.round(random() * 2); i++) {
        const x = -0.22 + i * 0.14 + random() * 0.04;
        s.rod([x, H - 0.14, -0.02], [x, H - 0.2, -0.02], 0.004, chrome);
        s.box([0.38, 0.01, 0.012], [x, H - 0.21, -0.02], s.material('#5a3d2a'));
        if (i === 0) {
          const jacket = s.box([0.36, 0.44, 0.05], [x, H - 0.44, -0.02], s.material(random() < 0.5 ? '#23262e' : '#e9e6dc', { roughness: 0.9 }));
          jacket.rotation.y = 0.05;
        }
      }
    } else {
      const H = 1.15;
      s.box([W + 0.2, H, 0.03], [0, H / 2, -DEEP / 2 + 0.015], laminate);
      s.box([W + 0.2, 0.08, 0.03], [0, 0.04, -DEEP / 2 + 0.03], s.material('#f1ede2'));
      const board = (y: number) => {
        s.box([W, 0.03, DEEP - 0.08], [0, y, 0.04], laminate);
        for (const x of [-0.3, 0.3]) s.box([0.03, 0.2, DEEP - 0.14], [x, y - 0.115, 0.0], chrome);
      };
      floorY = 0.4; shelfY = 0.86;
      board(floorY - 0.015); board(shelfY);
    }

    // ---- the safe: a hollow steel box with a hinged door -----------------------------
    const SW = 0.42, SH = 0.2, SD = 0.36, T = 0.015;
    const safe = new THREE.Group();
    safe.position.set(0.02, floorY, 0.02);
    safe.rotation.y = (random() - 0.5) * 0.1;
    s.root.add(safe);
    const inSafe = (mesh: THREE.Object3D) => { safe.add(mesh); return mesh; };
    inSafe(s.box([SW, T, SD], [0, T / 2, 0], steel));
    inSafe(s.box([SW, T, SD], [0, SH - T / 2, 0], steel));
    inSafe(s.box([SW, SH, T], [0, SH / 2, -SD / 2 + T / 2], steel));
    for (const x of [-1, 1]) inSafe(s.box([T, SH, SD], [x * (SW / 2 - T / 2), SH / 2, 0], steel));
    inSafe(s.box([SW - T * 2, 0.004, SD - T * 2], [0, T + 0.002, 0], inner));
    inSafe(s.box([SW - T * 2, SH - T * 2, 0.004], [0, SH / 2, -SD / 2 + T + 0.002], inner));
    for (const x of [-1, 1]) inSafe(s.box([0.004, SH - T * 2, SD - T * 2], [x * (SW / 2 - T - 0.002), SH / 2, 0], inner));
    for (const x of [-1, 1]) for (const z of [-1, 1]) inSafe(s.cylinder(0.015, 0.018, 0.012, [x * (SW / 2 - 0.04), -0.006, z * (SD / 2 - 0.04)], dark, 10));
    safe.position.y += 0.012;

    const shut = a.door === 'shut';
    const keypad = paint(256, 128, (g, w, h) => {
      g.fillStyle = a.finish === 'cream' ? '#d8cfb8' : a.finish === 'steel' ? '#a2a7ab' : '#34373c'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#17181b'; g.beginPath(); g.roundRect(20, 14, 150, 100, 8); g.fill();
      g.fillStyle = shut ? '#3ddc5a' : '#1f2a22'; g.beginPath(); g.roundRect(28, 20, 134, 24, 4); g.fill();
      g.fillStyle = shut ? '#0b3a14' : '#3a4a3e'; g.font = 'bold 18px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(shut ? 'LOCKED' : 'OPEN', 95, 32);
      const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];
      keys.forEach((k, i) => {
        const x = 40 + (i % 3) * 40, y = 62 + Math.floor(i / 3) * 14;
        g.fillStyle = shut ? '#d9dde2' : '#8a8f95'; g.beginPath(); g.roundRect(x - 14, y - 5, 28, 11, 3); g.fill();
        g.fillStyle = '#17181b'; g.font = 'bold 9px monospace'; g.fillText(k, x, y + 1);
      });
      g.fillStyle = '#f2efe6'; g.beginPath(); g.roundRect(186, 20, 54, 30, 3); g.fill();
      g.fillStyle = '#5a5a60'; g.font = 'bold 10px monospace'; g.fillText('SAFE', 213, 30); g.fillRect(192, 38, 42, 2); g.fillRect(192, 43, 30, 2);
    });
    const door = new THREE.Group();
    door.position.set(-SW / 2 + 0.01, 0, SD / 2 - 0.005);
    door.rotation.y = { open: 1.8, ajar: 0.55, shut: 0 }[a.door];
    safe.add(door);
    const panel = multi(new THREE.BoxGeometry(SW - 0.02, SH - 0.016, 0.03), [steel, steel, steel, steel, new THREE.MeshStandardMaterial({ map: keypad, emissiveMap: keypad, emissive: '#ffffff', emissiveIntensity: shut ? 0.9 : 0.12, roughness: 0.5, metalness: 0.2 }), inner], [SW / 2 - 0.01, SH / 2, 0.015]);
    door.add(panel);
    const handle = s.box([0.05, 0.016, 0.02], [SW / 2 + 0.11, SH / 2 - 0.02, 0.04], chrome); door.add(handle);
    for (const y of [0.04, SH - 0.04]) { const bolt = s.cylinder(0.012, 0.012, 0.02, [0.02, y, -0.01], chrome, 10); bolt.rotation.x = Math.PI / 2; door.add(bolt); }
    for (const y of [0.035, SH - 0.035]) { const hinge = s.cylinder(0.012, 0.012, 0.045, [-0.008, y, 0.012], dark, 10); door.add(hinge); }

    // ---- what the safe holds ----------------------------------------------------------
    const floor = T + 0.004;
    const put = (mesh: THREE.Mesh) => inSafe(mesh);
    if (a.inside === 'passport') {
      put(s.box([0.09, 0.012, 0.125], [-0.1, floor + 0.006, 0.04], s.material(random() < 0.5 ? '#5a1a2a' : '#1d2a4e', { roughness: 0.5 }))).rotation.y = 0.2;
      put(s.box([0.03, 0.001, 0.03], [-0.1, floor + 0.0125, 0.05], s.material('#c9a24a', { metalness: 0.8 }))).rotation.y = 0.2;
      for (let i = 0; i < 2; i++) {
        const cash = put(s.box([0.066, 0.03, 0.14], [0.06 + i * 0.075, floor + 0.015, 0.03 + i * 0.015], s.material('#7b8f74', { roughness: 0.85 })));
        cash.rotation.y = (random() - 0.5) * 0.4;
        put(s.box([0.07, 0.016, 0.03], [cash.position.x, floor + 0.015, cash.position.z], s.material('#efe6d2'))).rotation.y = cash.rotation.y;
      }
    } else if (a.inside === 'pistol') {
      const gun = s.material('#2f3236', { metalness: 0.65, roughness: 0.42 });
      const pistol = new THREE.Group(); pistol.position.set(0.0, floor, 0.06); pistol.rotation.y = -0.4 + random() * 0.3; inSafe(pistol);
      const p = (mesh: THREE.Mesh) => { pistol.add(mesh); return mesh; };
      p(s.box([0.17, 0.026, 0.032], [0, 0.013, 0], gun));
      p(s.box([0.17, 0.008, 0.026], [0, 0.03, 0], dark));
      const grip = p(s.box([0.036, 0.026, 0.08], [0.05, 0.013, -0.045], s.material('#1f2124', { roughness: 0.7 })));
      grip.rotation.y = -0.35;
      const guard = p(s.ring(0.016, 0.004, [0.01, 0.013, -0.03], gun)); guard.rotation.x = Math.PI / 2;
      p(s.cylinder(0.006, 0.006, 0.02, [-0.09, 0.013, 0], dark, 8)).rotation.z = Math.PI / 2;
    } else if (a.inside === 'parcel') {
      const kraft = s.material('#a8784a', { roughness: 0.95 });
      const parcel = put(s.box([0.22, 0.1, 0.16], [-0.02, floor + 0.05, 0.03], kraft));
      parcel.rotation.y = 0.15;
      const string = s.material('#e7dcc2', { roughness: 0.9 });
      for (const dz of [-0.03, 0.03]) put(s.box([0.224, 0.104, 0.004], [-0.02, floor + 0.05, 0.03 + dz], string)).rotation.y = 0.15;
      put(s.box([0.004, 0.104, 0.164], [-0.02, floor + 0.05, 0.03], string)).rotation.y = 0.15;
      put(s.box([0.07, 0.002, 0.045], [0.0, floor + 0.102, 0.05], white)).rotation.y = 0.15;
    } else if (a.inside === 'ring') {
      const velvet = s.material('#223366', { roughness: 1 });
      const box = put(s.box([0.07, 0.035, 0.07], [-0.02, floor + 0.0175, 0.05], velvet));
      box.rotation.y = 0.3;
      const lid = s.box([0.07, 0.03, 0.07], [-0.02 - Math.sin(0.3) * 0.0, floor + 0.05, 0.05 - 0.05], velvet);
      lid.rotation.set(-1.2, 0.3, 0); put(lid);
      put(s.box([0.06, 0.012, 0.06], [-0.02, floor + 0.041, 0.05], s.material('#f1ecdc', { roughness: 1 }))).rotation.y = 0.3;
      const ring = put(s.ring(0.012, 0.0022, [-0.02, floor + 0.058, 0.05], s.material('#e8c25a', { metalness: 0.9, roughness: 0.2, emissive: '#5a3c00', emissiveIntensity: 0.4 })));
      ring.rotation.y = 0.3;
    } else if (a.inside === 'laptop') {
      const lap = put(s.box([0.3, 0.018, 0.21], [-0.02, floor + 0.009, 0.02], s.material('#b9bdc1', { metalness: 0.7, roughness: 0.35 })));
      lap.rotation.y = 0.1;
      put(s.box([0.07, 0.008, 0.14], [0.15, floor + 0.004, 0.06], dark)).rotation.y = -0.3;
      put(s.box([0.06, 0.001, 0.12], [0.15, floor + 0.0085, 0.06], s.material('#223a5a', { emissive: '#2a66c9', emissiveIntensity: 0.6 }))).rotation.y = -0.3;
    }

    // ---- the shelf above, the floor beside, the bag --------------------------------------
    const shelfTop = a.setting === 'cubby' ? shelfY + 0.01 : shelfY + 0.015;
    if (a.shelf === 'towels') {
      for (let i = 0; i < 3; i++) {
        const towel = s.box([0.32 - i * 0.01, 0.055, 0.24], [-0.14 + (random() - 0.5) * 0.02, shelfTop + 0.0275 + i * 0.056, 0.0], i === 1 ? s.material('#e9e4d6', { roughness: 1 }) : white);
        towel.rotation.y = (random() - 0.5) * 0.1;
      }
      s.box([0.16, 0.035, 0.22], [0.2, shelfTop + 0.0175, 0.02], white);
    } else if (a.shelf === 'pillow') {
      s.ball([0.27, 0.06, 0.18], [0, shelfTop + 0.06, 0.0], s.material('#f4f2ee', { roughness: 0.6 }), 16);
      s.ball([0.28, 0.065, 0.19], [0, shelfTop + 0.06, 0.0], new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.18, roughness: 0.1, depthWrite: false }), 14);
    } else if (a.shelf === 'dryer') {
      const cloth = s.material('#d9d2c2', { roughness: 1 });
      s.box([0.2, 0.09, 0.14], [-0.1, shelfTop + 0.045, 0.02], cloth);
      s.box([0.1, 0.016, 0.04], [-0.1, shelfTop + 0.098, 0.03], s.material('#8a6a3a'));
      s.tube([[0.0, shelfTop + 0.03, 0.06], [0.12, shelfTop + 0.015, 0.1], [0.2, shelfTop + 0.02, 0.0], [0.26, shelfTop + 0.015, 0.12]], 0.005, dark);
      s.box([0.03, 0.02, 0.04], [0.26, shelfTop + 0.012, 0.12], white);
    }
    const besideX = -SW / 2 - 0.09;
    if (a.beside === 'shoes') {
      const leather = s.material('#1a1a1c', { roughness: 0.25, metalness: 0.1 });
      for (const dx of [-0.055, 0.055]) {
        s.box([0.09, 0.045, 0.22], [besideX + dx, floorY + 0.0225, 0.02], leather);
        s.ball([0.045, 0.03, 0.06], [besideX + dx, floorY + 0.03, -0.09], leather, 12);
        s.box([0.08, 0.012, 0.24], [besideX + dx, floorY + 0.006, 0.0], dark);
      }
    } else if (a.beside === 'shoebox') {
      s.box([0.2, 0.11, 0.3], [besideX, floorY + 0.055, 0.0], s.material('#d8cfb8', { roughness: 0.9 }));
      const lid = s.box([0.21, 0.025, 0.31], [besideX + 0.05, floorY + 0.125, -0.04], s.material('#c6552f', { roughness: 0.8 }));
      lid.rotation.set(0.12, 0, 0.2);
    } else if (a.beside === 'umbrella') {
      const um = s.cylinder(0.02, 0.028, 0.32, [besideX, floorY + 0.028, 0.0], s.material('#1e2430', { roughness: 0.7 }), 12);
      um.rotation.x = Math.PI / 2; um.rotation.z = 0.1;
      s.ring(0.03, 0.007, [besideX, floorY + 0.03, 0.2], s.material('#6b4a2a')).rotation.y = Math.PI / 2;
    } else if (a.beside === 'book') {
      s.box([0.11, 0.035, 0.16], [besideX, floorY + 0.0175, 0.02], s.material('#2c1f1a', { roughness: 0.6 })).rotation.y = 0.2;
      s.box([0.11, 0.028, 0.15], [besideX + 0.004, floorY + 0.0175, 0.02], s.material('#efe6d2', { roughness: 1 })).rotation.y = 0.2;
    }
    if (a.bag) {
      const cloth = new THREE.MeshStandardMaterial({ color: '#f1efe6', roughness: 1, side: THREE.DoubleSide });
      const x = a.setting === 'cubby' ? W / 2 - 0.02 : W / 2 - 0.08;
      const top = a.setting === 'cubby' ? shelfY - 0.02 : shelfY - 0.02;
      s.ball([0.075, 0.13, 0.045], [x, top - 0.14, DEEP / 2 + 0.03], cloth, 14);
      s.cylinder(0.02, 0.07, 0.06, [x, top - 0.01, DEEP / 2 + 0.03], cloth, 12);
      s.rod([x, top + 0.02, DEEP / 2 + 0.03], [x, top + 0.04, DEEP / 2 + 0.01], 0.004, chrome);
      s.box([0.06, 0.04, 0.002], [x, top - 0.14, DEEP / 2 + 0.075], s.material('#2a2a2e', { roughness: 0.9 }));
    }

    void mood; void mix;
    return s.finish();
  },
});
