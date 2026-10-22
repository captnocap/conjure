import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

const CLOTHS = {
  satin: 'Ivory bridal satin with a cold sheen, yards of it for one day.',
  denim: 'Heavy indigo denim, a work shirt or overalls being patched.',
  floral: 'Cream cotton lawn printed with small red and blue flowers, a summer dress.',
  khaki: 'Olive drab uniform cloth, piecework paid by the dozen.',
  flannel: 'Pale yellow and white checked flannel, something small for a baby.',
  crepe: 'Matt black crepe, a mourning dress needed by Friday.',
  gingham: 'Red and white gingham, an apron or a kitchen curtain.',
} as const;
type Cloth = keyof typeof CLOTHS;

const THREADS = {
  white: 'Plain white cotton.',
  black: 'Black, the other everyday reel.',
  scarlet: 'Scarlet, a seam meant to be seen.',
  gold: 'Old gold silk twist.',
  navy: 'Navy blue.',
  rose: 'Rose pink.',
} as const;
const THREAD_TINT: Record<keyof typeof THREADS, string> = {
  white: '#f1ede0', black: '#1c1b1d', scarlet: '#c8202b', gold: '#c99a2c', navy: '#22386e', rose: '#d9788f',
};

function clothTexture(kind: Cloth, random: () => number) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const base: Record<Cloth, string> = {
    satin: '#efe8d8', denim: '#34507c', floral: '#f0e6cf', khaki: '#7c7a4c', flannel: '#f3e7a6', crepe: '#2b282c', gingham: '#f4efe6',
  };
  ctx.fillStyle = base[kind];
  ctx.fillRect(0, 0, 256, 256);
  if (kind === 'satin') {
    for (let i = 0; i < 9; i++) {
      ctx.fillStyle = i % 2 ? 'rgba(255,255,255,0.35)' : 'rgba(190,170,140,0.18)';
      ctx.fillRect(0, i * 29 + random() * 8, 256, 6 + random() * 10);
    }
  } else if (kind === 'denim' || kind === 'khaki' || kind === 'crepe') {
    ctx.strokeStyle = kind === 'denim' ? 'rgba(190,205,230,0.35)' : kind === 'khaki' ? 'rgba(40,40,20,0.25)' : 'rgba(90,85,95,0.3)';
    ctx.lineWidth = 1.5;
    for (let i = -256; i < 256; i += 6) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + 256, 256); ctx.stroke(); }
  } else if (kind === 'floral') {
    for (let i = 0; i < 46; i++) {
      const x = random() * 256, y = random() * 256, r = 5 + random() * 4;
      ctx.fillStyle = ['#c7323d', '#3a5fa8', '#d9788f', '#c7323d'][i % 4];
      for (let p = 0; p < 5; p++) { ctx.beginPath(); ctx.arc(x + Math.cos(p * 1.257) * r, y + Math.sin(p * 1.257) * r, r * 0.62, 0, 7); ctx.fill(); }
      ctx.fillStyle = '#e6b53a'; ctx.beginPath(); ctx.arc(x, y, r * 0.5, 0, 7); ctx.fill();
      ctx.fillStyle = '#5c8a4a'; ctx.fillRect(x + r, y + r, 5, 3);
    }
  } else {
    const ink = kind === 'flannel' ? 'rgba(255,255,255,0.75)' : 'rgba(200,35,45,0.55)';
    ctx.fillStyle = ink;
    for (let i = 0; i < 8; i += 2) { ctx.fillRect(i * 32, 0, 32, 256); ctx.fillRect(0, i * 32, 256, 32); }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  return texture;
}

