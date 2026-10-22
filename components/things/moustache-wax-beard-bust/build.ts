import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type P = [number, number, number];
const HAIR = {
  black: 'Jet black, boot-polish glossy.',
  chestnut: 'Warm chestnut brown.',
  ginger: 'Bright ginger.',
  blond: 'Straw blond.',
  pepper: 'Salt-and-pepper grey.',
  white: 'Snow white.',
  blue: 'Dyed peacock blue, a modern joke on an old bust.',
} as const;
const HAIR_TINT: Record<keyof typeof HAIR, string> = { black: '#17130f', chestnut: '#5a2f16', ginger: '#c0541a', blond: '#d6ae58', pepper: '#6f6c68', white: '#f1eee6', blue: '#1b63c9' };

/** A tube that narrows along its length, for waxed points and drooping whiskers. */
function taper(points: P[], r0: number, r1: number, swell = 0) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  const tubular = 20, radial = 8;
  const geometry = new THREE.TubeGeometry(curve, tubular, 1, radial, false);
  const position = geometry.attributes.position;
  const centre = new THREE.Vector3(), v = new THREE.Vector3();
  for (let i = 0; i <= tubular; i++) {
    const t = i / tubular;
    curve.getPointAt(t, centre);
    const r = mix(r0, r1, t) + Math.sin(t * Math.PI) * swell;
    for (let j = 0; j <= radial; j++) {
      const index = i * (radial + 1) + j;
      v.fromBufferAttribute(position, index).sub(centre).multiplyScalar(r).add(centre);
      position.setXYZ(index, v.x, v.y, v.z);
    }
  }
  return geometry;
}

