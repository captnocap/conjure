import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

const TIMES = {
  three: ['Seven minutes past three, the dead of night.', 3, 7],
  midnight: ['Exactly midnight, both hands straight up.', 12, 0],
  showroom: ['Ten past ten, the smiling time of a watch in a shop window.', 10, 10],
  late: ['Four forty-seven, nearly dawn, far too late.', 4, 47],
  doom: ['Two minutes to twelve.', 11, 58],
  six: ['Half past six, hands hanging straight down.', 6, 30],
} as const;
const DIALS = {
  white: 'A plain white enamel dial with black numerals.',
  champagne: 'A champagne-gold sunburst dial.',
  black: 'A black dial with pale markers.',
  blue: 'A deep blue dial.',
} as const;
const DIAL_INK: Record<keyof typeof DIALS, [string, string]> = { white: ['#f3efe3', '#1b1b1e'], champagne: ['#e2c98a', '#3a2a12'], black: ['#18181b', '#eee6cf'], blue: ['#1d3566', '#f0ead8'] };

function dialTexture(face: string, ink: string, hour: number, minute: number, square: boolean, cracked: boolean, random: () => number) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = face; ctx.fillRect(0, 0, 256, 256);
  ctx.translate(128, 128);
  ctx.fillStyle = ink; ctx.strokeStyle = ink; ctx.lineCap = 'round';
  for (let i = 0; i < 12; i++) {
    ctx.save(); ctx.rotate(i / 12 * Math.PI * 2);
    const far = square ? 112 : 108;
    ctx.fillRect(i % 3 === 0 ? -6 : -3, -far, i % 3 === 0 ? 12 : 6, i % 3 === 0 ? 30 : 20);
    ctx.restore();
  }
  ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 44, 22, 0, Math.PI * 2); ctx.stroke();
  const hand = (angle: number, length: number, width: number) => {
    ctx.save(); ctx.rotate(angle); ctx.lineWidth = width;
    ctx.beginPath(); ctx.moveTo(0, 12); ctx.lineTo(0, -length); ctx.stroke(); ctx.restore();
  };
  hand((hour % 12 + minute / 60) / 12 * Math.PI * 2, 54, 13);
  hand(minute / 60 * Math.PI * 2, 86, 9);
  ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.fill();
  if (cracked) {
    ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.lineWidth = 3;
    const cx = (random() - 0.5) * 90, cy = (random() - 0.5) * 90;
    for (let i = 0; i < 9; i++) {
      let x = cx, y = cy; const angle = i / 9 * 6.28 + random();
      ctx.beginPath(); ctx.moveTo(x, y);
      for (let k = 0; k < 5; k++) { x += Math.cos(angle + (random() - 0.5) * 0.9) * 38; y += Math.sin(angle + (random() - 0.5) * 0.9) * 38; ctx.lineTo(x, y); }
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, 14, 0, 6.28); ctx.stroke();
  }
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  return new THREE.MeshStandardMaterial({ map, roughness: 0.35 });
}

