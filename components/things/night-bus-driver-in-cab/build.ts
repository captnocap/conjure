import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix, noul } from '@conjure/kit';
import { SKINS, anatomy, at, garment, joints, pick, poseArm, poseLeg, reachArm } from './bus';

/** A child's crayon drawing: a sun, a house and a bus, on a sheet of paper. */
function drawing(random: () => number) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 96;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#f6f2e6';
  ctx.fillRect(0, 0, 128, 96);
  ctx.strokeStyle = '#e8b020';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(100, 22, 10, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(100 + Math.cos(angle) * 13, 22 + Math.sin(angle) * 13);
    ctx.lineTo(100 + Math.cos(angle) * 19, 22 + Math.sin(angle) * 19);
    ctx.stroke();
  }
  ctx.strokeStyle = random() < 0.5 ? '#d02a2a' : '#2a5ad0';
  ctx.lineWidth = 4;
  ctx.strokeRect(20, 50, 70, 30);
  for (let i = 0; i < 3; i++) ctx.strokeRect(28 + i * 22, 56, 12, 10);
  ctx.fillStyle = '#2a2a2a';
  ctx.beginPath();
  ctx.arc(34, 82, 6, 0, Math.PI * 2);
  ctx.arc(76, 82, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#3a9a3a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(4, 90);
  ctx.lineTo(124, 90);
  ctx.stroke();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default defineThing({
  questions: {
    uniform: choice('What is the driver wearing?', {
      shirt: 'A white shirt and a company tie.',
      hivis: 'A polo shirt under a hi-vis vest.',
      cardigan: 'A wool cardigan over the shirt, against the night cold.',
      epaulettes: 'A short-sleeved uniform shirt with epaulettes.',
    }),
    dash: choice('What is on the dash or hanging from the mirror?', {
      thermos: 'A steel thermos flask wedged on the dash.',
      beads: 'Prayer beads hanging from the mirror.',
      toy: 'A small toy dangling from the mirror.',
      paper: 'A folded newspaper on the dash.',
      bare: 'Nothing: a bare dash.',
    }),
    posture: choice('How is the driver sitting?', {
      driving: 'Both hands on the wheel, head turned to the mirror.',
      red: 'Leaning back at a red light, one hand on the wheel, the other on a knee.',
      elbow: 'Elbow propped on the window ledge, chin in hand, one hand on the wheel.',
    }),
    glow: noul('Does the cab glow green from the ticket machine?'),
    notice: choice('What is stuck to the assault screen?', {
      standing: 'A printed NO STANDING notice.',
      fare: 'A PLEASE HAVE EXACT FARE sticker.',
      drawing: 'A child\'s crayon drawing taped up.',
      nothing: 'Nothing, just the glass.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const H = mix(1.66, 1.86, random());
    const build = random() < 0.45 ? 'heavy' : 'average';
    const skin = pick(random, SKINS);
    const topColour = { shirt: '#f1f0ea', hivis: pick(random, ['#1f3a7a', '#2a2a30', '#8a1f2a']), cardigan: '#f1f0ea', epaulettes: '#dfe6ee' }[a.uniform];
    const person = figure(s, {
      height: H, build, style: 'doll', pose: 'sitting', gaze: 'ahead', skin,
      hair: pick(random, ['short', 'none', 'cap', 'short']), hairColor: pick(random, ['#2a1d18', '#3b2a22', '#8a8a86', '#1f1a18']),
      top: topColour, bottom: pick(random, ['#1f2430', '#2a2d35', '#3a3a3e']), shoes: '#1d1a18', sleeves: a.uniform === 'epaulettes' || a.uniform === 'hivis' ? 'short' : 'long',
    });
    s.root.add(person.root);
    const { torsoL, headR, chestR, spine, shoulderW, limb } = anatomy(person, H, build);
    const dark = s.material('#24262b', { roughness: 0.6 });
    const steel = s.material('#9aa0a6', { metalness: 0.6, roughness: 0.35 });
    const glass = new THREE.MeshStandardMaterial({ color: '#c9d6e2', roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide });

    // ---- uniform details.
    if (a.uniform === 'shirt' || a.uniform === 'cardigan') {
      const tie = new THREE.Mesh(new THREE.BoxGeometry(0.055, torsoL * 0.6, 0.008), s.material(pick(random, ['#1f3a7a', '#8a1f2a', '#2a6a3a']), { roughness: 0.6 }));
      tie.position.set(0, torsoL * 0.58, chestR + 0.006);
      tie.castShadow = true;
      spine.add(tie);
    }
    if (a.uniform === 'hivis') {
      const vest = s.material('#e8f03a', { roughness: 0.9, emissive: '#b8c020', emissiveIntensity: 0.15 });
      garment(person, H, build, vest, { grow: 1.1, length: 0.9, lift: -0.03 });
      const band = new THREE.Mesh(new THREE.CylinderGeometry(chestR * 1.12, chestR * 1.12, 0.04, 16, 1, true), s.material('#d8d8d8', { roughness: 0.3, metalness: 0.4 }));
      band.position.y = torsoL * 0.42;
      band.scale.x = (spine.children.find((child) => (child as THREE.Mesh).isMesh) as THREE.Mesh).scale.x * 1.02;
      spine.add(band);
    }
    if (a.uniform === 'cardigan') {
      const wool = s.material(pick(random, ['#5a4a3a', '#3a4a5a', '#6a3a3a', '#4a5a4a']), { roughness: 1 });
      garment(person, H, build, wool, { grow: 1.14, length: 1.0, open: 55 });
      for (const side of ['left', 'right'] as const) {
        const { shoulder, elbow } = joints(person, side);
        for (const node of [shoulder, elbow]) for (const child of node.children) if ((child as THREE.Mesh).isMesh) (child as THREE.Mesh).material = wool;
      }
    }
    if (a.uniform === 'epaulettes') {
      for (const side of [-1, 1]) {
        const strap = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.012, 0.03), s.material('#1f2a4a', { roughness: 0.7 }));
        strap.position.set(side * shoulderW * 0.8, torsoL - limb * 0.3, 0);
        spine.add(strap);
      }
    }

    // ---- the pose: seated high, hands to the wheel, head turned to the mirror on the aisle side (+x).
    poseLeg(person, 'left', { forward: 70, knee: 62, out: 10 });
    poseLeg(person, 'right', { forward: 72, knee: 60, out: 6 });
    const { neck } = joints(person, 'left');
    neck.rotation.set(-0.08, 0.72, 0.05);
    spine.rotation.x = a.posture === 'red' ? -0.2 : a.posture === 'elbow' ? 0.05 : 0.12;
    person.settle();
    const hips = at(person.pelvis);
    const seatTop = hips.y - 0.05 * H;
    const wheelAt = new THREE.Vector3(hips.x, hips.y + 0.42, hips.z + 0.42);
    const R = 0.235;
    // Hands at ten and two on the tilted wheel.
    const tiltUp = new THREE.Vector3(0, Math.cos(1.0), Math.sin(1.0));
    const hand = (sign: number) => wheelAt.clone().add(new THREE.Vector3(sign * R * 0.82, 0, 0)).addScaledVector(tiltUp, R * 0.45);
    for (const side of ['left', 'right'] as const) {
      const sign = side === 'left' ? 1 : -1;
      const shoulder = at(joints(person, side).shoulder);
      const onWheel = side === 'right' || a.posture === 'driving';
      if (onWheel) {
        const target = hand(sign);
        reachArm(person, side, H, target.y - 0.03 - shoulder.y, target.z - 0.07 - shoulder.z, 2, 0);
      } else if (a.posture === 'red') {
        const knee = at(joints(person, 'left').knee);
        reachArm(person, side, H, knee.y + 0.08 - shoulder.y, knee.z - 0.1 - shoulder.z, 10, 6);
      } else {
        // Elbow on the window ledge, hand up at the chin.
        poseArm(person, side, { forward: 10, out: 70, bend: 135, inward: 20 });
      }
    }
    person.root.updateMatrixWorld(true);

    // ---- the driver's seat: a high-backed chair on a pedestal.
    const upholstery = s.material(pick(random, ['#2a3550', '#3a3a3e', '#4a2a2a']), { roughness: 0.85 });
    s.box([0.52, 0.12, 0.5], [hips.x, seatTop - 0.06, hips.z + 0.08], upholstery);
    const back = s.box([0.52, 0.72, 0.12], [hips.x, seatTop + 0.3, hips.z - 0.2], upholstery);
    back.rotation.x = -0.12;
    s.box([0.3, 0.14, 0.1], [hips.x, seatTop + 0.74, hips.z - 0.26], upholstery).rotation.x = -0.12;
    s.cylinder(0.05, 0.07, seatTop - 0.14, [hips.x, (seatTop - 0.14) / 2, hips.z + 0.05], steel, 12);
    s.box([0.3, 0.04, 0.3], [hips.x, 0.02, hips.z + 0.05], dark);
    s.box([0.05, 0.03, 0.3], [hips.x + 0.29, seatTop + 0.2, hips.z + 0.02], dark);

    // ---- the wheel, its column and the binnacle.
    const rim = s.material('#4a4e58', { roughness: 0.45 });
    const wheel = s.ring(R, 0.024, [wheelAt.x, wheelAt.y, wheelAt.z], rim);
    wheel.rotation.x = 1.0;
    const hub = s.cylinder(0.05, 0.05, 0.03, [wheelAt.x, wheelAt.y, wheelAt.z], dark, 12);
    hub.rotation.x = 1.0 + Math.PI / 2;
    for (let i = 0; i < 3; i++) {
      const angle = (i / 3) * Math.PI * 2 + Math.PI / 2;
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.025, R * 0.95, 0.015), dark);
      spoke.position.set(Math.cos(angle) * R * 0.48, Math.sin(angle) * R * 0.48, 0);
      spoke.rotation.z = angle - Math.PI / 2;
      spoke.castShadow = true;
      wheel.add(spoke);
    }
    s.rod([wheelAt.x, wheelAt.y, wheelAt.z], [wheelAt.x, wheelAt.y - 0.3, wheelAt.z + 0.3], 0.03, dark);
    const dashZ = hips.z + 0.86;
    const dashMat = s.material('#2e3138', { roughness: 0.7 });
    s.box([1.35, 0.22, 0.36], [hips.x, 0.79, dashZ], dashMat);
    s.box([1.35, 0.5, 0.06], [hips.x, 0.33, dashZ + 0.15], dashMat);
    const binnacle = s.box([0.42, 0.12, 0.16], [hips.x, 0.94, dashZ - 0.12], dashMat);
    binnacle.rotation.x = 0.5;
    const dial = new THREE.MeshStandardMaterial({ color: '#223', emissive: '#6ab0ff', emissiveIntensity: mix(0.4, 1.4, 1 - mood.daylight) });
    for (const dx of [-0.1, 0.1]) s.cylinder(0.04, 0.04, 0.01, [hips.x + dx, 0.97, dashZ - 0.19], dial, 14).rotation.x = Math.PI / 2 - 0.5;

    // ---- the ticket machine and card reader on the aisle side, the cash tray on the window side.
    const machineAt = new THREE.Vector3(hips.x + 0.48, 1.04, dashZ - 0.22);
    s.cylinder(0.02, 0.025, 0.24, [machineAt.x, 0.92, machineAt.z + 0.06], steel, 10);
    const machine = s.box([0.24, 0.13, 0.2], [machineAt.x, machineAt.y, machineAt.z], s.material('#3a3d44', { roughness: 0.5 }));
    machine.rotation.set(0.4, -0.5, 0);
    const screenColour = a.glow ? '#5cff7c' : '#aab0b8';
    const screenMat = new THREE.MeshStandardMaterial({ color: screenColour, emissive: screenColour, emissiveIntensity: a.glow ? mix(1.2, 2.4, 1 - mood.daylight) : 0.15, roughness: 0.3 });
    const screen = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.09, 0.004), screenMat);
    screen.position.set(0, 0.03, -0.1);
    screen.rotation.x = -0.3;
    machine.add(screen);
    const reader = s.cylinder(0.065, 0.065, 0.03, [hips.x + 0.66, 1.1, dashZ - 0.5], s.material('#f2c230', { roughness: 0.4 }), 18);
    reader.rotation.z = Math.PI / 2;
    s.cylinder(0.02, 0.02, 0.22, [hips.x + 0.66, 0.97, dashZ - 0.5], steel, 10);
    s.box([0.2, 0.03, 0.14], [hips.x - 0.5, 0.92, dashZ - 0.3], s.material('#4a4d54', { roughness: 0.5 }));
    s.scatter(new THREE.CylinderGeometry(1, 1, 0.15, 10), s.material('#c9b25a', { metalness: 0.8, roughness: 0.3 }), Array.from({ length: 5 }, () => ({ at: [hips.x - 0.5 + (random() - 0.5) * 0.14, 0.94, dashZ - 0.3 + (random() - 0.5) * 0.09] as [number, number, number], size: 0.011 })));
    if (a.glow) {
      const green = new THREE.PointLight('#5cff7c', mix(1.5, 4, 1 - mood.daylight), 2.6, 2);
      green.position.set(machineAt.x - 0.05, machineAt.y + 0.1, machineAt.z + 0.1);
      s.root.add(green);
    }

    // ---- the mirror above and to the aisle side, and whatever hangs from it.
    const mirrorAt = new THREE.Vector3(hips.x + 0.42, 1.72, dashZ - 0.35);
    const mirror = s.box([0.34, 0.14, 0.02], [mirrorAt.x, mirrorAt.y, mirrorAt.z], s.material('#d8dde2', { metalness: 0.9, roughness: 0.15 }));
    mirror.rotation.set(0.25, -0.7, 0);
    s.rod([mirrorAt.x, mirrorAt.y + 0.07, mirrorAt.z], [mirrorAt.x, 1.88, mirrorAt.z], 0.01, dark);
    if (a.dash === 'beads') {
      const bead = s.material(pick(random, ['#3a2a1a', '#2a5a2a', '#8a2a2a', '#e8e0d0']), { roughness: 0.4 });
      s.scatter(new THREE.SphereGeometry(1, 8, 6), bead, Array.from({ length: 22 }, (_, i) => ({ at: [mirrorAt.x - 0.05 + Math.sin(i / 22 * Math.PI) * 0.03, mirrorAt.y - 0.07 - i * 0.012, mirrorAt.z + 0.02] as [number, number, number], size: 0.007 })));
      s.cylinder(0.008, 0.008, 0.04, [mirrorAt.x - 0.05, mirrorAt.y - 0.36, mirrorAt.z + 0.02], bead, 8);
    } else if (a.dash === 'toy') {
      s.rod([mirrorAt.x - 0.05, mirrorAt.y - 0.07, mirrorAt.z], [mirrorAt.x - 0.06, mirrorAt.y - 0.2, mirrorAt.z + 0.01], 0.002, s.material('#d8d8d4'));
      const toy = s.material(pick(random, ['#e84d4d', '#f4d35e', '#5fb96b', '#5a8cff']), { roughness: 0.6 });
      s.ball([0.03, 0.03, 0.03], [mirrorAt.x - 0.06, mirrorAt.y - 0.24, mirrorAt.z + 0.01], toy, 10);
      s.ball([0.04, 0.05, 0.03], [mirrorAt.x - 0.06, mirrorAt.y - 0.31, mirrorAt.z + 0.01], toy, 10);
    } else if (a.dash === 'thermos') {
      s.cylinder(0.04, 0.04, 0.26, [hips.x - 0.32, 1.03, dashZ - 0.02], s.material('#b8bcc2', { metalness: 0.8, roughness: 0.3 }), 14).rotation.z = 0.1;
      s.cylinder(0.042, 0.04, 0.05, [hips.x - 0.335, 1.18, dashZ - 0.02], s.material('#2a2a2e', { roughness: 0.5 }), 14).rotation.z = 0.1;
    } else if (a.dash === 'paper') {
      s.box([0.3, 0.02, 0.2], [hips.x - 0.3, 0.91, dashZ - 0.02], s.material('#e8e4d8', { roughness: 0.95 })).rotation.y = 0.3;
      s.box([0.26, 0.004, 0.06], [hips.x - 0.3, 0.922, dashZ - 0.07], s.material('#1a1a1e', { roughness: 0.9 })).rotation.y = 0.3;
    }

    // ---- the cab shell: floor, assault screen on the aisle side, side window, low back partition, windscreen.
    const panel = s.material(pick(random, ['#2c3140', '#3a3f4a', '#4a3a3a']), { roughness: 0.7 });
    const backZ = hips.z - 0.5, frontZ = dashZ + 0.22, sideX = hips.x + 0.72, windowX = hips.x - 0.66;
    const length = frontZ - backZ;
    s.box([1.5, 0.03, length], [hips.x + 0.03, 0.015, (backZ + frontZ) / 2], dark);
    // Assault screen (aisle side): a panel to waist height, glass to the roof, in a steel frame.
    s.box([0.05, 1.0, length], [sideX, 0.5, (backZ + frontZ) / 2], panel);
    const screenPane = s.mesh(new THREE.PlaneGeometry(length, 0.86), glass, [sideX, 1.45, (backZ + frontZ) / 2]);
    screenPane.rotation.y = Math.PI / 2;
    for (const z of [backZ, frontZ]) s.box([0.05, 1.9, 0.05], [sideX, 0.95, z], steel);
    s.box([0.05, 0.05, length], [sideX, 1.9, (backZ + frontZ) / 2], steel);
    s.box([0.07, 0.04, length], [sideX, 1.02, (backZ + frontZ) / 2], steel);
    // Low back partition with glass above: the passengers can see the driver's back.
    s.box([sideX - windowX, 1.0, 0.05], [(sideX + windowX) / 2, 0.5, backZ], panel);
    const backPane = s.mesh(new THREE.PlaneGeometry(sideX - windowX, 0.86), glass, [(sideX + windowX) / 2, 1.45, backZ]);
    void backPane;
    s.box([sideX - windowX, 0.05, 0.05], [(sideX + windowX) / 2, 1.9, backZ], steel);
    s.box([0.05, 1.9, 0.05], [windowX, 0.95, backZ], steel);
    // Side window with a ledge, and the elbow on it.
    s.box([0.05, 0.98, length], [windowX, 0.49, (backZ + frontZ) / 2], panel);
    s.box([0.1, 0.04, length], [windowX + 0.02, 1.0, (backZ + frontZ) / 2], steel);
    const sidePane = s.mesh(new THREE.PlaneGeometry(length, 0.86), glass, [windowX, 1.45, (backZ + frontZ) / 2]);
    sidePane.rotation.y = Math.PI / 2;
    s.box([0.05, 0.05, length], [windowX, 1.9, (backZ + frontZ) / 2], steel);
    s.box([0.05, 1.9, 0.05], [windowX, 0.95, frontZ], steel);
    // Windscreen: a tall tilted pane across the front with a wiper resting on it.
    const screenH = 1.35;
    const windscreen = s.mesh(new THREE.PlaneGeometry(sideX - windowX, screenH), glass, [(sideX + windowX) / 2, 0.6 + screenH / 2, frontZ]);
    windscreen.rotation.x = -0.1;
    s.box([sideX - windowX + 0.05, 0.05, 0.05], [(sideX + windowX) / 2, 1.9, frontZ - 0.1], steel);
    const wiper = s.rod([hips.x + 0.1, 0.62, frontZ - 0.01], [hips.x - 0.45, 1.5, frontZ - 0.09], 0.012, dark);
    void wiper;
    // The notice on the assault screen.
    if (a.notice !== 'nothing') {
      let sheet: THREE.Mesh;
      if (a.notice === 'drawing') sheet = s.mesh(new THREE.PlaneGeometry(0.2, 0.15), new THREE.MeshStandardMaterial({ map: drawing(random), roughness: 0.9, side: THREE.DoubleSide }), [sideX + 0.03, 1.4, hips.z + 0.1]);
      else sheet = s.label(a.notice === 'standing' ? 'NO STANDING' : 'EXACT FARE PLEASE', 0.24, 0.1, [sideX + 0.03, 1.4, hips.z + 0.1], a.notice === 'standing' ? '#f4f4f0' : '#1a1a1e', a.notice === 'standing' ? '#c8102e' : '#f2c230');
      sheet.rotation.y = Math.PI / 2;
    }

    const flicker = mix(0.02, 0.12, mood.energy);
    return s.finish({
      update(dt, time) {
        person.update(dt, time);
        if (a.glow) screenMat.emissiveIntensity = mix(1.2, 2.4, 1 - mood.daylight) * (1 + Math.sin(time * 9) * flicker);
      },
    });
  },
});
