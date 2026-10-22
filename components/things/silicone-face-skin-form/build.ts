import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';
import { HUMAN, faceEllipse, faceLine, facePoint, headGeometry, paint, part, rod, type HeadSpec } from './head';

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const TONES = { pale: '#f0c9b0', medium: '#dba680', olive: '#bd8d62', deep: '#80523a', grey: '#a9adb2' } as const;

export default defineThing({
  questions: {
    who: choice('Whose face is it?', {
      neutral: 'A generic neutral adult face, nobody in particular.',
      oldman: 'An old man: big nose, deep creases, age spots, heavy brow.',
      celebrity: 'A recognisable-seeming celebrity likeness: sharp cheekbones, defined lips, a beauty mark, a reference photo pinned nearby.',
      child: 'A child: small, round, snub-nosed, freckled.',
    }),
    stage: choice('What stage is the skin at?', {
      raw: 'A raw milky translucent pour, unpainted, flashing still ragged at the edges.',
      painted: 'Painted: lips, flush, freckles and fine veins laid in.',
      hair: 'Painted, with eyebrows and a hairline being punched in strand by strand, the needle left in.',
    }),
    mount: choice('How is it supported?', {
      form: 'Draped over the white head form.',
      clips: 'Hanging limp from two clips on a drying rail, the bare form beside it.',
      half: 'Half peeled off the form, sagging away from one cheek.',
    }),
    twin: noul('Does a second identical face lie on the board beside it?'),
    tone: choice('What skin tone is the silicone pigmented to?', {
      pale: 'Pale pink-beige.', medium: 'Warm medium beige.', olive: 'Olive tan.', deep: 'Deep brown.', grey: 'Unpigmented grey, like a test pull.',
    }),
    mouth: choice('How was the face cast?', {
      closed: 'Lips closed, composed.',
      open: 'Mouth cut open as a hole, like the eyes.',
      smile: 'A slight closed smile.',
      lifecast: 'A life cast: eyes shut, lids intact, no eyeholes at all.',
    }),
    tools: choice('What lies around it on the board?', {
      pots: 'Little paint pots and fine brushes.',
      palette: 'A mixing palette smeared with flesh tones, and a scalpel.',
      airbrush: 'An airbrush on its hose and a few bottles.',
      bare: 'Almost nothing, a clean board.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const wear = mood.wear;
    const o: HeadSpec = {
      neutral: { ...HUMAN },
      oldman: { ...HUMAN, nose: 0.027, jaw: 0.36, brow: 0.007, socket: 0.011, chin: 0.008, lips: 0.003 },
      celebrity: { ...HUMAN, jaw: 0.5, lips: 0.007, chin: 0.008, brow: 0.005, nose: 0.021 },
      child: { ...HUMAN, jaw: 0.33, nose: 0.013, cranium: 0.08, lips: 0.004, chin: 0.004 },
    }[a.who];
    const hs = a.who === 'child' ? 0.84 : 1;
    const raw = a.stage === 'raw';
    const tone = new THREE.Color(TONES[a.tone]);
    if (raw) tone.lerp(new THREE.Color('#f3dccb'), 0.38);
    const toneCss = '#' + tone.getHexString();
    const darker = '#' + tone.clone().multiplyScalar(0.62).getHexString();
    const W = 2048, Hc = 1024;
    const holes = a.mouth !== 'lifecast';

    const skinMap = paint(W, Hc, (c) => {
      c.clearRect(0, 0, W, Hc);
      // The pull: an irregular face-shaped sheet.
      const outline: [number, number][] = [];
      const n = raw ? 90 : 60;
      for (let i = 0; i < n; i++) {
        const t = i / n * Math.PI * 2;
        const jag = raw ? 1 + (random() - 0.4) * 0.16 : 1 + (random() - 0.5) * 0.03;
        outline.push([Math.sin(t) * 0.0665 * jag, -0.012 + Math.cos(t) * 0.098 * jag]);
      }
      faceLine(c, o, outline); c.closePath();
      c.fillStyle = toneCss; c.fill();
      c.save(); c.clip();
      if (!raw) {
        const ex = o.eyeX, ey = o.eyeY, my = ey - 0.07;
        for (const side of [-1, 1]) {
          c.fillStyle = `rgba(215,90,85,${a.who === 'child' ? 0.3 : 0.16})`; faceEllipse(c, o, side * 0.04, -0.03, 0.018, 0.013); c.fill();
          c.fillStyle = 'rgba(120,70,60,0.22)'; faceEllipse(c, o, side * ex, ey, 0.019, 0.012); c.fill();
        }
        c.fillStyle = 'rgba(200,90,80,0.2)'; faceEllipse(c, o, 0, ey - 0.034, 0.012, 0.01); c.fill();
        // Lips.
        const smile = a.mouth === 'smile' ? 0.004 : 0;
        const lipCol = a.who === 'celebrity' ? '#b0202c' : a.tone === 'deep' ? '#6a3030' : 'rgba(178,88,84,0.95)';
        const top: [number, number][] = [], bot: [number, number][] = [];
        for (let i = 0; i <= 16; i++) { const t = i / 16 * 2 - 1, e = 1 - t * t; top.push([t * 0.021, my + smile * t * t + 0.005 * e - 0.0018 * Math.exp(-(t * t) / 0.03)]); bot.push([t * 0.021, my + smile * t * t - 0.0065 * e]); }
        c.fillStyle = lipCol; faceLine(c, o, [...top, ...bot.reverse()]); c.closePath(); c.fill();
        c.strokeStyle = 'rgba(60,20,20,0.7)'; c.lineWidth = 3; faceLine(c, o, top.map(([x]) => [x, my + smile * (x / 0.021) ** 2] as [number, number])); c.stroke();
        // Brows, painted under any punched hair.
        c.strokeStyle = a.who === 'oldman' ? 'rgba(150,150,150,0.6)' : 'rgba(60,40,30,0.5)'; c.lineWidth = a.who === 'celebrity' ? 12 : 9; c.lineCap = 'round';
        for (const side of [-1, 1]) { faceLine(c, o, [[side * 0.016, ey + 0.019], [side * 0.031, ey + 0.024], [side * 0.047, ey + 0.019]]); c.stroke(); }
        // Freckles.
        const freckles = a.who === 'child' ? 240 : a.who === 'oldman' ? 30 : 90;
        for (let i = 0; i < freckles; i++) {
          c.fillStyle = `rgba(120,70,40,${0.25 + random() * 0.4})`;
          const X = (random() - 0.5) * 0.1, Y = -0.04 + random() * 0.05 + Math.abs(X) * 0.2;
          faceEllipse(c, o, X, Y, 0.0008 + random() * 0.001, 0.0008 + random() * 0.001); c.fill();
        }
        // Veins at the temples and lids.
        c.lineWidth = 2;
        for (let i = 0; i < 10; i++) {
          c.strokeStyle = `rgba(70,90,160,${0.2 + random() * 0.25})`;
          const side = random() < 0.5 ? -1 : 1; let X = side * (0.04 + random() * 0.02), Y = 0.03 + random() * 0.04; const pts: [number, number][] = [[X, Y]];
          for (let k = 0; k < 5; k++) { X += (random() - 0.5) * 0.012; Y += (random() - 0.3) * 0.012; pts.push([X, Y]); }
          faceLine(c, o, pts); c.stroke();
        }
        if (a.who === 'oldman') {
          c.strokeStyle = 'rgba(70,40,30,0.5)'; c.lineWidth = 3;
          for (let i = 0; i < 4; i++) { const Y = 0.045 + i * 0.011; faceLine(c, o, [[-0.04, Y - 0.002], [-0.02, Y + 0.002], [0, Y], [0.02, Y + 0.002], [0.04, Y - 0.002]]); c.stroke(); }
          for (const side of [-1, 1]) {
            faceLine(c, o, [[side * 0.014, ey - 0.03], [side * 0.026, ey - 0.055], [side * 0.03, ey - 0.08]]); c.stroke();
            for (let k = -1; k <= 1; k++) { faceLine(c, o, [[side * 0.048, ey + k * 0.002], [side * 0.06, ey + k * 0.008]]); c.stroke(); }
            faceLine(c, o, [[side * 0.018, ey - 0.013], [side * 0.032, ey - 0.018], [side * 0.045, ey - 0.012]]); c.stroke();
          }
          for (let i = 0; i < 16; i++) { c.fillStyle = 'rgba(110,70,40,0.4)'; faceEllipse(c, o, (random() - 0.5) * 0.11, -0.05 + random() * 0.14, 0.002 + random() * 0.003, 0.002 + random() * 0.003); c.fill(); }
        }
        if (a.who === 'celebrity') { c.fillStyle = '#2a1a14'; faceEllipse(c, o, 0.026, ey - 0.058, 0.0017, 0.0017); c.fill(); }
        if (!holes) { c.strokeStyle = 'rgba(60,35,30,0.8)'; c.lineWidth = 4; for (const side of [-1, 1]) { faceLine(c, o, [[side * ex - 0.012, ey + 0.001], [side * ex, ey - 0.003], [side * ex + 0.012, ey + 0.001]]); c.stroke(); } }
      }
      // Soft shading at the edge so the sheet reads as thin rubber.
      c.strokeStyle = darker; c.globalAlpha = 0.35; c.lineWidth = 10; faceLine(c, o, outline); c.closePath(); c.stroke(); c.globalAlpha = 1;
      for (let i = 0; i < wear * 30; i++) { c.fillStyle = `rgba(60,50,40,${0.05 + random() * 0.1})`; c.beginPath(); c.arc(random() * W * 0.5, random() * Hc, 6 + random() * 30, 0, 7); c.fill(); }
      c.restore();
      // Cut the holes right through.
      c.globalCompositeOperation = 'destination-out'; c.fillStyle = '#000';
      if (holes) for (const side of [-1, 1]) { faceEllipse(c, o, side * o.eyeX, o.eyeY, a.who === 'child' ? 0.014 : 0.0128, a.who === 'child' ? 0.0085 : 0.0068); c.fill(); }
      if (a.mouth === 'open') { faceEllipse(c, o, 0, o.eyeY - 0.07, 0.015, 0.0045); c.fill(); }
      if (holes) for (const side of [-1, 1]) { faceEllipse(c, o, side * 0.006, o.eyeY - 0.041, 0.0026, 0.0016); c.fill(); }
      c.globalCompositeOperation = 'source-over';
    });
    const skinMat = new THREE.MeshPhysicalMaterial({ map: skinMap, alphaTest: 0.5, side: THREE.DoubleSide, roughness: raw ? 0.22 : 0.5, clearcoat: raw ? 0.6 : 0.1, sheen: 0.4 });
    const F0 = Math.PI / 2 - 1.3, FL = 2.6, T0 = 0.28, TL = 2.6;
    const skinGeo = () => headGeometry(o, F0, FL, T0, TL, 1.035);

    const plaster = new THREE.MeshStandardMaterial({ color: new THREE.Color('#f4f2ec').lerp(new THREE.Color('#b9b2a4'), wear * 0.3), roughness: 0.9 });
    const steel = new THREE.MeshStandardMaterial({ color: '#aab0b4', metalness: 0.8, roughness: 0.3 });
    const dark = new THREE.MeshStandardMaterial({ color: '#1b1c1e', roughness: 0.6 });
    const hairM = new THREE.MeshStandardMaterial({ color: a.who === 'oldman' ? '#c9c9c4' : a.who === 'child' ? '#b06a2a' : ['#2a1a12', '#5a3a1e', '#141210'][Math.floor(random() * 3)], roughness: 0.6 });

    // Work board.
    const boardW = 0.5, boardD = 0.34;
    part(s.root, new THREE.BoxGeometry(boardW, 0.016, boardD), new THREE.MeshStandardMaterial({ color: new THREE.Color('#55707a').lerp(new THREE.Color('#6a5a48'), mood.warmth * 0.7), roughness: 0.85 }), 0, 0.008, 0);
    const top = 0.016;

    // The rigid form on a short post.
    const hanging = a.mount === 'clips';
    const formX = hanging ? -0.12 : -0.03;
    const form = new THREE.Group(); form.position.set(formX, top + 0.065 + 0.108 * hs, -0.03); form.rotation.set(-0.3, hanging ? 0.35 : 0.12 + (random() - 0.5) * 0.2, 0, 'YXZ'); form.scale.setScalar(hs); s.root.add(form);
    part(form, headGeometry({ ...o, lips: o.lips * 0.5 }), plaster);
    part(s.root, new THREE.CylinderGeometry(0.02, 0.026, 0.08, 16), plaster, formX, top + 0.04, -0.045);
    part(s.root, new THREE.CylinderGeometry(0.07, 0.075, 0.014, 28), plaster, formX, top + 0.007, -0.045);
    rod(form, V(0, 0.118, 0.0), V(0, 0.1, 0.06), 0.0008, dark, 4);

    const punched = (parent: THREE.Object3D) => {
      // Brows and a half-finished hairline as instanced strands.
      const strands: THREE.Matrix4[] = [];
      const q = new THREE.Quaternion(), up = V(0, 1, 0), m = new THREE.Matrix4();
      const add = (X: number, Y: number, dir: THREE.Vector3, len: number) => {
        const p = facePoint(o, X, Y, 1.037);
        q.setFromUnitVectors(up, dir.clone().normalize());
        strands.push(m.clone().compose(p.addScaledVector(dir.clone().normalize(), len / 2), q, V(1, len, 1)));
      };
      for (const side of [-1, 1]) for (let i = 0; i < 70; i++) { const t = random(); add(side * (0.015 + t * 0.033), o.eyeY + 0.019 + Math.sin(t * Math.PI) * 0.005 + (random() - 0.5) * 0.004, V(side * 0.8, 0.5, 0.5), 0.006 + random() * 0.004); }
      const done = 0.25 + random() * 0.5;
      for (let i = 0; i < 380; i++) { const X = -0.058 + random() * 0.116 * done; add(X, 0.07 + random() * 0.026 - Math.abs(X) * 0.3, V((random() - 0.5) * 0.4, 0.5, -0.75 + random() * 0.3), 0.012 + random() * 0.016); }
      const inst = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.0005, 0.0005, 1, 4), hairM, strands.length);
      strands.forEach((mm, i) => inst.setMatrixAt(i, mm)); inst.castShadow = true; parent.add(inst);
      const nx = -0.058 + 0.116 * done, np = facePoint(o, nx, 0.08 - Math.abs(nx) * 0.25, 1.04);
      rod(parent, np, np.clone().add(V(0.02, 0.03, 0.05)), 0.0007, steel, 5);
      rod(parent, np.clone().add(V(0.02, 0.03, 0.05)), np.clone().add(V(0.05, 0.075, 0.125)), 0.004, new THREE.MeshStandardMaterial({ color: '#c8402c', roughness: 0.5 }));
    };

    let sway: THREE.Group | null = null;
    if (hanging) {
      const railY = top + 0.36;
      for (const side of [-1, 1]) { part(s.root, new THREE.CylinderGeometry(0.006, 0.006, 0.36, 10), steel, 0.09 + side * 0.125, top + 0.18, -0.09); part(s.root, new THREE.CylinderGeometry(0.03, 0.034, 0.01, 16), dark, 0.09 + side * 0.125, top + 0.005, -0.09); }
      rod(s.root, V(-0.045, railY, -0.09), V(0.225, railY, -0.09), 0.005, steel);
      sway = new THREE.Group(); sway.position.set(0.09, railY, -0.09); s.root.add(sway);
      const skin = part(sway, skinGeo(), skinMat, 0, -0.03 - 0.1 * hs, 0); skin.scale.set(hs * 0.96, hs * 1.06, hs * 0.3);
      if (a.stage === 'hair') punched(skin);
      for (const side of [-1, 1]) {
        part(sway, new THREE.BoxGeometry(0.02, 0.026, 0.012), dark, side * 0.03, -0.022, 0.004);
        part(sway, new THREE.TorusGeometry(0.009, 0.0015, 5, 14), steel, side * 0.03, -0.006, 0.004);
      }
    } else {
      const peel = new THREE.Group(); form.add(peel);
      const skin = part(peel, skinGeo(), skinMat);
      if (a.mount === 'half') { peel.position.x = -0.066; skin.position.x = 0.066; peel.rotation.y = -0.55; peel.rotation.z = -0.08; }
      if (a.stage === 'hair') punched(skin);
    }
    if (a.twin) {
      const twin = part(s.root, skinGeo(), skinMat, 0.15, top - 0.005, 0.025);
      twin.rotation.set(-Math.PI / 2 + 0.06, 0, (random() - 0.5) * 0.9, 'ZYX'); twin.rotation.order = 'YXZ'; twin.rotation.set(-Math.PI / 2, 0, (random() - 0.5) * 0.8);
      twin.scale.set(hs, hs, hs * 0.28);
      twin.position.y = top + 0.001;
    }

    // Tools.
    const paintCols = ['#' + tone.getHexString(), '#8a4a2a', '#4a5fa8', '#b0202c', '#f1e6dc', '#3a2a1e'];
    const tx = hanging ? -0.02 : -0.2, tz = 0.1;
    if (a.tools === 'pots') {
      const count = 3 + Math.round(mood.density * 3);
      for (let i = 0; i < count; i++) {
        const x = tx + (i % 3) * 0.05 + (random() - 0.5) * 0.012, z = tz - Math.floor(i / 3) * 0.05 + (random() - 0.5) * 0.012;
        part(s.root, new THREE.CylinderGeometry(0.018, 0.016, 0.024, 16), new THREE.MeshStandardMaterial({ color: '#e9edf0', roughness: 0.15, transparent: true, opacity: 0.55 }), x, top + 0.012, z);
        part(s.root, new THREE.CylinderGeometry(0.0155, 0.0145, 0.016, 16), new THREE.MeshStandardMaterial({ color: paintCols[i % 6], roughness: 0.3 }), x, top + 0.011, z);
      }
      for (let i = 0; i < 3; i++) {
        const b0 = V(tx - 0.02 + i * 0.03, top + 0.004, tz + 0.045), b1 = b0.clone().add(V(0.1 + random() * 0.03, 0.002, (random() - 0.5) * 0.04));
        rod(s.root, b0, b1, 0.0028, new THREE.MeshStandardMaterial({ color: ['#2a4a8a', '#8a2a2a', '#d8c9a0'][i], roughness: 0.5 }));
        rod(s.root, b1, b1.clone().add(b1.clone().sub(b0).normalize().multiplyScalar(0.016)), 0.002, new THREE.MeshStandardMaterial({ color: paintCols[(i + 1) % 6], roughness: 0.7 }));
      }
    } else if (a.tools === 'palette') {
      const pal = part(s.root, new THREE.CylinderGeometry(0.06, 0.06, 0.004, 28), new THREE.MeshStandardMaterial({ color: '#f1efe8', roughness: 0.3 }), tx + 0.05, top + 0.002, tz); pal.scale.z = 0.75;
      for (let i = 0; i < 7; i++) { const blob = part(s.root, new THREE.SphereGeometry(0.008 + random() * 0.008, 10, 6), new THREE.MeshStandardMaterial({ color: new THREE.Color(paintCols[i % 6]).lerp(tone, random() * 0.6), roughness: 0.3 }), tx + 0.05 + (random() - 0.5) * 0.08, top + 0.004, tz + (random() - 0.5) * 0.055); blob.scale.y = 0.2; }
      rod(s.root, V(tx, top + 0.004, tz + 0.07), V(tx + 0.09, top + 0.004, tz + 0.085), 0.003, steel);
      rod(s.root, V(tx + 0.09, top + 0.004, tz + 0.085), V(tx + 0.125, top + 0.004, tz + 0.09), 0.0012, steel, 4);
    } else if (a.tools === 'airbrush') {
      const body = rod(s.root, V(tx, top + 0.012, tz + 0.03), V(tx + 0.12, top + 0.018, tz + 0.06), 0.006, steel, 10); void body;
      part(s.root, new THREE.CylinderGeometry(0.012, 0.009, 0.02, 12), steel, tx + 0.07, top + 0.03, tz + 0.047);
      const pts = [V(tx + 0.03, top + 0.008, tz + 0.037), V(tx + 0.0, top + 0.004, tz + 0.06), V(tx - 0.03, top + 0.004, tz + 0.02), V(tx + 0.0, top + 0.004, tz - 0.05), V(tx - 0.03, top + 0.004, tz - 0.12)];
      part(s.root, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 30, 0.0028, 6), dark);
      for (let i = 0; i < 3; i++) { part(s.root, new THREE.CylinderGeometry(0.012, 0.014, 0.045, 12), new THREE.MeshStandardMaterial({ color: paintCols[i], roughness: 0.3 }), tx + 0.03 + i * 0.035, top + 0.0225, tz - 0.05); part(s.root, new THREE.CylinderGeometry(0.006, 0.008, 0.014, 10), dark, tx + 0.03 + i * 0.035, top + 0.052, tz - 0.05); }
    }
    if (a.stage === 'hair') { const hank = part(s.root, new THREE.CapsuleGeometry(0.008, 0.11, 4, 8), hairM, hanging ? -0.13 : 0.12, top + 0.004, 0.13); hank.rotation.set(Math.PI / 2, 0, 1.2 + random() * 0.5); hank.scale.z = 0.35; }
    if (a.who === 'celebrity') {
      const ref = paint(128, 160, (c) => {
        c.fillStyle = '#f4f1ea'; c.fillRect(0, 0, 128, 160); c.fillStyle = '#8a8f96'; c.fillRect(8, 8, 112, 124);
        c.fillStyle = '#2a2420'; c.beginPath(); c.ellipse(64, 66, 30, 40, 0, 0, 7); c.fill(); c.beginPath(); c.ellipse(64, 140, 52, 34, 0, Math.PI, 0); c.fill();
        c.fillStyle = '#d9a27c'; c.beginPath(); c.ellipse(64, 72, 22, 30, 0, 0, 7); c.fill();
        c.fillStyle = '#16308a'; c.font = 'bold 16px monospace'; c.textAlign = 'center'; c.fillText('REF A', 64, 152);
      });
      const card = part(s.root, new THREE.PlaneGeometry(0.075, 0.094), new THREE.MeshStandardMaterial({ map: ref, roughness: 0.6, side: THREE.DoubleSide }), hanging ? -0.19 : 0.17, top + 0.055, -0.12);
      card.rotation.set(-0.25, hanging ? 0.4 : -0.3, 0, 'YXZ');
      part(s.root, new THREE.BoxGeometry(0.03, 0.012, 0.02), dark, card.position.x, top + 0.006, -0.125);
    }

    const amp = mix(0.01, 0.07, mood.energy);
    return s.finish({ update: sway ? (_dt, time) => { sway!.rotation.z = Math.sin(time * 1.3) * amp; sway!.rotation.x = Math.sin(time * 0.9) * amp * 0.5; } : undefined });
  },
});
