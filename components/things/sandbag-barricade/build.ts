import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';
import { flood, floodColour } from './flood';

const BAGS = {
  jute: 'Coarse brown jute gunny sacks, dark where they are wet.',
  woven: 'White woven-plastic sacks with faded blue and green stripes.',
  mixed: 'Whatever was to hand: jute, plastic, the odd printed rice sack.',
  cement: 'Grey paper-and-plastic cement bags turned to stone by the wet.',
  fertiliser: 'Bright yellow and green fertiliser sacks, loud against the brown water.',
} as const;
const BAG_TINTS: Record<keyof typeof BAGS, string[]> = {
  jute: ['#9a7a4c', '#86683f', '#a88755', '#6f5636'],
  woven: ['#e6e3d8', '#d9dbd6', '#cfd8dc', '#e9e2cc', '#bfd0c4'],
  mixed: ['#9a7a4c', '#e6e3d8', '#86683f', '#d9c35a', '#cfd8dc', '#c8553a', '#6f5636'],
  cement: ['#9c9e9a', '#8b8d8a', '#aeada6', '#7f8380'],
  fertiliser: ['#e2c22e', '#4f9a4a', '#e8d04a', '#3f8a5a', '#e6e3d8'],
};
const PLACES = {
  home: 'A family home: a painted wall, a wooden double door and a barred window.',
  shop: 'A small shop with its rolling shutter pulled most of the way down under a signboard.',
  pharmacy: 'A chemist\'s with a green cross sign, the medicines moved to the top shelves.',
  school: 'A primary school with blue gates and a painted board.',
  godown: 'A grain godown with a corrugated sliding door and sacks stacked inside.',
  shrine: 'A neighbourhood shrine room with an arched saffron doorway and a hanging bell.',
} as const;

