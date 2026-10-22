import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

type V3 = [number, number, number];

/** A 32 × 32 painted plank face: horizontal boards with darker seams and a pixel grain. */
function plankMap(random: () => number, base: string, seam: string) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 32;
  const ctx = canvas.getContext('2d')!;
  const b = new THREE.Color(base);
  for (let y = 0; y < 32; y++)
    for (let x = 0; x < 32; x++) {
      const c = b.clone().offsetHSL(0, 0, (random() - 0.5) * 0.07);
      ctx.fillStyle = y % 8 === 7 ? seam : '#' + c.getHexString();
      ctx.fillRect(x, y, 1, 1);
    }
  ctx.fillStyle = seam;
  for (let i = 0; i < 10; i++) ctx.fillRect(Math.floor(random() * 32), Math.floor(random() * 32), 1 + Math.floor(random() * 3), 1);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.magFilter = map.minFilter = THREE.NearestFilter;
  map.generateMipmaps = false;
  return map;
}

function pixelMap(random: () => number, low = 0.82) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 16;
  const ctx = canvas.getContext('2d')!;
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 16; x++) {
      const v = Math.round(255 * mix(low, 1, random()));
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(x, y, 1, 1);
    }
  const map = new THREE.CanvasTexture(canvas);
  map.magFilter = map.minFilter = THREE.NearestFilter;
  map.generateMipmaps = false;
  return map;
}

