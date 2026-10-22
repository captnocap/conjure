import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

const R = 0.065, H_UP = 0.074, H_LOW = 0.071, Z_SQUASH = 0.96;
const T0 = -1.0, T1 = Math.PI / 2;
const W = 1024, H = 512;
const HAIR = { flaxen: '#d8b96a', auburn: '#8a3f22', raven: '#1d1a1c', white: '#d9d6cc' } as const;

const radiusAt = (theta: number) => R * Math.pow(Math.max(Math.cos(theta), 0), theta < 0 ? 0.72 : 1);
const heightAt = (theta: number) => (theta < 0 ? H_LOW : H_UP) * Math.sin(theta);
/** A point on the head: u runs round it (0.5 is the middle of the face), theta is elevation. */
const onHead = (u: number, theta: number, lift = 1) => {
  const phi = (u - 0.5) * Math.PI * 2, r = radiusAt(theta) * lift;
  return new THREE.Vector3(r * Math.sin(phi), heightAt(theta) * lift, r * Math.cos(phi) * Z_SQUASH);
};
const px = (u: number) => u * W;
const py = (theta: number) => (1 - (theta - T0) / (T1 - T0)) * H;

export default defineThing({
  questions: {
    crack: choice('How is the face cracked?', {
      hairline: 'One fine hairline crack from the forehead down through an eye to the jaw.',
      spiderweb: 'A spiderweb of cracks radiating from a blow to the forehead.',
      'missing-cheek': 'A shard of cheek has fallen out, leaving a dark jagged hole.',
      caved: 'Half the face has caved in, exposing the wire rocker and lead weight that work the eyes.',
      glued: 'It was once broken in pieces and stuck back together with thick yellowed glue.',
    }),
    eyes: choice('What are its glass eyes doing?', {
      open: 'Both wide open and staring.',
      'one-shut': 'One eye open, the other stuck shut.',
      'rolled-back': 'Rolled back in the head so mostly the whites show.',
      'one-gone': 'One eye staring, the other socket empty and black.',
      gone: 'Both eyes gone: two black sockets.',
      asleep: 'Both lids closed, as if put down for a nap.',
    }),
    hair: choice('What is left of its hair?', {
      ringlets: 'A full mohair wig of long sausage ringlets.',
      hacked: 'Hacked short with scissors by a child, standing up in tufts.',
      patchy: 'Patchy: a few clumps and one or two ringlets clinging on.',
      bald: 'Bald, with rings of brown glue where the wig used to be.',
    }),
    hairColour: choice('If it has hair, what colour?', {
      flaxen: 'Flaxen blonde.',
      auburn: 'Auburn red-brown.',
      raven: 'Raven black.',
      white: 'Bleached white-grey, like cobweb.',
    }),
    expression: choice('What expression is painted on it?', {
      rosebud: 'A sweet rosebud mouth with the hint of a smile.',
      'open-teeth': 'Parted lips showing a row of tiny teeth.',
      pout: 'A sulky downturned pout.',
      'worn-away': 'Nearly rubbed off: a pink smear where the mouth was.',
      weeping: 'Dark tear tracks run down from both eyes.',
      'drawn-smile': 'Someone has drawn a much wider smile over the lips in ink.',
    }),
    dress: choice('What does it wear?', {
      bare: 'Nothing: bare shoulder plate with the sewing holes showing.',
      bonnet: 'A frilled bonnet tied under the chin.',
      'lace-collar': 'A wide scalloped lace collar.',
      choker: 'A black velvet choker with a cameo.',
    }),
    gaze: choice('Which way is it facing?', {
      away: 'Turned aside, looking at something across the room.',
      'at-you': 'It has turned to face you directly, chin lowered.',
      cocked: 'Head cocked to one side, listening.',
      toppled: 'Toppled over onto its side, still staring.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const wear = mood.wear;
    const jag = (ctx: CanvasRenderingContext2D, from: [number, number], to: [number, number], wobble: number, steps = 9) => {
      ctx.beginPath();
      ctx.moveTo(...from);
      for (let i = 1; i <= steps; i++) {
        const t = i / steps, off = i === steps ? 0 : (random() - 0.5) * wobble;
        ctx.lineTo(mix(from[0], to[0], t) - (to[1] - from[1]) / steps * off * 0.1 + off, mix(from[1], to[1], t) + off * 0.6);
      }
      ctx.stroke();
    };

    // ---- the painted face -------------------------------------------------------------
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d')!;
    const bisque = new THREE.Color('#f1d3c2').lerp(new THREE.Color('#cfc6b4'), wear * 0.55);
    ctx.fillStyle = bisque.getStyle();
    ctx.fillRect(0, 0, W, H);
    const cx = px(0.5), eyeY = py(0.06), eyeDx = 72, mouthY = py(-0.47);
    const fade = mix(1, 0.5, wear);
    for (const side of [-1, 1]) {
      const blush = ctx.createRadialGradient(cx + side * 88, py(-0.25), 0, cx + side * 88, py(-0.25), 58);
      blush.addColorStop(0, `rgba(226,120,120,${0.6 * fade})`);
      blush.addColorStop(1, 'rgba(226,120,120,0)');
      ctx.fillStyle = blush;
      ctx.fillRect(cx + side * 88 - 60, py(-0.25) - 60, 120, 120);
    }
    // Grime that gathers low on the face and in the worn patches.
    for (let i = 0; i < mix(10, 240, wear); i++) {
      ctx.fillStyle = `rgba(88,70,52,${mix(0.05, 0.22, random())})`;
      const r = mix(2, 16, random());
      ctx.beginPath();
      ctx.arc(random() * W, mix(H * 0.25, H, Math.sqrt(random())), r, 0, 7);
      ctx.fill();
    }
    // Brows.
    const browTilt = { rosebud: 0, 'open-teeth': -0.1, pout: 0.25, 'worn-away': 0, weeping: -0.28, 'drawn-smile': 0.1 }[a.expression];
    ctx.strokeStyle = `rgba(108,70,44,${a.expression === 'worn-away' ? 0.35 : 0.9})`;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(cx + side * 34, eyeY - 54 + browTilt * 24);
      ctx.quadraticCurveTo(cx + side * 72, eyeY - 74, cx + side * 116, eyeY - 52 - browTilt * 24);
      ctx.stroke();
    }
    // Lash line and painted lashes round each socket.
    ctx.strokeStyle = '#2a1c16';
    for (const side of [-1, 1]) {
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(cx + side * eyeDx, eyeY, 41, 28, 0, Math.PI, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 2;
      for (let i = 0; i < 9; i++) {
        const angle = Math.PI + (i + 0.5) / 9 * Math.PI;
        ctx.beginPath();
        ctx.moveTo(cx + side * eyeDx + Math.cos(angle) * 41, eyeY + Math.sin(angle) * 28);
        ctx.lineTo(cx + side * eyeDx + Math.cos(angle) * 53, eyeY + Math.sin(angle) * 40);
        ctx.stroke();
      }
      for (let i = 0; i < 6; i++) {
        const angle = (i + 0.5) / 6 * Math.PI;
        ctx.beginPath();
        ctx.moveTo(cx + side * eyeDx + Math.cos(angle) * 40, eyeY + Math.sin(angle) * 27);
        ctx.lineTo(cx + side * eyeDx + Math.cos(angle) * 47, eyeY + Math.sin(angle) * 34);
        ctx.stroke();
      }
    }
    // Nostril dots.
    ctx.fillStyle = 'rgba(190,96,90,0.85)';
    for (const side of [-1, 1]) { ctx.beginPath(); ctx.arc(cx + side * 8, py(-0.27), 3, 0, 7); ctx.fill(); }
    // Mouth.
    const lip = `rgba(178,44,52,${a.expression === 'worn-away' ? 0.25 : 0.95 * mix(1, 0.75, wear)})`;
    ctx.fillStyle = lip;
    const lips = (curve: number, open: number) => {
      ctx.save(); ctx.translate(cx, mouthY); ctx.scale(1.4, 1.4); ctx.translate(-cx, -mouthY);
      if (open > 0) {
        ctx.fillStyle = '#3b1518';
        ctx.beginPath(); ctx.ellipse(cx, mouthY, 20, open, 0, 0, 7); ctx.fill();
        ctx.fillStyle = '#f6f1e2';
        for (let i = -2; i <= 2; i++) ctx.fillRect(cx + i * 7 - 3, mouthY - open + 1, 6, 7);
        ctx.fillStyle = lip;
      }
      ctx.beginPath();
      ctx.moveTo(cx - 26, mouthY - curve);
      ctx.quadraticCurveTo(cx - 12, mouthY - 13 - open, cx, mouthY - 6 - open);
      ctx.quadraticCurveTo(cx + 12, mouthY - 13 - open, cx + 26, mouthY - curve);
      ctx.quadraticCurveTo(cx, mouthY + 3 - open * 0.6, cx - 26, mouthY - curve);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx - 26, mouthY - curve);
      ctx.quadraticCurveTo(cx, mouthY + 22 + open, cx + 26, mouthY - curve);
      ctx.quadraticCurveTo(cx, mouthY + 2 + open * 0.8, cx - 26, mouthY - curve);
      ctx.fill();
      ctx.restore();
    };
    if (a.expression === 'open-teeth') lips(2, 9);
    else if (a.expression === 'pout') lips(-7, 0);
    else if (a.expression === 'worn-away') { ctx.beginPath(); ctx.ellipse(cx + 5, mouthY + 2, 30, 13, 0.2, 0, 7); ctx.fill(); }
    else lips(mix(1, 7, mood.cheer), 0);
    if (a.expression === 'weeping') {
      ctx.lineCap = 'round';
      for (const side of [-1, 1])
        for (let k = 0; k < 3; k++) {
          ctx.strokeStyle = `rgba(40,30,30,${0.75 - k * 0.2})`;
          ctx.lineWidth = 6 - k * 1.5;
          const x = cx + side * eyeDx + (k - 1) * 9 + (random() - 0.5) * 6;
          jag(ctx, [x, eyeY + 27], [x + (random() - 0.5) * 14, eyeY + mix(70, 150, random())], 5, 6);
        }
    }
    if (a.expression === 'drawn-smile') {
      ctx.strokeStyle = '#191520';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(cx - 108, mouthY - 46);
      ctx.quadraticCurveTo(cx, mouthY + 62, cx + 108, mouthY - 46);
      ctx.stroke();
      ctx.lineWidth = 3;
      for (let i = -5; i <= 5; i++) {
        const x = cx + i * 19, y = mouthY - 46 + (1 - (i / 5.7) ** 2) * 54;
        ctx.beginPath(); ctx.moveTo(x - 2, y - 12); ctx.lineTo(x + 2, y + 12); ctx.stroke();
      }
    }
    // Wig glue for the bald and the balding.
    if (a.hair === 'bald' || a.hair === 'patchy') {
      ctx.strokeStyle = 'rgba(126,84,36,0.8)';
      ctx.lineWidth = 9;
      ctx.beginPath();
      for (let x = 0; x <= W; x += 16) ctx.lineTo(x, py(0.78) + Math.sin(x * 0.05) * 7 + (random() - 0.5) * 8);
      ctx.stroke();
      for (let i = 0; i < 26; i++) {
        ctx.fillStyle = `rgba(140,96,40,${mix(0.3, 0.75, random())})`;
        ctx.beginPath();
        ctx.ellipse(random() * W, mix(0, py(0.8), random()), mix(8, 38, random()), mix(5, 14, random()), random() * 3, 0, 7);
        ctx.fill();
      }
    }
    // Cracks.
    const crackInk = (width: number, colour = '#33241c') => { ctx.strokeStyle = colour; ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; };
    const side = random() < 0.5 ? -1 : 1;
    const craze = Math.round(mix(0, 14, wear));
    crackInk(1.2, 'rgba(70,52,40,0.7)');
    for (let i = 0; i < craze; i++) {
      const x = random() * W, y = random() * H;
      jag(ctx, [x, y], [x + (random() - 0.5) * 160, y + (random() - 0.5) * 120], 18, 6);
    }
    const holes: [number, number][][] = [];
    if (a.crack === 'hairline') {
      crackInk(3.2);
      jag(ctx, [cx + side * 20, py(1.2)], [cx + side * eyeDx, eyeY - 27], 16);
      jag(ctx, [cx + side * eyeDx, eyeY + 27], [cx + side * 96, py(-0.85)], 18);
      crackInk(2);
      jag(ctx, [cx + side * 76, py(-0.3)], [cx + side * 170, py(-0.1)], 14, 6);
    }
    if (a.crack === 'spiderweb') {
      const ox = cx + side * 34, oy = py(0.62);
      const spokes = 9;
      for (let i = 0; i < spokes; i++) {
        const angle = i / spokes * Math.PI * 2 + random() * 0.4, reach = mix(110, 260, random());
        crackInk(3);
        jag(ctx, [ox, oy], [ox + Math.cos(angle) * reach, oy + Math.sin(angle) * reach * 0.8], 16, 8);
      }
      crackInk(2);
      for (const ring of [30, 62, 100]) {
        ctx.beginPath();
        for (let i = 0; i <= spokes; i++) {
          const angle = i / spokes * Math.PI * 2;
          ctx.lineTo(ox + Math.cos(angle) * ring * mix(0.8, 1.15, random()), oy + Math.sin(angle) * ring * 0.8 * mix(0.8, 1.15, random()));
        }
        ctx.stroke();
      }
      holes.push(Array.from({ length: 7 }, (_unused, i) => [ox + Math.cos(i * 0.9) * mix(8, 17, random()), oy + Math.sin(i * 0.9) * mix(7, 14, random())] as [number, number]));
    }
    if (a.crack === 'glued') {
      for (const pass of [0, 1]) {
        const lines: [[number, number], [number, number]][] = [
          [[cx - 150, py(1.0)], [cx + 40, py(-0.1)]], [[cx + 40, py(-0.1)], [cx + 170, py(-0.7)]],
          [[cx + 40, py(-0.1)], [cx + 190, py(0.5)]], [[cx - 60, py(0.45)], [cx - 180, py(-0.5)]], [[cx - 120, py(-0.1)], [cx - 10, py(-0.95)]],
        ];
        for (const [from, to] of lines) {
          const state = ctx.getLineDash();
          crackInk(pass === 0 ? 11 : 2.5, pass === 0 ? 'rgba(196,146,52,0.85)' : '#4a321c');
          ctx.setLineDash(state);
          ctx.beginPath(); ctx.moveTo(...from);
          ctx.lineTo((from[0] + to[0]) / 2 + (pass === 0 ? 0 : 0), (from[1] + to[1]) / 2 + 9);
          ctx.lineTo(...to); ctx.stroke();
        }
      }
    }
    const ragged = (points: [number, number][], jitter: number) => points.map(([x, y]) => [x + (random() - 0.5) * jitter, y + (random() - 0.5) * jitter] as [number, number]);
    if (a.crack === 'missing-cheek') {
      holes.push(ragged([[cx + side * 44, py(-0.12)], [cx + side * 96, py(-0.02)], [cx + side * 150, py(-0.2)], [cx + side * 138, py(-0.52)], [cx + side * 92, py(-0.68)], [cx + side * 60, py(-0.45)]], 16));
      crackInk(3);
      jag(ctx, [cx + side * 96, py(-0.02)], [cx + side * eyeDx, eyeY + 18], 8, 5);
      jag(ctx, [cx + side * 92, py(-0.68)], [cx + side * 70, py(-0.98)], 12, 5);
      jag(ctx, [cx + side * 150, py(-0.2)], [cx + side * 230, py(0.05)], 14, 6);
    }
    if (a.crack === 'caved') {
      holes.push(ragged([[cx + side * 4, py(0.95)], [cx + side * 14, py(0.42)], [cx - side * 8, py(0.05)], [cx + side * 22, py(-0.3)], [cx + side * 70, py(-0.52)], [cx + side * 140, py(-0.35)], [cx + side * 176, py(0.1)], [cx + side * 168, py(0.6)], [cx + side * 110, py(1.0)]], 18));
      crackInk(3);
      jag(ctx, [cx + side * 70, py(-0.52)], [cx + side * 40, py(-0.95)], 12, 5);
      jag(ctx, [cx - side * 8, py(0.05)], [cx - side * 120, py(0.3)], 16, 6);
      jag(ctx, [cx + side * 176, py(0.1)], [cx + side * 260, py(-0.1)], 14, 6);
    }
    // The broken edge shows white biscuit, then the hole itself is cut out of the texture.
    const trace = (points: [number, number][]) => { ctx.beginPath(); points.forEach((point, index) => (index ? ctx.lineTo(...point) : ctx.moveTo(...point))); ctx.closePath(); };
    for (const hole of holes) { crackInk(9, '#fbf6ee'); trace(hole); ctx.stroke(); crackInk(2, '#4a3a30'); trace(hole); ctx.stroke(); }
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = '#000';
    for (const hole of holes) { trace(hole); ctx.fill(); }
    for (const eye of [-1, 1]) { ctx.beginPath(); ctx.ellipse(cx + eye * eyeDx, eyeY, 38, 25, 0, 0, 7); ctx.fill(); }
    ctx.globalCompositeOperation = 'source-over';

    const skin = new THREE.CanvasTexture(canvas);
    skin.colorSpace = THREE.SRGBColorSpace;
    skin.anisotropy = 4;
    const face = new THREE.MeshStandardMaterial({ map: skin, alphaTest: 0.5, roughness: mix(0.42, 0.7, wear) });
    const plain = new THREE.MeshStandardMaterial({ color: bisque, roughness: mix(0.42, 0.7, wear), side: THREE.DoubleSide });
    const inside = new THREE.MeshStandardMaterial({ color: '#4a3b34', roughness: 1, side: THREE.BackSide });
    const wire = new THREE.MeshStandardMaterial({ color: '#6f6a5f', roughness: 0.5, metalness: 0.6 });
    const dark = new THREE.MeshStandardMaterial({ color: '#16110f', roughness: 0.8 });

    const add = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, at: THREE.Vector3 | [number, number, number] = [0, 0, 0]) => {
      const mesh = new THREE.Mesh(geometry, material);
      if (Array.isArray(at)) mesh.position.set(at[0], at[1], at[2]); else mesh.position.copy(at);
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };

    // ---- shoulder plate and neck ------------------------------------------------------
    const doll = new THREE.Group();
    s.root.add(doll);
    const plate = add(doll, new THREE.LatheGeometry([[0.082, 0], [0.083, 0.008], [0.075, 0.024], [0.055, 0.04], [0.036, 0.05], [0.029, 0.06], [0.027, 0.085]].map(([x, y]) => new THREE.Vector2(x, y)), 40), plain);
    plate.scale.set(1.22, 1, 0.8);
    for (const x of [-1, 1]) add(doll, new THREE.SphereGeometry(0.0045, 8, 6), dark, [x * 0.045, 0.014, 0.0535]);
    const neckY = 0.078;
    const head = new THREE.Group();
    head.position.set(0, neckY + H_LOW * Math.sin(1.0) - 0.006, 0);
    doll.add(head);

    const profile = Array.from({ length: 30 }, (_unused, i) => { const theta = mix(T0, T1, i / 29); return new THREE.Vector2(Math.max(radiusAt(theta), 0.0001), heightAt(theta)); });
    const shellGeometry = new THREE.LatheGeometry(profile, 56);
    const shell = add(head, shellGeometry, face);
    shell.rotation.y = Math.PI;
    shell.scale.z = Z_SQUASH;
    const lining = add(head, shellGeometry, inside);
    lining.scale.set(0.97, 0.97, 0.97 * Z_SQUASH);
    lining.castShadow = false;
    add(head, new THREE.SphereGeometry(1, 14, 10), plain, onHead(0.5, -0.2, 1.0)).scale.set(0.009, 0.009, 0.011);
    for (const ear of [-1, 1]) add(head, new THREE.SphereGeometry(1, 12, 8), plain, onHead(0.5 + ear * 0.25, -0.05, 0.99)).scale.set(0.006, 0.015, 0.01);

    // ---- sleep eyes on their rocker ---------------------------------------------------
    const rocker = new THREE.Group();
    const eyeCentre = (eye: number) => onHead(0.5 + eye * eyeDx / W, 0.06, 1).multiplyScalar(1 - 0.0165 / R);
    const pivot = eyeCentre(1).setX(0);
    rocker.position.copy(pivot);
    head.add(rocker);
    const irisColour = ['#3f6fa8', '#5a3a1e', '#6c8a6a', '#8e99a6'][Math.floor(random() * 4)];
    const glassWhite = new THREE.MeshStandardMaterial({ color: '#f4f1e8', roughness: 0.12 });
    const iris = new THREE.MeshStandardMaterial({ color: irisColour, roughness: 0.1 });
    const lid = new THREE.MeshStandardMaterial({ color: bisque.clone().multiplyScalar(0.94), roughness: 0.5 });
    const eyeState = (eye: number): 'open' | 'shut' | 'rolled' | 'gone' => {
      const odd = eye === side;
      switch (a.eyes) {
        case 'open': return 'open';
        case 'one-shut': return odd ? 'shut' : 'open';
        case 'rolled-back': return 'rolled';
        case 'one-gone': return odd ? 'gone' : 'open';
        case 'gone': return 'gone';
        default: return 'shut';
      }
    };
    let anyEye = false;
    for (const eye of [-1, 1]) {
      const state = eyeState(eye);
      if (state === 'gone') continue;
      anyEye = true;
      const ball = new THREE.Group();
      ball.position.copy(eyeCentre(eye)).sub(pivot);
      rocker.add(ball);
      add(ball, new THREE.SphereGeometry(0.02, 22, 16), glassWhite);
      const disc = add(ball, new THREE.SphereGeometry(0.0125, 18, 12), iris, [0, 0, 0.0105]);
      disc.scale.z = 0.75;
      add(ball, new THREE.SphereGeometry(0.0062, 12, 8), dark, [0, 0, 0.0178]).scale.z = 0.5;
      const cover = add(ball, new THREE.SphereGeometry(0.0208, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), lid);
      cover.rotation.x = -0.95;
      const lash = add(ball, new THREE.TorusGeometry(0.0208, 0.0016, 5, 20, Math.PI), dark);
      lash.rotation.set(-0.95 + Math.PI / 2, 0, 0);
      ball.rotation.x = state === 'shut' ? 1.5 : state === 'rolled' ? -0.8 : a.gaze === 'at-you' ? -0.16 : 0;
      ball.rotation.y = state === 'open' && a.gaze === 'away' ? -0.22 : 0;
    }
    if (anyEye) {
      const half = eyeCentre(1).x;
      add(rocker, new THREE.CylinderGeometry(0.0016, 0.0016, half * 2, 6), wire, [0, 0, -0.016]).rotation.z = Math.PI / 2;
      for (const eye of [-1, 1]) add(rocker, new THREE.CylinderGeometry(0.0016, 0.0016, 0.014, 6), wire, [eye * half, 0, -0.006]).rotation.x = Math.PI / 2;
      const arm = add(rocker, new THREE.CylinderGeometry(0.0018, 0.0018, 0.05, 6), wire, [0, -0.02, -0.024]);
      arm.rotation.x = -0.5;
      add(rocker, new THREE.SphereGeometry(0.011, 12, 10), new THREE.MeshStandardMaterial({ color: '#5b5d61', roughness: 0.6, metalness: 0.5 }), [0, -0.043, -0.036]).scale.y = 1.3;
    }

    // ---- hair -------------------------------------------------------------------------
    const hairMaterial = s.material(HAIR[a.hairColour], { roughness: 0.92 });
    const ringlet = (u: number, length: number) => {
      const top = onHead(u, 0.15, 1.05);
      const points: THREE.Vector3[] = [];
      const turns = length / 0.02;
      for (let i = 0; i <= turns * 8; i++) {
        const t = i / (turns * 8), angle = t * turns * Math.PI * 2;
        points.push(new THREE.Vector3(top.x * (1 + t * 0.12) + Math.cos(angle) * 0.0095, top.y - t * length, top.z * (1 + t * 0.12) + Math.sin(angle) * 0.0095));
      }
      add(head, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), Math.round(turns * 10), 0.0058, 6), hairMaterial);
    };
    if (a.hair === 'ringlets' || a.hair === 'hacked') {
      const cap = add(head, new THREE.SphereGeometry(1, 28, 14, 0, Math.PI * 2, 0, 1.42), hairMaterial);
      cap.scale.set(R * 1.07, H_UP * 1.09, R * 1.07 * Z_SQUASH);
      cap.rotation.x = -0.42;
      if (a.hair === 'ringlets') {
        for (const u of [0.22, 0.14, 0.06, -0.02, -0.1, -0.18, -0.26, 0.29, 0.78, 0.705]) ringlet(u < 0 ? u + 1 : u, mix(0.085, 0.125, random()));
        for (let i = 0; i < 7; i++) add(head, new THREE.TorusGeometry(0.0085, 0.004, 6, 12), hairMaterial, onHead(0.5 + (i - 3) * 0.035, 0.72 - Math.abs(i - 3) * 0.045, 1.07)).rotation.set(0.5, (i - 3) * 0.3, random());
      } else {
        for (let i = 0; i < 46; i++) {
          const u = random(), theta = u > 0.36 && u < 0.64 ? mix(0.75, 1.4, random()) : mix(-0.15, 1.4, random());
          const spike = add(head, new THREE.ConeGeometry(0.0065, mix(0.014, 0.034, random()), 5), hairMaterial, onHead(u, theta, 1.09));
          spike.lookAt(head.localToWorld(onHead(u, theta, 2).add(new THREE.Vector3((random() - 0.5) * 0.08, 0.03, (random() - 0.5) * 0.08))));
          spike.rotateX(Math.PI / 2);
        }
      }
    }
    if (a.hair === 'patchy') {
      for (let i = 0; i < 7; i++) {
        const u = random(), theta = u > 0.36 && u < 0.64 ? mix(0.8, 1.3, random()) : mix(0.2, 1.3, random());
        const clump = add(head, new THREE.SphereGeometry(1, 12, 8), hairMaterial, onHead(u, theta, 1.02));
        clump.scale.set(mix(0.014, 0.028, random()), 0.008, mix(0.014, 0.028, random()));
        clump.lookAt(head.localToWorld(onHead(u, theta, 2)));
        clump.rotateX(Math.PI / 2);
      }
      ringlet(mix(0.7, 0.8, random()), mix(0.07, 0.11, random()));
      if (random() < 0.6) ringlet(mix(0.15, 0.3, random()), mix(0.05, 0.09, random()));
    }

    // ---- what it wears ----------------------------------------------------------------
    const lace = new THREE.MeshStandardMaterial({ color: mood.cheer < 0.3 ? '#27242a' : new THREE.Color('#f1ead9').lerp(new THREE.Color('#a79f8c'), wear * 0.6), roughness: 0.9, side: THREE.DoubleSide });
    const frill = (inner: number, outer: number, drop: number, waves: number, amplitude: number) => {
      const geometry = new THREE.RingGeometry(inner, outer, 96, 3);
      const position = geometry.attributes.position;
      for (let i = 0; i < position.count; i++) {
        const x = position.getX(i), y = position.getY(i), r = Math.hypot(x, y), t = (r - inner) / (outer - inner);
        position.setZ(i, -t * drop + Math.sin(Math.atan2(y, x) * waves) * amplitude * t);
        const scallop = 1 + Math.abs(Math.sin(Math.atan2(y, x) * waves / 2)) * 0.1 * t;
        position.setXY(i, x * scallop, y * scallop);
      }
      geometry.computeVertexNormals();
      return geometry;
    };
    if (a.dress === 'lace-collar') {
      const collar = add(doll, frill(0.03, 0.088, 0.04, 14, 0.006), lace, [0, 0.07, 0]);
      collar.rotation.x = -Math.PI / 2;
      collar.scale.set(1.15, 0.82, 1);
      add(doll, new THREE.SphereGeometry(0.008, 10, 8), new THREE.MeshStandardMaterial({ color: '#2b3f66', roughness: 0.3 }), [0, 0.066, 0.036]);
    }
    if (a.dress === 'choker') {
      add(doll, new THREE.CylinderGeometry(0.0295, 0.0295, 0.013, 24), new THREE.MeshStandardMaterial({ color: '#15121a', roughness: 0.9 }), [0, 0.078, 0]);
      const cameo = add(doll, new THREE.SphereGeometry(1, 14, 10), new THREE.MeshStandardMaterial({ color: '#c77e68', roughness: 0.3 }), [0, 0.077, 0.03]);
      cameo.scale.set(0.009, 0.012, 0.004);
      add(doll, new THREE.SphereGeometry(1, 12, 8), new THREE.MeshStandardMaterial({ color: '#f5ecdc', roughness: 0.4 }), [0, 0.077, 0.0325]).scale.set(0.005, 0.008, 0.003);
    }
    if (a.dress === 'bonnet') {
      const hood = add(head, new THREE.SphereGeometry(1, 28, 16, 0, Math.PI * 2, 0, 1.75), lace);
      hood.scale.set(R * 1.2, H_UP * 1.2, R * 1.2);
      hood.rotation.x = -1.25;
      hood.position.set(0, 0.004, -0.004);
      const brim = add(head, frill(R * 1.12, R * 1.5, -0.012, 18, 0.005), lace, [0, 0.013, 0.014]);
      brim.rotation.x = 0.32;
      brim.scale.y = 1.12;
      for (const x of [-1, 1]) {
        add(head, new THREE.BoxGeometry(0.012, 0.075, 0.002), lace, [x * 0.045, -0.062, 0.03]).rotation.z = -x * 0.62;
        add(head, new THREE.TorusGeometry(0.013, 0.005, 6, 14), lace, [x * 0.016, -0.083, 0.047]).scale.y = 0.6;
        add(head, new THREE.BoxGeometry(0.011, 0.045, 0.002), lace, [x * 0.01, -0.108, 0.05]).rotation.z = x * 0.25;
      }
    }

    // ---- pose and fallen pieces -------------------------------------------------------
    const turn = (random() < 0.5 ? -1 : 1);
    if (a.gaze === 'away') head.rotation.set(0.1, turn * mix(0.55, 0.8, random()), 0);
    if (a.gaze === 'at-you') head.rotation.set(0.2, 0, 0);
    if (a.gaze === 'cocked') head.rotation.set(0.02, turn * 0.22, -turn * 0.36);
    if (a.gaze === 'toppled') {
      head.rotation.set(0, turn * 0.15, 0);
      doll.rotation.set(-1.0, 0, turn * 0.75);
    }
    if (a.crack === 'missing-cheek' || a.crack === 'caved') {
      const count = a.crack === 'caved' ? 4 : 2;
      for (let i = 0; i < count; i++) {
        const shard = add(s.root, new THREE.SphereGeometry(R, 8, 6, random() * 6, mix(0.4, 0.75, random()), mix(0.8, 1.5, random()), mix(0.35, 0.6, random())), plain);
        shard.position.set(side * mix(0.01, 0.07, random()), -R + 0.004, mix(0.07, 0.085, random()));
        shard.rotation.set(Math.PI + (random() - 0.5) * 0.3, random() * 6, 0);
        const centre = new THREE.Box3().setFromObject(shard);
        shard.position.y -= centre.min.y;
      }
    }

    const rock = mix(0, 0.16, mood.energy);
    const phase = random() * 6;
    const result = s.finish({
      update: (_dt, time) => { rocker.rotation.x = Math.sin(time * 1.3 + phase) * rock + Math.max(0, Math.sin(time * 0.37 + phase) - 0.96) * 20 * rock; },
    });
    return result;
  },
});