export default defineThing({
  questions: {
    style: choice('What style of watch is it?', {
      dress: 'A thin round gold dress watch on a brown leather strap, a father\'s watch.',
      bracelet: 'A heavy gold watch on a gold link bracelet, flashy, a gambler\'s trophy.',
      tank: 'A slim rectangular gold watch on black crocodile leather, old elegance.',
      field: 'A plain steel service watch on an olive canvas strap, worth little except to him.',
    }),
    dial: choice('What colour is the dial?', DIALS),
    time: choice('What time does it show?', Object.fromEntries(Object.entries(TIMES).map(([key, value]) => [key, value[0]])) as Record<keyof typeof TIMES, string>),
    pose: choice('How has it been laid down?', {
      buckled: 'Buckled into a loop and stood on the table, face tilted up as if displayed for appraisal.',
      flat: 'Unbuckled and laid flat on its back, the two strap halves curling up from the table.',
      tossed: 'Tossed down carelessly, lying half on its side with the strap twisted.',
    }),
    stopped: noul('Has it stopped, its crystal cracked?'),
    beside: choice('What was wagered with it?', {
      nothing: 'Nothing else. The watch alone.',
      ring: 'A plain gold wedding ring.',
      ticket: 'A numbered pawn ticket tied to it with string.',
      photo: 'A creased wallet photograph of someone.',
      cash: 'A few folded banknotes, not enough.',
      cufflinks: 'A pair of cufflinks and a tie pin: everything he had on him.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const steel = a.style === 'field';
    const metal = s.material(steel ? '#b9bec2' : '#e3b445', { metalness: 0.92, roughness: 0.22 + mood.wear * 0.3, emissive: steel ? '#20262a' : '#6a4708', emissiveIntensity: 0.4 });
    const strapColour = { dress: '#6b3f22', bracelet: '#e3b445', tank: '#19171a', field: '#5d6440' }[a.style];
    const strapMaterial = a.style === 'bracelet' ? metal : s.material(strapColour, { roughness: 0.75 });
    const stitch = s.material(a.style === 'field' ? '#3f452c' : '#d9c7a0', { roughness: 0.9 });
    const [face, ink] = DIAL_INK[a.dial];
    const [, hour, minute] = TIMES[a.time];
    const square = a.style === 'tank';
    const R = a.style === 'bracelet' ? 0.021 : 0.019, TH = a.style === 'bracelet' ? 0.012 : 0.009;
    const HALF = square ? 0.019 : R, WIDE = square ? 0.014 : R, STRAP = square ? 0.018 : a.style === 'bracelet' ? 0.021 : 0.019;

    // Case, built face up at the origin with twelve o'clock toward -z.
    const watch = new THREE.Group();
    const part = <T extends THREE.Object3D>(mesh: T) => { watch.add(mesh); return mesh; };
    let second: THREE.Mesh | null = null;
    if (square) {
      part(s.box([WIDE * 2, TH, HALF * 2], [0, TH / 2, 0], metal));
      const dial = part(s.mesh(new THREE.PlaneGeometry(WIDE * 2 - 0.005, HALF * 2 - 0.006), dialTexture(face, ink, hour, minute, true, a.stopped, random), [0, TH + 0.0003, 0]));
      dial.rotation.x = -Math.PI / 2; dial.castShadow = false;
      for (const x of [-1, 1]) part(s.box([0.003, 0.003, HALF * 2 + 0.01], [x * (WIDE - 0.0015), TH * 0.7, 0], metal));
    } else {
      part(s.cylinder(R, R * 0.92, TH, [0, TH / 2, 0], metal, 40));
      part(s.ring(R - 0.0015, 0.0018, [0, TH, 0], metal)).rotation.x = Math.PI / 2;
      const dial = part(s.mesh(new THREE.CircleGeometry(R - 0.0028, 40), dialTexture(face, ink, hour, minute, false, a.stopped, random), [0, TH + 0.0004, 0]));
      dial.rotation.x = -Math.PI / 2; dial.castShadow = false;
      for (const x of [-1, 1]) for (const z of [-1, 1]) part(s.box([0.004, TH * 0.6, 0.008], [x * (STRAP / 2 + 0.002), TH * 0.45, z * (R + 0.001)], metal));
    }
    part(s.cylinder(0.003, 0.003, 0.005, [WIDE + 0.002, TH / 2, 0], metal, 10)).rotation.z = Math.PI / 2;
    second = part(s.box([0.0006, 0.0004, (square ? WIDE : R) * 0.8], [0, TH + 0.0012, 0], s.material('#b3262b')));
    second.geometry.translate(0, 0, -(square ? WIDE : R) * 0.3);
    second.rotation.y = -random() * 6.28;
    const crystal = part(new THREE.Mesh(square ? new THREE.BoxGeometry(WIDE * 2 - 0.004, 0.0012, HALF * 2 - 0.005) : new THREE.CylinderGeometry(R - 0.003, R - 0.0022, 0.0014, 32),
      new THREE.MeshPhysicalMaterial({ color: '#ffffff', transparent: true, opacity: 0.16, roughness: 0.02, depthWrite: false })));
    crystal.position.y = TH + 0.0018;

    /** Lay strap segments along a curve given in the (z, y) plane of `into`. */
    const strap = (into: THREE.Object3D, curve: THREE.Curve<THREE.Vector2>, holes: boolean) => {
      const length = curve.getLength(), links = a.style === 'bracelet';
      const count = Math.max(4, Math.round(length / (links ? 0.0075 : 0.005)));
      for (let i = 0; i < count; i++) {
        const t = (i + 0.5) / count, p = curve.getPointAt(t), tangent = curve.getTangentAt(t);
        const taper = links ? 1 : mix(1, 0.86, t);
        const piece = s.box([STRAP * taper, links ? 0.0032 : 0.0026, length / count * (links ? 0.82 : 1.12)], [0, p.y, p.x], strapMaterial);
        piece.rotation.x = -Math.atan2(tangent.y, tangent.x);
        into.add(piece);
        if (links) {
          const centre = s.box([STRAP * 0.36, 0.0038, length / count * 0.95], [0, p.y, p.x], metal);
          centre.rotation.x = piece.rotation.x;
          into.add(centre);
        } else if (holes && i % 3 === 1 && t > 0.35) {
          const hole = s.cylinder(0.0011, 0.0011, 0.003, [0, p.y, p.x], stitch, 8);
          hole.rotation.x = piece.rotation.x;
          into.add(hole);
        }
      }
    };
    const buckle = (into: THREE.Object3D, z: number, y: number, tilt: number) => {
      const frame = s.ring(STRAP * 0.55, 0.0011, [0, y, z], metal);
      frame.rotation.x = Math.PI / 2 + tilt; frame.scale.set(1, 0.62, 1);
      into.add(frame);
    };
    const V = (z: number, y: number) => new THREE.Vector2(z, y);

    const rig = new THREE.Group();
    s.root.add(rig);
    if (a.pose === 'buckled') {
      // A closed loop standing on the table; the case sits on the upper front of it.
      const RZ = 0.031, RY = 0.026, cy = RY + 0.002, at = 0.95;
      const loop = new THREE.EllipseCurve(0, cy, RZ, RY, at + 0.5, at - 0.5 + Math.PI * 2, false, 0);
      strap(rig, loop as unknown as THREE.Curve<THREE.Vector2>, true);
      watch.position.set(0, cy + Math.sin(at) * (RY + 0.001), Math.cos(at) * (RZ + 0.001));
      watch.rotation.x = Math.PI / 2 - Math.atan2(Math.sin(at) * RZ, Math.cos(at) * RY);
      rig.add(watch);
      buckle(rig, -RZ * 0.75, cy - RY * 0.72, -0.9);
      rig.rotation.y = mix(-0.5, 0.5, random());
    } else {
      rig.add(watch);
      const curl = mix(0.7, 1.25, random());
      const far = new THREE.Group(), near = new THREE.Group();
      far.position.z = -HALF; near.position.z = HALF; near.rotation.y = Math.PI;
      far.rotation.y = (random() - 0.5) * 0.5; near.rotation.y += (random() - 0.5) * 0.5;
      rig.add(far, near);
      strap(far, new THREE.SplineCurve([V(0, TH * 0.4), V(-0.02, 0.0025), V(-0.05, 0.002), V(-0.072, 0.012 * curl), V(-0.078, 0.034 * curl), V(-0.064, 0.05 * curl)]) as unknown as THREE.Curve<THREE.Vector2>, true);
      strap(near, new THREE.SplineCurve([V(0, TH * 0.4), V(-0.02, 0.0025), V(-0.04, 0.002), V(-0.058, 0.009 * curl), V(-0.066, 0.024 * curl)]) as unknown as THREE.Curve<THREE.Vector2>, false);
      buckle(near, -0.069, 0.03 * curl, 0.2);
      if (a.pose === 'tossed') {
        // Half on its side, propped on the crown and the curled strap.
        rig.rotation.z = mix(0.75, 1.1, random());
        rig.rotation.y = random() * 6.28;
        far.rotation.y += 0.6; near.rotation.y -= 0.5;
      } else rig.rotation.y = mix(-0.6, 0.6, random());
    }
    rig.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(rig);
    rig.position.y -= box.min.y;

    // What else was put on the table.
    const gold = s.material('#e3b445', { metalness: 0.95, roughness: 0.2, emissive: '#6a4708', emissiveIntensity: 0.45 });
    const bx = 0.062, bz = 0.03;
    if (a.beside === 'ring') {
      s.mesh(new THREE.TorusGeometry(0.0098, 0.0017, 10, 40), gold, [bx, 0.0017, bz]).rotation.x = Math.PI / 2;
    } else if (a.beside === 'ticket') {
      const tag = s.label('No. ' + (1000 + Math.floor(random() * 8999)), 0.05, 0.024, [bx + 0.01, 0.0008, bz + 0.012], '#7a1d1a', '#e6d7a8');
      tag.rotation.set(-Math.PI / 2, 0, mix(-0.5, 0.5, random()), 'YXZ');
      s.tube([[bx - 0.016, 0.001, bz + 0.012], [0.035, 0.004, 0.02], [0.022, 0.008, 0.008], [0.012, 0.006, 0]], 0.0005, s.material('#c9b98f'));
    } else if (a.beside === 'photo') {
      const canvas = document.createElement('canvas');
      canvas.width = 160; canvas.height = 200;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#efe8d6'; ctx.fillRect(0, 0, 160, 200);
      ctx.fillStyle = '#8a7558'; ctx.fillRect(12, 12, 136, 160);
      ctx.fillStyle = '#3a2f24'; ctx.beginPath(); ctx.arc(80, 78, 30, 0, 6.28); ctx.fill();
      ctx.beginPath(); ctx.ellipse(80, 168, 52, 56, 0, Math.PI, 0); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 96 + random() * 20); ctx.lineTo(160, 90 + random() * 20); ctx.stroke();
      const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace;
      const photo = s.mesh(new THREE.PlaneGeometry(0.052, 0.065), new THREE.MeshStandardMaterial({ map, roughness: 0.6, side: THREE.DoubleSide }), [bx + 0.012, 0.0008, bz]);
      photo.rotation.set(-Math.PI / 2 + 0.03, 0, mix(-0.5, 0.5, random()), 'YXZ');
    } else if (a.beside === 'cash') {
      const bill = s.material('#8aa27c', { roughness: 0.9 });
      for (let i = 0; i < 3; i++) {
        const note = s.box([0.066, 0.0006, 0.078], [bx + 0.022 + i * 0.006, 0.0005 + i * 0.0008, bz + i * 0.004], bill);
        note.rotation.y = mix(-0.4, 0.4, random());
        const band = s.box([0.03, 0.0002, 0.03], [0, 0.0004, 0], s.material('#dfe6d2'));
        note.add(band);
      }
    } else if (a.beside === 'cufflinks') {
      for (const dz of [0, 0.022]) {
        s.cylinder(0.007, 0.007, 0.003, [bx + dz * 0.4, 0.0015, bz + dz], gold, 16);
        s.cylinder(0.0045, 0.0045, 0.0034, [bx + dz * 0.4, 0.0017, bz + dz], s.material('#16161a', { roughness: 0.2 }), 12);
      }
      s.rod([bx + 0.025, 0.0012, bz - 0.02], [bx + 0.07, 0.0012, bz + 0.005], 0.0011, gold);
      s.ball([0.003, 0.003, 0.003], [bx + 0.07, 0.003, bz + 0.005], s.material('#f1ece0', { roughness: 0.2 }), 10);
    }

    const running = !a.stopped;
    return s.finish({
      update: (_dt, time) => { if (running && second) second.rotation.y = -Math.floor(time) / 60 * Math.PI * 2; },
    });
  },
});
