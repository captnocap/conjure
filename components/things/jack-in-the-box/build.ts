import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

const MOTLEY = {
  circus: { one: '#cf3327', two: '#f0c02c', hair: '#ee7f1c' },
  harlequin: { one: '#1d1c20', two: '#f1ece0', hair: '#c9302c' },
  candy: { one: '#ef8fb0', two: '#9bd8c0', hair: '#5fa8e0' },
  jester: { one: '#6a3f9a', two: '#3d9c46', hair: '#e2b12e' },
} as const;

type Ctx = CanvasRenderingContext2D;
type V3 = readonly [number, number, number];

export default defineThing({
  questions: {
    state: choice('What state is the box in?', {
      closed: 'Lid shut and latched, the handle turning, nothing happened yet.',
      ajar: 'The lid lifted a crack: white-gloved fingers on the rim and the top of a face looking out.',
      sprung: 'Sprung: the clown is out, arms flung wide, swaying on its spring.',
      drooping: 'Sprung long ago: the tired spring has bent over and the clown hangs head-down beside the box.',
    }),
    face: choice('What is the clown\'s face like?', {
      jolly: 'Rosy cheeks, bright eyes and a big friendly red smile.',
      blank: 'A pale porcelain face with dot eyes and almost no expression.',
      sad: 'A white pierrot face with a black tear and a down-turned mouth.',
      leering: 'A grin that goes too far up the cheeks, with heavy half-closed eyes.',
      sinister: 'Black eye sockets with pinprick pupils, a smeared mouth full of pointed teeth, cracks in the paint.',
    }),
    art: choice('What is printed on the tin box?', {
      stars: 'Midnight blue with gold stars and a crescent moon.',
      stripes: 'Red and white circus-tent stripes with a gold name banner.',
      diamonds: 'Harlequin diamonds in two colours.',
      letters: 'Nursery pastels with one big letter of J-A-C-K on each side.',
      clowns: 'A laughing clown face painted on every side.',
      plain: 'Plain dark green enamel with gold pinstripes and a single question mark.',
    }),
    motley: choice('What colours is the clown dressed in?', {
      circus: 'Red and yellow stripes with orange hair.',
      harlequin: 'Black and white diamonds with red hair.',
      candy: 'Pink and mint with blue hair.',
      jester: 'Purple and green with yellow hair.',
    }),
    hat: choice('What is on the clown\'s head?', {
      jester: 'A two-horned jester cap with bells.',
      cone: 'A tall pointed cone hat with a pom-pom.',
      bowler: 'A tiny bowler hat perched at an angle.',
      none: 'No hat: a bald white dome between two tufts of hair.',
    }),
    spring: score('How far does the spring reach once it is out?', ['A short hop above the rim', 'A hand high', 'Absurdly tall, towering and unsteady']),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const jit = (range: number) => (random() - 0.5) * 2 * range;
    const B = 0.13;
    const motley = MOTLEY[a.motley];
    const gold = s.material('#d8ae3e', { metalness: 0.4, roughness: 0.35 });
    const steel = s.material('#c8c9c4', { metalness: 0.5, roughness: 0.3 });

    const put = <T extends THREE.Object3D>(parent: THREE.Object3D, node: T, at: V3 = [0, 0, 0]) => {
      node.position.set(...at);
      node.castShadow = node.receiveShadow = true;
      parent.add(node);
      return node;
    };
    const texture = (width: number, height: number, draw: (g: Ctx) => void) => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      draw(canvas.getContext('2d')!);
      const map = new THREE.CanvasTexture(canvas);
      map.colorSpace = THREE.SRGBColorSpace;
      return map;
    };
    const rust = (g: Ctx, w: number, h: number, amount: number) => {
      for (let i = 0; i < Math.round(amount * 20); i++) {
        const edge = random() < 0.7;
        const x = edge && random() < 0.5 ? (random() < 0.5 ? 0 : w) + jit(18) : random() * w;
        const y = edge ? (random() < 0.5 ? 0 : h) + jit(18) : random() * h;
        g.fillStyle = `rgba(${Math.round(105 + random() * 50)},${Math.round(55 + random() * 30)},28,${0.35 + random() * 0.4})`;
        g.beginPath();
        g.ellipse(x, y, 5 + random() * 22, 4 + random() * 12, random() * 3, 0, Math.PI * 2);
        g.fill();
      }
    };
    const star = (g: Ctx, x: number, y: number, r: number) => {
      g.beginPath();
      for (let i = 0; i < 10; i++) { const angle = -Math.PI / 2 + (i / 10) * Math.PI * 2, rr = i % 2 ? r * 0.42 : r; g.lineTo(x + Math.cos(angle) * rr, y + Math.sin(angle) * rr); }
      g.closePath();
      g.fill();
    };
    const miniClown = (g: Ctx) => {
      g.fillStyle = '#f4efe6';
      g.beginPath(); g.arc(128, 132, 70, 0, Math.PI * 2); g.fill();
      g.fillStyle = motley.hair;
      for (const side of [-1, 1]) { g.beginPath(); g.arc(128 + side * 74, 112, 28, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = '#1b1a1c';
      for (const side of [-1, 1]) { g.beginPath(); g.ellipse(128 + side * 26, 116, 8, 12, 0, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = '#d3271f';
      g.beginPath(); g.arc(128, 140, 14, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.moveTo(84, 158); g.quadraticCurveTo(128, 214, 172, 158); g.quadraticCurveTo(128, 180, 84, 158); g.fill();
    };
    const panel = (letter: string) => texture(256, 256, (g) => {
      const tones = { stars: '#1c2a5c', stripes: '#f2ebdc', diamonds: motley.two, letters: ['#f6d6dc', '#cfe6f2', '#f7ecc2', '#d5ecd2'][Math.floor(random() * 4)], clowns: '#e9b732', plain: '#1f4a3a' };
      g.fillStyle = tones[a.art];
      g.fillRect(0, 0, 256, 256);
      if (a.art === 'stars') {
        g.fillStyle = '#f0c63e';
        for (let i = 0; i < 9; i++) star(g, 30 + random() * 196, 30 + random() * 196, 8 + random() * 14);
        g.beginPath(); g.arc(178, 84, 40, 0, Math.PI * 2); g.fill();
        g.fillStyle = tones.stars;
        g.beginPath(); g.arc(194, 74, 36, 0, Math.PI * 2); g.fill();
      } else if (a.art === 'stripes') {
        g.fillStyle = '#c9302c';
        for (let i = 0; i < 4; i++) g.fillRect(16 + i * 64, 0, 32, 256);
        g.fillStyle = '#e2b53a';
        g.fillRect(28, 100, 200, 56);
        g.fillStyle = '#5a1f1a';
        g.font = 'bold 44px Georgia, serif';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText('JACK', 128, 130);
      } else if (a.art === 'diamonds') {
        g.fillStyle = motley.one;
        for (let row = -1; row < 5; row++) for (let column = -1; column < 5; column++) {
          const x = column * 64 + (row % 2 ? 32 : 0), y = row * 64;
          g.beginPath(); g.moveTo(x + 32, y); g.lineTo(x + 64, y + 64); g.lineTo(x + 32, y + 128); g.lineTo(x, y + 64); g.fill();
        }
      } else if (a.art === 'letters') {
        g.fillStyle = ['#c9302c', '#2f6fb8', '#3d8f5a', '#d98a1f'][Math.floor(random() * 4)];
        g.font = 'bold 170px Georgia, serif';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText(letter, 128, 138);
      } else if (a.art === 'clowns') {
        miniClown(g);
      } else {
        g.strokeStyle = '#d8ae3e';
        g.lineWidth = 3;
        g.strokeRect(30, 30, 196, 196);
        g.fillStyle = '#d8ae3e';
        g.font = 'bold 130px Georgia, serif';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText('?', 128, 136);
      }
      g.strokeStyle = '#d8ae3e';
      g.lineWidth = 14;
      g.strokeRect(7, 7, 242, 242);
      g.strokeStyle = 'rgba(60,40,10,0.5)';
      g.lineWidth = 2;
      g.strokeRect(15, 15, 226, 226);
      rust(g, 256, 256, mood.wear);
    });
    const tin = (map: THREE.Texture) => new THREE.MeshStandardMaterial({ map, metalness: 0.25, roughness: mix(0.32, 0.8, mood.wear) });
    const sides = ['K', 'C', 'J', 'A'].map((letter) => tin(panel(letter)));
    const hidden = new THREE.MeshBasicMaterial({ visible: false });
    const under = s.material('#3a3229');

    // The box: four printed walls, a dark inside, gold corners, a hinged lid and a crank.
    put(s.root, new THREE.Mesh(new THREE.BoxGeometry(B, B, B), [sides[0], sides[1], hidden, under, sides[2], sides[3]]), [0, B / 2, 0]);
    const inside = new THREE.Mesh(new THREE.BoxGeometry(B - 0.006, B - 0.004, B - 0.006), new THREE.MeshStandardMaterial({ color: '#2a2019', roughness: 1, side: THREE.BackSide }));
    inside.position.y = B / 2 + 0.002;
    inside.receiveShadow = true;
    s.root.add(inside);
    for (const x of [-1, 1]) for (const z of [-1, 1]) s.box([0.007, B, 0.007], [x * B / 2, B / 2, z * B / 2], gold);
    for (const z of [-1, 1]) s.box([B, 0.004, 0.005], [0, B - 0.002, z * (B / 2 - 0.0015)], gold);
    for (const x of [-1, 1]) s.box([0.005, 0.004, B], [x * (B / 2 - 0.0015), B - 0.002, 0], gold);
    for (const x of [-1, 1]) for (const z of [-1, 1]) s.cylinder(0.009, 0.011, 0.006, [x * (B / 2 - 0.012), -0.003, z * (B / 2 - 0.012)], gold, 12);

    const lid = put(s.root, new THREE.Group(), [0, B + 0.001, -B / 2]);
    const lidTop = tin(panel('J'));
    put(lid, new THREE.Mesh(new THREE.BoxGeometry(B + 0.006, 0.008, B + 0.006), [under, under, lidTop, under, under, under]), [0, 0.004, B / 2]);
    put(lid, new THREE.Mesh(new THREE.BoxGeometry(B + 0.008, 0.004, B + 0.008), gold), [0, 0.001, B / 2]);
    for (const x of [-0.035, 0.035]) s.cylinder(0.005, 0.005, 0.022, [x, B, -B / 2 - 0.003], steel, 10).rotation.z = Math.PI / 2;
    const out = a.state === 'sprung' || a.state === 'drooping';
    const lidRest = a.state === 'closed' ? 0 : a.state === 'ajar' ? -0.52 : -(1.75 + random() * 0.35);
    lid.rotation.x = lidRest;
    if (a.state === 'closed') s.box([0.02, 0.022, 0.005], [0, B - 0.006, B / 2 + 0.004], gold);

    const crank = put(s.root, new THREE.Group(), [B / 2, B * 0.52, 0]);
    put(crank, new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.03, 10), steel), [0.014, 0, 0]).rotation.z = Math.PI / 2;
    put(crank, new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.004, 16), gold), [0.002, 0, 0]).rotation.z = Math.PI / 2;
    put(crank, new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.05, 0.012), steel), [0.028, 0.02, 0]);
    put(crank, new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.009, 0.034, 12), s.material('#c9302c')), [0.046, 0.042, 0]).rotation.z = Math.PI / 2;
    put(crank, new THREE.Mesh(new THREE.SphereGeometry(0.0105, 12, 10), s.material('#c9302c')), [0.064, 0.042, 0]);
    crank.rotation.x = random() * Math.PI * 2;

    // ---- The clown ------------------------------------------------------------------------
    const jack = put(s.root, new THREE.Group(), [0, 0.02, 0]);
    const bob = new THREE.Group();
    jack.add(bob);
    if (a.state !== 'closed') {
      const peeking = a.state === 'ajar';
      const straight = peeking ? B - 0.085 : B - 0.005;
      const reach = peeking ? 0 : mix(0.07, 0.3, a.spring);
      const bend = a.state === 'drooping' ? 2.35 + random() * 0.4 : peeking ? 0 : jit(0.12) + 0.04;
      const side = random() < 0.5 ? -1 : 1;
      const heading = a.state === 'drooping' ? (side > 0 ? 0.35 : Math.PI - 0.35) + jit(0.2) : random() * Math.PI * 2;
      const dir = new THREE.Vector3(Math.cos(heading), 0, Math.sin(heading)), up = new THREE.Vector3(0, 1, 0);
      const across = new THREE.Vector3().crossVectors(dir, up);
      const total = straight + reach;
      const centre = (distance: number) => {
        if (distance <= straight || Math.abs(bend) < 1e-4) return { at: new THREE.Vector3(0, distance, 0), tangent: up.clone(), normal: dir.clone() };
        const radius = reach / bend, angle = ((distance - straight) / reach) * bend;
        return {
          at: new THREE.Vector3(0, straight, 0).addScaledVector(dir, radius * (1 - Math.cos(angle))).addScaledVector(up, radius * Math.sin(angle)),
          tangent: dir.clone().multiplyScalar(Math.sin(angle)).addScaledVector(up, Math.cos(angle)),
          normal: dir.clone().multiplyScalar(Math.cos(angle)).addScaledVector(up, -Math.sin(angle)),
        };
      };
      const turns = peeking ? 5 : Math.round(7 + reach * 22);
      const coil: THREE.Vector3[] = [];
      for (let i = 0; i <= turns * 12; i++) {
        const f = i / (turns * 12), frame = centre(f * total), radius = mix(0.04, 0.02, f), angle = f * turns * Math.PI * 2;
        coil.push(frame.at.addScaledVector(frame.normal, Math.cos(angle) * radius).addScaledVector(across, Math.sin(angle) * radius));
      }
      put(bob, new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(coil), coil.length * 2, 0.0028, 6), steel));

      const end = centre(total);
      const clown = put(bob, new THREE.Group(), end.at.toArray() as [number, number, number]);
      const forward = new THREE.Vector3(0, 0, 1).addScaledVector(end.tangent, -end.tangent.z).normalize();
      clown.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3().crossVectors(end.tangent, forward), end.tangent, forward));

      const cloth = new THREE.MeshStandardMaterial({
        roughness: 0.9,
        map: texture(128, 128, (g) => {
          g.fillStyle = motley.two;
          g.fillRect(0, 0, 128, 128);
          g.fillStyle = motley.one;
          if (a.motley === 'harlequin' || a.motley === 'jester') {
            for (let row = -1; row < 5; row++) for (let column = -1; column < 5; column++) {
              const x = column * 32 + (row % 2 ? 16 : 0), y = row * 32;
              g.beginPath(); g.moveTo(x + 16, y); g.lineTo(x + 32, y + 32); g.lineTo(x + 16, y + 64); g.lineTo(x, y + 32); g.fill();
            }
          } else for (let i = 0; i < 4; i++) g.fillRect(i * 32, 0, 16, 128);
          g.fillStyle = `rgba(90,80,70,${mood.wear * 0.35})`;
          g.fillRect(0, 0, 128, 128);
        }),
      });
      const white = s.material('#f3efe6', { roughness: 0.8 });
      const R = 0.04;
      // Body, ruff and head.
      put(clown, new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.046, 0.06, 20), cloth), [0, -0.006, 0]);
      for (let i = 0; i < 3; i++) put(clown, new THREE.Mesh(new THREE.SphereGeometry(0.0055, 10, 8), s.material(motley.one)), [0, 0.012 - i * 0.016, 0.024 + i * 0.0075]);
      const ruff = new THREE.CylinderGeometry(0.044, 0.05, 0.008, 18, 1);
      const ruffPosition = ruff.getAttribute('position');
      for (let i = 0; i < ruffPosition.count; i++) {
        const angle = Math.atan2(ruffPosition.getZ(i), ruffPosition.getX(i));
        if (Math.hypot(ruffPosition.getX(i), ruffPosition.getZ(i)) > 0.01) ruffPosition.setY(i, ruffPosition.getY(i) + Math.sin(angle * 9) * 0.006);
      }
      ruff.computeVertexNormals();
      put(clown, new THREE.Mesh(ruff, white), [0, 0.03, 0]);
      const headY = 0.03 + R * 0.92;
      const face = texture(512, 256, (g) => {
        const cx = 128;
        g.fillStyle = a.face === 'sinister' ? '#dcd7c8' : a.face === 'jolly' ? '#f6ede2' : '#f3efe6';
        g.fillRect(0, 0, 512, 256);
        g.lineCap = 'round';
        const eye = (dx: number, y: number, rx: number, ry: number, colour = '#17161a', tilt = 0) => { g.fillStyle = colour; g.beginPath(); g.ellipse(cx + dx, y, rx, ry, tilt, 0, Math.PI * 2); g.fill(); };
        if (a.face === 'jolly') {
          for (const side of [-1, 1]) { g.fillStyle = '#f08f8f'; g.beginPath(); g.arc(cx + side * 50, 146, 17, 0, Math.PI * 2); g.fill(); }
          for (const side of [-1, 1]) {
            g.fillStyle = '#2f7fd0';
            g.beginPath(); g.moveTo(cx + side * 30, 78); g.lineTo(cx + side * 40, 104); g.lineTo(cx + side * 20, 104); g.fill();
            eye(side * 30, 112, 8, 10);
            g.fillStyle = '#ffffff'; g.beginPath(); g.arc(cx + side * 30 - 2, 109, 2.6, 0, Math.PI * 2); g.fill();
            g.strokeStyle = '#17161a'; g.lineWidth = 3; g.beginPath(); g.arc(cx + side * 30, 96, 16, Math.PI * 1.2, Math.PI * 1.8); g.stroke();
          }
          g.fillStyle = '#d3271f';
          g.beginPath(); g.moveTo(cx - 44, 154); g.quadraticCurveTo(cx, 206, cx + 44, 154); g.quadraticCurveTo(cx, 174, cx - 44, 154); g.fill();
        } else if (a.face === 'blank') {
          for (const side of [-1, 1]) { g.fillStyle = 'rgba(235,150,150,0.35)'; g.beginPath(); g.arc(cx + side * 46, 144, 14, 0, Math.PI * 2); g.fill(); eye(side * 28, 114, 4.5, 4.5); }
          g.strokeStyle = '#b3423a'; g.lineWidth = 4;
          g.beginPath(); g.moveTo(cx - 9, 166); g.lineTo(cx + 9, 166); g.stroke();
        } else if (a.face === 'sad') {
          for (const side of [-1, 1]) {
            g.fillStyle = 'rgba(70,100,170,0.35)'; g.beginPath(); g.ellipse(cx + side * 30, 108, 15, 12, 0, 0, Math.PI * 2); g.fill();
            eye(side * 30, 114, 6, 7);
            g.strokeStyle = '#17161a'; g.lineWidth = 3;
            g.beginPath(); g.moveTo(cx + side * 14, 86); g.lineTo(cx + side * 44, 98); g.stroke();
          }
          g.fillStyle = '#17161a';
          g.beginPath(); g.moveTo(cx - 30, 124); g.lineTo(cx - 36, 148); g.arc(cx - 30, 148, 6, Math.PI, 0, true); g.closePath(); g.fill();
          g.strokeStyle = '#8f2a2a'; g.lineWidth = 5;
          g.beginPath(); g.moveTo(cx - 24, 176); g.quadraticCurveTo(cx, 156, cx + 24, 176); g.stroke();
        } else if (a.face === 'leering') {
          for (const side of [-1, 1]) {
            g.fillStyle = '#fffdf6'; g.beginPath(); g.ellipse(cx + side * 30, 114, 15, 8, side * -0.2, 0, Math.PI * 2); g.fill();
            eye(side * 30 + 5, 116, 4.5, 4.5);
            g.strokeStyle = '#17161a'; g.lineWidth = 6;
            g.beginPath(); g.moveTo(cx + side * 12, 112); g.lineTo(cx + side * 48, 102); g.stroke();
            g.lineWidth = 3;
            g.beginPath(); g.moveTo(cx + side * 12, 100); g.lineTo(cx + side * 46, 86); g.stroke();
          }
          g.fillStyle = '#c21f1f';
          g.beginPath(); g.moveTo(cx - 72, 128); g.quadraticCurveTo(cx, 226, cx + 72, 128); g.quadraticCurveTo(cx, 180, cx - 72, 128); g.fill();
          g.fillStyle = '#fffdf6';
          g.beginPath(); g.moveTo(cx - 54, 152); g.quadraticCurveTo(cx, 206, cx + 54, 152); g.quadraticCurveTo(cx, 184, cx - 54, 152); g.fill();
          g.strokeStyle = '#6a1616'; g.lineWidth = 1.5;
          for (let i = -4; i <= 4; i++) { g.beginPath(); g.moveTo(cx + i * 10, 160); g.lineTo(cx + i * 10, 198); g.stroke(); }
        } else {
          for (const side of [-1, 1]) {
            eye(side * 30, 112, 15, 21, '#0d0c0f', side * 0.3);
            eye(side * 29, 116, 3, 3, '#f2d23c');
          }
          g.strokeStyle = 'rgba(160,25,25,0.75)'; g.lineWidth = 12;
          g.beginPath(); g.moveTo(cx - 70, 140); g.quadraticCurveTo(cx, 208, cx + 70, 136); g.stroke();
          g.fillStyle = '#0d0c0f';
          g.beginPath(); g.moveTo(cx - 60, 148); g.quadraticCurveTo(cx, 208, cx + 60, 148); g.quadraticCurveTo(cx, 174, cx - 60, 148); g.fill();
          g.fillStyle = '#f4efdc';
          for (let i = -5; i < 5; i++) {
            const x = cx + i * 11 + 5, lift = 162 + (1 - (Math.abs(i + 0.5) / 5) ** 2) * 8 - 4;
            g.beginPath(); g.moveTo(x - 5, lift - 4); g.lineTo(x + 5, lift - 4); g.lineTo(x, lift + 12); g.fill();
          }
          g.strokeStyle = 'rgba(30,25,25,0.75)'; g.lineWidth = 1.6;
          for (let i = 0; i < 4; i++) {
            let x = cx + jit(60), y = 30 + random() * 30;
            g.beginPath(); g.moveTo(x, y);
            for (let k = 0; k < 5; k++) { x += jit(16); y += 10 + random() * 14; g.lineTo(x, y); }
            g.stroke();
          }
        }
        // Crazed, chipped paint with age.
        g.strokeStyle = 'rgba(60,50,45,0.5)'; g.lineWidth = 1.2;
        for (let i = 0; i < Math.round(mood.wear * 9); i++) {
          let x = random() * 512, y = random() * 256;
          g.beginPath(); g.moveTo(x, y);
          for (let k = 0; k < 4; k++) { x += jit(22); y += jit(22); g.lineTo(x, y); }
          g.stroke();
        }
      });
      const head = put(clown, new THREE.Mesh(new THREE.SphereGeometry(R, 32, 22), new THREE.MeshStandardMaterial({ map: face, roughness: 0.45 })), [0, headY, 0]);
      head.scale.set(1, 0.95, 0.96);
      if (a.face !== 'sinister' && a.face !== 'blank') put(clown, new THREE.Mesh(new THREE.SphereGeometry(a.face === 'jolly' ? 0.0095 : 0.007, 14, 10), s.material(a.face === 'sad' ? '#2a2a30' : '#d3271f', { roughness: 0.3 })), [0, headY - 0.003, R * 0.96 + 0.004]);
      const hair = s.material(motley.hair, { roughness: 1 });
      for (const sideX of [-1, 1]) for (let i = 0; i < 4; i++) put(clown, new THREE.Mesh(new THREE.SphereGeometry(0.013 + random() * 0.006, 10, 8), hair), [sideX * (R * 0.92 + random() * 0.008), headY + 0.004 - i * 0.008 + jit(0.004), -0.012 + i * 0.007]);

      if (!peeking) {
        if (a.hat === 'jester') {
          for (const sideX of [-1, 1]) {
            const horn = put(clown, new THREE.Group(), [sideX * R * 0.4, headY + R * 0.72, 0]);
            horn.rotation.z = -sideX * 0.85;
            put(horn, new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.024, 0.07, 14), s.material(sideX > 0 ? motley.one : motley.two)), [0, 0.03, 0]);
            put(horn, new THREE.Mesh(new THREE.SphereGeometry(0.008, 10, 8), gold), [0, 0.07, 0]);
          }
          put(clown, new THREE.Mesh(new THREE.SphereGeometry(R * 0.99, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.36), s.material(motley.one)), [0, headY + 0.003, 0]);
        } else if (a.hat === 'cone') {
          const cone = put(clown, new THREE.Group(), [0, headY + R * 0.82, 0]);
          cone.rotation.z = jit(0.25);
          put(cone, new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.026, 0.085, 18), cloth), [0, 0.04, 0]);
          put(cone, new THREE.Mesh(new THREE.SphereGeometry(0.011, 10, 8), s.material(motley.hair)), [0, 0.087, 0]);
        } else if (a.hat === 'bowler') {
          const bowler = put(clown, new THREE.Group(), [0.008, headY + R * 0.86, 0]);
          bowler.rotation.z = -0.3;
          const felt = s.material('#1f1e22', { roughness: 0.7 });
          put(bowler, new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.003, 20), felt), [0, 0, 0]);
          put(bowler, new THREE.Mesh(new THREE.SphereGeometry(0.02, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), felt), [0, 0.001, 0]).scale.y = 1.1;
          put(bowler, new THREE.Mesh(new THREE.CylinderGeometry(0.0205, 0.0205, 0.005, 16), s.material(motley.one)), [0, 0.004, 0]);
        }
        // Arms: flung up and out when freshly sprung, dangling when the spring has given up.
        const lift = a.state === 'drooping' ? 1.25 : 0.55 + jit(0.2);
        for (const sideX of [-1, 1]) {
          const armDirection = new THREE.Vector3(sideX * Math.cos(lift), Math.sin(lift), 0.25).normalize();
          const shoulder = new THREE.Vector3(sideX * 0.024, 0.008, 0);
          const sleeve = put(clown, new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.017, 0.062, 12), cloth), shoulder.clone().addScaledVector(armDirection, 0.034).toArray() as [number, number, number]);
          sleeve.quaternion.setFromUnitVectors(up, armDirection);
          const hand = shoulder.clone().addScaledVector(armDirection, 0.075);
          put(clown, new THREE.Mesh(new THREE.SphereGeometry(0.0145, 12, 10), white), hand.toArray() as [number, number, number]);
          put(clown, new THREE.Mesh(new THREE.TorusGeometry(0.012, 0.004, 6, 14), white), shoulder.clone().addScaledVector(armDirection, 0.064).toArray() as [number, number, number]).quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), armDirection);
        }
      } else {
        // Gloved fingers hooked over the front rim.
        for (const sideX of [-1, 1]) for (let i = 0; i < 4; i++) {
          const finger = s.ball([0.0058, 0.011, 0.007], [sideX * 0.036 + (i - 1.5) * 0.0105, B + 0.001, B / 2 - 0.001], white, 10);
          finger.rotation.x = 0.5;
        }
      }
    }

    const sway = mix(0.01, 0.11, mood.energy), pace = mix(1.2, 5, mood.energy);
    const phase = random() * 6;
    return s.finish({
      update: (dt, time) => {
        if (!out) {
          // The handle keeps turning, and now and then the lid twitches.
          crank.rotation.x -= dt * mix(0.5, 4, mood.energy);
          const twitch = Math.max(0, Math.sin(time * pace * 0.7 + phase)) ** 12;
          lid.rotation.x = lidRest - twitch * mix(0.01, 0.07, mood.energy);
        } else if (a.state === 'sprung') {
          jack.rotation.z = Math.sin(time * pace + phase) * sway;
          jack.rotation.x = Math.cos(time * pace * 0.83 + phase) * sway * 0.6;
          bob.scale.y = 1 + Math.sin(time * pace * 2.1) * sway * 0.35;
        } else {
          jack.rotation.z = Math.sin(time * pace * 0.5 + phase) * sway * 0.25;
        }
      },
    });
  },
});
