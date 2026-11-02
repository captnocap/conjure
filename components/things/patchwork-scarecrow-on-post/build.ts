import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix, paint, paintHex } from '@conjure/kit';
import { animateCrows, crow, type Crow } from './crow';
import { pumpkin, stem } from './pumpkin';

function canvasTexture(size: [number, number], draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void) {
  const canvas = document.createElement('canvas');
  [canvas.width, canvas.height] = size;
  draw(canvas.getContext('2d')!, size[0], size[1]);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

/** Flannel: a woven tartan of the shirt colour with dark and pale bands. */
function plaid(base: string) {
  const c = new THREE.Color(base);
  const dark = c.clone().multiplyScalar(0.35).getStyle(), light = c.clone().lerp(new THREE.Color('#f2ead8'), 0.55).getStyle();
  return canvasTexture([128, 128], (ctx, w, h) => {
    ctx.fillStyle = c.getStyle(); ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = dark; ctx.fillRect(0, 40, w, 34); ctx.fillRect(40, 0, 34, h);
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = light; ctx.fillRect(0, 98, w, 6); ctx.fillRect(98, 0, 6, h);
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = dark; ctx.fillRect(0, 10, w, 4); ctx.fillRect(10, 0, 4, h);
  });
}

function burlap() {
  return canvasTexture([64, 64], (ctx, w, h) => {
    ctx.fillStyle = '#c4a46e'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < w; i += 4) {
      ctx.fillStyle = 'rgba(90,64,30,0.35)'; ctx.fillRect(i, 0, 1.5, h); ctx.fillRect(0, i, w, 1.5);
    }
  });
}