export default defineThing({
  questions: {
    height: score('How high is the sandbag wall?', ['Three courses, shin high', 'Knee high', 'Waist high', 'Chest high, a real rampart']),
    state: choice('Is the barricade holding?', {
      holding: 'Holding: brown water outside, a dry floor behind it.',
      seeping: 'Seeping: it holds, but a puddle is spreading on the inside and someone is bailing.',
      breached: 'Breached in the middle, bags tumbled inward and water pouring through the gap.',
      unfinished: 'Unfinished: one end still open, spare bags stacked ready, the water already here.',
      overtopped: 'Overtopped: the water simply rose higher than the wall and stands level on both sides.',
    }),
    bags: choice('What are the bags made of?', BAGS),
    sheeting: choice('What plastic sheeting is laid over the outer face?', {
      blue: 'A bright blue tarpaulin weighted down with the top row of bags.',
      clear: 'Milky clear polythene, the bags ghosting through it.',
      black: 'Black builders\' plastic.',
      banner: 'An old vinyl advertising banner turned to a new use, lettering still showing.',
      none: 'None: bare bags only.',
    }),
    protects: choice('What is behind the doorway it protects?', PLACES),
    left: choice('What has been left at the barricade?', {
      nothing: 'Nothing. Everyone has gone to higher ground.',
      spade: 'A spade stuck upright in the top bags and a bucket beside it.',
      pump: 'A blue hose arcing over the wall, pumping water back out.',
      boats: 'Folded paper boats sailing on the flood side, launched by children.',
      dog: 'A street dog curled up asleep on top of the bags.',
      lamp: 'A row of sandals and a small oil lamp burning on the top course.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const zf = -0.72, R = 1.25, bagH = 0.14;
    const courses = Math.round(mix(3, 8, a.height));
    const top = courses * bagH;
    const dry = a.state === 'holding' || a.state === 'seeping';
    const level = a.state === 'overtopped' ? top - 0.045 : dry ? Math.min(0.34, top - 0.05) : Math.min(0.34, Math.max(0.2, top - 0.02));
    const pit = new THREE.Path();
    pit.absarc(0, -zf, R - 0.26, Math.PI, Math.PI * 2, false);
    pit.closePath();
    const f = flood(s, 2.3, 1.8, level, dry ? pit : undefined);
    const water = floodColour(s);

    // ---- the wall and its doorway ----
    const wallTint = { home: mood.cheer > 0.5 ? '#6fb6ad' : '#9fb0a6', shop: '#d9c9a1', pharmacy: '#e6e8e2', school: '#e8d9a8', godown: '#a9a195', shrine: '#e9e1cf' }[a.protects];
    const wallMat = s.material(wallTint, { roughness: 0.9 });
    const wallShape = new THREE.Shape();
    wallShape.moveTo(-1.6, 0); wallShape.lineTo(1.6, 0); wallShape.lineTo(1.6, 2.5); wallShape.lineTo(-1.6, 2.5); wallShape.closePath();
    const doorW = a.protects === 'godown' || a.protects === 'shop' ? 1.5 : 1.1, doorH = 1.95;
    const opening = new THREE.Path();
    opening.moveTo(-doorW / 2, 0.06); opening.lineTo(doorW / 2, 0.06);
    if (a.protects === 'shrine') { opening.lineTo(doorW / 2, doorH - 0.45); opening.absarc(0, doorH - 0.45, doorW / 2, 0, Math.PI, false); }
    else { opening.lineTo(doorW / 2, doorH); opening.lineTo(-doorW / 2, doorH); }
    opening.closePath();
    wallShape.holes.push(opening);
    s.mesh(new THREE.ExtrudeGeometry(wallShape, { depth: 0.24, bevelEnabled: false }), wallMat, [0, 0, zf - 0.24]);
    // Damp stain rising up the wall from the water.
    for (const side of [-1, 1]) s.box([1.6 - doorW / 2, level + 0.2 + mood.wear * 0.3, 0.012], [side * (doorW / 2 + (1.6 - doorW / 2) / 2), (level + 0.2 + mood.wear * 0.3) / 2, zf + 0.005], s.material(new THREE.Color(wallTint).lerp(water, 0.4), { roughness: 1 }));
    s.box([3.3, 0.1, 0.34], [0, 2.55, zf - 0.12], s.material(new THREE.Color(wallTint).multiplyScalar(0.8)));
    const inside = s.material('#1b1a18', { roughness: 1 });
    s.box([doorW, doorH, 0.02], [0, doorH / 2 + 0.06, zf - 0.23], inside);
    const wood = s.material('#6a4a2f', { roughness: 0.85 });
    const metal = s.material('#8e969a', { metalness: 0.55, roughness: 0.5 });
    const sign = (text: string, ink: string, paper: string, width = 1.9) => s.label(text, width, 0.34, [0, 2.22, zf + 0.03], ink, paper);
    if (a.protects === 'home') {
      const paint = s.material(mood.cheer > 0.5 ? '#2f6f9a' : '#5a4a3a', { roughness: 0.7 });
      for (const side of [-1, 1]) {
        const leaf = s.box([doorW / 2 - 0.02, doorH - 0.08, 0.05], [side * doorW / 4, doorH / 2 + 0.06, zf - 0.1], paint);
        leaf.rotation.y = side * -0.12;
        s.box([doorW / 2 - 0.16, 0.5, 0.012], [side * doorW / 4, 1.5, zf - 0.07], s.material('#00000022', { transparent: true, opacity: 0.25, depthWrite: false })).rotation.y = side * -0.12;
      }
      s.ring(0.05, 0.01, [-0.07, 1.15, zf - 0.05], metal);
      s.box([0.7, 0.75, 0.04], [1.15, 1.55, zf + 0.01], wood);
      s.box([0.6, 0.65, 0.02], [1.15, 1.55, zf + 0.03], inside);
      for (let i = 0; i < 5; i++) s.rod([0.9 + i * 0.125, 1.22, zf + 0.045], [0.9 + i * 0.125, 1.88, zf + 0.045], 0.012, metal);
      s.label(String(3 + Math.floor(random() * 90)) + '/' + 'ABCD'[Math.floor(random() * 4)], 0.34, 0.16, [-1.15, 1.75, zf + 0.012], '#f2efe2', '#2a4f8a');
      s.box([0.26, 0.36, 0.1], [-1.2, 1.3, zf + 0.05], s.material('#5d6468'));
    } else if (a.protects === 'shop' || a.protects === 'pharmacy') {
      const down = a.protects === 'shop' ? 0.72 : 0.35;
      const rows = Math.round((doorH * down) / 0.09);
      for (let i = 0; i < rows; i++) s.box([doorW - 0.02, 0.07, 0.04 + (i % 2) * 0.02], [0, doorH + 0.06 - 0.045 - i * 0.09, zf - 0.12], metal);
      s.box([doorW + 0.1, 0.16, 0.2], [0, doorH + 0.14, zf - 0.08], s.material('#6b7175', { metalness: 0.4 }));
      if (a.protects === 'shop') sign(['KIRANA STORE', 'TEA & SNACKS', 'TAILOR', 'CYCLE REPAIR', 'MOBILE RECHARGE'][Math.floor(random() * 5)], '#f6e7b0', '#a5271f', 2.3);
      else {
        sign('MEDICAL', '#ffffff', '#1f7a4a', 1.6);
        const green = s.material('#22a45a', { emissive: '#22a45a', emissiveIntensity: mix(0.1, 0.9, mood.daylight > 0.7 ? 1 : 0.2) });
        s.box([0.34, 0.11, 0.05], [1.3, 2.22, zf + 0.06], green); s.box([0.11, 0.34, 0.05], [1.3, 2.22, zf + 0.06], green);
        for (let i = 0; i < 3; i++) s.box([doorW - 0.2, 0.03, 0.2], [0, 1.0 + i * 0.3, zf - 0.3], s.material('#d9d5c6'));
        for (let i = 0; i < 14; i++) s.box([0.09, 0.12 + random() * 0.08, 0.08], [-0.42 + (i % 7) * 0.14, 1.09 + Math.floor(i / 7) * 0.3, zf - 0.28], s.material(['#d95a4a', '#3f7fb5', '#f0efe8', '#e2c22e'][i % 4]));
      }
    } else if (a.protects === 'school') {
      const blue = s.material('#2f5fa8', { roughness: 0.6 });
      for (const side of [-1, 1]) {
        s.box([doorW / 2 - 0.02, 0.06, 0.05], [side * doorW / 4, doorH - 0.1, zf - 0.1], blue);
        s.box([doorW / 2 - 0.02, 0.9, 0.03], [side * doorW / 4, 0.55, zf - 0.1], blue);
        for (let i = 0; i < 4; i++) s.rod([side * (0.07 + i * 0.13), 0.9, zf - 0.1], [side * (0.07 + i * 0.13), doorH - 0.1, zf - 0.1], 0.014, blue);
      }
      sign('PRIMARY SCHOOL', '#1c2f5a', '#f3ecd2', 2.1);
      s.cylinder(0.02, 0.09, 0.14, [1.2, 1.85, zf + 0.12], s.material('#b58a2a', { metalness: 0.7, roughness: 0.3 }), 12);
      s.rod([1.2, 1.92, zf + 0.12], [1.2, 2.1, zf + 0.02], 0.008, metal);
      s.box([0.8, 0.6, 0.03], [-1.1, 1.4, zf + 0.02], s.material('#23312b'));
    } else if (a.protects === 'godown') {
      for (let i = 0; i < 9; i++) s.box([0.075, doorH, 0.03 + (i % 2) * 0.02], [-doorW / 2 + 0.04 + i * 0.085 - 0.3, doorH / 2 + 0.06, zf + 0.03], metal);
      s.box([2.3, 0.06, 0.06], [0, doorH + 0.12, zf + 0.04], s.material('#4b5054'));
      const sack = s.material('#b79a66', { roughness: 1 });
      for (let i = 0; i < 9; i++) s.ball([0.26, 0.11, 0.2], [0.15 + (i % 2) * 0.3 + (Math.floor(i / 2) % 2) * 0.1, 0.5 + Math.floor(i / 2) * 0.2, zf - 0.35], sack, 10);
      s.label('GODOWN No ' + (1 + Math.floor(random() * 9)), 1.3, 0.26, [0.9, 2.25, zf + 0.012], '#2a2a2a', '#a9a195');
    } else {
      const saffron = s.material('#e07b1f', { roughness: 0.7 });
      const arch = s.ring(doorW / 2 + 0.06, 0.06, [0, doorH - 0.45 + 0.06, zf + 0.02], saffron, Math.PI);
      arch.scale.z = 0.6;
      for (const side of [-1, 1]) s.box([0.12, doorH - 0.45, 0.08], [side * (doorW / 2 + 0.06), (doorH - 0.45) / 2 + 0.06, zf + 0.02], saffron);
      s.cylinder(0.02, 0.085, 0.13, [0, doorH - 0.25, zf - 0.05], s.material('#c59a2f', { metalness: 0.75, roughness: 0.3 }), 12);
      s.rod([0, doorH - 0.19, zf - 0.05], [0, doorH + 0.02, zf - 0.05], 0.007, metal);
      const flame = s.material('#ffd27a', { emissive: '#ffb347', emissiveIntensity: 1.6 });
      s.ball([0.03, 0.05, 0.03], [0, 1.05, zf - 0.2], flame, 8);
      s.box([0.5, 0.9, 0.3], [0, 0.5, zf - 0.32], s.material('#b9b2a2'));
      const heads = Array.from({ length: 22 }, (_unused, i) => {
        const t = (i / 21) * Math.PI;
        return { at: [Math.cos(t) * (doorW / 2 - 0.02), doorH - 0.42 + Math.sin(t) * (doorW / 2 - 0.22) * 0.9 - Math.sin(t) * 0.0, zf + 0.09] as [number, number, number], size: 0.035, color: i % 3 ? '#f29a1c' : '#f6c21f' };
      });
      s.scatter(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9, flatShading: true }), heads);
    }
    // Threshold and the dry (or wet) floor behind the bags.
    s.box([doorW + 0.3, 0.12, 0.34], [0, 0.06, zf + 0.1], s.material('#a39d8f', { roughness: 0.95 }));
    if (dry) {
      const floor = s.mesh(new THREE.CircleGeometry(R - 0.14, 28, 0, Math.PI), s.material('#b5ae9e', { roughness: 0.95 }), [0, 0.012, zf]);
      floor.rotation.x = -Math.PI / 2; floor.rotation.z = Math.PI; floor.scale.y = -1;
      floor.rotation.set(-Math.PI / 2, 0, 0); floor.scale.set(1, -1, 1);
      (floor.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
      if (a.state === 'seeping') {
        const puddle = s.mesh(new THREE.CircleGeometry(1, 20), new THREE.MeshStandardMaterial({ color: water, roughness: 0.2, side: THREE.DoubleSide }), [0.2, 0.02, zf + 0.62]);
        puddle.rotation.x = -Math.PI / 2; puddle.scale.set(0.6, 0.3, 1);
        const trickle = s.mesh(new THREE.CircleGeometry(1, 12), puddle.material, [-0.35, 0.021, zf + 0.75]);
        trickle.rotation.x = -Math.PI / 2; trickle.scale.set(0.3, 0.12, 1);
        s.cylinder(0.13, 0.1, 0.2, [-0.45, 0.11, zf + 0.42], s.material('#c9482f', { roughness: 0.5, side: THREE.DoubleSide }), 14);
        s.rod([0.3, 0.02, zf + 0.25], [0.55, 0.9, zf + 0.12], 0.014, wood);
        s.ball([0.14, 0.04, 0.09], [0.28, 0.04, zf + 0.27], s.material('#d9d2bd', { roughness: 1 }), 8);
      }
    }

    // ---- the bags ----
    const pillow = new THREE.SphereGeometry(1, 14, 10);
    const pos = pillow.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const puff = (v: number, e: number) => Math.sign(v) * Math.abs(v) ** e;
      pos.setXYZ(i, puff(pos.getX(i), 0.6) * 0.29, puff(pos.getY(i), 0.75) * 0.082, puff(pos.getZ(i), 0.65) * 0.165);
    }
    pillow.computeVertexNormals();
    const tints = BAG_TINTS[a.bags];
    const placed: { at: THREE.Vector3; turn: THREE.Euler; tint: THREE.Color }[] = [];
    const wet = new THREE.Color('#5a4a38');
    const lay = (x: number, y: number, z: number, yaw: number, pitch = 0, rollAngle = 0) => {
      const tint = new THREE.Color(tints[Math.floor(random() * tints.length)]);
      tint.multiplyScalar(mix(0.88, 1.06, random()));
      if (y < level + 0.08) tint.lerp(wet, a.bags === 'jute' || a.bags === 'mixed' ? 0.4 : 0.18);
      placed.push({ at: new THREE.Vector3(x, y, z), turn: new THREE.Euler(pitch, yaw, rollAngle, 'YXZ'), tint });
    };
    const perCourse = 7;
    const span = a.state === 'unfinished' ? 0.72 : 1;
    const loose = mix(0.02, 0.1, mood.wear);
    const topRow: { x: number; z: number; theta: number }[] = [];
    for (let course = 0; course < courses; course++) {
      const y = bagH * (course + 0.5);
      const offset = (course % 2) * 0.5;
      const thick = course < Math.ceil(courses * 0.4) && courses > 3 ? 2 : 1;
      for (let ring = 0; ring < thick; ring++) {
        const radius = R + ring * 0.3;
        const n = perCourse + ring * 2 + (course % 2 && ring === 0 ? -1 : 0);
        for (let i = 0; i < n; i++) {
          const theta = ((i + 0.5 + offset * (ring === 0 ? 1 : 0)) / (perCourse + ring * 2)) * Math.PI;
          if (theta > Math.PI * span + 0.01 - course * 0.05 * (span < 1 ? 1 : 0)) continue;
          const gap = Math.abs(theta - Math.PI / 2);
          if (a.state === 'breached' && course > 0 && gap < 0.42 + (course / courses) * 0.25) continue;
          const lean = course === courses - 1 && random() < 0.28 ? 1 : 0;
          const x = Math.cos(theta) * (radius + lean * 0.08), z = zf + Math.sin(theta) * (radius + lean * 0.08);
          lay(x + (random() - 0.5) * loose, y - lean * 0.03, z + (random() - 0.5) * loose, Math.PI / 2 - theta + (random() - 0.5) * (0.12 + loose * 2), lean * (random() - 0.5) * 0.5, lean * 0.35 + (random() - 0.5) * loose * 2);
          if (course === courses - 1 && ring === 0) topRow.push({ x, z, theta });
        }
      }
    }
    if (a.state === 'breached') {
      // The washed-out bags lie tumbled just inside the gap.
      for (let i = 0; i < 4 + courses; i++) {
        const r = random() * 0.75, t = Math.PI / 2 + (random() - 0.5) * 1.1;
        lay(Math.cos(t) * r, level - 0.02 + random() * 0.05 + (i % 3) * 0.035, zf + Math.sin(t) * r * 0.9 + 0.1, random() * 6.28, (random() - 0.5) * 0.7, (random() - 0.5) * 0.7);
      }
      f.wake(0.9, zf + R, 0.9, 0.2);
      for (const side of [-1, 1]) f.ripple(side * 0.2, zf + R - 0.55, 0.16 + random() * 0.08, 2);
    }
    if (a.state === 'unfinished') {
      for (let i = 0; i < 9; i++) lay(-1.2 + (i % 2) * 0.3 + (random() - 0.5) * 0.05, level - 0.1 + Math.floor(i / 2) * bagH + 0.06, zf + 0.24 + (random() - 0.5) * 0.06, (i % 2) * 0.3 + (random() - 0.5) * 0.3, 0, (random() - 0.5) * 0.15);
    }
    // Sheeting over the outer face, with weight bags sitting on its top edge.
    if (a.sheeting !== 'none' && courses > 1) {
      const from = a.state === 'unfinished' ? -0.12 : a.state === 'breached' ? 0.15 : -0.34, to = a.state === 'unfinished' ? 0.36 : a.state === 'breached' ? 0.4 : 0.34;
      let sheet: THREE.Material;
      if (a.sheeting === 'banner') {
        const canvas = document.createElement('canvas');
        canvas.width = 512; canvas.height = 128;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#e8d23a'; ctx.fillRect(0, 0, 512, 128);
        ctx.fillStyle = '#c4281f'; ctx.fillRect(0, 0, 512, 26); ctx.fillRect(0, 108, 512, 20);
        ctx.fillStyle = '#1f3f8f'; ctx.font = 'bold 62px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(['GRAND SALE', 'VOTE VOTE', 'MEGA OFFER', 'COACHING'][Math.floor(random() * 4)], 256, 68);
        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.wrapS = THREE.RepeatWrapping; texture.repeat.x = -1;
        sheet = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.45, side: THREE.DoubleSide });
      } else if (a.sheeting === 'clear') sheet = new THREE.MeshStandardMaterial({ color: '#e9eef0', roughness: 0.2, transparent: true, opacity: 0.55, side: THREE.DoubleSide });
      else sheet = s.material(a.sheeting === 'blue' ? '#1f6fd0' : '#1d1e21', { roughness: 0.42, side: THREE.DoubleSide });
      const double = courses > 3;
      const low = Math.max(0.02, level - 0.08);
      const drape = s.mesh(new THREE.CylinderGeometry(R + 0.2, R + (double ? 0.52 : 0.26), top - low + 0.02, 28, 1, true, from * Math.PI, (to - from) * Math.PI), sheet, [0, (top + low) / 2 + 0.01, zf]);
      drape.castShadow = false;
      const flap = s.mesh(new THREE.RingGeometry(R - 0.2, R + 0.2, 28, 1, Math.PI / 2 - to * Math.PI, (to - from) * Math.PI), sheet, [0, top + 0.012, zf]);
      flap.rotation.x = -Math.PI / 2; flap.scale.y = -1;
      for (const bag of topRow) {
        const t = 0.5 - bag.theta / Math.PI;
        if (t > from + 0.05 && t < to - 0.05 && random() < 0.75) lay(bag.x, top + bagH * 0.5 + 0.01, bag.z, Math.PI / 2 - bag.theta + (random() - 0.5) * 0.5, 0, (random() - 0.5) * 0.2);
      }
    }
    const bagMesh = new THREE.InstancedMesh(pillow, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.95 }), placed.length);
    const matrix = new THREE.Matrix4(), q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1);
    placed.forEach((bag, index) => {
      bagMesh.setMatrixAt(index, matrix.compose(bag.at, q.setFromEuler(bag.turn), one));
      bagMesh.setColorAt(index, bag.tint);
    });
    bagMesh.instanceMatrix.needsUpdate = true;
    if (bagMesh.instanceColor) bagMesh.instanceColor.needsUpdate = true;
    bagMesh.castShadow = bagMesh.receiveShadow = true;
    s.root.add(bagMesh);
    if (a.state !== 'overtopped') {
      const outer = R + (courses > 3 ? 0.58 : 0.3);
      const arc = s.mesh(new THREE.RingGeometry(outer, outer + 0.03, 40, 1, Math.PI, Math.PI * span), new THREE.MeshStandardMaterial({ color: water.clone().lerp(new THREE.Color('#efe9d6'), 0.6), side: THREE.DoubleSide }), [0, level + 0.006, zf]);
      arc.rotation.x = -Math.PI / 2;
    }

    // ---- what was left there ----
    const perch = topRow.length ? topRow[Math.floor(topRow.length * (0.25 + random() * 0.2))] : { x: 0.8, z: zf + 0.8, theta: 1 };
    const py = Math.max(top, level) + (a.sheeting !== 'none' ? 0.02 : 0);
    if (a.left === 'spade') {
      s.rod([perch.x, py - 0.1, perch.z], [perch.x + 0.1, py + 1.05, perch.z - 0.06], 0.018, wood);
      s.box([0.2, 0.26, 0.02], [perch.x - 0.012, py + 0.02, perch.z + 0.008], metal).rotation.z = -0.09;
      s.rod([perch.x + 0.02, py + 1.05, perch.z - 0.06], [perch.x + 0.18, py + 1.05, perch.z - 0.06], 0.02, wood);
      const other = topRow[Math.floor(topRow.length * 0.72)] ?? perch;
      s.cylinder(0.14, 0.1, 0.24, [other.x, py + 0.12, other.z], s.material('#3f7fb5', { roughness: 0.5, side: THREE.DoubleSide }), 14);
      s.ring(0.13, 0.008, [other.x, py + 0.27, other.z], metal, Math.PI).rotation.y = 0.6;
    } else if (a.left === 'pump') {
      const hose = s.material('#2a6fc0', { roughness: 0.5 });
      s.tube([[0.25, 0.08, zf + 0.25], [0.5, py + 0.1, zf + 0.6], [0.72, py + 0.2, zf + 0.92], [0.95, py + 0.05, zf + 1.22], [1.05, level + 0.05, zf + 1.38]], 0.035, hose);
      s.box([0.34, 0.26, 0.26], [0.2, 0.2, zf + 0.22], s.material('#c9482f'));
      s.cylinder(0.06, 0.06, 0.1, [0.2, 0.38, zf + 0.22], s.material('#2a2a2a'), 10);
      const gush = s.mesh(new THREE.CylinderGeometry(0.03, 0.07, 0.16, 8), new THREE.MeshStandardMaterial({ color: water.clone().lerp(new THREE.Color('#ffffff'), 0.45), roughness: 0.2 }), [1.08, level + 0.07, zf + 1.42]);
      gush.rotation.x = 0.5;
      f.ripple(1.1, zf + 1.48, 0.12, 3);
    } else if (a.left === 'boats') {
      const paper = s.material('#f3f0e6', { roughness: 0.9, side: THREE.DoubleSide, flatShading: true });
      const inks = ['#f3f0e6', '#f0d9a0', '#bcd6e8', '#f2b8b8'];
      for (let i = 0; i < 3 + Math.round(mood.density * 3); i++) {
        const t = Math.PI * (0.15 + 0.7 * random()), r = R + 0.8 + random() * 0.25;
        const x = Math.cos(t) * r, z = Math.min(1.5, zf + Math.sin(t) * r * 0.95);
        const boat = new THREE.Group();
        const mat = i ? s.material(inks[i % inks.length], { roughness: 0.9, side: THREE.DoubleSide, flatShading: true }) : paper;
        const hull = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.07, 4, 1), mat);
        hull.rotation.x = Math.PI; hull.scale.set(1.5, 1, 0.5); hull.rotation.y = Math.PI / 4;
        const sail = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.11, 4), mat);
        sail.position.y = 0.075; sail.scale.set(1, 1, 0.4);
        boat.add(hull, sail);
        boat.traverse((node) => { node.castShadow = true; });
        boat.position.set(x, level + 0.035, z);
        boat.rotation.y = random() * 6.28;
        s.root.add(boat);
        f.ripple(x, z, 0.14, 1);
      }
    } else if (a.left === 'dog') {
      const fur = s.material(['#b98a55', '#d9c8a8', '#4a3c30'][Math.floor(random() * 3)], { roughness: 1 });
      const dog = new THREE.Group();
      const m = (at: readonly [number, number, number], scale: readonly [number, number, number]) => { const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), fur); mesh.position.set(...at); mesh.scale.set(...scale); mesh.castShadow = true; dog.add(mesh); return mesh; };
      m([0, 0.09, 0], [0.24, 0.1, 0.16]);
      m([0.2, 0.08, 0.1], [0.1, 0.075, 0.085]);
      m([0.28, 0.065, 0.14], [0.07, 0.04, 0.045]);
      m([0.17, 0.14, 0.06], [0.04, 0.05, 0.015]);
      const tail = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.025, 5, 12, Math.PI * 0.7), fur);
      tail.rotation.x = Math.PI / 2; tail.position.set(-0.12, 0.05, 0.02); tail.rotation.z = 2.2;
      dog.add(tail);
      dog.position.set(perch.x, py, perch.z);
      dog.rotation.y = Math.PI / 2 - perch.theta + 0.2;
      s.root.add(dog);
    } else if (a.left === 'lamp') {
      const base = topRow[Math.floor(topRow.length / 2) - 1] ?? perch;
      s.cylinder(0.06, 0.035, 0.035, [base.x, py + 0.02, base.z], s.material('#a5522f', { roughness: 0.9 }), 12);
      s.ball([0.022, 0.045, 0.022], [base.x, py + 0.075, base.z], s.material('#ffd27a', { emissive: '#ffa63a', emissiveIntensity: 2 }), 8);
      const glow = s.ball([0.14, 0.14, 0.14], [base.x, py + 0.08, base.z], new THREE.MeshBasicMaterial({ color: '#ffc267', transparent: true, opacity: 0.18, depthWrite: false }), 10);
      glow.castShadow = false;
      const hues = ['#e2482f', '#2b7fd0', '#f0c22e', '#3aa565', '#3a3a3a'];
      topRow.filter((_bag, index) => index % 2 === 0).slice(0, 4).forEach((bag, index) => {
        if (bag === base) return;
        for (const side of [-1, 1]) {
          const sandal = s.box([0.08, 0.02, 0.22], [bag.x + Math.cos(bag.theta + 1.57) * side * 0.06, py + 0.012, bag.z + Math.sin(bag.theta + 1.57) * side * 0.06], s.material(hues[index % hues.length], { roughness: 0.8 }));
          sandal.rotation.y = -bag.theta + Math.PI / 2 + Math.PI / 2;
        }
      });
    }

    return s.finish({ footprint: 2.3, update: (dt, time) => f.update(dt, time) });
  },
});