export default defineThing({
  questions: {
    style: choice('What facial hair is the bust wearing?', {
      handlebar: 'A handlebar moustache, waxed into two upturned curls.',
      walrus: 'A heavy walrus moustache drooping over the mouth.',
      chinstrap: 'A narrow chinstrap beard tracing the jaw from ear to ear, upper lip bare.',
      wizard: 'A long wizard beard to the chest with trailing moustaches.',
      goatee: 'A pointed goatee joined to a small moustache.',
      chops: 'Mutton chops: broad side-whiskers joined across the lip, chin shaved clean.',
      pencil: 'A pencil moustache, one thin drawn line.',
    }),
    colour: choice('What colour is the hair?', HAIR),
    brows: score('How heavy are the eyebrows?', ['Thin, plucked and arched', 'Ordinary', 'Thick and straight', 'Great bushy thatches']),
    grooming: score('What state is the grooming in?', ['Immaculate, every hair waxed in place', 'Tidy', 'A bit shaggy', 'Overgrown and wild, strays everywhere']),
    bust: choice('What is the bust itself like?', {
      plaster: 'Chalk-white plaster, classical and blank-eyed.',
      ivory: 'Yellowed ivory plaster with painted eyes and lips.',
      bronze: 'Painted to look like dark bronze.',
      flesh: 'A painted shop mannequin in pink flesh tones with rosy cheeks.',
      terracotta: 'Unglazed red terracotta.',
    }),
    card: choice('What does the little card at its base say?', {
      wax: 'MOUSTACHE WAX 25¢',
      groom: 'GENTLEMEN’S GROOMING',
      month: 'BEARD OF THE MONTH',
      nfs: 'NOT FOR SALE',
      none: 'There is no card.',
    }),
    tins: choice('What wax and tools sit at the base?', {
      stack: 'A neat stack of wax tins and a small comb.',
      open: 'One tin open with a thumbprint in the wax, lid beside it, comb across it.',
      many: 'A whole pyramid of tins, a display for sale.',
      comb: 'Just a tiny moustache comb.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const g = a.grooming;
    const skinTint = { plaster: '#efeae0', ivory: '#e4d6b2', bronze: '#5b4630', flesh: '#e9b99c', terracotta: '#b9633f' }[a.bust];
    const skin = s.material(skinTint, { roughness: a.bust === 'bronze' ? 0.4 : 0.8, metalness: a.bust === 'bronze' ? 0.55 : 0 });
    const shade = s.material(new THREE.Color(skinTint).multiplyScalar(0.86), { roughness: 0.85, metalness: a.bust === 'bronze' ? 0.5 : 0 });
    const hairTint = new THREE.Color(HAIR_TINT[a.colour]);
    const hair = new THREE.MeshStandardMaterial({ color: hairTint, roughness: mix(0.3, 0.85, g), emissive: a.colour === 'blue' ? '#0a2a6a' : '#000000', emissiveIntensity: 0.5 });
    const whisker = (points: P[], r0: number, r1: number, swell = 0) => { const m = s.mesh(taper(points, r0 * mix(1, 1.35, g), r1 * mix(1, 2.2, g), swell * mix(1, 1.5, g)), hair); return m; };

    // --- Display board and socle.
    s.cylinder(0.2, 0.21, 0.018, [0, 0.009, 0.03], s.material('#4a2c18', { roughness: 0.45 }), 40);
    const B = 0.018;
    s.lathe([[0, 0], [0.085, 0], [0.085, 0.014], [0.062, 0.028], [0.05, 0.055], [0.07, 0.078], [0, 0.078]], skin, [0, B, 0]);
    // Chest: a cut-off classical bust, flattened front to back.
    const chest = s.lathe([[0, 0.075], [0.075, 0.078], [0.105, 0.1], [0.15, 0.18], [0.165, 0.245], [0.15, 0.285], [0.1, 0.31], [0.05, 0.33], [0, 0.335]], skin, [0, B, 0]);
    chest.scale.z = 0.58;
    s.cylinder(0.043, 0.05, 0.12, [0, B + 0.37, -0.004], skin, 20);
    // Collar line for a painted mannequin.
    if (a.bust === 'flesh' || a.bust === 'ivory') { const collar = s.ring(0.052, 0.008, [0, B + 0.325, 0], s.material('#f4f1e8')); collar.rotation.x = Math.PI / 2; collar.scale.y = 0.7; s.ball([0.014, 0.01, 0.008], [0, B + 0.318, 0.04], s.material(mood.cheer > 0.5 ? '#b3262d' : '#1d2440'), 10); }

    // --- Head.
    const Y = B; // every head coordinate below is relative to the board top
    s.ball([0.082, 0.1, 0.097], [0, Y + 0.49, 0], skin, 28);
    s.ball([0.068, 0.072, 0.076], [0, Y + 0.432, 0.02], skin, 24);
    s.ball([0.013, 0.027, 0.02], [0, Y + 0.478, 0.098], skin, 12).rotation.x = -0.25;
    s.ball([0.017, 0.01, 0.012], [0, Y + 0.462, 0.1], skin, 10);
    for (const side of [-1, 1]) {
      s.ball([0.012, 0.027, 0.018], [side * 0.083, Y + 0.482, -0.004], skin, 12);
      // Eye: a lidded almond; painted busts get an iris.
      s.ball([0.015, 0.008, 0.008], [side * 0.032, Y + 0.498, 0.083], a.bust === 'ivory' || a.bust === 'flesh' ? s.material('#f6f3ea') : shade, 12);
      if (a.bust === 'ivory' || a.bust === 'flesh') s.ball([0.006, 0.006, 0.004], [side * 0.032, Y + 0.498, 0.0885], s.material('#2a3a4a'), 8);
      s.ball([0.019, 0.006, 0.01], [side * 0.032, Y + 0.506, 0.084], skin, 10);
      if (a.bust === 'flesh') s.ball([0.02, 0.016, 0.006], [side * 0.05, Y + 0.458, 0.075], s.material('#e58f86', { roughness: 0.9 }), 10);
    }
    // Lips.
    s.ball([0.022, 0.006, 0.008], [0, Y + 0.436, 0.092], a.bust === 'ivory' || a.bust === 'flesh' ? s.material('#a8453f') : shade, 10);
    // Sculpted hair: a combed cap with a side parting, the same material as the bust.
    const capGeo = new THREE.SphereGeometry(1, 28, 14, 0, Math.PI * 2, 0, Math.PI * 0.52);
    const cap = s.mesh(capGeo, shade, [0, Y + 0.492, -0.006]);
    cap.scale.set(0.087, 0.105, 0.102); cap.rotation.x = -0.38;
    const wave = s.ball([0.05, 0.022, 0.03], [0.02, Y + 0.572, 0.062], shade, 14); wave.rotation.z = -0.3;
    // Chips and cracks with wear.
    if (mood.wear > 0.45) {
      const raw = s.material(a.bust === 'bronze' || a.bust === 'flesh' ? '#efeae0' : '#b9b09c', { roughness: 1 });
      const chips = Math.round(mood.wear * 7);
      for (let i = 0; i < chips; i++) { const ang = random() * Math.PI * 2; s.ball([0.012, 0.008, 0.006], [Math.cos(ang) * 0.15 * random(), Y + 0.1 + random() * 0.2, 0.062 + random() * 0.02], raw, 6).rotation.z = random() * 3; }
      s.ball([0.008, 0.012, 0.006], [0.003, Y + 0.492, 0.108], raw, 6);
    }

    // --- Eyebrows.
    const bw = a.brows;
    for (const side of [-1, 1]) {
      const arch = mix(0.012, 0.002, bw);
      s.mesh(taper([[side * 0.01, Y + 0.513, 0.094], [side * 0.032, Y + 0.518 + arch, 0.092], [side * 0.058, Y + 0.51 + arch * 0.3, 0.076]], mix(0.0028, 0.011, bw), mix(0.0012, 0.008, bw), mix(0, 0.003, bw)), hair);
      if (bw > 0.6) for (let i = 0; i < Math.round(mix(0, 10, (bw - 0.6) / 0.4)); i++) {
        const t = random(), x = side * mix(0.014, 0.06, t), y = Y + 0.516 + (random() - 0.2) * 0.012, z = mix(0.096, 0.08, t);
        s.rod([x, y, z], [x + side * 0.012 * random(), y + 0.012 + random() * 0.012, z + 0.012], 0.0032, hair, 0.0006);
      }
    }

    // --- Facial hair.
    const lipY = Y + 0.448, lipZ = 0.099;
    const moustacheCore = (r: number) => s.ball([r * 1.5, r, r], [0, lipY, lipZ], hair, 10);
    if (a.style === 'handlebar') {
      moustacheCore(0.009);
      for (const side of [-1, 1]) whisker([[0, lipY, lipZ], [side * 0.028, lipY - 0.006, lipZ - 0.002], [side * 0.058, lipY - 0.002, 0.082], [side * 0.08, lipY + 0.018, 0.07], [side * 0.082, lipY + 0.042, 0.066], [side * 0.068, lipY + 0.05, 0.066]], 0.009, 0.0022, 0.004);
    } else if (a.style === 'walrus') {
      moustacheCore(0.014);
      for (const side of [-1, 1]) {
        whisker([[0, lipY + 0.002, lipZ], [side * 0.024, lipY - 0.006, lipZ + 0.004], [side * 0.046, lipY - 0.03, 0.09], [side * 0.05, lipY - 0.062, 0.082]], 0.015, 0.006, 0.006);
        whisker([[side * 0.006, lipY - 0.002, lipZ + 0.004], [side * 0.02, lipY - 0.02, lipZ + 0.004], [side * 0.03, lipY - 0.044, 0.094]], 0.012, 0.005, 0.004);
      }
    } else if (a.style === 'pencil') {
      for (const side of [-1, 1]) whisker([[side * 0.003, lipY - 0.002, lipZ - 0.001], [side * 0.02, lipY - 0.004, lipZ - 0.004], [side * 0.036, lipY - 0.009, 0.088]], 0.0035, 0.0015);
    } else if (a.style === 'chinstrap') {
      whisker([[-0.083, Y + 0.475, 0.0], [-0.074, Y + 0.415, 0.03], [-0.045, Y + 0.375, 0.07], [0, Y + 0.364, 0.09], [0.045, Y + 0.375, 0.07], [0.074, Y + 0.415, 0.03], [0.083, Y + 0.475, 0.0]], 0.009, 0.009, 0.002);
    } else if (a.style === 'goatee') {
      moustacheCore(0.007);
      for (const side of [-1, 1]) {
        whisker([[0, lipY, lipZ], [side * 0.022, lipY - 0.005, lipZ - 0.003], [side * 0.032, lipY - 0.03, 0.09], [side * 0.022, lipY - 0.055, 0.09]], 0.007, 0.006);
      }
      const tuft = s.mesh(new THREE.ConeGeometry(0.03, mix(0.07, 0.12, g), 14), hair, [0, Y + 0.372 - mix(0.035, 0.06, g) + 0.03, 0.088]);
      tuft.rotation.x = Math.PI + 0.25; tuft.scale.z = 0.7;
      s.ball([0.03, 0.022, 0.02], [0, Y + 0.385, 0.084], hair, 12);
    } else if (a.style === 'chops') {
      moustacheCore(0.009);
      for (const side of [-1, 1]) {
        const chop = s.ball([0.022 * mix(1, 1.3, g), 0.05, 0.036], [side * 0.072, Y + 0.435, 0.03], hair, 14); chop.rotation.z = side * 0.12;
        s.ball([0.026 * mix(1, 1.4, g), 0.03, 0.03], [side * 0.062, Y + 0.402, 0.05], hair, 12);
        whisker([[0, lipY, lipZ], [side * 0.03, lipY - 0.004, 0.096], [side * 0.055, lipY - 0.02, 0.075], [side * 0.064, lipY - 0.04, 0.058]], 0.009, 0.014, 0.003);
      }
    } else {
      // Wizard: a jaw-covering mass, a long tapering fall and trailing moustaches.
      moustacheCore(0.011);
      const length = mix(0.2, 0.34, g);
      const jaw = s.mesh(new THREE.SphereGeometry(1, 20, 12, 0, Math.PI * 2, Math.PI * 0.45, Math.PI * 0.55), hair, [0, Y + 0.44, 0.02]);
      jaw.scale.set(0.076, 0.085, 0.084);
      const fall = s.mesh(new THREE.ConeGeometry(0.07, length, 16, 6), hair, [0, Y + 0.405 - length / 2, 0.075]);
      fall.rotation.x = Math.PI - 0.1; fall.scale.z = 0.55;
      const p = fall.geometry.attributes.position;
      for (let i = 0; i < p.count; i++) p.setX(i, p.getX(i) + Math.sin(p.getY(i) * 40) * 0.006 * (0.5 + g));
      fall.geometry.computeVertexNormals();
      for (const side of [-1, 1]) whisker([[0, lipY, lipZ], [side * 0.03, lipY - 0.008, lipZ], [side * 0.05, lipY - 0.06, 0.092], [side * 0.045, lipY - 0.15, 0.1], [side * 0.05 + (random() - 0.5) * 0.02, lipY - 0.2, 0.105]], 0.011, 0.003, 0.003);
    }

    // Strays: loose hairs spring out as the grooming goes, and stubble creeps over the cheeks.
    if (g > 0.3) {
      const spike = new THREE.ConeGeometry(0.0022, 0.03, 4); spike.translate(0, 0.015, 0);
      const count = Math.round(mix(0, 170, (g - 0.3) / 0.7));
      const mesh = new THREE.InstancedMesh(spike, hair, count);
      const dummy = new THREE.Object3D(), up = new THREE.Vector3(0, 1, 0), n = new THREE.Vector3();
      for (let i = 0; i < count; i++) {
        // A point on the lower front of the jaw sphere.
        const theta = (random() - 0.5) * 2.6, phi = mix(0.05, a.style === 'wizard' ? 1.5 : 1.15, random());
        n.set(Math.sin(theta) * Math.cos(phi * 0.6), -Math.sin(phi) * 0.9 + 0.25, Math.cos(theta) * Math.cos(phi * 0.6)).normalize();
        dummy.position.set(n.x * 0.07, Y + 0.432 + n.y * 0.074, 0.02 + n.z * 0.078);
        n.x += (random() - 0.5) * 0.9; n.y += (random() - 0.75) * 0.9; n.z += (random() - 0.2) * 0.5; n.normalize();
        dummy.quaternion.setFromUnitVectors(up, n);
        dummy.scale.setScalar(mix(0.4, 1.5, random()) * mix(0.6, 1.3, g));
        dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix);
      }
      mesh.castShadow = true;
      s.root.add(mesh);
    }

    // --- Wax tins, comb and card on the board.
    const tinTint = { black: '#1d1d1f', chestnut: '#7a2a1c', ginger: '#c98a1c', blond: '#c9a84a', pepper: '#3d4a5a', white: '#2b4a78', blue: '#1d5a8a' }[a.colour];
    const lidCanvas = document.createElement('canvas'); lidCanvas.width = lidCanvas.height = 128;
    const ctx = lidCanvas.getContext('2d')!;
    ctx.fillStyle = tinTint; ctx.fillRect(0, 0, 128, 128);
    ctx.strokeStyle = '#e6c56a'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(64, 64, 52, 0, 7); ctx.stroke();
    ctx.fillStyle = '#f1e2b0'; ctx.textAlign = 'center'; ctx.font = 'bold 30px Georgia, serif'; ctx.fillText('WAX', 64, 58);
    ctx.lineWidth = 6; ctx.strokeStyle = '#f1e2b0'; ctx.beginPath(); ctx.moveTo(64, 82); ctx.quadraticCurveTo(40, 96, 26, 74); ctx.moveTo(64, 82); ctx.quadraticCurveTo(88, 96, 102, 74); ctx.stroke();
    const lidMap = new THREE.CanvasTexture(lidCanvas); lidMap.colorSpace = THREE.SRGBColorSpace;
    const tinSide = s.material(tinTint, { metalness: 0.6, roughness: 0.35 });
    const tinTop = new THREE.MeshStandardMaterial({ map: lidMap, metalness: 0.3, roughness: 0.4 });
    const tin = (x: number, y: number, z: number, open = false) => {
      const body = s.cylinder(0.03, 0.03, 0.016, [x, y + 0.008, z], tinSide, 24);
      if (open) s.cylinder(0.027, 0.027, 0.004, [x, y + 0.0155, z], s.material('#d9b45a', { roughness: 0.35 }), 20);
      else { const top = s.mesh(new THREE.CircleGeometry(0.029, 24), tinTop, [x, y + 0.0165, z]); top.rotation.x = -Math.PI / 2; top.rotation.z = random() * 6; }
      return body;
    };
    const tx = 0.115, tz = 0.12, ty = B;
    const combGeo = () => { const parts: THREE.BufferGeometry[] = [new THREE.BoxGeometry(0.07, 0.006, 0.003)]; parts[0].translate(0, 0.012, 0); for (let i = 0; i < 18; i++) { const tooth = new THREE.BoxGeometry(0.0018, 0.012, 0.002); tooth.translate(-0.033 + i * 0.0039, 0.004, 0); parts.push(tooth); } const merged = mergeGeometries(parts)!; parts.forEach((part) => part.dispose()); return merged; };
    const comb = new THREE.Mesh(combGeo(), s.material('#2a1a10', { roughness: 0.3 })); comb.castShadow = true; s.root.add(comb);
    comb.rotation.x = -Math.PI / 2;
    if (a.tins === 'stack') { tin(tx, ty, tz); tin(tx + 0.004, ty + 0.017, tz - 0.003); tin(tx - 0.07, ty, tz + 0.04); comb.position.set(-0.1, ty + 0.002, 0.15); comb.rotation.z = 0.5; }
    else if (a.tins === 'open') { tin(tx, ty, tz, true); s.ball([0.008, 0.002, 0.006], [tx + 0.004, ty + 0.0165, tz], s.material('#b8923c'), 8); const lid = s.cylinder(0.031, 0.031, 0.006, [tx - 0.06, ty + 0.012, tz + 0.045], tinSide, 24); lid.rotation.z = 0.35; comb.position.set(tx, ty + 0.02, tz + 0.004); comb.rotation.z = -0.4; }
    else if (a.tins === 'many') { for (let level = 0; level < 3; level++) for (let i = 0; i < 3 - level; i++) tin(0.07 + (i + level * 0.5) * 0.062 - 0.06, ty + level * 0.017, 0.13 - Math.abs(i + level * 0.5 - 1) * 0.02); comb.position.set(-0.11, ty + 0.002, 0.14); comb.rotation.z = 0.4; }
    else { comb.position.set(0.09, ty + 0.002, 0.15); comb.rotation.z = -0.3; }
    if (a.card !== 'none') {
      const text = { wax: 'MOUSTACHE WAX 25¢', groom: 'GENTLEMEN’S GROOMING', month: 'BEARD OF THE MONTH', nfs: 'NOT FOR SALE' }[a.card];
      const card = s.label(text, 0.13, 0.05, [-0.085, ty + 0.03, 0.135], '#2a2018', mood.wear > 0.5 ? '#e0d2a8' : '#f6f0dc');
      card.rotation.set(-0.3, 0.3, 0);
      s.box([0.13, 0.05, 0.002], [-0.089, ty + 0.028, 0.12], s.material('#d9cfb4')).rotation.set(0.3, 0.3, 0);
    }

    return s.finish({ footprint: 0.22 });
  },
});