export default defineThing({
  questions: {
    face: choice('What face does the scarecrow have?', {
      stitched: 'A burlap sack head with a wide black stitched smile and stitched X eyes.',
      buttons: 'Two mismatched button eyes and a crooked stitched mouth on the sack.',
      painted: 'A crude jack-o-lantern face painted on the sack in black: triangle eyes, jagged grin.',
      pumpkin: 'A carved pumpkin for a head, glowing faintly from inside.',
      blank: 'A blank, featureless burlap sack, tied off at the neck. The unsettling one.',
    }),
    hat: choice('What hat does it wear?', {
      straw: 'A floppy wide-brimmed straw hat.',
      witch: 'A bent black felt witch hat with a buckle.',
      fedora: 'A battered, dented old felt fedora.',
      none: 'No hat; straw sprouts from the top of its head.',
    }),
    shirt: paint('What colour is its flannel shirt?', ['red', 'crimson', 'orange', 'rust', 'green', 'forest', 'blue', 'navy', 'purple', 'yellow', 'brown']),
    trousers: choice('What is it wearing below?', {
      overalls: 'Faded blue denim overalls with patched knees.',
      trousers: 'Old brown work trousers held up with twine.',
      skirt: 'A ragged patchwork skirt of feed-sack calico.',
    }),
    crows: choice('Are there crows on it?', {
      none: 'No crows: it is doing its job.',
      one: 'One crow perched insolently on its outstretched arm.',
      two: 'A crow on each arm.',
      head: 'A crow standing on its head.',
    }),
    state: choice('What has happened to it?', {
      fresh: 'Freshly made: plump with straw, arms straight out, standing proud.',
      sagging: 'Sagging and half-fallen: head lolling, one arm slipped off the crossbar.',
      torn: 'A sleeve torn open and flapping in the wind, straw spilling out.',
      leaning: 'The post has been knocked crooked and leans hard to one side.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const wood = s.material('#7a6248', { roughness: 0.95 });
    const rope = s.material('#9a7a48', { roughness: 0.95 });
    const strawMat = s.material('#e0c070', { roughness: 0.9 });
    const sagging = a.state === 'sagging', leaning = a.state === 'leaning';

    // The cross post. Everything hangs from a group that can lean.
    const rig = new THREE.Group();
    s.root.add(rig);
    const barY = 1.95, postH = barY + 0.12, barW = 1.7;
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.11, postH + 0.4, 0.1), wood);
    post.position.set(0, (postH - 0.4) / 2, -0.15);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(barW, 0.08, 0.08), wood);
    bar.position.set(0, barY, -0.13);
    for (const m of [post, bar]) { m.castShadow = m.receiveShadow = true; rig.add(m); }
    const lash = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.012, 6, 16), rope);
    lash.position.set(0, barY, -0.1);
    lash.rotation.z = Math.PI / 4;
    rig.add(lash);

    // The scarecrow itself: a figure in T-pose, its arms along the crossbar.
    const sentinelTop = '#123456', sentinelBottom = '#654321';
    const person = figure(s, {
      height: 1.72, build: 'heavy', style: 'doll', face: 'blank', hair: 'none', pose: 'standing',
      top: sentinelTop, bottom: sentinelBottom, shoes: '#5a4030', skin: '#c4a46e', sleeves: 'long',
    });
    const { joints } = person;
    joints.shoulders.left.rotation.set(0, 0, 1.5);
    joints.shoulders.right.rotation.set(0, 0, -1.5);
    joints.elbows.left.rotation.set(0, 0, 0.05);
    joints.elbows.right.rotation.set(0, 0, -0.05);
    // Legs hang limp, a little apart, toes down.
    joints.hips.left.rotation.set(0.05, 0, 0.06);
    joints.hips.right.rotation.set(-0.08, 0, -0.06);
    joints.knees.left.rotation.x = 0.15;
    joints.knees.right.rotation.x = 0.25;
    joints.ankles.left.rotation.x = 0.5;
    joints.ankles.right.rotation.x = 0.4;
    if (sagging) {
      joints.spine.rotation.set(0.25, 0, 0.12);
      joints.neck.rotation.set(0.3, 0.25, 0.55);
      joints.shoulders.right.rotation.set(0.1, 0, -0.25);
      joints.elbows.right.rotation.set(-0.3, 0, 0);
    } else {
      joints.neck.rotation.set(0.12, (random() - 0.5) * 0.4, (random() - 0.5) * 0.3);
    }
    rig.add(person.root);
    // Lift it so the shoulders sit at the crossbar.
    rig.updateMatrixWorld(true);
    const shoulder = joints.shoulders.left.getWorldPosition(new THREE.Vector3());
    person.root.position.set(0, barY - shoulder.y + 0.03 - (sagging ? 0.12 : 0), 0.0);
    const shirtTint = new THREE.Color(sentinelTop).lerp(new THREE.Color('#8b8275'), mood.wear * 0.18);
    const bottomTint = new THREE.Color(sentinelBottom).lerp(new THREE.Color('#8b8275'), mood.wear * 0.18);
    const flannel = s.material('#ffffff', { map: plaid(paintHex(a.shirt, '#c8102e')), roughness: 0.85 });
    const trouserColour = { overalls: '#5a7aa0', trousers: '#6a5034', skirt: '#a06a50' }[a.trousers];
    const trousers = a.trousers === 'skirt'
      ? s.material('#ffffff', { map: plaid('#b07a4a'), roughness: 0.9 })
      : s.material(trouserColour, { roughness: 0.9 });
    const sack = s.material('#ffffff', { map: burlap(), roughness: 1 });
    person.root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const m = mesh.material as THREE.MeshStandardMaterial;
      if (m.color?.equals(shirtTint)) mesh.material = flannel;
      else if (m.color?.equals(bottomTint)) mesh.material = trousers;
      else if (m.color && Math.abs(m.color.r - new THREE.Color('#c4a46e').lerp(new THREE.Color('#8b8275'), mood.wear * 0.18).r) < 0.002) mesh.material = sack;
    });

    // Straw bursting from cuffs, ankles and neck.
    const tuft = (parent: THREE.Object3D, count: number, length: number, spread: number, dir: 1 | -1 = -1) => {
      for (let i = 0; i < count; i++) {
        const st = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.006, length * (0.6 + random() * 0.6), 4), strawMat);
        const ang = random() * Math.PI * 2, tilt = random() * spread;
        st.position.set(Math.cos(ang) * 0.025, dir * length * 0.35, Math.sin(ang) * 0.025);
        st.rotation.set(Math.sin(ang) * tilt, 0, Math.cos(ang) * tilt);
        st.castShadow = true;
        parent.add(st);
      }
    };
    for (const side of ['left', 'right'] as const) {
      tuft(person.hands[side].parent!, 14, 0.2, 0.7);
      tuft(joints.ankles[side], 10, 0.14, 0.6);
    }
    const H = 1.72, headR = H * 0.064;
    // A stuffed sack head is bigger than a person's.
    person.head.scale.setScalar(1.35);
    // Gathered sack neck tied with twine, straw poking out.
    const neckTie = new THREE.Mesh(new THREE.TorusGeometry(headR * 0.62, 0.012, 6, 14), rope);
    neckTie.rotation.x = Math.PI / 2;
    neckTie.position.y = -headR * 0.95;
    person.head.add(neckTie);
    const frill = new THREE.Mesh(new THREE.ConeGeometry(headR * 1.05, headR * 0.5, 10, 1, true), sack);
    frill.position.y = -headR * 1.15;
    frill.rotation.x = Math.PI;
    person.head.add(frill);
    // Elbow and knee patches.
    const patchColours = ['#c9b07a', '#6a8a4a', '#a04a3a', '#3a4a6a', '#d8c8a0'];
    for (const side of ['left', 'right'] as const) {
      const patch = new THREE.Mesh(new THREE.BoxGeometry(H * 0.075, H * 0.06, H * 0.075), s.material(patchColours[Math.floor(random() * 5)], { roughness: 1 }));
      patch.position.y = -0.01;
      patch.rotation.y = random();
      joints.elbows[side].add(patch);
      if (a.trousers !== 'skirt') {
        const knee = new THREE.Mesh(new THREE.BoxGeometry(H * 0.085, H * 0.08, H * 0.085), s.material(patchColours[Math.floor(random() * 5)], { roughness: 1 }));
        knee.position.y = -0.02;
        joints.knees[side].add(knee);
      }
    }
    if (a.trousers === 'overalls') {
      // Bib and straps.
      const bib = new THREE.Mesh(new THREE.BoxGeometry(H * 0.14, H * 0.12, 0.02), trousers);
      bib.position.set(0, H * 0.09, H * 0.055);
      joints.spine.add(bib);
      for (const sx of [-1, 1]) {
        const strap = new THREE.Mesh(new THREE.BoxGeometry(0.035, H * 0.22, 0.012), trousers);
        strap.position.set(sx * H * 0.06, H * 0.2, H * 0.052);
        joints.spine.add(strap);
      }
    } else if (a.trousers === 'skirt') {
      const skirt = new THREE.Mesh(new THREE.CylinderGeometry(H * 0.1, H * 0.2, H * 0.32, 12, 1, true), trousers);
      skirt.position.y = -H * 0.15;
      (skirt.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
      person.pelvis.add(skirt);
    } else {
      const belt = new THREE.Mesh(new THREE.TorusGeometry(H * 0.078, 0.01, 6, 16), rope);
      belt.rotation.x = Math.PI / 2;
      belt.scale.set(1.2, 0.75, 1);
      belt.position.y = 0.02;
      person.pelvis.add(belt);
    }

    // The face, on the front of the head.
    const front = headR * 0.98;
    const ink = s.material('#1c1a18', { roughness: 0.8 });
    const faceGroup = new THREE.Group();
    person.head.add(faceGroup);
    const stitchLine = (x0: number, y0: number, x1: number, y1: number, stitches: number) => {
      const line = new THREE.Mesh(new THREE.BoxGeometry(Math.hypot(x1 - x0, y1 - y0), 0.006, 0.006), ink);
      line.position.set((x0 + x1) / 2, (y0 + y1) / 2, front + 0.002);
      line.rotation.z = Math.atan2(y1 - y0, x1 - x0);
      faceGroup.add(line);
      for (let i = 0; i <= stitches && stitches > 0; i++) {
        const f = i / stitches;
        const tick = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.03, 0.006), ink);
        tick.position.set(mix(x0, x1, f), mix(y0, y1, f), front + 0.003);
        tick.rotation.z = Math.atan2(y1 - y0, x1 - x0);
        faceGroup.add(tick);
      }
    };
    const curveAt = (x: number) => -headR * 0.35 - Math.cos((x / (headR * 0.75)) * Math.PI / 2) * headR * 0.18;
    if (a.face === 'stitched' || a.face === 'buttons') {
      const n = 5;
      for (let i = 0; i < n; i++) {
        const x0 = mix(-headR * 0.6, headR * 0.6, i / n), x1 = mix(-headR * 0.6, headR * 0.6, (i + 1) / n);
        stitchLine(x0, a.face === 'stitched' ? curveAt(x0) : -headR * 0.38 + i * 0.004, x1, a.face === 'stitched' ? curveAt(x1) : -headR * 0.38 + (i + 1) * 0.004, 1);
      }
    }
    if (a.face === 'stitched') {
      for (const sx of [-1, 1]) {
        const e = headR * 0.16;
        stitchLine(sx * headR * 0.38 - e, headR * 0.22 - e, sx * headR * 0.38 + e, headR * 0.22 + e, 0);
        stitchLine(sx * headR * 0.38 - e, headR * 0.22 + e, sx * headR * 0.38 + e, headR * 0.22 - e, 0);
      }
    }
    if (a.face === 'buttons') {
      [['#2a2a6a', 0.17], ['#8a1a1a', 0.13]].forEach(([colour, r], i) => {
        const button = new THREE.Mesh(new THREE.CylinderGeometry(headR * (r as number), headR * (r as number), 0.012, 14), s.material(colour as string, { roughness: 0.3 }));
        button.rotation.x = Math.PI / 2;
        button.position.set((i ? 1 : -1) * headR * 0.38, headR * 0.2, front);
        faceGroup.add(button);
        for (const hx of [-1, 1]) {
          const hole = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.006, 0.004), s.material('#e8e0c8'));
          hole.position.set((i ? 1 : -1) * headR * 0.38 + hx * headR * 0.05, headR * 0.2, front + 0.008);
          faceGroup.add(hole);
        }
      });
    }
    if (a.face === 'painted') {
      const tex = canvasTexture([256, 256], (ctx, w, h) => {
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = '#141210';
        const tri = (cx: number, cy: number, r: number) => { ctx.beginPath(); ctx.moveTo(cx - r, cy + r * 0.7); ctx.lineTo(cx + r, cy + r * 0.7); ctx.lineTo(cx, cy - r * 0.8); ctx.closePath(); ctx.fill(); };
        tri(w * 0.3, h * 0.32, w * 0.13); tri(w * 0.7, h * 0.32, w * 0.13); tri(w * 0.5, h * 0.52, w * 0.06);
        ctx.beginPath(); ctx.moveTo(w * 0.12, h * 0.64);
        for (let i = 0; i <= 8; i++) ctx.lineTo(w * (0.12 + i * 0.095), h * (i % 2 ? 0.7 : 0.62) + Math.sin(i / 8 * Math.PI) * h * 0.08);
        for (let i = 8; i >= 0; i--) ctx.lineTo(w * (0.12 + i * 0.095), h * 0.72 + Math.sin(i / 8 * Math.PI) * h * 0.14);
        ctx.closePath(); ctx.fill();
      });
      const paintFace = new THREE.Mesh(new THREE.SphereGeometry(headR * 1.015, 24, 16, Math.PI * 0.2, Math.PI * 0.6, Math.PI * 0.2, Math.PI * 0.6), new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: 0.5, roughness: 0.9 }));
      paintFace.scale.y = 1.12;
      faceGroup.add(paintFace);
    }
    const lights: THREE.Mesh[] = [];
    if (a.face === 'pumpkin') {
      // A carved pumpkin replaces the sack head.
      person.head.children.forEach((child) => { if (child !== neckTie && child !== frill && (child as THREE.Mesh).isMesh && (child as THREE.Mesh).geometry.type === 'SphereGeometry') child.visible = false; });
      const ps = new Sculpture(context);
      const head = pumpkin(ps, { radius: headR * 1.75, height: headR * 2.3, ribs: 10, groove: 0.8, color: '#e2701a', shade: 0.4 }, random);
      stem(ps, head.topAt.clone(), 0.05, 0.014, s.material('#5a5230'), random);
      ps.root.position.y = -headR * 1.15;
      person.head.add(ps.root);
      const glow = s.material('#ffcc55', { emissive: '#ff9a20', emissiveIntensity: mix(0.8, 2.4, mood.cheer * 0.5 + 0.5) });
      const r = headR * 1.75;
      const shapes: [number, number, number, number][] = [[-0.38, 0.3, 0.22, 3], [0.38, 0.3, 0.22, 3], [0, -0.25, 0.5, 6]];
      for (const [x, y, size, segs] of shapes) {
        const cut = new THREE.Mesh(new THREE.CircleGeometry(r * size, segs), glow);
        cut.position.set(x * r, headR * 0.05 + y * r, r * 0.97 - Math.abs(x) * r * 0.25);
        if (segs === 3) cut.rotation.z = Math.PI / 2 * (x < 0 ? 1 : 1);
        if (segs === 6) cut.scale.y = 0.35;
        lights.push(cut);
        person.head.add(cut);
      }
    }

    // Hats, pushed back on the head so the face shows.
    const hatGroup = new THREE.Group();
    hatGroup.rotation.x = -0.4;
    hatGroup.position.z = -headR * 0.15;
    person.head.add(hatGroup);
    const hatTop = a.face === 'pumpkin' ? headR * 1.9 : headR * 1.4;
    if (a.hat === 'straw') {
      const hatMat = s.material('#d8b866', { roughness: 0.95, side: THREE.DoubleSide });
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(headR * 2.1, headR * 2.2, 0.012, 24), hatMat);
      brim.position.y = hatTop * 0.55;
      brim.rotation.set(0.15, 0, -0.12);
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(headR * 0.85, headR * 1.05, headR * 0.9, 16), hatMat);
      crown.position.y = hatTop * 0.55 + headR * 0.45;
      const band = new THREE.Mesh(new THREE.CylinderGeometry(headR * 1.06, headR * 1.08, headR * 0.2, 16), s.material('#8a2a1a'));
      band.position.y = hatTop * 0.55 + headR * 0.15;
      hatGroup.add(brim, crown, band);
    } else if (a.hat === 'witch') {
      const felt = s.material('#1c1a22', { roughness: 0.9, side: THREE.DoubleSide });
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(headR * 1.9, headR * 1.9, 0.01, 24), felt);
      brim.position.y = hatTop * 0.6;
      brim.rotation.z = 0.1;
      const cone = new THREE.Mesh(new THREE.ConeGeometry(headR * 1.1, headR * 2.2, 16), felt);
      cone.position.y = hatTop * 0.6 + headR * 1.0;
      const tip = new THREE.Mesh(new THREE.ConeGeometry(headR * 0.42, headR * 1.2, 10), felt);
      tip.position.set(headR * 0.35, hatTop * 0.6 + headR * 2.2, 0);
      tip.rotation.z = -1.0;
      const buckle = new THREE.Mesh(new THREE.BoxGeometry(headR * 0.5, headR * 0.4, 0.01), s.material('#c8a040', { metalness: 0.8, roughness: 0.3 }));
      buckle.position.set(0, hatTop * 0.6 + headR * 0.25, headR * 1.02);
      hatGroup.add(brim, cone, tip, buckle);
    } else if (a.hat === 'fedora') {
      const felt = s.material('#4a4038', { roughness: 0.95 });
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(headR * 1.6, headR * 1.6, 0.012, 20), felt);
      brim.position.y = hatTop * 0.6;
      brim.rotation.set(-0.12, 0, 0.18);
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(headR * 0.8, headR * 1.0, headR * 0.95, 14), felt);
      crown.position.y = hatTop * 0.6 + headR * 0.47;
      crown.rotation.z = 0.12;
      crown.scale.z = 1.15;
      const dent = new THREE.Mesh(new THREE.BoxGeometry(headR * 0.25, headR * 0.3, headR * 1.4), s.material('#2e2822'));
      dent.position.y = hatTop * 0.6 + headR * 0.88;
      hatGroup.add(brim, crown, dent);
    } else {
      tuft(person.head, 18, 0.16, 0.9, 1);
      person.head.children.slice(-18).forEach((child) => { child.position.y += headR * 1.0; });
    }

    // A torn sleeve flapping from the right forearm.
    let flap: THREE.Mesh | null = null;
    if (a.state === 'torn') {
      flap = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.32, 1, 4).translate(0, -0.16, 0), new THREE.MeshStandardMaterial({ map: (flannel as THREE.MeshStandardMaterial).map, side: THREE.DoubleSide, roughness: 0.9 }));
      flap.position.set(0, -0.08, 0.04);
      flap.castShadow = true;
      joints.elbows.right.add(flap);
      tuft(joints.elbows.right, 12, 0.18, 1.2);
      // Spilled straw on the ground below.
      for (let i = 0; i < 24; i++) {
        const st = s.box([0.16, 0.005, 0.008], [-0.4 - random() * 0.5, 0.004, (random() - 0.5) * 0.5], strawMat);
        st.rotation.y = random() * 3;
      }
    }

    // Straw tufts at the post foot.
    for (let i = 0; i < 18; i++) {
      const st = s.rod([0, 0, 0], [(random() - 0.5) * 0.3, 0.12 + random() * 0.15, (random() - 0.5) * 0.3], 0.006, s.material('#b8a060'));
      st.position.add(new THREE.Vector3((random() - 0.5) * 0.3, 0, (random() - 0.5) * 0.3));
    }

    // Crows.
    rig.updateMatrixWorld(true);
    const crows: Crow[] = [];
    const perch = (x: number, y: number, z: number, faceY: number) => {
      const c = crow(s, random() < 0.5 ? 'perched' : 'cawing', random, { size: 1.05 });
      c.root.position.set(x, y, z);
      c.root.rotation.y = faceY;
      rig.add(c.root);
      crows.push(c);
    };
    if (a.crows === 'one' || a.crows === 'two') {
      const sides = a.crows === 'two' ? [-1, 1] : [random() < 0.5 ? -1 : 1];
      for (const sx of sides) {
        if (sagging && sx === -1) { perch(-barW / 2 + 0.08, barY + 0.04, -0.07, Math.PI / 2 + 0.4); continue; }
        perch(sx * (barW / 2 - 0.06), barY + 0.04 + 0.06, -0.06, sx > 0 ? -Math.PI / 2 - 0.4 : Math.PI / 2 + 0.4);
      }
    }
    if (a.crows === 'head') {
      const top = new THREE.Vector3();
      person.head.getWorldPosition(top);
      rig.worldToLocal(top);
      const lift = a.hat === 'witch' ? headR * 1.3 : a.hat === 'none' ? headR * 1.0 : a.face === 'pumpkin' ? headR * 2.4 : headR * 1.5;
      perch(top.x, top.y + lift, top.z, (random() - 0.5) * 1.2);
    }

    if (leaning) rig.rotation.z = (random() < 0.5 ? 1 : -1) * 0.32;
    else rig.rotation.z = (random() - 0.5) * 0.06;
    rig.rotation.y = (random() - 0.5) * 0.3;

    const animate = animateCrows(crows, mood.energy);
    const sway = mix(0.01, 0.06, mood.energy);
    return s.finish({
      footprint: 0.5,
      update: (_dt, time) => {
        animate(time);
        person.head.rotation.z = Math.sin(time * 0.9) * sway;
        if (flap) { flap.rotation.x = Math.sin(time * (3 + mood.energy * 8)) * (0.3 + mood.energy * 0.8); flap.rotation.z = Math.sin(time * 2.3) * 0.3; }
      },
    });
  },
});
