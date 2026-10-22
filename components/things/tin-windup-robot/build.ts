import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

const LIVERIES = {
  red: { body: '#c5372c', trim: '#d8d3c2', ink: '#1d2430' },
  blue: { body: '#2a5486', trim: '#d24a32', ink: '#f1e6c6' },
  yellow: { body: '#e0aa25', trim: '#2b2f38', ink: '#b3312a' },
  green: { body: '#66835a', trim: '#ece2c2', ink: '#2b2f38' },
  silver: { body: '#b4b9b8', trim: '#c5372c', ink: '#1d2430' },
} as const;

type Ctx = CanvasRenderingContext2D;

export default defineThing({
  questions: {
    era: choice('Which toy-robot design is it?', {
      boxhead: 'The 1950s classic: square head, square chest, bulb eyes, a grille mouth and one antenna.',
      atomic: 'An atomic-age model with a barrel body and a clear dome head showing a glowing coil brain.',
      spaceman: 'A robot astronaut with a round helmet, a smiling painted face in the visor and ear-cup radios.',
      mechanical: 'A 1930s mechanical man: riveted boiler body, drum head, slit eyes, heavy jaw and a funnel hat.',
    }),
    livery: choice('What colours is the tin printed in?', {
      red: 'Fire-engine red with silver trim.',
      blue: 'Deep space blue with red trim.',
      yellow: 'Warning yellow with black trim.',
      green: 'Army olive green with cream trim.',
      silver: 'Bare silvery tinplate with red trim.',
    }),
    chest: choice('What is printed on its chest?', {
      gauges: 'Two dials with needles and a row of coloured buttons.',
      spark: 'A red celluloid window that flashes sparks.',
      gears: 'A cutaway view of meshing cogs.',
      heart: 'A red heart, as if somebody thought it should have one.',
      number: 'A big unit number in a roundel, one of a production run.',
      screen: 'A little television screen showing a ringed planet.',
    }),
    key: choice('What about the wind-up key?', {
      wound: 'Freshly wound and turning: the robot is going.',
      rundown: 'The key is there but the spring has run down; it has stopped where it was.',
      lost: 'The key is lost. Only the square winding shaft sticks out, and it will never go again.',
    }),
    doing: choice('Where has its walk taken it?', {
      striding: 'Mid-stride on open floor, one foot out, arms swinging.',
      halted: 'Standing with feet together and head bowed.',
      blocked: 'Walked straight into a wooden block and is still trying to push through it.',
      fallen: 'Tipped over onto its face, key in the air, legs still working.',
    }),
    missing: choice('What has it lost over the years?', {
      nothing: 'Nothing: complete, a collector would pay for it.',
      arm: 'One arm, leaving an empty shoulder slot.',
      eye: 'One eye is a dark empty socket.',
      antenna: 'The top piece is bent over and snapped short.',
      lots: 'An arm, an eye and the top piece: it has been through a lot.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const livery = LIVERIES[a.livery];
    const rough = mix(0.3, 0.8, mood.wear);
    const tin = s.material(livery.body, { metalness: 0.3, roughness: rough });
    const trim = s.material(livery.trim, { metalness: 0.3, roughness: rough });
    const dark = s.material('#22252a', { roughness: 0.7 });
    const steel = s.material('#d2d0c4', { metalness: 0.45, roughness: 0.32 });
    const wound = a.key === 'wound';
    const lostArm = a.missing === 'arm' || a.missing === 'lots';
    const lostEye = a.missing === 'eye' || a.missing === 'lots';
    const lostTop = a.missing === 'antenna' || a.missing === 'lots';

    const put = <T extends THREE.Object3D>(parent: THREE.Object3D, node: T, at: readonly [number, number, number] = [0, 0, 0]) => {
      node.position.set(...at);
      node.castShadow = node.receiveShadow = true;
      parent.add(node);
      return node;
    };
    const box = (parent: THREE.Object3D, size: readonly [number, number, number], at: readonly [number, number, number], material: THREE.Material | THREE.Material[]) =>
      put(parent, new THREE.Mesh(new THREE.BoxGeometry(...size), material), at);
    const cyl = (parent: THREE.Object3D, top: number, bottom: number, height: number, at: readonly [number, number, number], material: THREE.Material, axis: 'x' | 'y' | 'z' = 'y', segments = 20) => {
      const mesh = put(parent, new THREE.Mesh(new THREE.CylinderGeometry(top, bottom, height, segments), material), at);
      if (axis === 'x') mesh.rotation.z = Math.PI / 2;
      if (axis === 'z') mesh.rotation.x = Math.PI / 2;
      return mesh;
    };
    const ball = (parent: THREE.Object3D, radius: number, at: readonly [number, number, number], material: THREE.Material) =>
      put(parent, new THREE.Mesh(new THREE.SphereGeometry(radius, 18, 12), material), at);

    // Lithographed tin: flat printed colour, a row of rivets, and rust where the mood has worn it.
    const rust = (g: Ctx, w: number, h: number) => {
      for (let i = 0; i < Math.round(mood.wear * 22); i++) {
        const edge = random() < 0.65;
        const x = edge && random() < 0.5 ? (random() < 0.5 ? 0 : w) + (random() - 0.5) * 30 : random() * w;
        const y = edge ? (random() < 0.5 ? 0 : h) + (random() - 0.5) * 30 : random() * h;
        g.fillStyle = `rgba(${Math.round(110 + random() * 50)},${Math.round(55 + random() * 30)},28,${0.35 + random() * 0.45})`;
        g.beginPath();
        g.ellipse(x, y, 4 + random() * 18, 3 + random() * 10, random() * 3, 0, Math.PI * 2);
        g.fill();
      }
      g.strokeStyle = 'rgba(235,235,225,0.5)';
      g.lineWidth = 1;
      for (let i = 0; i < Math.round(mood.wear * 16); i++) {
        const x = random() * w, y = random() * h;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + (random() - 0.5) * 50, y + (random() - 0.5) * 30);
        g.stroke();
      }
    };
    const tinPlate = (g: Ctx, w: number, h: number) => {
      g.fillStyle = `#${tin.color.getHexString(THREE.SRGBColorSpace)}`;
      g.fillRect(0, 0, w, h);
      g.strokeStyle = livery.ink;
      g.lineWidth = 3;
      g.strokeRect(7, 7, w - 14, h - 14);
      for (let x = 18; x < w - 8; x += 24) for (const y of [15, h - 15]) {
        g.fillStyle = 'rgba(20,20,20,0.45)';
        g.beginPath(); g.arc(x + 1, y + 1, 3.4, 0, Math.PI * 2); g.fill();
        g.fillStyle = 'rgba(245,240,225,0.85)';
        g.beginPath(); g.arc(x, y, 2.8, 0, Math.PI * 2); g.fill();
      }
    };
    const unit = String(1 + Math.floor(random() * 9));
    const panel = (g: Ctx, x: number, y: number, w: number, h: number) => {
      g.save();
      g.translate(x, y);
      g.fillStyle = a.chest === 'spark' || a.chest === 'screen' ? '#16181d' : '#f0e6c8';
      g.strokeStyle = livery.ink;
      g.lineWidth = 4;
      g.beginPath();
      g.roundRect(0, 0, w, h, 12);
      g.fill();
      g.stroke();
      const cx = w / 2, cy = h / 2;
      if (a.chest === 'gauges') {
        for (const dx of [-0.25, 0.25]) {
          const gx = cx + dx * w, gy = h * 0.38, r = w * 0.18;
          g.fillStyle = '#fffaf0'; g.strokeStyle = '#1d2430'; g.lineWidth = 3;
          g.beginPath(); g.arc(gx, gy, r, 0, Math.PI * 2); g.fill(); g.stroke();
          const needle = -2.6 + random() * 2;
          g.strokeStyle = '#c5372c'; g.lineWidth = 3.5;
          g.beginPath(); g.moveTo(gx, gy); g.lineTo(gx + Math.cos(needle) * r * 0.8, gy + Math.sin(needle) * r * 0.8); g.stroke();
        }
        ['#c5372c', '#e0aa25', '#2f8f4e', '#2a5486'].forEach((hex, i) => {
          g.fillStyle = hex;
          g.beginPath(); g.arc(w * (0.2 + i * 0.2), h * 0.78, w * 0.06, 0, Math.PI * 2); g.fill();
        });
      } else if (a.chest === 'spark') {
        g.fillStyle = '#d2281f';
        g.beginPath(); g.roundRect(w * 0.1, h * 0.12, w * 0.8, h * 0.76, 8); g.fill();
        g.strokeStyle = '#ffe07a'; g.lineWidth = 3;
        for (let i = 0; i < 14; i++) {
          const angle = (i / 14) * Math.PI * 2, r = h * (0.16 + random() * 0.2);
          g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(angle) * r * 1.3, cy + Math.sin(angle) * r); g.stroke();
        }
        g.fillStyle = '#fff6cf';
        g.beginPath(); g.arc(cx, cy, h * 0.09, 0, Math.PI * 2); g.fill();
      } else if (a.chest === 'gears') {
        const gear = (gx: number, gy: number, r: number, hex: string) => {
          g.fillStyle = hex;
          g.beginPath();
          const teeth = Math.round(r / 3.2);
          for (let i = 0; i < teeth * 2; i++) {
            const angle = (i / (teeth * 2)) * Math.PI * 2, rr = i % 2 ? r : r * 0.8;
            g.lineTo(gx + Math.cos(angle) * rr, gy + Math.sin(angle) * rr);
          }
          g.closePath(); g.fill();
          g.fillStyle = '#f0e6c8';
          g.beginPath(); g.arc(gx, gy, r * 0.25, 0, Math.PI * 2); g.fill();
        };
        gear(w * 0.36, h * 0.42, h * 0.3, '#3a3f48');
        gear(w * 0.7, h * 0.62, h * 0.22, '#c5372c');
        gear(w * 0.72, h * 0.24, h * 0.13, '#b8862b');
      } else if (a.chest === 'heart') {
        g.fillStyle = '#cf2a2a';
        g.beginPath();
        g.moveTo(cx, h * 0.82);
        g.bezierCurveTo(w * 0.02, h * 0.5, w * 0.2, h * 0.08, cx, h * 0.34);
        g.bezierCurveTo(w * 0.8, h * 0.08, w * 0.98, h * 0.5, cx, h * 0.82);
        g.fill();
      } else if (a.chest === 'number') {
        g.fillStyle = livery.body === '#c5372c' ? '#2a5486' : '#c5372c';
        g.beginPath(); g.arc(cx, cy, h * 0.4, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#fffaf0';
        g.font = `bold ${h * 0.62}px Georgia, serif`;
        g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(unit, cx, cy + h * 0.04);
      } else {
        g.fillStyle = '#27456e';
        g.beginPath(); g.roundRect(w * 0.08, h * 0.1, w * 0.84, h * 0.8, 16); g.fill();
        g.fillStyle = '#f2c14e';
        g.beginPath(); g.arc(cx, cy, h * 0.2, 0, Math.PI * 2); g.fill();
        g.strokeStyle = '#f7eedb'; g.lineWidth = 4;
        g.beginPath(); g.ellipse(cx, cy, h * 0.36, h * 0.09, -0.35, 0, Math.PI * 2); g.stroke();
        g.fillStyle = '#ffffff';
        for (let i = 0; i < 9; i++) g.fillRect(w * (0.12 + random() * 0.76), h * (0.14 + random() * 0.7), 3, 3);
      }
      g.restore();
    };
    const litho = (w: number, h: number, draw: (g: Ctx) => void) => {
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const g = canvas.getContext('2d')!;
      tinPlate(g, w, h);
      draw(g);
      rust(g, w, h);
      const map = new THREE.CanvasTexture(canvas);
      map.colorSpace = THREE.SRGBColorSpace;
      return new THREE.MeshStandardMaterial({ map, metalness: 0.25, roughness: rough });
    };

    const robot = new THREE.Group();
    const barrel = a.era === 'atomic' || a.era === 'mechanical';
    const halfW = 0.046, halfD = barrel ? 0.044 : 0.031;
    const hipY = 0.092, torsoH = 0.092, shoulderY = hipY + torsoH - 0.02, neckY = hipY + torsoH;

    // Torso.
    const upper = put(robot, new THREE.Group());
    if (barrel) {
      const wrap = litho(512, 192, (g) => panel(g, 181, 30, 150, 132));
      const body = cyl(upper, 0.044, 0.046, torsoH, [0, hipY + torsoH / 2, 0], wrap, 'y', 32);
      body.rotation.y = Math.PI;
      for (const y of [hipY + 0.004, neckY - 0.004]) put(upper, new THREE.Mesh(new THREE.TorusGeometry(0.046, 0.004, 8, 32), trim), [0, y, 0]).rotation.x = Math.PI / 2;
      cyl(upper, 0.03, 0.044, 0.012, [0, neckY + 0.006, 0], trim);
    } else {
      const front = litho(256, 256, (g) => panel(g, 40, 44, 176, 168));
      const side = litho(128, 192, () => undefined);
      box(upper, [halfW * 2, torsoH, halfD * 2], [0, hipY + torsoH / 2, 0], [side, side, tin, tin, front, side]);
      box(upper, [halfW * 2 + 0.006, 0.01, halfD * 2 + 0.006], [0, hipY + 0.005, 0], trim);
      box(upper, [halfW * 2 + 0.006, 0.006, halfD * 2 + 0.006], [0, neckY - 0.003, 0], trim);
    }
    cyl(upper, 0.014, 0.016, 0.014, [0, neckY + 0.005, 0], dark);
    box(robot, [0.07, 0.012, 0.036], [0, hipY - 0.004, 0], dark);

    // Head, built per design, with eyes and a top piece that can go missing.
    const head = put(upper, new THREE.Group(), [0, neckY + 0.01, 0]);
    const eyeColour = { boxhead: '#ffd45a', atomic: '#7df0ff', spaceman: '#1d2430', mechanical: '#ff8a3a' }[a.era];
    const glow = a.era === 'spaceman' ? 0 : wound ? mix(0.5, 1.8, mood.energy) : a.key === 'rundown' ? 0.12 : 0;
    const eyeMaterials: THREE.MeshStandardMaterial[] = [];
    const eye = (geometry: THREE.BufferGeometry, at: readonly [number, number, number], index: number) => {
      const gone = lostEye && index === 0;
      const material = new THREE.MeshStandardMaterial({ color: gone ? '#0c0d0f' : eyeColour, emissive: gone ? '#000000' : eyeColour, emissiveIntensity: gone ? 0 : glow, roughness: 0.4 });
      if (!gone) eyeMaterials.push(material);
      const mesh = put(head, new THREE.Mesh(geometry, material), at);
      if (gone) mesh.scale.multiplyScalar(0.8);
      return mesh;
    };
    const top = new THREE.Group();
    if (a.era === 'boxhead') {
      const face = litho(160, 128, (g) => {
        g.fillStyle = '#1d2026';
        g.fillRect(48, 86, 64, 22);
        g.fillStyle = livery.trim;
        for (let i = 0; i < 5; i++) g.fillRect(53 + i * 12, 89, 6, 16);
      });
      box(head, [0.064, 0.052, 0.054], [0, 0.026, 0], [tin, tin, tin, tin, face, tin]);
      for (const [i, x] of [-0.015, 0.015].entries()) {
        cyl(head, 0.0115, 0.0115, 0.005, [x, 0.033, 0.0275], trim, 'z');
        eye(new THREE.SphereGeometry(0.0085, 16, 12), [x, 0.033, 0.029], i);
      }
      for (const x of [-1, 1]) cyl(head, 0.009, 0.009, 0.01, [x * 0.036, 0.028, 0], trim, 'x');
      put(head, top, [0, 0.052, 0]);
      cyl(top, 0.0022, 0.0022, 0.034, [0, 0.017, 0], steel, 'y', 8);
      ball(top, 0.007, [0, 0.036, 0], s.material('#c5372c'));
    } else if (a.era === 'atomic') {
      cyl(head, 0.034, 0.03, 0.014, [0, 0.007, 0], trim);
      const coil = new THREE.MeshStandardMaterial({ color: '#ff7a3c', emissive: '#ff5a1e', emissiveIntensity: glow * 0.9 + 0.1, roughness: 0.5 });
      eyeMaterials.push(coil);
      put(head, new THREE.Mesh(new THREE.TorusKnotGeometry(0.011, 0.0032, 48, 6, 2, 5), coil), [0, 0.03, 0]);
      cyl(head, 0.004, 0.004, 0.016, [0, 0.02, 0], steel, 'y', 8);
      const dome = new THREE.Mesh(new THREE.SphereGeometry(0.033, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshPhysicalMaterial({ color: '#dff3f5', transparent: true, opacity: 0.3, roughness: 0.05, depthWrite: false }));
      dome.position.y = 0.014;
      head.add(dome);
      put(head, new THREE.Mesh(new THREE.TorusGeometry(0.033, 0.0022, 6, 32), steel), [0, 0.014, 0]).rotation.x = Math.PI / 2;
      for (const [i, x] of [-0.013, 0.013].entries()) eye(new THREE.SphereGeometry(0.006, 14, 10), [x, 0.008, 0.031], i);
      put(head, top, [0, 0.047, 0]);
      cyl(top, 0.002, 0.002, 0.016, [0, 0.008, 0], steel, 'y', 8);
      put(top, new THREE.Mesh(new THREE.TorusGeometry(0.009, 0.002, 6, 24), steel), [0, 0.025, 0]);
    } else if (a.era === 'spaceman') {
      ball(head, 0.036, [0, 0.034, 0], tin);
      const visor = cyl(head, 0.025, 0.025, 0.012, [0, 0.034, 0.028], s.material('#f1dcc0'), 'z', 28);
      visor.scale.set(1, 1, 1);
      put(head, new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.004, 8, 28), trim), [0, 0.034, 0.033]);
      for (const [i, x] of [-0.009, 0.009].entries()) eye(new THREE.SphereGeometry(0.0038, 12, 8), [x, 0.04, 0.034], i);
      const smile = put(head, new THREE.Mesh(new THREE.TorusGeometry(0.009, 0.0016, 6, 16, Math.PI * 0.8), s.material(mood.cheer > 0.35 ? '#a8322a' : '#4a3a36')), [0, mood.cheer > 0.35 ? 0.032 : 0.02, 0.0345]);
      smile.rotation.z = mood.cheer > 0.35 ? Math.PI * 1.1 : Math.PI * 0.1;
      for (const x of [-1, 1]) cyl(head, 0.012, 0.012, 0.012, [x * 0.037, 0.034, 0], trim, 'x');
      put(head, top, [0.04, 0.042, 0]);
      cyl(top, 0.002, 0.002, 0.04, [0, 0.02, 0], steel, 'y', 8);
      ball(top, 0.005, [0, 0.042, 0], s.material('#c5372c'));
    } else {
      const drum = litho(256, 128, () => undefined);
      cyl(head, 0.029, 0.029, 0.05, [0, 0.025, 0], drum, 'y', 28).rotation.y = Math.PI;
      for (const [i, x] of [-0.012, 0.012].entries()) eye(new THREE.BoxGeometry(0.013, 0.005, 0.006), [x, 0.034, 0.0275], i);
      box(head, [0.03, 0.013, 0.012], [0, 0.011, 0.027], trim);
      for (let i = 0; i < 4; i++) box(head, [0.003, 0.009, 0.002], [-0.009 + i * 0.006, 0.011, 0.0335], dark);
      ball(head, 0.004, [0, 0.023, 0.03], steel);
      for (const x of [-1, 1]) cyl(head, 0.006, 0.006, 0.008, [x * 0.03, 0.026, 0], steel, 'x', 6);
      put(head, top, [0, 0.05, 0]);
      cyl(top, 0.009, 0.03, 0.022, [0, 0.011, 0], trim);
      cyl(top, 0.004, 0.004, 0.012, [0, 0.026, 0], trim, 'y', 10);
    }
    if (lostTop) {
      top.scale.set(1, 0.45, 1);
      top.rotation.z = 0.95 + random() * 0.4;
      top.rotation.y = random() * 6;
    }

    // Arms hang from shoulder pivots and end in pincers.
    const arms: THREE.Group[] = [];
    for (const side of [-1, 1]) {
      const shoulderX = side * (halfW + 0.011);
      cyl(upper, 0.009, 0.009, 0.012, [side * (halfW + 0.004), shoulderY, 0], dark, 'x', 12);
      if (lostArm && side === -1) continue;
      const arm = put(upper, new THREE.Group(), [shoulderX, shoulderY, 0]);
      if (barrel) cyl(arm, 0.008, 0.008, 0.058, [0, -0.029, 0], steel, 'y', 12);
      else box(arm, [0.018, 0.06, 0.022], [0, -0.028, 0], tin);
      cyl(arm, 0.011, 0.011, 0.008, [0, -0.06, 0], trim, 'y', 12);
      const claw = put(arm, new THREE.Mesh(new THREE.TorusGeometry(0.011, 0.0038, 8, 20, Math.PI * 1.45), s.material('#c5372c', { metalness: 0.2 })), [0, -0.075, 0]);
      claw.rotation.set(0, Math.PI / 2, Math.PI * 0.78);
      arms.push(arm);
    }

    // Legs swing from the hips; big flat feet keep it upright.
    const legs = [-1, 1].map((side) => {
      const leg = put(robot, new THREE.Group(), [side * 0.024, hipY - 0.006, 0]);
      box(leg, [0.03, 0.07, 0.034], [0, -0.035, 0], tin);
      box(leg, [0.032, 0.008, 0.036], [0, -0.05, 0], trim);
      box(leg, [0.04, 0.016, 0.07], [0, -0.076, 0.012], trim);
      return leg;
    });

    // The key: a shaft out of the back with two looped wings.
    const key = put(upper, new THREE.Group(), [0, hipY + torsoH * 0.5, -halfD]);
    cyl(key, 0.0035, 0.0035, 0.04, [0, 0, -0.02], steel, 'z', 4);
    cyl(key, 0.009, 0.009, 0.003, [0, 0, -0.001], dark, 'z', 16);
    if (a.key !== 'lost') {
      const brass = s.material('#d9b45a', { metalness: 0.45, roughness: 0.3 });
      for (const side of [-1, 1]) put(key, new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.0042, 8, 24), brass), [side * 0.026, 0, -0.04]);
      box(key, [0.016, 0.009, 0.007], [0, 0, -0.04], brass);
      key.rotation.z = 0.5 + random() * 0.6;
    }

    const pose = new THREE.Group();
    pose.add(robot);
    s.root.add(pose);
    const stride = { striding: 0.42, halted: 0, blocked: 0.26, fallen: 0.5 }[a.doing];
    const swing = { striding: 0.55, halted: 0, blocked: 0.2, fallen: 0.45 }[a.doing];
    const armRest = { striding: -0.25, halted: 0.06, blocked: -1.05, fallen: -0.9 }[a.doing];
    const setLimbs = (k: number) => {
      legs[0].rotation.x = -stride * k;
      legs[1].rotation.x = stride * k;
      arms.forEach((arm, index) => { arm.rotation.x = armRest + swing * k * (index === arms.length - 1 ? -1 : 1); });
    };
    setLimbs(1);
    if (a.doing === 'halted') head.rotation.x = wound ? 0.08 : 0.3;
    if (a.doing === 'blocked') {
      robot.rotation.x = -0.1;
      const hue = ['#2f8f4e', '#e0aa25', '#2a5486', '#c5372c'][Math.floor(random() * 4)];
      const block = s.box([0.06, 0.06, 0.06], [random() * 0.02 - 0.01, 0.03, 0.105], s.material(hue === livery.body ? '#e3c28d' : hue));
      block.rotation.y = (random() - 0.5) * 0.5;
    }
    if (a.doing === 'fallen') {
      pose.rotation.x = Math.PI / 2 - 0.06;
      pose.rotation.z = (random() - 0.5) * 0.5;
    }

    const rate = mix(2.5, 12, mood.energy);
    const rock = a.doing === 'striding' ? 0.07 : a.doing === 'blocked' ? 0.03 : 0;
    robot.rotation.z = rock;
    return s.finish({
      update: wound
        ? (_dt, time) => {
            // Clockwork moves in ratchet ticks, not smoothly.
            const tick = Math.floor(time * rate);
            const k = Math.cos((tick / 8) * Math.PI * 2);
            setLimbs(k);
            robot.rotation.z = rock * k;
            key.rotation.z = 0.8 - tick * 0.45;
            for (const material of eyeMaterials) material.emissiveIntensity = glow * (tick % 5 === 0 ? 0.55 : 1);
          }
        : undefined,
    });
  },
});
