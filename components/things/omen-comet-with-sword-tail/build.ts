import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix } from '@conjure/kit';

const STYLES = {
  chronicle: 'Hand-coloured woodcut: a gold blade, red flames, black outlines, like the Nuremberg Chronicle.',
  fire: 'Burning: a white-hot head and a blade of orange fire glowing against the sky.',
  gilt: 'A goldsmith\'s piece: polished gold and red enamel, like a reliquary.',
  ink: 'Black ink on cream paper, an uncoloured broadsheet print.',
} as const;
interface Palette { blade: string; edge: string; beard: string; head: string; halo: string; boss: string; glow: number; metal: number }
const PALETTE: Record<keyof typeof STYLES, Palette> = {
  chronicle: { blade: '#e0b04a', edge: '#2a1e18', beard: '#c4352a', head: '#e8b43c', halo: '#c4352a', boss: '#f2d27a', glow: 0.15, metal: 0.35 },
  fire: { blade: '#ffb347', edge: '#ff6a1a', beard: '#ff4a1a', head: '#fff1c2', halo: '#ff7a1a', boss: '#ffffff', glow: 1, metal: 0 },
  gilt: { blade: '#e3c063', edge: '#a8822e', beard: '#d9a83e', head: '#e3c063', halo: '#b02a2a', boss: '#c43a32', glow: 0.05, metal: 0.9 },
  ink: { blade: '#f1e9d6', edge: '#1d1a17', beard: '#1d1a17', head: '#f1e9d6', halo: '#1d1a17', boss: '#1d1a17', glow: 0, metal: 0 },
};

