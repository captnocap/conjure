import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

type P2 = [number, number];
type P3 = [number, number, number];

/** Dark vesicular basalt with pale flaking scars, dusted toward ochre. UVs are in metres. */
function basaltTexture(random: () => number, dust: number, tone: string) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = tone;
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 2600; i++) {
    const light = random() < 0.45;
    ctx.fillStyle = light ? `rgba(150,128,100,${0.1 + random() * 0.2})` : `rgba(12,9,7,${0.15 + random() * 0.35})`;
    const r = 0.6 + random() * (light ? 2.2 : 3);
    ctx.beginPath();
    ctx.arc(random() * 512, random() * 512, r, 0, Math.PI * 2);
    ctx.fill();
  }
  // Flaked-off scars: paler irregular patches with a dark rim on one side.
  for (let i = 0; i < 14; i++) {
    const x = random() * 512, y = random() * 512, r = 18 + random() * 50;
    ctx.fillStyle = `rgba(120,100,78,${0.25 + random() * 0.2})`;
    ctx.beginPath();
    for (let k = 0; k < 7; k++) {
      const t = (k / 7) * Math.PI * 2, rr = r * (0.6 + random() * 0.5);
      k ? ctx.lineTo(x + Math.cos(t) * rr, y + Math.sin(t) * rr * 0.7) : ctx.moveTo(x + Math.cos(t) * rr, y + Math.sin(t) * rr * 0.7);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(15,10,8,0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  // Hairline cracks.
  ctx.strokeStyle = 'rgba(10,8,6,0.6)';
  for (let i = 0; i < 9; i++) {
    ctx.lineWidth = 0.8 + random() * 1.6;
    let x = random() * 512, y = random() * 512;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let k = 0; k < 6; k++) { x += (random() - 0.5) * 120; y += (random() - 0.5) * 120; ctx.lineTo(x, y); }
    ctx.stroke();
  }
  ctx.fillStyle = `rgba(168,124,70,${dust * 0.55})`;
  ctx.fillRect(0, 0, 512, 512);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(0.9, 0.9);
  return map;
}

/** A flat irregular plate from y = 0 to y = thickness, outline given in x and z. */
function plateGeometry(points: readonly P2[], thickness: number, bevel: number) {
  const shape = new THREE.Shape(points.map(([x, z]) => new THREE.Vector2(x, -z)));
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel * 1.4, bevelSegments: 1, curveSegments: 4 });
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, bevel, 0);
  return geometry;
}

function outline(random: () => number, cx: number, cz: number, rx: number, rz: number, corners: number): P2[] {
  return Array.from({ length: corners }, (_unused, i) => {
    const t = (i / corners) * Math.PI * 2 + (random() - 0.5) * 0.35, r = 0.78 + random() * 0.3;
    return [cx + Math.cos(t) * rx * r, cz + Math.sin(t) * rz * r] as P2;
  });
}

