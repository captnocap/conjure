import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix, paint, paintHex, paintIsMetal } from '@conjure/kit';

type P = [number, number, number];

function puffMap() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const g = canvas.getContext('2d')!;
  const grad = g.createRadialGradient(64, 64, 4, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,0.9)');
  grad.addColorStop(0.55, 'rgba(255,255,255,0.35)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(canvas);
}

function bannerMap(word: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 128; canvas.height = 384;
  const g = canvas.getContext('2d')!;
  g.fillStyle = '#f0ece2'; g.fillRect(0, 0, 128, 384);
  g.fillStyle = '#b0182a';
  g.font = 'bold 44px sans-serif';
  g.textAlign = 'center';
  [...word].forEach((letter, i) => g.fillText(letter, 64, 46 + i * 38));
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  return map;
}

export default defineThing({
  questions: {
    era: choice('When is it?', {
      '1947': '1947, newly unveiled: a Soviet soldier with a flag stands on a pedestal in front of the plinth.',
      today: 'Today: the soldier long gone, the woman alone above the city.',
    }),
    patina: paint('What colour is the statue metal?', ['copper', 'gold', 'teal', 'mint', 'green', 'charcoal', 'black', 'silver']),
    lighting: choice('How is it lit?', {
      floodlit: 'Floodlit from below at night: the plinth glows, the bronze shines against a dark sky.',
      unlit: 'Unlit, in daylight or grey dusk.',
    }),
    fog: choice('What is the weather on the hilltop?', {
      clear: 'Clear: the figure sharp against the sky.',
      wisps: 'Wisps of fog drifting round the plinth.',
      thick: 'Thick fog swallowing the plinth, only the woman and her palm above it.',
    }),
    tribute: choice('What has been left at the base?', {
      none: 'Nothing: bare stone steps.',
      wreaths: 'Wreaths with ribbons laid on the steps for an anniversary.',
      candles: 'Dozens of small candles flickering on the steps.',
      banner: 'A protester\'s bedsheet banner draped down the plinth, painted with one word: SZABADSÁG (freedom).',
    }),
    visitors: choice('Who is up there?', {
      none: 'Nobody: the hilltop is deserted.',
      tourists: 'Tourists photographing the view and each other.',
      lone: 'A single figure standing at the foot of the steps, looking up.',
      crowd: 'A crowd gathered with flags for a commemoration.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const lowSun = Math.abs(mood.daylight - 0.5) * 2;
    const flood = a.lighting === 'floodlit';
    const stoneColour = new THREE.Color('#ddd6c6').lerp(new THREE.Color('#77705f'), mood.wear * 0.4);
    if (flood) stoneColour.lerp(new THREE.Color('#e8c27a'), 0.3);
    const floodColour = new THREE.Color().setHSL(mix(0.12, 0.08, mood.warmth), 0.8, 0.45);
    const stone = s.material(stoneColour, { roughness: 0.85, emissive: floodColour, emissiveIntensity: flood ? mix(0.15, 0.35, lowSun) : 0 });
    const darkStone = s.material(stoneColour.clone().multiplyScalar(0.8), { roughness: 0.9 });
    const metalHex = paintHex(a.patina, '#7a5a3a');
    const bronze = s.material(metalHex, { roughness: 0.4, metalness: paintIsMetal(a.patina) ? 0.75 : 0.35, emissive: floodColour, emissiveIntensity: flood ? 0.18 : 0 });
    const grass = s.material('#6d8450', { roughness: 0.95 });
    const glow = new THREE.MeshStandardMaterial({ color: '#ffe0a0', emissive: '#ffb648', emissiveIntensity: mix(1, 2, lowSun) });

    // The hilltop: a grassy crown, a paved terrace, broad steps.
    s.cylinder(19, 23, 4, [0, 2, 0], grass, 24);
    s.box([26, 0.6, 30], [0, 4.3, 1.5], s.material(stoneColour.clone().multiplyScalar(0.9), { roughness: 0.95 }));
    let y = 4.6;
    for (let k = 0; k < 3; k++) { s.box([20 - k * 2.4, 0.8, 20 - k * 2.4], [0, y + 0.4, 0], stone); y += 0.8; }
    // The plinth: a heavy lower block with side wings, a tapering shaft, a cornice.
    s.box([11, 8, 11], [0, y + 4, 0], stone);
    s.box([11.6, 0.8, 11.6], [0, y + 8.4, 0], darkStone);
    for (const side of [-1, 1]) s.box([5, 4, 7], [side * 7.6, y + 2, 0], stone);
    const shaft0 = y + 8.8, shaftH = 15;
    const shaft = s.mesh(new THREE.CylinderGeometry(2.7 * Math.SQRT2, 3.9 * Math.SQRT2, shaftH, 4).rotateY(Math.PI / 4), stone, [0, shaft0 + shaftH / 2, 0]);
    void shaft;
    // Shallow carved panels on the shaft front.
    s.box([2.6, shaftH * 0.6, 0.2], [0, shaft0 + shaftH * 0.45, 3.4], darkStone).rotation.x = -0.04;
    const top = shaft0 + shaftH;
    s.box([6.6, 1.2, 6.6], [0, top + 0.6, 0], darkStone);
    s.box([5.4, 1, 5.4], [0, top + 1.7, 0], stone);
    const stand = top + 2.2;

    // The woman: arms raised, the palm frond held level over her head, robe to her feet.
    const H = 14;
    const woman = figure(s, { height: H, style: 'doll', face: 'blank', hair: 'long', build: 'slight', pose: 'standing', skin: metalHex, hairColor: metalHex, top: metalHex, bottom: metalHex, shoes: metalHex, sleeves: 'long', gaze: 'up' });
    s.root.add(woman.root);
    woman.root.position.set(0, stand, 0);
    woman.joints.body.rotation.x = 0.04;
    woman.root.updateMatrixWorld(true);
    const hand = (side: number) => new THREE.Vector3(side * 0.16 * H, stand + 1.12 * H, 0.06 * H);
    woman.reach('left', hand(1), { space: s.root, elbow: { x: 1, y: 0.4, z: 0 } });
    woman.reach('right', hand(-1), { space: s.root, elbow: { x: -1, y: 0.4, z: 0 } });
    // Recolour the figure so its every surface is the statue metal.
    woman.root.traverse((node) => { const mesh = node as THREE.Mesh; if (mesh.isMesh) { mesh.material = bronze; mesh.castShadow = true; } });
    const robe = s.lathe([[0.13 * H, 0], [0.15 * H, 0.08 * H], [0.11 * H, 0.3 * H], [0.085 * H, 0.5 * H], [0.07 * H, 0.56 * H]], bronze, [0, stand, -0.01 * H]);
    robe.scale.set(1, 1, 0.85);
    // A train sweeping back from the shoulders.
    s.surface((u, v, target) => {
      const width = mix(0.16, 0.26, v) * H, x = (u - 0.5) * width;
      target.set(x, stand + mix(0.78, 0.02, v) * H, -0.05 * H - Math.sin(v * Math.PI * 0.9) * 0.12 * H - v * 0.06 * H + Math.cos((u - 0.5) * Math.PI) * 0.02 * H);
    }, new THREE.MeshStandardMaterial({ color: bronze.color, roughness: 0.4, metalness: bronze.metalness, side: THREE.DoubleSide, emissive: bronze.emissive, emissiveIntensity: bronze.emissiveIntensity }), { segments: [10, 12] });
    // The palm frond: a long arched rib with leaflets, held level between the hands.
    const mid = hand(1).add(hand(-1)).multiplyScalar(0.5).add(new THREE.Vector3(0, 0.03 * H, 0));
    const span = 0.62 * H;
    const rib: P[] = [];
    for (let k = 0; k <= 10; k++) { const t = k / 10 - 0.5; rib.push([mid.x + t * span, mid.y + 0.04 * H - (t * t) * 0.32 * H, mid.z + Math.sin(t * 3) * 0.02 * H]); }
    s.tube(rib, 0.012 * H, bronze);
    const leaflet = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.02, 0.06).translate(0.5, 0, 0), bronze, 64);
    const matrix = new THREE.Matrix4();
    for (let i = 0; i < 64; i++) {
      const t = (i >> 1) / 31 - 0.5, side = i & 1 ? 1 : -1;
      const p = new THREE.Vector3(mid.x + t * span, mid.y + 0.04 * H - (t * t) * 0.32 * H, mid.z);
      const length = (0.05 + 0.08 * (1 - Math.abs(t) * 1.6)) * H;
      matrix.compose(p, new THREE.Quaternion().setFromEuler(new THREE.Euler(0, side * Math.PI / 2 + t * 0.4, -0.5 + side * 0.1)), new THREE.Vector3(length, H * 0.6, H * 0.6));
      leaflet.setMatrixAt(i, matrix);
    }
    leaflet.castShadow = true;
    s.root.add(leaflet);

    // Allegorical figures on the side wings: a torch-bearer and one killing a serpent.
    const figures: { update(dt: number, time: number): void }[] = [];
    const bearer = figure(s, { height: 6, style: 'doll', face: 'blank', hair: 'short', pose: 'reaching', skin: metalHex, top: metalHex, bottom: metalHex, shoes: metalHex, gaze: 'up' });
    s.root.add(bearer.root);
    bearer.root.position.set(7.6, y + 4, 0.6);
    bearer.root.rotation.y = 0.5;
    const fighter = figure(s, { height: 6, style: 'doll', face: 'blank', hair: 'none', pose: 'running', skin: metalHex, top: metalHex, bottom: metalHex, shoes: metalHex, gaze: 'down', mirror: true });
    s.root.add(fighter.root);
    fighter.root.position.set(-7.6, y + 4, 0.8);
    fighter.root.rotation.y = -0.6;
    for (const f of [bearer, fighter]) f.root.traverse((node) => { const mesh = node as THREE.Mesh; if (mesh.isMesh) mesh.material = bronze; });
    s.root.updateMatrixWorld(true);
    const torch = bearer.hands.left.getWorldPosition(new THREE.Vector3());
    s.cylinder(0.12, 0.08, 1.2, [torch.x, torch.y + 0.5, torch.z], bronze, 8);
    s.ball([0.35, 0.6, 0.35], [torch.x, torch.y + 1.3, torch.z], flood || lowSun > 0.6 ? glow : bronze, 8);
    const serpent: P[] = [];
    for (let k = 0; k <= 14; k++) { const t = k / 14; serpent.push([-7.6 + Math.cos(t * 9) * 1.6 * (1 - t * 0.5), y + 4.3 + t * 1.2, 1.2 + Math.sin(t * 9) * 1.4]); }
    s.tube(serpent, 0.32, bronze);

    // 1947: the Soviet soldier on his own pedestal at the front.
    if (a.era === '1947') {
      s.box([5, 5, 4], [0, 4.6 + 2.5, 12], stone);
      s.box([5.6, 0.6, 4.6], [0, 4.6 + 5.2, 12], darkStone);
      const soldier = figure(s, { height: 6.4, style: 'doll', face: 'blank', hair: 'cap', pose: 'standing', build: 'heavy', skin: metalHex, top: metalHex, bottom: metalHex, shoes: metalHex, gaze: 'ahead' });
      s.root.add(soldier.root);
      soldier.root.position.set(0, 4.6 + 5.5, 12);
      soldier.root.traverse((node) => { const mesh = node as THREE.Mesh; if (mesh.isMesh) mesh.material = bronze; });
      s.root.updateMatrixWorld(true);
      soldier.reach('right', new THREE.Vector3(-1.4, 4.6 + 5.5 + 4.4, 12.6), { space: s.root });
      s.rod([-1.4, 4.6 + 5.5 + 0.2, 12.6], [-1.4, 4.6 + 5.5 + 8.5, 12.6], 0.08, bronze);
      const flag = s.mesh(new THREE.PlaneGeometry(3, 2, 4, 1).translate(1.5, 0, 0), s.material(metalHex, { side: THREE.DoubleSide, metalness: 0.4 }), [-1.4, 4.6 + 5.5 + 7.4, 12.6]);
      flag.rotation.y = -0.4;
    }

    // What has been left.
    if (a.tribute === 'wreaths') {
      const leaves = s.material('#2f5a34', { roughness: 0.9 });
      for (let i = 0; i < 6; i++) {
        const x = -6 + i * 2.4, z = 10.6 + (i % 2) * 0.6;
        const wreath = s.ring(0.8, 0.22, [x, 5.6 + 0.9, z], leaves);
        wreath.rotation.x = -0.3;
        s.box([0.25, 1.4, 0.05], [x + 0.25, 5.6 + 0.4, z + 0.25], s.material(['#c8102e', '#f4f2ec', '#2f7a3a'][i % 3]));
      }
    }
    if (a.tribute === 'candles') {
      const wax = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.1, 0.1, 0.3, 6), s.material('#c8102e', { roughness: 0.6 }), 60);
      const flames = new THREE.InstancedMesh(new THREE.SphereGeometry(0.09, 5, 4), glow, 60);
      for (let i = 0; i < 60; i++) {
        const x = (random() - 0.5) * 16, z = 9.2 + random() * 1.6;
        const step = z > 10 ? 4.6 : 5.4;
        matrix.makeTranslation(x, step + 0.15, z); wax.setMatrixAt(i, matrix);
        matrix.makeTranslation(x, step + 0.42, z); flames.setMatrixAt(i, matrix);
      }
      wax.castShadow = true;
      s.root.add(wax, flames);
    }
    if (a.tribute === 'banner') {
      const cloth = s.mesh(new THREE.PlaneGeometry(3, 9, 2, 8), new THREE.MeshStandardMaterial({ map: bannerMap('SZABADSÁG'), roughness: 0.95, side: THREE.DoubleSide }), [0, shaft0 + 4.6, 3.95]);
      cloth.rotation.x = -0.075;
      const position = cloth.geometry.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < position.count; i++) position.setZ(i, Math.sin(position.getY(i) * 1.3 + position.getX(i)) * 0.12);
      cloth.geometry.computeVertexNormals();
    }

    // Visitors.
    const people = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.3, 1.1, 2, 5).translate(0, 0.85, 0), s.material('#ffffff', { roughness: 0.9 }), 120);
    const tones = ['#3a3a42', '#6a4a36', '#8a2a2a', '#2c3d55', '#6b6b62', '#c9b27a', '#d9573f'];
    const count = { none: 0, tourists: 18, lone: 0, crowd: 110 }[a.visitors];
    for (let i = 0; i < count; i++) {
      const t = random() * Math.PI * 2, r = 11 + random() * 2;
      matrix.makeTranslation(Math.sin(t) * r * 1.0, 4.6, Math.cos(t) * r * 1.1 + 2);
      if (a.visitors === 'crowd') matrix.makeTranslation((random() - 0.5) * 24, 4.6, 11 + random() * 4.5);
      people.setMatrixAt(i, matrix);
      people.setColorAt(i, new THREE.Color(tones[i % tones.length]));
    }
    people.count = count;
    if (count) { people.castShadow = true; s.root.add(people); } else people.geometry.dispose();
    if (a.visitors === 'crowd') for (let i = 0; i < 6; i++) {
      const x = -10 + i * 4 + random(), z = 12 + random() * 3;
      s.rod([x, 4.6, z], [x, 9.6, z], 0.05, s.material('#3a3a3a'));
      s.mesh(new THREE.PlaneGeometry(1.5, 1), new THREE.MeshStandardMaterial({ color: ['#c8102e', '#f4f2ec', '#2f7a3a'][i % 3], side: THREE.DoubleSide }), [x + 0.75, 9.1, z]);
    }
    if (a.visitors === 'lone') {
      const lone = figure(s, { height: 1.75, style: 'doll', hair: 'hat', pose: 'standing', top: '#3a3430', bottom: '#2a2826', shoes: '#1a1a1a', skin: '#d9b08c', gaze: 'up' });
      s.root.add(lone.root);
      lone.root.position.set(1.5, 4.6, 13);
      lone.root.rotation.y = Math.PI;
      figures.push(lone);
    }

    // Fog round the plinth.
    const puffs = puffMap();
    const fogs: THREE.Mesh[] = [];
    const fogLevel = { clear: 0, wisps: 0.35, thick: 0.85 }[a.fog];
    if (fogLevel > 0) {
      const veil = new THREE.MeshBasicMaterial({ map: puffs, color: '#eef0ee', transparent: true, opacity: fogLevel * 0.9, depthWrite: false, side: THREE.DoubleSide });
      for (let i = 0; i < Math.round(8 + fogLevel * 14); i++) {
        const w = 12 + random() * 14;
        const mesh = s.mesh(new THREE.PlaneGeometry(w, w * 0.45), veil, [(random() - 0.5) * 30, 5 + random() * (fogLevel > 0.5 ? 22 : 12), (random() - 0.2) * 20]);
        mesh.castShadow = false;
        mesh.rotation.y = (random() - 0.5) * 0.6;
        fogs.push(mesh);
      }
    } else puffs.dispose();

    const drift = mix(0.2, 1.4, mood.energy);
    return s.finish({
      footprint: 16,
      update: (dt, time) => {
        for (const f of figures) f.update(dt, time);
        fogs.forEach((mesh, i) => { mesh.position.x += Math.sin(time * 0.2 + i) * 0.01 * drift; });
      },
    });
  },
});