export default defineThing({
  questions: {
    kind: choice('What kind of chest is it?', {
      oak: 'Plain oak planks with an iron latch.',
      banded: 'Dark wood bound with iron straps, heavy and old.',
      ender: 'A dark purple-black chest with a green glow in its seams, from somewhere else.',
      trapped: 'Oak with a red-rimmed latch: a trap.',
      gold: 'A gilded chest, gold plates over wood.',
    }),
    lid: choice('How is the lid?', {
      closed: 'Shut tight.',
      ajar: 'Lifted a crack, light leaking out.',
      open: 'Thrown wide open.',
    }),
    loot: choice('What is in it, or spilling out?', {
      gold: 'Gold ingots stacked and tumbling out.',
      gems: 'Glowing cyan gems and a few emeralds.',
      food: 'Bread loaves and red apples.',
      bones: 'Bones and a skull: someone else got here first, long ago.',
      books: 'Old leather books and a rolled map.',
      nothing: 'Nothing at all: already looted.',
    }),
    double: noul('Is it a double-wide chest?'),
    base: choice('What does it sit on?', {
      plinth: 'A raised square plinth of stone blocks.',
      grass: 'A patch of grass with a few flowers.',
      sand: 'Half buried in a drift of sand.',
      floor: 'Bare floor, nothing underneath.',
    }),
    marker: choice('What else marks the find?', {
      nothing: 'Nothing.',
      torch: 'A lit torch stuck in the ground beside it.',
      trail: 'A trail of dropped coins leading away.',
      sign: 'A small wooden sign stuck in the ground.',
      cobweb: 'Cobwebs strung from the lid, untouched for years.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const wide = a.double ? 1.8 : 0.9;
    const woodColour = { oak: '#a06a34', banded: '#5a3a22', ender: '#1c1230', trapped: '#a06a34', gold: '#d9a83a' }[a.kind];
    const seam = a.kind === 'ender' ? '#2fb86a' : a.kind === 'gold' ? '#8a6a1a' : '#4a2f1b';
    const wood = s.material('#ffffff', { map: plankMap(random, woodColour, seam), roughness: a.kind === 'gold' ? 0.4 : 0.85, metalness: a.kind === 'gold' ? 0.4 : 0 });
    const iron = s.material('#7a7f84', { metalness: 0.6, roughness: 0.4 });
    const gem = new THREE.MeshStandardMaterial({ color: '#8fe8f0', emissive: '#3fc4d8', emissiveIntensity: 0.9, roughness: 0.3 });
    const glow = new THREE.MeshStandardMaterial({ color: '#ffd978', emissive: '#ffb640', emissiveIntensity: mix(0.7, 1.8, 1 - mood.daylight), roughness: 0.6 });
    const box = (size: V3, at: V3, material: THREE.Material, parent: THREE.Object3D = s.root) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
      mesh.position.set(...at);
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };

    // Where it stands.
    let floorY = 0;
    let groundY = 0;
    const pixel = pixelMap(random);
    if (a.base === 'plinth') {
      const stone = s.material('#8d8f8a', { map: pixel, roughness: 0.95 });
      for (let x = 0; x < (a.double ? 3 : 2); x++) for (let z = 0; z < 2; z++) box([0.98, 0.5, 0.98], [(x - (a.double ? 1 : 0.5)) * 1.0, 0.25, (z - 0.5) * 1.0], stone);
      floorY = groundY = 0.5;
    }
    if (a.base === 'grass') {
      box([wide + 1.2, 0.12, 2.0], [0, 0.06, 0], s.material('#5fa83a', { map: pixel }));
      for (let i = 0; i < 6; i++) {
        const fx = (random() - 0.5) * (wide + 1.0), fz = (random() - 0.5) * 1.8;
        if (Math.abs(fx) < wide / 2 + 0.1 && Math.abs(fz) < 0.6) continue;
        box([0.08, 0.3, 0.08], [fx, 0.25, fz], s.material('#3f8d2a'));
        box([0.2, 0.16, 0.2], [fx, 0.42, fz], s.material(random() < 0.5 ? '#e23b3b' : '#f4d53a'));
      }
      floorY = groundY = 0.12;
    }
    if (a.base === 'sand') {
      const sand = s.material('#e2cf8f', { map: pixel, roughness: 1 });
      box([wide + 1.4, 0.3, 2.2], [0, 0.15, 0], sand);
      box([wide + 0.6, 0.3, 1.2], [0.1, 0.4, 0.15], sand);
      box([0.6, 0.25, 0.5], [wide / 2 + 0.2, 0.62, -0.2], sand);
      floorY = 0;
      groundY = 0.3;
    }

    // The chest body: a box, a lid on a hinge at the back, and the latch.
    const body = new THREE.Group();
    body.position.y = floorY;
    s.root.add(body);
    const H = 0.62, D = 0.86;
    box([wide, H, D], [0, H / 2, 0], wood, body);
    box([wide - 0.08, 0.02, D - 0.08], [0, H - 0.005, 0], s.material('#241a12'), body);
    const lid = new THREE.Group();
    lid.position.set(0, H, -D / 2);
    body.add(lid);
    box([wide, 0.32, D], [0, 0.16, D / 2], wood, lid);
    const angle = { closed: 0, ajar: -0.35, open: -1.9 }[a.lid];
    lid.rotation.x = angle;
    const latchMat = a.kind === 'trapped' ? s.material('#c23b3b') : a.kind === 'gold' ? s.material('#e8c34a', { metalness: 0.7, roughness: 0.3 }) : iron;
    box([0.14, 0.2, 0.05], [0, 0.02, D / 2 + 0.02], latchMat, lid);
    box([0.1, 0.12, 0.03], [0, -0.12, D / 2 + 0.025], iron, body).position.y = H - 0.05;
    if (a.kind === 'banded' || a.kind === 'gold')
      for (const x of a.double ? [-0.6, 0, 0.6] : [-0.3, 0.3]) {
        box([0.1, H + 0.02, D + 0.04], [x, H / 2, 0], latchMat, body);
        box([0.1, 0.34, D + 0.04], [x, 0.16, D / 2], latchMat, lid);
      }
    if (a.kind === 'ender') {
      const green = new THREE.MeshStandardMaterial({ color: '#4fe08a', emissive: '#2fb86a', emissiveIntensity: 1.2 });
      for (const x of a.double ? [-0.55, 0.55] : [0]) box([0.2, 0.2, 0.05], [x, H * 0.55, D / 2 + 0.01], green, body);
    }
    const open = a.lid !== 'closed';
    if (open && a.loot !== 'nothing') box([wide - 0.1, 0.04, D - 0.1], [0, H * 0.78, 0], a.loot === 'gems' ? gem : a.loot === 'gold' ? glow : s.material('#241a12'), body);

    // Loot inside and tumbling out the front.
    const spill = (count: number, make: (i: number) => THREE.Mesh) => {
      for (let i = 0; i < count; i++) {
        const mesh = make(i);
        const inside = open && i < count * 0.5;
        if (inside) mesh.position.set((random() - 0.5) * (wide - 0.3), H * 0.8 + 0.08 + (i % 2) * 0.1, (random() - 0.5) * 0.5);
        else mesh.position.set((random() - 0.5) * (wide + 0.6), 0.08, D / 2 + 0.15 + random() * (a.base === 'plinth' ? 0.35 : 0.7));
        mesh.rotation.y = random() * 3;
        if (inside) body.add(mesh); else { mesh.position.y += groundY; s.root.add(mesh); }
      }
    };
    const count = open ? 8 : 3;
    if (a.loot === 'gold') spill(count, () => box([0.26, 0.1, 0.14], [0, 0, 0], s.material('#e3b53a', { metalness: 0.7, roughness: 0.3 }), new THREE.Group()));
    if (a.loot === 'gems') spill(count, (i) => box([0.16, 0.16, 0.16], [0, 0, 0], i % 3 === 2 ? new THREE.MeshStandardMaterial({ color: '#4fd870', emissive: '#2fb86a', emissiveIntensity: 0.8 }) : gem, new THREE.Group()));
    if (a.loot === 'food') spill(count, (i) => i % 2 ? box([0.3, 0.14, 0.16], [0, 0, 0], s.material('#c98a3a'), new THREE.Group()) : box([0.16, 0.16, 0.16], [0, 0, 0], s.material('#d22a2a'), new THREE.Group()));
    if (a.loot === 'books') spill(count, (i) => box([0.22, 0.07, 0.3], [0, 0, 0], s.material(['#6b2a2a', '#2a4a7a', '#3f6a3a', '#7a5a2a'][i % 4]), new THREE.Group()));
    if (a.loot === 'bones') {
      spill(count, (i) => i === 0 ? box([0.26, 0.26, 0.26], [0, 0, 0], s.material('#efe9d8'), new THREE.Group()) : box([0.34, 0.07, 0.07], [0, 0, 0], s.material('#efe9d8'), new THREE.Group()));
      const skull = s.root.children.find((c) => c instanceof THREE.Mesh && (c.geometry as THREE.BoxGeometry).parameters.width === 0.26) ?? body.children.find((c) => c instanceof THREE.Mesh && (c.geometry as THREE.BoxGeometry).parameters.width === 0.26);
      if (skull) for (const sx of [-0.06, 0.06]) box([0.05, 0.05, 0.02], [sx, 0.03, 0.135], s.material('#17120f'), skull);
    }

    // Markers.
    const mx = -(wide / 2 + 0.55);
    if (a.marker === 'torch') {
      box([0.08, 0.6, 0.08], [mx, groundY + 0.3, 0.2], s.material('#8a5a2b'));
      box([0.2, 0.2, 0.2], [mx, groundY + 0.65, 0.2], glow);
    }
    if (a.marker === 'trail')
      for (let i = 0; i < 9; i++) {
        const coin = s.cylinder(0.06, 0.06, 0.02, [wide / 2 * 0.3 + i * 0.22 + (random() - 0.5) * 0.12, groundY + 0.01, D / 2 + 0.5 + i * 0.12 + (random() - 0.5) * 0.3], s.material('#e3b53a', { metalness: 0.7, roughness: 0.3 }), 8);
        void coin;
      }
    if (a.marker === 'sign') {
      box([0.06, 0.5, 0.06], [mx, groundY + 0.25, 0.3], s.material('#8a5a2b'));
      box([0.6, 0.36, 0.05], [mx, groundY + 0.62, 0.3], s.material('#b88a4a'));
      for (let i = 0; i < 3; i++) box([0.4 - i * 0.1, 0.04, 0.012], [mx - i * 0.03, groundY + 0.72 - i * 0.1, 0.33], s.material('#3a2a1a'));
    }
    if (a.marker === 'cobweb') {
      const web = new THREE.MeshStandardMaterial({ color: '#f4f4f0', transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide });
      for (const x of [-wide / 2, wide / 2]) {
        const w = s.mesh(new THREE.PlaneGeometry(0.5, 0.6), web, [x, floorY + H + 0.1, 0.1]);
        w.rotation.y = Math.PI / 2;
      }
      for (let i = 0; i < 4; i++) s.rod([(random() - 0.5) * wide, floorY + H + 0.3, -0.3], [(random() - 0.5) * wide * 1.4, groundY + 0.1, 0.5], 0.004, web);
    }

    const energy = mood.energy;
    const phase = random() * 6;
    return s.finish({
      update: (_dt, time) => {
        glow.emissiveIntensity = mix(0.7, 1.8, 1 - mood.daylight) * (0.92 + Math.sin(time * 8 + phase) * 0.08 * (0.3 + energy));
        if (a.lid === 'ajar') lid.rotation.x = angle + Math.sin(time * 1.5 + phase) * 0.04 * energy;
      },
    });
  },
});
