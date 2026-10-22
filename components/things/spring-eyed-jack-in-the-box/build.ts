import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

type P3 = [number, number, number];

export default defineThing({
  questions: {
    state: choice('What has the box just done?', {
      fresh: 'Just gone off: lid flung back, jack at full height still boinging, a puff of paper confetti around it.',
      up: 'Jack is up and has been for a while, standing straight on his spring.',
      half: 'Half out: the lid pushed partway open, the head peering over the rim.',
      shut: 'Shut tight, crank ready, nothing showing but the painted tin.',
      sagged: 'Stuck open for years: the tired spring has sagged over the side and the head hangs.',
    }),
    face: choice("What is the clown's face like?", {
      jolly: 'Jolly: a wide red smile, round cheeks, raised brows.',
      leering: 'Leering: a lopsided toothy smirk under slanted brows.',
      sad: 'Sad: a downturned mouth, drooping brows and a painted blue tear.',
      worn: 'Worn featureless: the paint handled away to bare grey, only the nose left.',
    }),
    eyes: choice('What about the spring eyes?', {
      both: 'Both eyeballs out on their springs, pointing slightly different ways.',
      snapped: 'One eye on its spring; the other spring has snapped and its eyeball lies by the box.',
      dangling: 'Both springs overstretched, the eyeballs dangling down to the chin.',
      painted: 'No springs: flat painted-on eyes.',
    }),
    litho: choice('What is printed on the tin?', {
      stars: 'Yellow stars on midnight blue.',
      harlequin: 'Harlequin diamonds.',
      stripes: 'Circus-tent stripes.',
      letters: 'Nursery alphabet blocks: big letters in boxes.',
      dots: 'Big polka dots on cream.',
    }),
    colours: choice('What is the colour scheme?', {
      primary: 'Toy-shop primaries: red, yellow and blue.',
      pastel: 'Faded nursery pastels: pink, mint and butter.',
      mono: 'Black, white and one red, a sinister harlequin.',
      carnival: 'Carnival purple, green and gold.',
    }),
    hat: choice('What is on his head?', {
      jester: 'A two-horned jester cap with bells.',
      cone: 'A tall cone hat with pom-poms.',
      bowler: 'A tiny bowler hat.',
      tufts: 'Nothing: a bald crown between two tufts of orange hair.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const wear = mood.wear;
    const scheme = { primary: ['#d62b2b', '#f2c32e', '#2957b8'], pastel: ['#ef9fb4', '#f3e3a0', '#9fd9c2'], mono: ['#1a191c', '#efede6', '#c8202a'], carnival: ['#6b2f9c', '#e0b030', '#2f9a55'] }[a.colours];
    const dull = (c: string) => '#' + new THREE.Color(c).lerp(new THREE.Color('#8f8676'), wear * 0.35).getHexString();
    const [c1, c2, c3] = scheme.map(dull);
    const paint = (c: string, o: THREE.MeshStandardMaterialParameters = {}) => s.material(dull(c), { roughness: 0.5, ...o });
    const steel = s.material('#b9bec2', { metalness: 0.85, roughness: 0.28 + wear * 0.3 });
    const black = s.material('#17161a', { roughness: 0.4 });
    const S = 0.15, half = S / 2;

    // Lithographed tin.
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    const g = canvas.getContext('2d')!;
    g.fillStyle = a.litho === 'dots' ? dull('#f1e8cf') : a.litho === 'stars' && a.colours === 'primary' ? dull('#1c2f6b') : c1; g.fillRect(0, 0, 256, 256);
    if (a.litho === 'stars') { g.fillStyle = c2; for (let i = 0; i < 14; i++) { const x = 20 + random() * 216, y = 20 + random() * 216, r = 8 + random() * 12; g.beginPath(); for (let k = 0; k < 10; k++) { const t = k * Math.PI / 5, rr = k % 2 ? r * 0.42 : r; g.lineTo(x + Math.sin(t) * rr, y - Math.cos(t) * rr); } g.fill(); } }
    else if (a.litho === 'harlequin') { for (let i = -1; i < 5; i++) for (let j = -1; j < 5; j++) { g.fillStyle = (i + j) % 2 ? c2 : c3; const x = i * 64 + (j % 2 ? 32 : 0), y = j * 48; g.beginPath(); g.moveTo(x + 32, y); g.lineTo(x + 64, y + 48); g.lineTo(x + 32, y + 96); g.lineTo(x, y + 48); g.fill(); } }
    else if (a.litho === 'stripes') { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? c2 : c1; g.fillRect(i * 32, 0, 32, 256); } }
    else if (a.litho === 'letters') { const letters = 'JACK'; for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { g.fillStyle = (i + j) % 2 ? c2 : c3; g.fillRect(i * 128 + 8, j * 128 + 8, 112, 112); g.fillStyle = (i + j) % 2 ? c3 : c2; g.font = 'bold 96px serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(letters[j * 2 + i], i * 128 + 64, j * 128 + 70); } }
    else { for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) { g.fillStyle = [c1, c3, c2][(i + j) % 3]; g.beginPath(); g.arc(44 + i * 84, 44 + j * 84, 28, 0, 7); g.fill(); } }
    g.strokeStyle = c3; g.lineWidth = 14; g.strokeRect(7, 7, 242, 242);
    g.strokeStyle = c2; g.lineWidth = 4; g.strokeRect(16, 16, 224, 224);
    for (let i = 0; i < Math.round(wear * 26); i++) { const x = random() * 256, y = random() < 0.6 ? (random() < 0.5 ? random() * 40 : 216 + random() * 40) : random() * 256, r = 6 + random() * 22 * wear; const rust = g.createRadialGradient(x, y, 1, x, y, r); rust.addColorStop(0, 'rgba(92,48,20,0.95)'); rust.addColorStop(0.7, 'rgba(130,70,30,0.7)'); rust.addColorStop(1, 'rgba(130,70,30,0)'); g.fillStyle = rust; g.fillRect(x - r, y - r, r * 2, r * 2); }
    const litho = new THREE.CanvasTexture(canvas);
    litho.colorSpace = THREE.SRGBColorSpace;
    const tin = new THREE.MeshStandardMaterial({ map: litho, metalness: 0.35, roughness: 0.35 + wear * 0.4 });
    const inside = s.material('#2a2622', { roughness: 0.8 });

    const box = new THREE.Group();
    s.root.add(box);
    const B = <T extends THREE.Object3D>(o: T) => { box.add(o); return o; };
    for (const [x, z, ry] of [[0, half, 0], [0, -half, Math.PI], [half, 0, Math.PI / 2], [-half, 0, -Math.PI / 2]] as const) {
      const wall = B(s.mesh(new THREE.PlaneGeometry(S, S), tin, [x, half, z])); wall.rotation.y = ry;
      const back = B(s.mesh(new THREE.PlaneGeometry(S * 0.98, S * 0.98), inside, [x * 0.97, half, z * 0.97])); back.rotation.y = ry + Math.PI;
    }
    B(s.box([S, 0.004, S], [0, 0.002, 0], inside));
    for (const x of [-1, 1]) for (const z of [-1, 1]) B(s.box([0.006, S + 0.002, 0.006], [x * half, half, z * half], steel));
    for (const y of [0.003, S]) { for (const z of [-1, 1]) B(s.box([S + 0.006, 0.006, 0.006], [0, y, z * half], steel)); for (const x of [-1, 1]) B(s.box([0.006, 0.006, S + 0.006], [x * half, y, 0], steel)); }
    // Crank.
    B(s.rod([half, S * 0.45, 0.01], [half + 0.025, S * 0.45, 0.01], 0.005, steel));
    const crankTurn = random() * 6.3;
    const knob: P3 = [half + 0.025, S * 0.45 + Math.sin(crankTurn) * 0.035, 0.01 + Math.cos(crankTurn) * 0.035];
    B(s.rod([half + 0.025, S * 0.45, 0.01], knob, 0.004, steel));
    B(s.rod(knob, [knob[0] + 0.03, knob[1], knob[2]], 0.004, steel));
    B(s.ball([0.012, 0.012, 0.012], [knob[0] + 0.036, knob[1], knob[2]], paint(scheme[0]), 12));
    // Lid.
    const lidAngle = { fresh: -2.05, up: -1.75, half: -1.12, shut: 0, sagged: -1.95 }[a.state] + (a.state === 'shut' ? 0 : (random() - 0.5) * 0.15);
    const lid = new THREE.Group();
    lid.position.set(0, S + 0.004, -half);
    lid.rotation.x = lidAngle;
    box.add(lid);
    const lidTop = s.mesh(new THREE.PlaneGeometry(S, S), tin, [0, 0.003, half]); lidTop.rotation.x = -Math.PI / 2; lid.add(lidTop);
    lid.add(s.box([S + 0.006, 0.005, S + 0.006], [0, 0, half], steel));
    const lidIn = s.mesh(new THREE.PlaneGeometry(S * 0.96, S * 0.96), inside, [0, -0.003, half]); lidIn.rotation.x = Math.PI / 2; lid.add(lidIn);
    lid.add(s.box([0.03, 0.02, 0.004], [0, -0.01, S + 0.002], steel));

    const helix = (path: (t: number) => THREE.Vector3, turns: number, radius: number, wire: number, material: THREE.Material) => {
      const points: THREE.Vector3[] = [];
      const n = Math.ceil(turns * 14);
      for (let i = 0; i <= n; i++) {
        const t = i / n, p = path(t);
        const tangent = path(Math.min(1, t + 0.01)).sub(path(Math.max(0, t - 0.01))).normalize();
        const side = new THREE.Vector3(0, 0, 1).cross(tangent);
        if (side.lengthSq() < 1e-4) side.set(1, 0, 0);
        side.normalize();
        const up = tangent.clone().cross(side);
        const angle = t * turns * Math.PI * 2;
        points.push(p.add(side.multiplyScalar(Math.cos(angle) * radius)).add(up.multiplyScalar(Math.sin(angle) * radius)));
      }
      return s.mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), n * 2, wire, 6), material);
    };

    let update: ((dt: number, time: number) => void) | undefined;
    if (a.state !== 'shut') {
      const L = { fresh: 0.24, up: 0.19, half: 0.012, sagged: 0.2 }[a.state];
      const sag = a.state === 'sagged';
      const dir = random() < 0.5 ? -1 : 1;
      const base = 0.02;
      const path = sag
        ? (t: number) => new THREE.Vector3(dir * (0.02 * t + 0.2 * t * t), base + (S - base + 0.1) * t * 1.35 - 0.19 * t * t - (t > 0.6 ? (t - 0.6) * 0.1 : 0), 0.01 * t)
        : (t: number) => new THREE.Vector3(0, t, 0);
      const springGroup = new THREE.Group();
      s.root.add(springGroup);
      const coil = helix(sag ? path : (t) => new THREE.Vector3(0, base + t * (S - base + L), 0), sag ? 9 : a.state === 'half' ? 9 : 8, 0.036, 0.0042, steel);
      springGroup.add(coil);

      const topGroup = new THREE.Group();
      s.root.add(topGroup);
      const end = sag ? path(1) : new THREE.Vector3(0, S + L, 0);
      topGroup.position.copy(end);
      if (sag) { const tangent = path(1).sub(path(0.94)).normalize(); topGroup.rotation.z = -Math.atan2(tangent.x, tangent.y); }
      else topGroup.rotation.z = a.state === 'half' ? 0 : (random() - 0.5) * 0.2;
      const T = <T2 extends THREE.Object3D>(o: T2) => { topGroup.add(o); return o; };
      // Cloth body, arms and ruff.
      const cloth = paint(scheme[0], { roughness: 0.9 }), cloth2 = paint(scheme[1], { roughness: 0.9 });
      T(s.lathe([[0.04, -0.07], [0.036, -0.03], [0.022, 0.0], [0.001, 0.012]], cloth));
      for (let k = 0; k < 3; k++) T(s.ball([0.008, 0.008, 0.008], [0, -0.012 - k * 0.018, 0.027 + k * 0.004], cloth2, 8));
      const armUp = a.state === 'fresh' ? 0.05 : a.state === 'half' ? 0.03 : sag ? -0.03 : -0.01;
      if (a.state !== 'half') for (const side of [-1, 1]) {
        const hand: P3 = [side * 0.085, -0.035 + armUp + (random() - 0.5) * 0.02, 0.012];
        T(s.rod([side * 0.024, -0.012, 0], hand, 0.012, cloth, 0.009));
        T(s.ball([0.013, 0.013, 0.013], hand, paint('#f4f1ea'), 10));
      }
      for (let k = 0; k < 10; k++) { const t = k / 10 * Math.PI * 2; T(s.ball([0.014, 0.007, 0.014], [Math.cos(t) * 0.028, 0.006, Math.sin(t) * 0.028], k % 2 ? cloth2 : paint(scheme[2], { roughness: 0.9 }), 8)); }

      // Head.
      const head = new THREE.Group();
      head.position.y = 0.058;
      head.scale.setScalar(1.22);
      topGroup.add(head);
      const H = <T2 extends THREE.Object3D>(o: T2) => { head.add(o); return o; };
      const r = 0.046;
      const worn = a.face === 'worn';
      const skin = worn ? s.material('#9c9a94', { metalness: 0.3, roughness: 0.6 }) : paint('#f6f2ea', { roughness: 0.4 });
      const red = paint('#d1242c', { roughness: 0.35 });
      H(s.ball([r, r * 1.04, r], [0, 0, 0], skin, 24));
      H(s.ball([0.012, 0.012, 0.012], [0, -0.004, r + 0.004], worn ? paint('#a8605a') : red, 12));
      if (!worn) {
        for (const side of [-1, 1]) H(s.ball([0.011, 0.01, 0.004], [side * 0.027, -0.012, r * 0.82], paint('#ee8f9c'), 8)).rotation.y = side * 0.6;
        const mouthY = -0.022;
        if (a.face === 'jolly') { const m = H(s.ring(0.021, 0.0045, [0, mouthY + 0.01, r * 0.86], red, Math.PI)); m.rotation.z = Math.PI; m.rotation.x = -0.35; }
        else if (a.face === 'sad') { const m = H(s.ring(0.016, 0.004, [0, mouthY - 0.014, r * 0.84], red, Math.PI)); m.rotation.x = 0.3; H(s.ball([0.005, 0.008, 0.003], [-0.024, -0.006, r * 0.9], paint('#3f8fe0'), 8)); }
        else { H(s.tube([[-0.024, mouthY - 0.004, r * 0.78], [-0.008, mouthY - 0.008, r * 0.93], [0.012, mouthY - 0.002, r * 0.9], [0.028, mouthY + 0.014, r * 0.72]], 0.006, red)); for (let k = 0; k < 4; k++) H(s.box([0.006, 0.007, 0.003], [-0.012 + k * 0.008, mouthY - 0.002 + k * 0.002, r * 0.96 - Math.abs(k - 1.5) * 0.002], paint('#f4efdc'))); }
        const slant = a.face === 'jolly' ? 0.15 : a.face === 'sad' ? 0.6 : -0.6;
        for (const side of [-1, 1]) { const brow = H(s.box([0.018, 0.004, 0.004], [side * 0.019, 0.034 + (a.face === 'jolly' ? 0.004 : 0), r * 0.84], black)); brow.rotation.z = -side * slant; brow.rotation.y = side * 0.4; }
      }
      // Hair and hat.
      const hair = paint(a.colours === 'mono' ? '#c8202a' : '#ef7a22', { roughness: 0.95 });
      if (!worn || a.hat === 'tufts') for (const side of [-1, 1]) for (let k = 0; k < 3; k++) H(s.ball([0.016, 0.016, 0.016], [side * (r + 0.004), 0.008 + k * 0.012 - 0.01, -0.006 + (k - 1) * 0.012], hair, 8));
      if (a.hat === 'jester') {
        for (const side of [-1, 1]) {
          const tip: P3 = [side * 0.085, r + 0.02, 0];
          H(s.tube([[side * 0.012, r * 0.7, 0], [side * 0.035, r + 0.035, 0], [side * 0.07, r + 0.045, 0], tip], 0.016, side > 0 ? cloth : cloth2));
          H(s.ball([0.01, 0.01, 0.01], tip, s.material('#e0b030', { metalness: 0.8, roughness: 0.25 }), 10));
        }
        H(s.ring(r * 0.86, 0.006, [0, r * 0.55, 0], paint(scheme[2]))).rotation.x = Math.PI / 2;
      } else if (a.hat === 'cone') {
        const cone = H(s.cylinder(0.001, r * 0.72, 0.11, [0, r + 0.04, -0.004], cloth2, 16)); cone.rotation.x = -0.1;
        for (let k = 0; k < 3; k++) H(s.ball([0.009, 0.009, 0.009], [0, r + 0.005 + k * 0.03, r * 0.6 - k * 0.014], cloth, 8));
        H(s.ball([0.012, 0.012, 0.012], [0, r + 0.096, -0.012], cloth, 8));
      } else if (a.hat === 'bowler') {
        H(s.cylinder(r * 0.8, r * 0.8, 0.004, [0.004, r * 0.86, 0], black, 20)).rotation.z = -0.15;
        H(s.ball([r * 0.52, r * 0.5, r * 0.52], [0.008, r * 0.94, 0], black, 14));
        H(s.cylinder(r * 0.53, r * 0.53, 0.008, [0.006, r * 0.9, 0], red, 20)).rotation.z = -0.15;
      }
      // Eyes on their own springs.
      const eyeGroups: { g: THREE.Group; phase: number }[] = [];
      const eyeWhite = s.material('#fbfaf6', { roughness: 0.25 });
      const eyeball = (target: THREE.Object3D, at: P3, look: P3 = [0, 0, 1]) => {
        const eye = new THREE.Group(); eye.position.set(...at); target.add(eye);
        eye.add(s.ball([0.017, 0.017, 0.017], [0, 0, 0], eyeWhite, 14));
        eye.add(s.ball([0.008, 0.008, 0.005], [look[0] * 0.014, look[1] * 0.014, look[2] * 0.014], black, 10));
        eye.lookAt(eye.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0, 0)));
        return eye;
      };
      for (const side of [-1, 1]) {
        const socket: P3 = [side * 0.018, 0.013, r * 0.88];
        if (a.eyes === 'painted') {
          H(s.ball([0.012, 0.014, 0.004], socket, eyeWhite, 10));
          H(s.ball([0.005, 0.006, 0.003], [socket[0] + (worn ? 0 : side * 0.002), socket[1] - 0.002, socket[2] + 0.003], black, 8));
          continue;
        }
        H(s.cylinder(0.011, 0.011, 0.004, socket, black, 12)).rotation.x = Math.PI / 2;
        const eg = new THREE.Group(); eg.position.set(...socket); head.add(eg);
        if (a.eyes === 'snapped' && side === 1) {
          eg.add(helix((t) => new THREE.Vector3(t * 0.006, t * 0.004, t * 0.02), 2.5, 0.007, 0.0014, steel));
          continue;
        }
        const dangling = a.eyes === 'dangling';
        const len = dangling ? 0.075 + random() * 0.02 : 0.05 + random() * 0.02;
        const aim = new THREE.Vector3(side * (0.15 + random() * 0.4), (random() - 0.5) * 0.5, 1).normalize();
        const pathEye = dangling
          ? (t: number) => new THREE.Vector3(side * 0.006 * t, -len * t * t, 0.03 * Math.sin(t * Math.PI * 0.6))
          : (t: number) => aim.clone().multiplyScalar(len * t);
        eg.add(helix(pathEye, dangling ? 7 : 5, 0.009, 0.0017, steel));
        const tip = pathEye(1);
        const eye = new THREE.Group(); eye.position.copy(tip); eg.add(eye);
        eye.add(s.ball([0.021, 0.021, 0.021], [0, 0, 0.006], eyeWhite, 14));
        const pt = random() * 6.3;
        eye.add(s.ball([0.01, 0.01, 0.006], [Math.cos(pt) * 0.006, Math.sin(pt) * 0.006, 0.025], black, 10));
        eyeGroups.push({ g: eg, phase: random() * 6 });
      }
      void eyeball;
      if (a.eyes === 'snapped') {
        const ex = -dir * (half + 0.05 + random() * 0.03), ez = half * 0.6 + random() * 0.05;
        s.ball([0.017, 0.017, 0.017], [ex, 0.017, ez], eyeWhite, 14);
        s.ball([0.008, 0.005, 0.008], [ex + 0.004, 0.031, ez + 0.003], black, 10);
        const stub = helix((t) => new THREE.Vector3(ex - 0.012 - t * 0.02, 0.006, ez + t * 0.012), 3, 0.006, 0.0014, steel); void stub;
      }
      if (a.state === 'half') { topGroup.position.z = 0.012; topGroup.rotation.x = 0.12; }

      if (a.state === 'fresh') {
        const colours = [scheme[0], scheme[1], scheme[2], '#f4f1ea'];
        s.scatter(new THREE.BoxGeometry(0.009, 0.0012, 0.006), new THREE.MeshStandardMaterial({ roughness: 0.8 }), Array.from({ length: 46 }, (_u, i) => {
          const t = random() * 6.3, d = 0.09 + random() * 0.17;
          return { at: [Math.cos(t) * d, 0.0008 + (d < 0.105 ? S : 0), Math.sin(t) * d] as P3, size: 0.8 + random() * 0.7, color: dull(colours[i % 4]) };
        }).filter((p) => p.at[1] < 0.01));
      }
      if (sag && wear > 0.4) for (let k = 0; k < 3; k++) s.rod([dir * half, S, -half + k * 0.05], [dir * (0.1 + k * 0.03), S + 0.05 + k * 0.03, 0.0], 0.0006, s.material('#d9d6cf'));

      const energy = mood.energy;
      const lively = { fresh: 1, up: 0.35, half: 0.15, sagged: 0.08 }[a.state] * mix(0.25, 1.5, energy);
      const baseY = topGroup.position.y, baseZ = topGroup.rotation.z, restLid = lid.rotation.x;
      update = (_dt, time) => {
        const bob = Math.sin(time * (4 + energy * 5)) * lively;
        if (!sag) {
          const stretch = 1 + bob * 0.07 * (a.state === 'half' ? 0.2 : 1);
          springGroup.scale.y = stretch;
          topGroup.position.y = (baseY) * stretch + (a.state === 'half' ? 0 : 0);
          topGroup.rotation.z = baseZ + Math.sin(time * (3 + energy * 3)) * 0.1 * lively;
        } else topGroup.rotation.z = baseZ + Math.sin(time * 1.3) * 0.05 * lively * 4;
        if (a.state === 'fresh') lid.rotation.x = restLid + Math.sin(time * 6) * 0.05 * lively;
        for (const eye of eyeGroups) {
          eye.g.rotation.x = Math.sin(time * (7 + energy * 6) + eye.phase) * 0.22 * (0.2 + lively);
          eye.g.rotation.y = Math.cos(time * (5 + energy * 5) + eye.phase * 2) * 0.18 * (0.2 + lively);
        }
      };
    } else {
      // Shut: a latch, and the clown lithographed on the lid is all you get.
      box.add(s.box([0.02, 0.03, 0.006], [0, S - 0.012, half + 0.004], steel));
      const energy = mood.energy;
      const crankGroup = box;
      update = (_dt, time) => { crankGroup.rotation.z = Math.sin(time * 18) * 0.004 * energy; };
    }
    s.root.rotation.y = (random() - 0.5) * 0.4;
    return s.finish({ update });
  },
});