export default defineThing({
  questions: {
    style: choice('How is the comet painted?', STYLES),
    head: choice('What is at the head of the comet?', {
      star: 'An eight-pointed flaming star with a gilt boss.',
      face: 'A scowling face in a ring of flame, glaring down.',
      eye: 'A single staring eye in a ring of flame.',
      arm: 'A bent arm reaching out of the star, its fist gripping the sword\'s hilt.',
    }),
    blade: choice('What shape is the sword of its tail?', {
      straight: 'A long straight broadsword blade, tapering to a point.',
      curved: 'A curved falchion, broadening toward the tip.',
      wavy: 'A wavy flame-bladed sword, its edges rippling.',
    }),
    beard: choice('What streams from the edges of the tail?', {
      beard: 'Long hair-like streaks, the bearded tail of the chronicles.',
      flames: 'Tongues of flame licking off both edges.',
      sparks: 'A spray of sparks and small stars.',
      blood: 'Drops of blood falling from the point.',
    }),
    bearing: choice('How does it hang in the sky?', {
      plunging: 'Slanting down, point first, toward the earth.',
      level: 'Lying level across the sky like a drawn sword.',
      rising: 'Climbing, point raised, head low.',
      hanging: 'Hanging straight down, point at the ground, like the sword of Damocles.',
    }),
    mount: choice('What holds it up?', {
      sky: 'Nothing: it hangs free in the sky.',
      pole: 'A gilt pole on a round base, like a carved processional emblem.',
      clouds: 'It bursts out of a dark bank of cloud.',
      chains: 'It hangs on two chains from a wooden beam, like a warning sign over a gate.',
    }),
    below: choice('What is beneath it?', {
      nothing: 'Nothing below: the comet alone.',
      town: 'A small walled town with a church spire under the point, unaware.',
      watchers: 'Two small people, one pointing up in fear, one kneeling in prayer.',
      scroll: 'A ribbon scroll winding round the blade, lettered with a warning.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const P = PALETTE[a.style];
    const ink = a.style === 'ink';
    const into = <T extends THREE.Object3D>(group: THREE.Object3D, child: T) => { group.add(child); return child; };
    // Dread warms the fire: low cheer burns redder.
    const glow = P.glow * mix(1.3, 0.8, mood.cheer) * mix(0.6, 1.2, mood.energy * 0.5 + 0.5);
    const paint = (colour: string, emissive = 0, extra: THREE.MeshStandardMaterialParameters = {}) =>
      s.material(colour, { metalness: P.metal, roughness: P.metal > 0.5 ? mix(0.25, 0.5, mood.wear) : 0.6, emissive: emissive > 0 ? colour : '#000000', emissiveIntensity: emissive, ...extra });
    const bladeMaterial = paint(P.blade, a.style === 'fire' ? glow * 0.9 : 0);
    const edgeMaterial = paint(P.edge, a.style === 'fire' ? glow : 0);
    const beardMaterial = paint(P.beard, a.style === 'ink' ? 0 : Math.max(0.25, glow));
    const headMaterial = paint(P.head, a.style === 'fire' ? glow * 1.2 : P.glow * 0.5);
    const haloMaterial = paint(P.halo, a.style === 'ink' || a.style === 'gilt' ? 0 : Math.max(0.3, glow));

    // ---- The comet, built along +x from its head at the origin to the point, in the xy plane facing +z.
    const comet = new THREE.Group();
    const L = 3.1, X0 = 0.62, W0 = 0.15, TIP = L - 0.42;
    const centreline = (t: number) => (a.blade === 'curved' ? 0.32 * t * t : 0);
    const halfWidth = (t: number, x: number) => {
      let w = a.blade === 'curved' ? W0 * (0.85 + 0.55 * t) : W0 * (1 - 0.3 * t);
      if (a.blade === 'wavy') w += 0.03 * Math.sin(t * Math.PI * 10);
      if (x > TIP) w *= Math.max(0, (L - x) / (L - TIP)) ** (a.blade === 'curved' ? 0.6 : 1);
      return Math.max(0, w);
    };
    const N = 60;
    const upper: THREE.Vector2[] = [], lower: THREE.Vector2[] = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N, x = X0 + (L - X0) * t, c = centreline(t), w = halfWidth(t, x);
      upper.push(new THREE.Vector2(x, c + w));
      lower.push(new THREE.Vector2(x, c - w * (a.blade === 'curved' ? 0.55 : 1)));
    }
    const outline = new THREE.Shape([...lower, ...upper.slice(0, -1).reverse()]);
    const bladeGeometry = new THREE.ExtrudeGeometry(outline, { depth: 0.035, bevelEnabled: true, bevelThickness: 0.014, bevelSize: 0.016, bevelSegments: 1 });
    bladeGeometry.translate(0, 0, -0.0175);
    into(comet, s.mesh(bladeGeometry, bladeMaterial));
    // The fuller down the middle, and an outline along both edges.
    const along = (offset: number, from = 0.04, to = 0.82) => {
      const pts: [number, number, number][] = [];
      for (let k = 0; k <= 24; k++) {
        const t = from + (to - from) * (k / 24), x = X0 + (L - X0) * t;
        pts.push([x, centreline(t) + offset * halfWidth(t, x), 0.034]);
      }
      return pts;
    };
    into(comet, s.tube(along(0), 0.011, edgeMaterial));
    if (a.style === 'chronicle' || a.style === 'ink') for (const side of [-1, 1]) into(comet, s.tube(along(side * (a.blade === 'curved' && side < 0 ? 0.5 : 0.92), 0.0, 0.97), 0.008, edgeMaterial));

    // The crossguard and grip between the head and the blade.
    const guard = into(comet, s.box([0.07, 0.62, 0.07], [X0 - 0.03, 0, 0], headMaterial));
    void guard;
    for (const side of [-1, 1]) {
      const quillon = into(comet, s.mesh(new THREE.ConeGeometry(0.06, 0.18, 6), haloMaterial, [X0 - 0.03, side * 0.39, 0]));
      quillon.rotation.z = side > 0 ? 0 : Math.PI;
    }
    const grip = into(comet, s.cylinder(0.045, 0.045, 0.3, [X0 - 0.2, 0, 0], paint(ink ? '#1d1a17' : '#7a1f1a'), 10));
    grip.rotation.z = Math.PI / 2;

    // ---- The head: a flaming star, with a face, an eye, or an arm.
    const star = (outer: number, inner: number, points: number) => {
      const shape = new THREE.Shape();
      for (let k = 0; k < points * 2; k++) {
        const t = (k / (points * 2)) * Math.PI * 2 + Math.PI / 2, r = k % 2 ? inner : outer;
        if (k === 0) shape.moveTo(Math.cos(t) * r, Math.sin(t) * r); else shape.lineTo(Math.cos(t) * r, Math.sin(t) * r);
      }
      shape.closePath();
      return shape;
    };
    const head = new THREE.Group();
    comet.add(head);
    const halo = into(head, s.mesh(new THREE.ExtrudeGeometry(star(0.62, 0.3, 14), { depth: 0.03, bevelEnabled: false }), haloMaterial, [0, 0, -0.06]));
    into(head, s.mesh(new THREE.ExtrudeGeometry(star(0.42, 0.2, 8), { depth: 0.06, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 1 }), headMaterial, [0, 0, -0.03]));
    const disc = (draw: (ctx: CanvasRenderingContext2D) => void, r: number) => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 256;
      const ctx = canvas.getContext('2d')!;
      draw(ctx);
      const map = new THREE.CanvasTexture(canvas);
      map.colorSpace = THREE.SRGBColorSpace;
      return into(head, s.mesh(new THREE.CircleGeometry(r, 40), new THREE.MeshStandardMaterial({ map, roughness: 0.5, metalness: P.metal * 0.5, emissive: a.style === 'fire' ? '#ffffff' : '#000000', emissiveMap: a.style === 'fire' ? map : null, emissiveIntensity: a.style === 'fire' ? glow * 0.6 : 0 }), [0, 0, 0.06]));
    };
    const faceInk = ink ? '#1d1a17' : '#3a1410';
    if (a.head === 'face') {
      disc((ctx) => {
        ctx.fillStyle = P.head; ctx.fillRect(0, 0, 256, 256);
        ctx.strokeStyle = faceInk; ctx.fillStyle = faceInk; ctx.lineWidth = 9; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(128, 128, 120, 0, Math.PI * 2); ctx.stroke();
        for (const side of [-1, 1]) {
          ctx.beginPath(); ctx.moveTo(128 + side * 22, 92); ctx.lineTo(128 + side * 78, 72); ctx.stroke();
          ctx.beginPath(); ctx.ellipse(128 + side * 46, 108, 14, 9, 0, 0, Math.PI * 2); ctx.fill();
        }
        ctx.beginPath(); ctx.moveTo(128, 112); ctx.lineTo(116, 160); ctx.lineTo(136, 160); ctx.stroke();
        ctx.beginPath(); ctx.arc(128, 214, 50, 1.2 * Math.PI, 1.8 * Math.PI); ctx.stroke();
      }, 0.21);
    } else if (a.head === 'eye') {
      disc((ctx) => {
        ctx.fillStyle = P.head; ctx.fillRect(0, 0, 256, 256);
        ctx.fillStyle = '#f6f1e4'; ctx.strokeStyle = faceInk; ctx.lineWidth = 9;
        ctx.beginPath(); ctx.moveTo(18, 128); ctx.quadraticCurveTo(128, 30, 238, 128); ctx.quadraticCurveTo(128, 226, 18, 128); ctx.fill(); ctx.stroke();
        ctx.fillStyle = ink ? '#6a645c' : '#b0302a'; ctx.beginPath(); ctx.arc(128, 128, 44, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#120a08'; ctx.beginPath(); ctx.arc(128, 128, 20, 0, Math.PI * 2); ctx.fill();
      }, 0.21);
    } else {
      into(head, s.ball([0.13, 0.13, 0.08], [0, 0, 0.05], paint(P.boss, a.style === 'fire' ? glow : 0), 18));
    }
    if (a.head === 'arm') {
      // Paré's comet: a sleeved arm bending out of the star, the fist closed on the grip.
      const sleeve = paint(ink ? '#3a3430' : '#9a2a22');
      const skin = s.material(ink ? '#efe4cc' : '#e2b48e');
      const shoulder: [number, number, number] = [0.02, 0.12, 0.1], elbow: [number, number, number] = [0.1, 0.5, 0.14], fist: [number, number, number] = [X0 - 0.22, 0.02, 0.1];
      into(comet, s.rod(shoulder, elbow, 0.06, sleeve, 0.05));
      into(comet, s.rod(elbow, fist, 0.05, sleeve, 0.04));
      into(comet, s.ball([0.06, 0.06, 0.06], elbow, sleeve, 12));
      into(comet, s.ball([0.075, 0.065, 0.07], fist, skin, 14));
    }

    // ---- What streams from the edges.
    const streaks: { at: THREE.Vector3; dir: THREE.Vector3; length: number; width: number }[] = [];
    if (a.beard === 'beard' || a.beard === 'flames') {
      const count = a.beard === 'beard' ? Math.round(mix(24, 40, mood.density)) : 18;
      for (let i = 0; i < count; i++) {
        const t = (i + random() * 0.6) / count * 0.92, x = X0 + (L - X0) * t;
        const side = i % 2 ? 1 : -1, w = halfWidth(t, x) * (side < 0 && a.blade === 'curved' ? 0.55 : 1);
        const ang = (a.beard === 'beard' ? 0.45 : 1.0) + (random() - 0.5) * 0.3;
        const length = a.beard === 'beard' ? (0.55 - t * 0.35) * (0.7 + random() * 0.6) : 0.12 + random() * 0.12;
        streaks.push({ at: new THREE.Vector3(x, centreline(t) + side * w, 0), dir: new THREE.Vector3(Math.cos(ang), side * Math.sin(ang), 0), length, width: a.beard === 'beard' ? 0.016 : 0.05 });
      }
      // The coma behind the head streams back too.
      for (let i = 0; i < 9; i++) {
        const ang = Math.PI * (0.65 + (i / 8) * 0.7);
        streaks.push({ at: new THREE.Vector3(Math.cos(ang) * 0.5, Math.sin(ang) * 0.5, -0.02), dir: new THREE.Vector3(Math.cos(ang), Math.sin(ang), 0), length: 0.25 + random() * 0.2, width: a.beard === 'beard' ? 0.02 : 0.06 });
      }
    }
    const beard = new THREE.Group();
    comet.add(beard);
    if (streaks.length) {
      const cone = new THREE.ConeGeometry(1, 1, 5);
      cone.translate(0, -0.5, 0);
      cone.rotateZ(Math.PI); // base at the origin, point along +y
      const mesh = new THREE.InstancedMesh(cone, beardMaterial, streaks.length);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion();
      streaks.forEach((streak, k) => {
        q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), streak.dir.normalize());
        m.compose(streak.at, q, new THREE.Vector3(streak.width, streak.length, streak.width * 0.6));
        mesh.setMatrixAt(k, m);
      });
      mesh.castShadow = true;
      beard.add(mesh);
    }
    if (a.beard === 'sparks') {
      const sparks: { at: readonly [number, number, number]; size: number }[] = [];
      for (let i = 0; i < Math.round(mix(30, 60, mood.density)); i++) {
        const t = random(), x = X0 + (L - X0) * t * 0.95;
        sparks.push({ at: [x + (random() - 0.5) * 0.2, centreline(t) + (random() - 0.5) * (0.5 + t * 0.6), (random() - 0.5) * 0.15], size: 0.02 + random() * 0.03 });
      }
      beard.add(s.scatter(new THREE.OctahedronGeometry(1), beardMaterial, sparks));
    }

    // ---- How it bears: turn the comet in its plane.
    const bearing = { plunging: -0.55, level: -0.06, rising: 0.5, hanging: -Math.PI / 2 }[a.bearing];
    comet.rotation.z = bearing;
    comet.rotation.y = -0.12;
    s.root.add(comet);
    comet.updateMatrixWorld(true);
    const tipWorld = new THREE.Vector3(L, centreline(1), 0).applyMatrix4(comet.matrixWorld);
    if (a.beard === 'blood') {
      // Drops falling from the point, straight down.
      const drops: { at: readonly [number, number, number]; size: number }[] = [];
      for (let i = 0; i < 6; i++) drops.push({ at: [tipWorld.x + (random() - 0.5) * 0.04, tipWorld.y - 0.1 - i * 0.16 - random() * 0.05, tipWorld.z], size: 0.03 - i * 0.002 });
      const drop = new THREE.SphereGeometry(1, 10, 8);
      drop.scale(1, 1.4, 1);
      s.scatter(drop, paint(ink ? '#1d1a17' : '#8a1010', 0, { metalness: 0.2, roughness: 0.3 }), drops);
    }
    const bounds = new THREE.Box3().setFromObject(s.root);
    const span = bounds.getSize(new THREE.Vector3());

    // ---- What holds it, and what lies below: lift the comet clear of whatever stands under it.
    const lift = a.below === 'watchers' ? 0.85 : a.below === 'town' ? 0.55 : a.mount === 'pole' ? 0.55 : a.mount === 'clouds' ? 0.22 : a.mount === 'chains' ? 0.35 : 0;
    s.root.position.y = 0;
    const offset = lift - bounds.min.y;
    for (const child of [...s.root.children]) child.position.y += offset;
    const bottom = lift, topY = bounds.max.y + offset;
    const midX = (bounds.min.x + bounds.max.x) / 2;
    const wood = s.material(ink ? '#3a3430' : '#6a4a2c', { roughness: 0.75 });
    const gilt = s.material(ink ? '#1d1a17' : '#d4aa4e', { metalness: ink ? 0 : 0.75, roughness: 0.4 });
    if (a.mount === 'pole') {
      const centre = new THREE.Vector3((X0 + L) * 0.4, 0, 0).applyMatrix4(comet.matrixWorld);
      centre.y += offset;
      const poleTop = Math.max(bottom + 0.05, centre.y);
      s.cylinder(0.32, 0.38, 0.08, [centre.x, 0.04, centre.z], wood, 32);
      s.cylinder(0.025, 0.03, poleTop, [centre.x, poleTop / 2, centre.z - 0.06], gilt, 12);
      s.ball([0.05, 0.05, 0.05], [centre.x, 0.1, centre.z - 0.06], gilt, 12);
    } else if (a.mount === 'clouds') {
      const puffs: { at: readonly [number, number, number]; size: number }[] = [];
      const lowEnd = a.bearing === 'rising' ? bounds.min.x : a.bearing === 'level' ? midX : bounds.max.x;
      const centre = a.bearing === 'hanging' ? midX : (lowEnd + midX) / 2;
      for (let i = 0; i < 26; i++) {
        const size = 0.16 + random() * 0.16;
        puffs.push({ at: [centre + (random() - 0.5) * span.x * 0.6, size * 0.9 + random() * 0.25, (random() - 0.5) * 0.5], size });
      }
      s.scatter(new THREE.SphereGeometry(1, 12, 9), s.material(ink ? '#d8cfbc' : mood.cheer > 0.5 ? '#8a8794' : '#5a5664', { roughness: 0.95 }), puffs);
    } else if (a.mount === 'chains') {
      const beamY = topY + 0.3, half = Math.max(span.x / 2 + 0.25, 0.6);
      for (const side of [-1, 1]) s.box([0.1, beamY + 0.05, 0.1], [midX + side * half, (beamY + 0.05) / 2, -0.25], wood);
      s.box([half * 2 + 0.25, 0.1, 0.12], [midX, beamY, -0.25], wood);
      for (const t of [0.3, 0.75]) {
        const anchor = new THREE.Vector3(X0 + (L - X0) * t * (a.bearing === 'hanging' ? 0.1 : 1), centreline(t), 0).applyMatrix4(comet.matrixWorld);
        anchor.y += offset;
        s.rod([anchor.x, beamY - 0.05, -0.2], [anchor.x, anchor.y + 0.05, anchor.z], 0.012, gilt);
        for (let k = 0; k < 8; k++) {
          const y = anchor.y + 0.05 + ((beamY - anchor.y - 0.1) * (k + 0.5)) / 8;
          const link = s.ring(0.025, 0.007, [anchor.x, y, -0.2 + ((anchor.z + 0.2) * (k + 0.5)) / 8], gilt);
          link.rotation.y = k % 2 ? Math.PI / 2 : 0;
        }
      }
    }
    const people: ReturnType<typeof figure>[] = [];
    if (a.below === 'town') {
      const target = new THREE.Vector3(tipWorld.x, 0, 0.2);
      const wall = s.material(ink ? '#f1e9d6' : '#d9cdb0', { roughness: 0.85 });
      const roof = s.material(ink ? '#1d1a17' : '#a8442e', { roughness: 0.7 });
      s.cylinder(0.42, 0.44, 0.1, [target.x, 0.05, target.z], wall, 24);
      for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * Math.PI * 2 + random() * 0.4, r = 0.12 + random() * 0.18;
        const w = 0.09 + random() * 0.05, h = 0.1 + random() * 0.08;
        s.box([w, h, w], [target.x + Math.cos(ang) * r, 0.1 + h / 2, target.z + Math.sin(ang) * r], wall);
        s.mesh(new THREE.ConeGeometry(w * 0.75, h * 0.7, 4), roof, [target.x + Math.cos(ang) * r, 0.1 + h + h * 0.35, target.z + Math.sin(ang) * r]).rotation.y = Math.PI / 4;
      }
      s.box([0.09, 0.32, 0.09], [target.x, 0.26, target.z - 0.05], wall);
      s.mesh(new THREE.ConeGeometry(0.07, 0.24, 4), roof, [target.x, 0.54, target.z - 0.05]).rotation.y = Math.PI / 4;
      for (let i = 0; i < 4; i++) {
        const ang = (i / 4) * Math.PI * 2 + Math.PI / 4;
        s.cylinder(0.05, 0.05, 0.2, [target.x + Math.cos(ang) * 0.42, 0.1, target.z + Math.sin(ang) * 0.42], wall, 10);
      }
    } else if (a.below === 'watchers') {
      const at = tipWorld.x - Math.sign(Math.cos(bearing)) * 0.4;
      const colours = ink ? [['#3a3430', '#2a2622'], ['#6a645c', '#3a3430']] : [['#3f5f8a', '#4a3a2a'], ['#8a3a2a', '#5a4a3a']];
      const poses = ['pointing', 'kneeling'] as const;
      poses.forEach((pose, i) => {
        const person = figure(s, { height: 0.62, pose, style: 'doll', gaze: 'up', hair: i ? 'hood' : 'hat', top: colours[i][0], bottom: colours[i][1], skin: ink ? '#efe4cc' : '#d9b08c', mirror: tipWorld.x < midX });
        if (pose === 'pointing') { person.joints.shoulders.right.rotation.x = -2.4; person.joints.shoulders.left.rotation.x = -2.4; }
        if (pose === 'kneeling') { person.joints.shoulders.left.rotation.set(-1.2, 0, 0); person.joints.shoulders.right.rotation.set(-1.2, 0, 0); person.joints.elbows.left.rotation.set(-1.2, -0.6, 0); person.joints.elbows.right.rotation.set(-1.2, 0.6, 0); }
        person.settle();
        person.root.position.set(at + (i ? 0.35 : -0.05), 0, 0.25 + i * 0.12);
        person.root.rotation.y = i ? -0.3 : 0.4;
        s.root.add(person.root);
        people.push(person);
      });
    } else if (a.below === 'scroll') {
      // A ribbon winding round the blade, lettered with a warning.
      const canvas = document.createElement('canvas');
      canvas.width = 1024; canvas.height = 96;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#f2ead6'; ctx.fillRect(0, 0, 1024, 96);
      ctx.strokeStyle = ink ? '#1d1a17' : '#7a1f1a'; ctx.lineWidth = 6; ctx.strokeRect(3, 3, 1018, 90);
      ctx.fillStyle = ink ? '#1d1a17' : '#7a1f1a'; ctx.font = 'bold 64px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('VAE · VAE · VAE · HABITANTIBVS', 512, 50, 990);
      const map = new THREE.CanvasTexture(canvas);
      map.colorSpace = THREE.SRGBColorSpace;
      const geometry = new THREE.PlaneGeometry(L * 0.8, 0.14, 64, 1);
      const pos = geometry.getAttribute('position');
      for (let k = 0; k < pos.count; k++) {
        const x = pos.getX(k), t = (x / (L * 0.8)) + 0.5;
        const wave = Math.sin(t * Math.PI * 3);
        pos.setXYZ(k, X0 + 0.1 + t * L * 0.72, centreline(t) + pos.getY(k) + wave * 0.12, Math.cos(t * Math.PI * 3) * 0.16);
      }
      geometry.computeVertexNormals();
      const ribbon = s.mesh(geometry, new THREE.MeshStandardMaterial({ map, side: THREE.DoubleSide, roughness: 0.8 }));
      comet.add(ribbon);
      ribbon.position.y = 0;
    }

    // ---- Motion: the beard flickers and the comet drifts on its path, more with energy.
    const pace = mix(0.5, 4, mood.energy);
    const baseY = comet.position.y;
    const drift = a.mount === 'sky' && a.below !== 'scroll' ? 0.04 * mood.energy : 0;
    return s.finish({
      update: (dt, time) => {
        beard.scale.set(1 + Math.sin(time * pace) * 0.04, 1 + Math.sin(time * pace * 1.3 + 1) * 0.06, 1);
        halo.rotation.z += dt * 0.15 * pace * 0.3;
        comet.position.y = baseY + (1 + Math.sin(time * 0.6)) * drift;
        for (const person of people) person.update(dt, time);
      },
    });
  },
});