/** Gold transfers painted on a clear canvas and cut out with alphaTest, so they stay solid in every pass. */
function decal(width: number, height: number, paint: (ctx: CanvasRenderingContext2D, w: number, h: number) => void, wear: number, random: () => number) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = Math.max(32, Math.round(512 * height / width));
  const ctx = canvas.getContext('2d')!;
  ctx.strokeStyle = ctx.fillStyle = '#e2b648';
  ctx.lineCap = 'round';
  paint(ctx, canvas.width, canvas.height);
  // Hands and decades rub the transfers away in patches.
  ctx.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < Math.floor(wear * wear * 60); i++) {
    ctx.beginPath();
    ctx.ellipse(random() * canvas.width, random() * canvas.height, 10 + random() * 46, 6 + random() * 22, random() * 3, 0, 7);
    ctx.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshStandardMaterial({ map: texture, alphaTest: 0.45, metalness: 0.55, roughness: 0.4, emissive: '#6b4a10', emissiveIntensity: 0.35 });
  return new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
}

function scroll(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, flip: number) {
  ctx.beginPath();
  for (let t = 0; t <= 22; t++) {
    const a = t * 0.42, rr = r * (1 - t / 26);
    const px = x + Math.cos(a) * rr * flip, py = y + Math.sin(a) * rr;
    if (t === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.stroke();
}

export default defineThing({
  questions: {
    finish: choice('What era and finish is the machine?', {
      gilded: 'Victorian black japan smothered in gold scrolls and flowers, a parlour showpiece.',
      workhorse: 'Plain black enamel with sober gold lines and a maker\'s name, the machine every household had.',
      mint: 'A 1950s machine in mint green enamel with chrome trim and no decals.',
      crimson: 'Deep red enamel with gold pinstripes, a showroom or export model.',
      bare: 'Japanning worn through to grey iron, the gold almost entirely rubbed away.',
    }),
    state: choice('What state was the work left in?', {
      midseam: 'Stopped mid-seam: needle down in the cloth, the fabric trailing off both sides of the bed.',
      tangled: 'Jammed: a bird\'s nest of thread at the needle and the cloth puckered up around it.',
      finished: 'Just finished: the needle is up and the cloth lies folded beside the machine, thread still attached.',
      empty: 'Nobody is sewing: no cloth, no thread on the pin, the machine standing bare.',
    }),
    cloth: choice('If there is cloth at the machine, what is being sewn?', CLOTHS),
    thread: choice('If it is threaded, what colour is the thread?', THREADS),
    progress: score('If it stopped mid-seam, how far along the cloth had it got?', ['Barely started, nearly all of it still to feed through', 'Halfway', 'The last few inches, most of it already through']),
    crank: choice('How is it driven?', {
      hand: 'A geared hand crank with a turned wooden knob bolted beside the wheel.',
      wheel: 'Only the bare spoked hand wheel, the crank long since lost.',
    }),
    base: choice('What does it stand on?', {
      plinth: 'A varnished wooden base with a little drawer front.',
      case: 'The bottom of a bentwood carrying case, with brass catches at the ends.',
      none: 'Nothing: the iron bed sits straight on the table.',
    }),
    notions: noul('Are an oil can, spare bobbins and a reel left beside it?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const bodyTint = { gilded: '#17161a', workhorse: '#1b1b1e', mint: '#9fcfb9', crimson: '#8e1722', bare: '#55575a' }[a.finish];
    const enamel = s.material(bodyTint, { roughness: mix(0.22, 0.6, mood.wear) + (a.finish === 'bare' ? 0.25 : 0), metalness: a.finish === 'bare' ? 0.6 : 0.25 });
    const chrome = s.material('#d9dcdd', { metalness: 0.9, roughness: mix(0.18, 0.5, mood.wear) });
    const wood = s.material(mix(0, 1, mood.warmth) > 0.5 ? '#8a5a32' : '#7a5636', { roughness: 0.55 });
    const brass = s.material('#c79a3e', { metalness: 0.8, roughness: 0.35 });
    const threadTint = THREAD_TINT[a.thread];
    const threadMat = s.material(threadTint, { roughness: 0.8 });
    const threaded = a.state !== 'empty';
    const hasCloth = a.state !== 'empty';

    // Stand.
    let bedBottom = 0;
    if (a.base !== 'none') {
      bedBottom = 0.05;
      s.box([0.47, 0.05, 0.25], [0, 0.025, 0], wood);
      s.box([0.49, 0.012, 0.27], [0, 0.006, 0], wood);
      if (a.base === 'plinth') {
        s.box([0.12, 0.028, 0.006], [0.13, 0.027, 0.127], s.material('#6b4426'));
        s.ball([0.008, 0.008, 0.008], [0.13, 0.027, 0.134], brass, 10);
      } else {
        for (const x of [-1, 1]) {
          s.box([0.006, 0.03, 0.04], [x * 0.238, 0.035, 0], brass);
          s.box([0.012, 0.008, 0.02], [x * 0.243, 0.05, 0], brass);
        }
      }
    }
    const bedTop = bedBottom + 0.026;
    s.box([0.37, 0.026, 0.18], [0, bedBottom + 0.013, 0], enamel);

    // One cast-iron silhouette: pillar, arm and head.
    const y0 = bedTop;
    const shape = new THREE.Shape();
    shape.moveTo(0.175, y0);
    shape.lineTo(0.17, y0 + 0.17);
    shape.quadraticCurveTo(0.168, y0 + 0.2, 0.13, y0 + 0.202);
    shape.lineTo(-0.13, y0 + 0.2);
    shape.quadraticCurveTo(-0.178, y0 + 0.2, -0.178, y0 + 0.16);
    shape.lineTo(-0.178, y0 + 0.085);
    shape.lineTo(-0.118, y0 + 0.085);
    shape.lineTo(-0.118, y0 + 0.118);
    shape.quadraticCurveTo(-0.116, y0 + 0.14, -0.09, y0 + 0.14);
    shape.lineTo(0.04, y0 + 0.136);
    shape.quadraticCurveTo(0.082, y0 + 0.13, 0.086, y0 + 0.08);
    shape.quadraticCurveTo(0.088, y0 + 0.015, 0.07, y0);
    shape.closePath();
    const body = new THREE.ExtrudeGeometry(shape, { depth: 0.058, bevelEnabled: true, bevelThickness: 0.009, bevelSize: 0.009, bevelSegments: 3, curveSegments: 10 });
    body.translate(0, 0, -0.029);
    s.mesh(body, enamel);
    const faceZ = 0.029 + 0.009 + 0.0012;

    // Bright work: face plate, needle bar, presser foot, stitch plate, tension discs.
    const needleX = -0.148;
    const needleUp = a.state === 'finished' || a.state === 'empty';
    s.box([0.004, 0.1, 0.06], [-0.189, y0 + 0.14, 0], chrome);
    s.rod([needleX, y0 + 0.09, 0.006], [needleX, y0 + (needleUp ? 0.05 : 0.03), 0.006], 0.004, chrome);
    s.rod([needleX, y0 + (needleUp ? 0.05 : 0.03), 0.006], [needleX, y0 + (needleUp ? 0.018 : 0.0), 0.006], 0.0012, chrome, 0.0004);
    s.rod([needleX + 0.014, y0 + 0.09, -0.008], [needleX + 0.014, y0 + 0.016, -0.008], 0.003, chrome);
    s.box([0.022, 0.004, 0.03], [needleX + 0.008, y0 + 0.012, 0.002], chrome);
    s.box([0.07, 0.002, 0.1], [needleX + 0.01, y0 + 0.001, 0], chrome);
    const tension = s.cylinder(0.014, 0.014, 0.012, [-0.148, y0 + 0.15, faceZ + 0.005], chrome, 16);
    tension.rotation.x = Math.PI / 2;
    s.rod([-0.16, y0 + 0.2, 0], [-0.16, y0 + 0.222, 0], 0.004, chrome);
    s.rod([-0.176, y0 + 0.19, 0.03], [-0.176, y0 + 0.215, 0.036], 0.002, chrome);

    // Gold transfers.
    if (a.finish !== 'mint') {
      const rubbed = a.finish === 'bare' ? Math.max(0.85, mood.wear) : mood.wear * 0.8;
      const ornate = a.finish === 'gilded';
      const arm = decal(0.25, 0.05, (ctx, w, h) => {
        ctx.lineWidth = ornate ? 5 : 3;
        if (a.finish === 'crimson') {
          ctx.strokeRect(8, 8, w - 16, h - 16);
          ctx.strokeRect(18, 18, w - 36, h - 36);
        } else if (ornate) {
          for (let i = 0; i < 9; i++) scroll(ctx, 34 + i * 56, h / 2 + (i % 2 ? 10 : -10), h * 0.36, i % 2 ? 1 : -1);
          for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.arc(62 + i * 56, h / 2, 7, 0, 7); ctx.fill(); }
        } else {
          scroll(ctx, 44, h / 2, h * 0.36, 1);
          scroll(ctx, w - 44, h / 2, h * 0.36, -1);
          ctx.font = `bold ${Math.round(h * 0.56)}px serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('THE FAMILY', w / 2, h / 2 + 2, w - 190);
          ctx.lineWidth = 2;
          ctx.strokeRect(86, 10, w - 172, h - 20);
        }
      }, rubbed, random);
      arm.position.set(0.0, y0 + 0.17, faceZ);
      s.root.add(arm);
      const pillar = decal(0.07, 0.11, (ctx, w, h) => {
        ctx.lineWidth = ornate ? 16 : 10;
        ctx.beginPath(); ctx.ellipse(w / 2, h / 2, w * 0.36, h * 0.4, 0, 0, 7); ctx.stroke();
        if (ornate) { scroll(ctx, w / 2, h / 2, w * 0.24, 1); scroll(ctx, w / 2, h / 2, w * 0.24, -1); }
        else { ctx.beginPath(); ctx.arc(w / 2, h / 2, w * 0.12, 0, 7); ctx.fill(); }
      }, rubbed, random);
      pillar.position.set(0.128, y0 + 0.075, faceZ);
      s.root.add(pillar);
      const bed = decal(0.36, 0.17, (ctx, w, h) => {
        ctx.lineWidth = ornate ? 7 : 4;
        ctx.strokeRect(12, 12, w - 24, h - 24);
        if (a.finish !== 'crimson') for (const [cx, cy, f] of [[52, 50, 1], [w - 52, 50, -1], [52, h - 50, 1], [w - 52, h - 50, -1]] as const) scroll(ctx, cx, cy, 30, f);
        if (ornate) for (let i = 0; i < 6; i++) scroll(ctx, 120 + i * 55, h - 44, 22, i % 2 ? 1 : -1);
      }, rubbed, random);
      bed.rotation.x = -Math.PI / 2;
      bed.position.set(0, bedTop + 0.0008, 0);
      s.root.add(bed);
    } else {
      s.box([0.09, 0.022, 0.003], [0.0, y0 + 0.17, faceZ], chrome);
      s.box([0.25, 0.005, 0.003], [0.0, y0 + 0.148, faceZ], chrome);
    }

    // Hand wheel and crank, turning together.
    const wheel = new THREE.Group();
    wheel.position.set(0.2, y0 + 0.16, 0);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.056, 0.011, 10, 40), a.finish === 'mint' ? enamel : chrome);
    rim.rotation.y = Math.PI / 2;
    wheel.add(rim);
    for (let i = 0; i < 6; i++) {
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.1, 0.008), enamel);
      spoke.rotation.x = i * Math.PI / 6;
      wheel.add(spoke);
    }
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.02, 0.05, 16), chrome);
    hub.rotation.z = Math.PI / 2;
    hub.position.x = -0.008;
    wheel.add(hub);
    wheel.rotation.x = random() * Math.PI;
    wheel.traverse((node) => { node.castShadow = true; });
    s.root.add(wheel);
    const crank = new THREE.Group();
    if (a.crank === 'hand') {
      const gearbox = s.cylinder(0.034, 0.034, 0.02, [0.212, y0 + 0.108, -0.052], enamel, 20);
      gearbox.rotation.z = Math.PI / 2;
      s.box([0.03, 0.05, 0.014], [0.19, y0 + 0.1, -0.045], enamel);
      crank.position.set(0.228, y0 + 0.108, -0.052);
      const armBar = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.085, 0.016), chrome);
      armBar.position.y = 0.036;
      const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.015, 0.055, 14), wood);
      knob.rotation.z = Math.PI / 2;
      knob.position.set(0.03, 0.074, 0);
      const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.014, 12), brass);
      pin.rotation.z = Math.PI / 2;
      crank.add(armBar, knob, pin);
      crank.rotation.x = random() * Math.PI * 2;
      crank.traverse((node) => { node.castShadow = true; });
      s.root.add(crank);
    }

    // Reel on the spool pin and the thread path down to the needle.
    const pinX = 0.07;
    s.rod([pinX, y0 + 0.2, 0], [pinX, y0 + 0.262, 0], 0.0025, chrome);
    if (threaded) {
      const reelWood = s.material('#d8bf94');
      s.cylinder(0.016, 0.016, 0.004, [pinX, y0 + 0.206, 0], reelWood, 16);
      s.cylinder(0.016, 0.016, 0.004, [pinX, y0 + 0.25, 0], reelWood, 16);
      s.cylinder(0.013, 0.013, 0.04, [pinX, y0 + 0.228, 0], threadMat, 16);
      s.tube([[pinX - 0.013, y0 + 0.235, 0], [-0.06, y0 + 0.212, 0.012], [-0.16, y0 + 0.224, 0.004], [-0.178, y0 + 0.2, 0.03], [-0.15, y0 + 0.152, faceZ + 0.008], [-0.165, y0 + 0.1, 0.03], [needleX, y0 + 0.05, 0.01], [needleX, y0 + (needleUp ? 0.02 : 0.004), 0.007]], 0.0011, threadMat);
    }

    // Cloth.
    if (hasCloth) {
      const texture = clothTexture(a.cloth, random);
      const clothMat = new THREE.MeshStandardMaterial({ map: texture, side: THREE.DoubleSide, roughness: a.cloth === 'satin' ? 0.35 : 0.9, metalness: a.cloth === 'satin' ? 0.15 : 0 });
      const dirt = new THREE.Color('#8b8275');
      clothMat.color.lerp(dirt, mood.wear * 0.25);
      if (a.state === 'finished') {
        // Folded and set down to the left, one corner still under the foot.
        const folds = 3 + Math.floor(random() * 3);
        for (let i = 0; i < folds; i++) {
          const w = 0.2 - i * 0.012, d = 0.17 - i * 0.01;
          const fold = new THREE.Mesh(new THREE.BoxGeometry(w, 0.012, d, 6, 1, 6), clothMat);
          const pos = fold.geometry.attributes.position;
          for (let v = 0; v < pos.count; v++) pos.setY(v, pos.getY(v) + Math.sin(pos.getX(v) * 40 + i) * 0.0015 + Math.cos(pos.getZ(v) * 34 + i * 2) * 0.0015);
          fold.geometry.computeVertexNormals();
          fold.position.set(-0.37 + (random() - 0.5) * 0.012, 0.007 + i * 0.012, 0.03 + (random() - 0.5) * 0.012);
          fold.rotation.y = (random() - 0.5) * 0.12;
          fold.castShadow = fold.receiveShadow = true;
          s.root.add(fold);
        }
        if (threaded) s.tube([[needleX, y0 + 0.02, 0.007], [-0.2, y0 + 0.004, 0.03], [-0.26, 0.03, 0.05], [-0.33, 0.012 * folds + 0.004, 0.04]], 0.0011, threadMat);
      } else {
        const feed = a.state === 'midseam' ? mix(0.13, -0.12, a.progress) : 0.02;
        const width = 0.3, depth = 0.44;
        const geometry = new THREE.PlaneGeometry(width, depth, 36, 48);
        geometry.rotateX(-Math.PI / 2);
        const cx = needleX - 0.03, pos = geometry.attributes.position;
        const phase = random() * 6, pucker = a.state === 'tangled' ? 1 : 0;
        const rest = 0;
        for (let v = 0; v < pos.count; v++) {
          const x = pos.getX(v) + cx, z = pos.getZ(v) + feed;
          const dx = Math.max(-0.185 - x, 0, x - 0.185), dz = Math.max(-0.09 - z, 0, z - 0.09);
          const out = Math.min(1, Math.hypot(dx, dz) / 0.13);
          const drop = out * out * (3 - 2 * out);
          let y = bedTop + 0.004 - drop * (bedTop + 0.001 - rest);
          const ripple = Math.sin(x * 46 + z * 23 + phase) * 0.004 + Math.sin(z * 61 - x * 17 + phase * 2) * 0.003;
          y += ripple * (0.25 + drop * 1.6 * (1 - drop * 0.6));
          const near = Math.hypot(x - needleX, z);
          if (pucker) y += Math.max(0, 0.06 - near) * 0.45 * (0.6 + 0.4 * Math.sin(Math.atan2(z, x - needleX) * 7 + phase));
          pos.setXYZ(v, x, Math.max(0.003, y), z);
        }
        geometry.computeVertexNormals();
        s.mesh(geometry, clothMat);
        // The seam already sewn, running away behind the needle.
        if (threaded) {
          const stitches: { at: [number, number, number]; size: number }[] = [];
          const sewn = feed - depth / 2 + 0.02;
          for (let z = -0.004; z > Math.max(sewn, -0.085); z -= 0.007) stitches.push({ at: [needleX, bedTop + 0.0062, z], size: 1 });
          if (stitches.length) s.scatter(new THREE.BoxGeometry(0.0016, 0.001, 0.004), threadMat, stitches);
        }
        if (a.state === 'tangled' && threaded) {
          for (let i = 0; i < 5; i++) {
            const loop: [number, number, number][] = [];
            const turns = 7 + Math.floor(random() * 4);
            for (let t = 0; t < turns; t++) loop.push([needleX + (random() - 0.5) * 0.07, bedTop + 0.02 + random() * 0.04, 0.012 + (random() - 0.3) * 0.07]);
            s.tube(loop, 0.0012, threadMat);
          }
        }
      }
    }

    // Company: an oil can, bobbins, a spare reel.
    if (a.notions) {
      const side = 0.29;
      s.lathe([[0, 0], [0.022, 0], [0.024, 0.004], [0.022, 0.03], [0.006, 0.04], [0.003, 0.085], [0, 0.085]], brass, [side, 0, 0.09]);
      const bobbins = 2 + Math.floor(mood.density * 4);
      for (let i = 0; i < bobbins; i++) {
        const bx = side - 0.02 + (random() - 0.5) * 0.09, bz = -0.02 + (random() - 0.5) * 0.1;
        s.cylinder(0.011, 0.011, 0.002, [bx, 0.001, bz], chrome, 14);
        s.cylinder(0.007, 0.007, 0.008, [bx, 0.006, bz], i % 2 ? threadMat : s.material('#e9e4d6'), 12);
        s.cylinder(0.011, 0.011, 0.002, [bx, 0.011, bz], chrome, 14);
      }
      const spare = s.material(['#2f6f62', '#b9442f', '#e5dfd0', '#3d4d86'][Math.floor(random() * 4)]);
      const reel = s.cylinder(0.014, 0.014, 0.04, [side + 0.02, 0.016, -0.1], spare, 16);
      reel.rotation.z = Math.PI / 2;
      reel.rotation.y = random() * 3;
    }

    // Rust blooms on a neglected machine.
    if (mood.wear > 0.55) {
      const rust = s.material('#7a4a2a', { roughness: 1 });
      const spots = Math.floor((mood.wear - 0.5) * 30);
      for (let i = 0; i < spots; i++) {
        const spot = s.ball([0.008 + random() * 0.012, 0.0015, 0.006 + random() * 0.01], [(random() - 0.5) * 0.34, bedTop + 0.0012, (random() - 0.5) * 0.15], rust, 8);
        spot.castShadow = false;
      }
    }

    const running = a.state === 'midseam' ? mix(0, 1.6, Math.max(0, mood.energy - 0.45)) : 0;
    return s.finish({
      update: (dt) => {
        if (!running) return;
        wheel.rotation.x += dt * running * 3;
        crank.rotation.x -= dt * running;
      },
    });
  },
});