export default defineThing({
  questions: {
    cap: choice('How is the lens cap lying?', {
      hood: 'Curved side up like a tiny white tunnel, its two semicircular ends showing.',
      trough: 'Flipped over, cupped side up like a little white trough holding a pinch of dust.',
      tilted: 'Rolled onto its side, one semicircular end facing the sky, propped against a pebble.',
      plate: 'A flat white half-disc with a rolled rim, lying like a dropped saucer.',
    }),
    arm: choice('What else of the lander is in frame?', {
      both: 'The toothed edge of the landing ring behind, and the jointed soil arm reaching out from it.',
      ring: 'Only the toothed edge of the landing ring along the back.',
      alone: 'Nothing: the cap alone on the rock, the lander out of frame.',
    }),
    probe: choice('What did the soil probe do?', {
      pressing: 'Came down dead on the cap: the conical tip pressed into it, measuring the cap instead of Venus.',
      hovering: 'Is just about to: the tip hanging a hand above the cap.',
      missed: 'Missed by a hand\'s breadth: the tip sunk in grit beside the cap.',
      dented: 'Has been and gone: a small round dent left in the cap.',
    }),
    slab: choice('What is the rock under it like?', {
      plate: 'One broad flat slab of dark basalt with flaking edges.',
      layered: 'Stacked thin plates like split shale, each edge a pale step.',
      cracked: 'A pavement cracked into polygons with grit in the joints.',
      glassy: 'A smooth dark glassy lava skin with ropy folds.',
    }),
    marking: choice('What is on the cap?', {
      plain: 'Plain white paint, nothing else.',
      number: 'A stencilled black serial number.',
      stripe: 'A red stripe across it.',
      scorched: 'Half blackened by the heat of the descent.',
    }),
    around: choice('What lies around it?', {
      bare: 'Nothing: bare rock.',
      pebbles: 'A scatter of dark pebbles and flakes.',
      drift: 'A small drift of rust-brown dust banked against one side.',
      bolts: 'The spring and two bolts that held the cap on, flung nearby.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const dust = mix(0.05, 0.6, mood.wear);
    const ochre = new THREE.Color('#a87c46');
    const paint = (colour: string, options: THREE.MeshStandardMaterialParameters = {}) =>
      new THREE.MeshStandardMaterial({ color: new THREE.Color(colour).lerp(ochre, dust * 0.5), roughness: 0.85, ...options });

    // ---- The rock ----------------------------------------------------------------------------
    const glassy = a.slab === 'glassy';
    const rockTone = glassy ? '#2c2622' : new THREE.Color('#4a4038').lerp(new THREE.Color('#5a3d2c'), mood.warmth * 0.5).getStyle();
    const rockMap = basaltTexture(random, dust, rockTone);
    const rock = new THREE.MeshStandardMaterial({ map: rockMap, bumpMap: rockMap, bumpScale: 1.5, roughness: glassy ? 0.35 : 0.95, metalness: glassy ? 0.2 : 0 });
    const edge = paint('#5d5146', { roughness: 1 });
    let top = 0.07;
    if (a.slab === 'plate' || glassy) {
      s.mesh(plateGeometry(outline(random, 0, 0, 0.56, 0.46, 9), 0.06, 0.01), rock);
      if (glassy) {
        // Ropy folds: low arched ridges across the skin.
        for (let i = 0; i < 5; i++) {
          const z = -0.3 + i * 0.14 + (random() - 0.5) * 0.04, bow = 0.08 + random() * 0.06;
          s.tube([[-0.4, top - 0.006, z], [-0.13, top + 0.004, z + bow], [0.13, top + 0.004, z + bow], [0.4, top - 0.006, z]], 0.014, rock);
        }
      }
    } else if (a.slab === 'layered') {
      for (let layer = 0; layer < 3; layer++) {
        const shrink = 1 - layer * 0.17;
        s.mesh(plateGeometry(outline(random, (random() - 0.5) * 0.08, (random() - 0.5) * 0.06, 0.58 * shrink, 0.47 * shrink, 8), 0.028, 0.006), layer % 2 ? edge : rock).position.y = layer * 0.04;
      }
      top = 0.12;
    } else {
      // Cracked pavement: a jittered grid of plates with gaps between.
      const grid = 3, cell = 0.36;
      for (let i = 0; i < grid; i++)
        for (let k = 0; k < grid; k++) {
          const cx = (i - 1) * cell + (random() - 0.5) * 0.05, cz = (k - 1) * cell * 0.85 + (random() - 0.5) * 0.05;
          const piece = s.mesh(plateGeometry(outline(random, 0, 0, cell * 0.47, cell * 0.4, 6), 0.05 + random() * 0.02, 0.008), rock, [cx, 0, cz]);
          if (i !== 1 || k !== 1) piece.rotation.set((random() - 0.5) * 0.06, random() * 0.4, (random() - 0.5) * 0.06);
        }
      s.cylinder(0.6, 0.62, 0.03, [0, 0.015, 0], paint('#6b5038', { roughness: 1 }), 20);
    }

    // ---- The cap -------------------------------------------------------------------------------
    const R = 0.1, L = 0.27;
    const capCanvas = document.createElement('canvas');
    capCanvas.width = 256; capCanvas.height = 256;
    const cx = capCanvas.getContext('2d')!;
    const white = new THREE.Color('#f3f1ea').lerp(ochre, dust * 0.35);
    cx.fillStyle = white.getStyle();
    cx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 400; i++) { cx.fillStyle = `rgba(120,90,60,${random() * 0.08 + dust * 0.1})`; cx.fillRect(random() * 256, random() * 256, 2 + random() * 6, 1 + random() * 2); }
    if (a.marking === 'number') {
      cx.fillStyle = '#1d1b19';
      cx.font = 'bold 64px monospace';
      cx.textAlign = 'center'; cx.textBaseline = 'middle';
      cx.save(); cx.translate(128, 128); cx.rotate(-Math.PI / 2); cx.fillText(`${['14', '13', '09', '10', '11', '12'][Math.floor(random() * 6)]}-${Math.floor(random() * 9)}`, 0, 0); cx.restore();
    } else if (a.marking === 'stripe') {
      cx.fillStyle = '#c4231c';
      cx.fillRect(0, 96, 256, 44);
    } else if (a.marking === 'scorched') {
      const burn = cx.createLinearGradient(0, 0, 256, 0);
      burn.addColorStop(0, 'rgba(20,12,6,0.95)'); burn.addColorStop(0.55, 'rgba(40,24,12,0.6)'); burn.addColorStop(1, 'rgba(40,24,12,0)');
      cx.fillStyle = burn; cx.fillRect(0, 0, 256, 256);
    }
    if (a.probe === 'dented') {
      const dent = cx.createRadialGradient(118, 128, 2, 128, 128, 30);
      dent.addColorStop(0, 'rgba(30,22,14,0.75)'); dent.addColorStop(0.6, 'rgba(60,45,30,0.35)'); dent.addColorStop(1, 'rgba(255,255,255,0)');
      cx.fillStyle = dent; cx.beginPath(); cx.arc(128, 128, 30, 0, Math.PI * 2); cx.fill();
      cx.strokeStyle = 'rgba(255,255,255,0.7)'; cx.lineWidth = 2; cx.beginPath(); cx.arc(130, 126, 24, 0.3, 2.4); cx.stroke();
    }
    const capMap = new THREE.CanvasTexture(capCanvas);
    capMap.colorSpace = THREE.SRGBColorSpace;
    const capSkin = new THREE.MeshStandardMaterial({ map: capMap, roughness: mix(0.35, 0.8, dust), side: THREE.DoubleSide });
    const capPlain = new THREE.MeshStandardMaterial({ color: white, roughness: mix(0.35, 0.8, dust), side: THREE.DoubleSide });
    const capInside = new THREE.MeshStandardMaterial({ color: new THREE.Color('#d8d4c8').lerp(ochre, dust * 0.5), roughness: 0.9, side: THREE.DoubleSide });

    const cap = new THREE.Group();
    s.root.add(cap);
    const own = <T extends THREE.Object3D>(node: T) => { cap.add(node); return node; };
    if (a.cap === 'plate') {
      const half = new THREE.Shape();
      half.absarc(0, 0, R * 1.5, 0, Math.PI, false);
      half.lineTo(R * 1.5, 0);
      const disc = new THREE.ExtrudeGeometry(half, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 2, curveSegments: 24 });
      disc.rotateX(-Math.PI / 2);
      own(s.mesh(disc, capPlain, [0, 0.004, 0.06]));
      const rim = own(s.mesh(new THREE.TorusGeometry(R * 1.5, 0.008, 6, 32, Math.PI), capPlain, [0, 0.016, 0.06]));
      rim.rotation.x = -Math.PI / 2;
      own(s.box([R * 3, 0.014, 0.02], [0, 0.012, 0.06], capPlain));
      // A painted face on the half-disc top for the marking.
      const face = own(s.mesh(new THREE.CircleGeometry(R * 1.3, 24, 0, Math.PI), capSkin, [0, 0.0205, 0.06]));
      face.rotation.x = -Math.PI / 2;
    } else {
      const shell = new THREE.CylinderGeometry(R, R, L, 28, 1, true, 0, Math.PI);
      shell.rotateZ(Math.PI / 2);
      own(s.mesh(shell, capSkin));
      for (const side of [-1, 1]) {
        const end = own(s.mesh(new THREE.CircleGeometry(R, 24, 0, Math.PI), capPlain, [side * L / 2, 0, 0]));
        end.rotation.y = side * Math.PI / 2;
        own(s.mesh(new THREE.TorusGeometry(R, 0.006, 6, 24, Math.PI), capPlain, [side * L / 2, 0, 0])).rotation.y = Math.PI / 2;
      }
      // The lip along both open edges, and the hinge tab.
      for (const side of [-1, 1]) own(s.box([L + 0.01, 0.008, 0.018], [0, 0.004, side * (R + 0.006)], capPlain));
      own(s.box([0.04, 0.012, 0.03], [L / 2 + 0.02, 0.006, R], capPlain));
      if (a.cap === 'trough') {
        own(s.box([L * 0.9, 0.012, R * 1.0], [0, R * 0.8, 0], capInside));
        cap.rotation.x = Math.PI;
        cap.position.y = R + 0.01;
      } else if (a.cap === 'tilted') {
        cap.rotation.set(0, 0, Math.PI / 2 - 0.25);
        cap.position.y = L / 2 - 0.01;
      }
    }
    const capAt: P3 = [0.02 + (random() - 0.5) * 0.08, top, 0.06 + (random() - 0.5) * 0.06];
    cap.position.x += capAt[0];
    cap.position.y += capAt[1];
    cap.position.z += capAt[2];
    cap.rotation.y += -0.8 + (random() - 0.5) * 0.5;
    const capTop = a.cap === 'plate' ? top + 0.03 : a.cap === 'tilted' ? top + L * 0.95 : top + R + 0.01;
    if (a.cap === 'tilted') s.ball([0.05, 0.035, 0.045], [capAt[0] - 0.1, top + 0.02, capAt[2] + 0.05], paint('#3a322c'), 8);

    // ---- The lander, at the back ----------------------------------------------------------
    const frame = paint('#4f4f4b', { metalness: 0.5, roughness: 0.55 });
    const ringPaint = paint('#7d7467', { metalness: 0.35, roughness: 0.6 });
    const ringR = 1.5, near = -0.52;
    if (a.arm !== 'alone') {
      const span = 1.0;
      const ring = new THREE.TorusGeometry(ringR, 0.075, 10, 36, span);
      ring.rotateZ(Math.PI / 2 - span / 2);
      ring.rotateX(Math.PI / 2);
      s.mesh(ring, ringPaint, [0, 0.13, near - ringR]);
      const teeth = 9;
      for (let i = 0; i <= teeth; i++) {
        const t = Math.PI / 2 - span / 2 + 0.04 + (i / teeth) * (span - 0.08);
        const tooth = s.box([0.07, 0.09, 0.1], [Math.cos(t) * (ringR + 0.09), 0.05, near - ringR + Math.sin(t) * (ringR + 0.09)], paint('#24211e'));
        tooth.rotation.y = -t + Math.PI / 2;
      }
    }

    // ---- The soil arm ---------------------------------------------------------------------------
    const metal = paint('#bdb9ad', { metalness: 0.6, roughness: 0.4 });
    let arm: THREE.Group | null = null;
    if (a.arm === 'both' && a.probe !== 'dented') {
      arm = new THREE.Group();
      s.root.add(arm);
      const base: P3 = [0.32, 0.22, near + 0.02];
      const target: P3 = a.probe === 'missed'
        ? [capAt[0] + 0.22, top + 0.02, capAt[2] + 0.1]
        : [capAt[0], capTop + (a.probe === 'hovering' ? 0.12 : 0.0), capAt[2]];
      const elbow: P3 = [(base[0] + target[0]) / 2 + 0.08, Math.max(base[1], target[1]) + 0.32, (base[2] + target[2]) / 2 - 0.08];
      const tipLength = 0.11;
      const wrist: P3 = [target[0], target[1] + tipLength + 0.04, target[2]];
      const add = <T extends THREE.Object3D>(node: T) => { arm!.add(node); return node; };
      add(s.box([0.12, 0.08, 0.1], base, frame));
      add(s.rod(base, elbow, 0.018, metal));
      add(s.ball([0.03, 0.03, 0.03], elbow, frame, 10));
      add(s.rod(elbow, wrist, 0.015, metal));
      add(s.cylinder(0.03, 0.03, 0.04, [wrist[0], wrist[1] - 0.02, wrist[2]], frame, 12));
      // The conical tip, point down, with its flat stop-ring.
      add(s.cylinder(0.026, 0.002, tipLength, [target[0], target[1] + tipLength / 2 - (a.probe === 'missed' ? 0.03 : 0.005), target[2]], paint('#9c978b', { metalness: 0.7, roughness: 0.35 }), 14));
      add(s.cylinder(0.04, 0.04, 0.006, [target[0], target[1] + tipLength * 0.8, target[2]], frame, 16));
      add(s.tube([base, [base[0] + 0.12, base[1] + 0.18, base[2] + 0.06], [elbow[0], elbow[1] - 0.04, elbow[2]]], 0.006, paint('#2b2723')));
      if (a.probe === 'missed') {
        const crater = s.mesh(new THREE.TorusGeometry(0.04, 0.012, 6, 16), paint('#6d5137', { roughness: 1 }), [target[0], top + 0.005, target[2]]);
        crater.rotation.x = Math.PI / 2;
      }
    }

    // ---- Around it -----------------------------------------------------------------------------
    const stone = paint('#3a322c', { roughness: 0.95 });
    if (a.around === 'pebbles') {
      const pebbles = Array.from({ length: 26 }, () => {
        const angle = random() * Math.PI * 2, r = 0.16 + random() * 0.34;
        return { at: [Math.cos(angle) * r, top + 0.01, Math.sin(angle) * r * 0.85] as P3, size: mix(0.012, 0.04, random() ** 2) };
      }).filter(({ at }) => Math.hypot(at[0] - capAt[0], at[2] - capAt[2]) > 0.16);
      s.scatter(new THREE.DodecahedronGeometry(1, 0), stone, pebbles);
      for (let i = 0; i < 6; i++) {
        const flake = s.box([0.05 + random() * 0.06, 0.008, 0.04 + random() * 0.04], [(random() - 0.5) * 0.8, top + 0.004, (random() - 0.5) * 0.6], edge);
        flake.rotation.set((random() - 0.5) * 0.2, random() * 3, (random() - 0.5) * 0.2);
      }
    } else if (a.around === 'drift') {
      const drift = s.ball([0.22, 0.03, 0.1], [capAt[0] - 0.05, top, capAt[2] + R + 0.06], paint('#6e4c33', { roughness: 1 }), 18);
      drift.rotation.y = -0.4;
      s.ball([0.12, 0.02, 0.07], [capAt[0] + 0.22, top, capAt[2] - 0.06], paint('#6e4c33', { roughness: 1 }), 14);
    } else if (a.around === 'bolts') {
      const steel = paint('#8d8a82', { metalness: 0.7, roughness: 0.35 });
      const coil: P3[] = [];
      const sx = capAt[0] - 0.26, sz = capAt[2] + 0.12;
      for (let i = 0; i <= 40; i++) coil.push([sx + i * 0.0025, top + 0.014 + Math.sin(i * 0.9) * 0.011, sz + Math.cos(i * 0.9) * 0.011]);
      s.tube(coil, 0.0025, steel);
      for (const [bx, bz] of [[0.2, -0.12], [0.3, 0.18]] as P2[]) {
        const bolt = s.cylinder(0.006, 0.006, 0.04, [capAt[0] + bx, top + 0.008, capAt[2] + bz], steel, 8);
        bolt.rotation.z = Math.PI / 2;
        bolt.rotation.y = random() * 3;
        s.cylinder(0.012, 0.012, 0.008, [capAt[0] + bx - 0.02, top + 0.012, capAt[2] + bz], steel, 6).rotation.z = Math.PI / 2;
      }
    }

    // A breath of hot wind rocks the cap, faster when the scene is restless.
    const rest = cap.rotation.z;
    const sway = mix(0.004, 0.03, mood.energy), pace = mix(0.6, 2.4, mood.energy);
    return s.finish({
      update(_dt, time) {
        cap.rotation.z = rest + Math.sin(time * pace) * sway * (a.cap === 'plate' ? 0.3 : 1);
      },
    });
  },
});
