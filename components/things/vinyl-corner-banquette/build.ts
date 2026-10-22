import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

type P = [number, number, number];
type Ctx = CanvasRenderingContext2D;

function paint(w: number, h: number, draw: (c: Ctx, w: number, h: number) => void, repeat = 0) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext('2d')!, w, h);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  if (repeat) { texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(repeat, repeat); }
  return texture;
}

const VINYL = {
  oxblood: { base: '#7a1c22', pipe: '#4a0e14' },
  leopard: { base: '#d2a258', pipe: '#2a1a10' },
  teal: { base: '#2f8f8a', pipe: '#1c5a58' },
  black: { base: '#1f1f24', pipe: '#d8b04a' },
  pink: { base: '#f06fa6', pipe: '#fbe3ee' },
  mustard: { base: '#d6a62a', pipe: '#6a4a10' },
} as const;

export default defineThing({
  questions: {
    upholstery: choice('What is it upholstered in?', {
      oxblood: 'Deep oxblood vinyl, an old-school lounge.',
      leopard: 'Leopard print, loud and unembarrassed.',
      teal: 'Cracked teal vinyl, a bit seaside, a bit tired.',
      black: 'Black leatherette with gold piping, a hostess club.',
      pink: 'Glossy bubblegum pink, girls’ night.',
      mustard: 'Mustard yellow, a 1970s coffee shop.',
    }),
    tufting: choice('How is the back finished?', {
      buttoned: 'Deep diamond quilting with a button at every crossing.',
      channel: 'Vertical padded channels.',
      plain: 'Smooth and plain.',
    }),
    layout: choice('What shape is the seating?', {
      corner: 'A plain L in a corner.',
      long: 'A long back bench with a short return.',
      booth: 'A U-shaped booth, seats on three sides.',
    }),
    left: choice('What has been left on the seat?', {
      nothing: 'Nothing. The room is empty or not yet used.',
      coats: 'A pile of winter coats, a scarf and a briefcase: the whole office is here.',
      salaryman: 'A suit jacket over the backrest, a loosened tie on the seat, shoes kicked off below.',
      bouquet: 'A wrapped bouquet of flowers, a farewell or a confession.',
      handbag: 'A single handbag with a phone glowing beside it.',
      shopping: 'A convenience-store bag and a clear umbrella: someone came in from the rain alone.',
    }),
    phone: choice('What is the intercom phone doing?', {
      hung: 'Hanging in its cradle.',
      dangling: 'Off the hook, dangling on its curly cord.',
      seat: 'Off the hook, lying on the seat mid-call.',
    }),
    phoneColour: choice('What colour is the phone?', {
      beige: 'Yellowed beige office plastic.',
      red: 'Emergency red.',
      black: 'Black.',
      mint: 'Mint green.',
    }),
    wall: choice('What is the wall behind it?', {
      panel: 'Dark wood-effect slats.',
      damask: 'Patterned wallpaper above a dado rail.',
      quilted: 'Padded quilted panels, soundproofing dressed up as luxury.',
      mirror: 'Smoked mirror tiles.',
      stars: 'Midnight paint with glowing stars and planets.',
    }),
    glow: noul('Is there a glowing LED strip under the seat edge?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const put = (g: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, at: P = [0, 0, 0]) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...at);
      mesh.castShadow = mesh.receiveShadow = true;
      g.add(mesh);
      return mesh;
    };
    const vinyl = VINYL[a.upholstery];
    const crackCount = Math.round((a.upholstery === 'teal' ? 10 : 0) + mood.wear * (a.upholstery === 'teal' ? 40 : 16));
    const skin = paint(256, 256, (c, w, h) => {
      c.fillStyle = vinyl.base; c.fillRect(0, 0, w, h);
      if (a.upholstery === 'leopard') for (let i = 0; i < 46; i++) {
        const x = random() * w, y = random() * h, r = 7 + random() * 8;
        for (const [ox, oy] of [[0, 0], [w, 0], [-w, 0], [0, h], [0, -h]]) {
          c.fillStyle = '#b07a30'; c.beginPath(); c.ellipse(x + ox, y + oy, r * 0.7, r * 0.55, i, 0, 7); c.fill();
          c.strokeStyle = '#2a1a10'; c.lineWidth = 3.5; c.beginPath(); c.ellipse(x + ox, y + oy, r, r * 0.8, i, i, i + 2.2); c.stroke();
          c.beginPath(); c.ellipse(x + ox, y + oy, r, r * 0.8, i, i + 3, i + 5.2); c.stroke();
        }
      }
      if (a.tufting === 'buttoned') {
        for (const [tint, off, width] of [['rgba(0,0,0,0.38)', 0, 7], ['rgba(255,255,255,0.16)', 4, 3]] as const) {
          c.strokeStyle = tint; c.lineWidth = width;
          for (let k = -2; k <= 4; k++) {
            c.beginPath(); c.moveTo(k * 128 + off, 0); c.lineTo(k * 128 + 256 + off, 256); c.stroke();
            c.beginPath(); c.moveTo(k * 128 + off, 256); c.lineTo(k * 128 + 256 + off, 0); c.stroke();
          }
        }
      } else if (a.tufting === 'channel') {
        for (let y = 0; y < h; y += 64) {
          c.fillStyle = 'rgba(0,0,0,0.4)'; c.fillRect(0, y, w, 6);
          c.fillStyle = 'rgba(255,255,255,0.14)'; c.fillRect(0, y + 8, w, 5);
        }
      }
      c.strokeStyle = 'rgba(235,240,232,0.6)'; c.lineWidth = 1.2;
      for (let i = 0; i < crackCount; i++) {
        let x = random() * w, y = random() * h;
        c.beginPath(); c.moveTo(x, y);
        for (let j = 0; j < 4; j++) { x += (random() - 0.5) * 30; y += (random() - 0.5) * 30; c.lineTo(x, y); }
        c.stroke();
      }
    }, 2);
    const skinMat = new THREE.MeshStandardMaterial({ map: skin, roughness: mix(0.28, 0.6, mood.wear), metalness: 0.05 });
    const pipe = s.material(vinyl.pipe, { roughness: 0.35, metalness: a.upholstery === 'black' ? 0.6 : 0 });
    const dark = s.material('#1c1a1c', { roughness: 0.7 });
    const hue = mood.warmth > 0.5 ? '#ff3fa0' : '#2ad8ff';
    const ledMat = new THREE.MeshStandardMaterial({ color: hue, emissive: hue, emissiveIntensity: mix(0.8, 2, mood.cheer) });
    const button = new THREE.SphereGeometry(0.016, 8, 6);

    const profile = new THREE.Shape();
    profile.moveTo(0, 0.14); profile.lineTo(0, 0.38); profile.quadraticCurveTo(0, 0.43, 0.05, 0.425);
    profile.lineTo(0.41, 0.42); profile.quadraticCurveTo(0.445, 0.42, 0.45, 0.46);
    profile.lineTo(0.5, 0.88); profile.quadraticCurveTo(0.51, 0.94, 0.56, 0.94);
    profile.lineTo(0.6, 0.94); profile.quadraticCurveTo(0.64, 0.94, 0.64, 0.9); profile.lineTo(0.64, 0.14); profile.closePath();
    const DEPTH = 0.64;
    /** One straight run: local x is depth (0 at the seat front), local z runs along its length. */
    const run = (len: number) => {
      const g = new THREE.Group();
      put(g, new THREE.ExtrudeGeometry(profile, { depth: len, bevelEnabled: false, curveSegments: 6 }), skinMat);
      put(g, new THREE.BoxGeometry(DEPTH - 0.07, 0.14, len - 0.02), dark, [0.07 + (DEPTH - 0.07) / 2, 0.07, len / 2]);
      for (const [x, y] of [[0.012, 0.415], [0.535, 0.945]]) {
        const p = put(g, new THREE.CylinderGeometry(0.011, 0.011, len, 8), pipe, [x, y, len / 2]);
        p.rotation.x = Math.PI / 2;
      }
      for (let z = 0.75; z < len - 0.4; z += 0.75) put(g, new THREE.BoxGeometry(0.44, 0.006, 0.012), dark, [0.23, 0.421, z]);
      if (a.tufting === 'buttoned') {
        const at: P[] = [];
        for (const [y, off] of [[0.5, 0], [0.625, 0.125], [0.75, 0], [0.875, 0.125]])
          for (let z = off || 0.25; z < len - 0.05; z += 0.25) at.push([0.448 + (y - 0.44) * 0.119, y, z]);
        const buttons = new THREE.InstancedMesh(button, pipe, at.length);
        const m = new THREE.Matrix4();
        at.forEach((p, i) => buttons.setMatrixAt(i, m.makeTranslation(...p)));
        g.add(buttons);
      }
      if (a.glow) put(g, new THREE.BoxGeometry(0.03, 0.05, len - 0.06), ledMat, [0.055, 0.11, len / 2]).castShadow = false;
      s.root.add(g);
      return g;
    };

    const L = a.layout === 'long' ? 3.0 : a.layout === 'booth' ? 2.5 : 2.2;
    const sideLen = a.layout === 'long' ? 0.8 : a.layout === 'booth' ? 1.25 : 1.35;
    const side = random() < 0.5 ? -1 : 1;
    const back = run(L);
    back.rotation.y = Math.PI / 2; back.position.set(-L / 2, 0, DEPTH);
    const z0 = 0.15;
    for (const sx of a.layout === 'booth' ? [-1, 1] : [side]) {
      const g = run(sideLen + DEPTH - z0);
      if (sx < 0) { g.rotation.y = Math.PI; g.position.set(-L / 2 + DEPTH, -0.003, sideLen + DEPTH); }
      else g.position.set(L / 2 - DEPTH, -0.003, z0);
    }

    // Wall with its finish.
    const WH = 1.8;
    const wallMap = paint(512, 384, (c, w, h) => {
      if (a.wall === 'panel') {
        c.fillStyle = '#4a3020'; c.fillRect(0, 0, w, h);
        for (let x = 0; x < w; x += 22) { c.fillStyle = ['#553826', '#4a3020', '#5e3e2a', '#44291a'][Math.floor(random() * 4)]; c.fillRect(x, 0, 19, h); }
      } else if (a.wall === 'damask') {
        c.fillStyle = '#e6d3ae'; c.fillRect(0, 0, w, h);
        c.fillStyle = '#b8894a';
        for (let y = 0; y < 6; y++) for (let x = 0; x < 14; x++) {
          const px = x * 40 + (y % 2) * 20, py = y * 38 + 14;
          c.beginPath(); c.moveTo(px, py - 15); c.quadraticCurveTo(px + 13, py, px, py + 15); c.quadraticCurveTo(px - 13, py, px, py - 15); c.fill();
          c.beginPath(); c.arc(px + 20, py + 19, 3, 0, 7); c.fill();
        }
        c.fillStyle = '#5a2a22'; c.fillRect(0, h * 0.58, w, h * 0.42);
        c.fillStyle = '#3a1814'; c.fillRect(0, h * 0.58, w, 9);
      } else if (a.wall === 'quilted') {
        c.fillStyle = '#5a2a52'; c.fillRect(0, 0, w, h);
        c.strokeStyle = 'rgba(0,0,0,0.45)'; c.lineWidth = 5;
        for (let k = -8; k < 16; k++) { c.beginPath(); c.moveTo(k * 64, 0); c.lineTo(k * 64 + h, h); c.stroke(); c.beginPath(); c.moveTo(k * 64, h); c.lineTo(k * 64 + h, 0); c.stroke(); }
        c.fillStyle = '#d8b04a';
        for (let y = 0; y <= h; y += 32) for (let x = (y / 32) % 2 ? 32 : 0; x <= w; x += 64) { c.beginPath(); c.arc(x, y, 4, 0, 7); c.fill(); }
      } else if (a.wall === 'mirror') {
        for (let y = 0; y < h; y += 64) for (let x = 0; x < w; x += 64) {
          const v = 96 + Math.floor(random() * 70);
          c.fillStyle = `rgb(${v - 20},${v},${v + 18})`; c.fillRect(x, y, 62, 62);
          c.fillStyle = 'rgba(255,255,255,0.25)'; c.beginPath(); c.moveTo(x + 8, y + 54); c.lineTo(x + 54, y + 8); c.lineTo(x + 54, y + 20); c.lineTo(x + 20, y + 54); c.fill();
        }
      } else {
        c.fillStyle = '#2a2458'; c.fillRect(0, 0, w, h);
        const tints = ['#fff27a', '#ff7ac8', '#7af0ff', '#b8ff8a'];
        for (let i = 0; i < 26; i++) {
          const x = random() * w, y = random() * h * 0.8, r = 5 + random() * 12;
          c.fillStyle = tints[i % 4]; c.beginPath();
          for (let k = 0; k < 10; k++) { const t = (k / 10) * Math.PI * 2 + i, rr = k % 2 ? r * 0.45 : r; c.lineTo(x + Math.cos(t) * rr, y + Math.sin(t) * rr); }
          c.fill();
        }
        c.fillStyle = '#ff9a5a'; c.beginPath(); c.arc(w * mix(0.2, 0.8, random()), h * 0.3, 32, 0, 7); c.fill();
      }
      for (let i = 0; i < mood.wear * 30; i++) { c.fillStyle = `rgba(30,20,10,${random() * 0.18})`; c.beginPath(); c.arc(random() * w, random() * h, 6 + random() * 26, 0, 7); c.fill(); }
    });
    s.box([L + 0.1, WH, 0.08], [0, WH / 2, -0.041], s.material('#3a3436', { roughness: 0.9 }));
    const wallFace = s.mesh(new THREE.PlaneGeometry(L + 0.1, WH), new THREE.MeshStandardMaterial({ map: wallMap, roughness: a.wall === 'mirror' ? 0.2 : 0.8, emissive: a.wall === 'stars' ? '#ffffff' : '#000000', emissiveMap: a.wall === 'stars' ? wallMap : null, emissiveIntensity: 0.35 }), [0, WH / 2, 0]);
    wallFace.castShadow = false;
    s.box([L + 0.1, 0.05, 0.1], [0, WH + 0.025, -0.035], s.material('#2a2426'));

    // Intercom phone.
    const px = a.layout === 'booth' ? 0.3 : -side * (L / 2 - 0.55), py = 1.36;
    const shell = s.material({ beige: '#d8caa4', red: '#c8261e', black: '#222226', mint: '#8fd0b4' }[a.phoneColour], { roughness: 0.4 });
    s.box([0.1, 0.24, 0.04], [px, py, 0.021], shell);
    for (const y of [0.075, -0.075]) s.box([0.07, 0.022, 0.03], [px, py + y, 0.05], shell);
    s.box([0.012, 0.012, 0.004], [px + 0.03, py - 0.1, 0.043], new THREE.MeshStandardMaterial({ color: '#ff3a1c', emissive: '#ff3a1c', emissiveIntensity: a.phone === 'hung' ? 0.1 : 1.5 }));
    const note = s.label(mood.cheer > 0.5 ? 'FRONT DESK 9' : 'TIME UP? DIAL 9', 0.24, 0.07, [px, py + 0.22, 0.004], '#c81e2a', '#fffbe8');
    note.rotation.z = (random() - 0.5) * 0.08;
    const handset = new THREE.Group();
    put(handset, new THREE.BoxGeometry(0.034, 0.19, 0.026), shell, [0, 0, 0.018]);
    for (const y of [0.085, -0.085]) put(handset, new THREE.CylinderGeometry(0.026, 0.03, 0.03, 12), shell, [0, y, 0.006]).rotation.x = Math.PI / 2;
    s.root.add(handset);
    const jack = new THREE.Vector3(px, py - 0.12, 0.03);
    let tail: THREE.Vector3, mid: THREE.Vector3[];
    if (a.phone === 'hung') {
      handset.position.set(px, py, 0.062);
      tail = new THREE.Vector3(px, py - 0.1, 0.075);
      mid = [new THREE.Vector3(px + 0.03, py - 0.36, 0.05), new THREE.Vector3(px + 0.06, py - 0.2, 0.07)];
    } else if (a.phone === 'dangling') {
      const drop = mix(0.25, 0.38, random());
      handset.position.set(px + 0.03, py - 0.12 - drop - 0.1, 0.17);
      handset.rotation.set(0.25, random() * 3, (random() - 0.5) * 0.4);
      tail = handset.position.clone().add(new THREE.Vector3(0, 0.1, 0));
      mid = [new THREE.Vector3(px + 0.01, py - 0.12 - drop * 0.5, 0.11)];
    } else {
      const hx = px + side * 0.25;
      handset.position.set(hx, 0.447, 0.42);
      handset.rotation.set(-Math.PI / 2, 0, 0.9 + random());
      handset.rotation.order = 'YXZ';
      tail = new THREE.Vector3(hx - 0.04, 0.45, 0.36);
      mid = [new THREE.Vector3(px, 1.0, 0.2), new THREE.Vector3(px + side * 0.08, 0.7, 0.3), new THREE.Vector3(hx - 0.06, 0.47, 0.3)];
    }
    {
      const path = new THREE.CatmullRomCurve3([jack, ...mid, tail]);
      const coils = Math.round(path.getLength() * 55), steps = coils * 6;
      const pts: P[] = [];
      const up = new THREE.Vector3(0.3, 0.2, 1).normalize();
      for (let i = 0; i <= steps; i++) {
        const t = i / steps, p = path.getPoint(t), tan = path.getTangent(t);
        const u = new THREE.Vector3().crossVectors(tan, up).normalize(), v = new THREE.Vector3().crossVectors(tan, u);
        const ang = (i / 6) * Math.PI * 2;
        p.addScaledVector(u, Math.cos(ang) * 0.011).addScaledVector(v, Math.sin(ang) * 0.011);
        pts.push([p.x, p.y, p.z]);
      }
      const cord = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p))), steps * 2, 0.0035, 5), shell);
      cord.castShadow = true;
      s.root.add(cord);
    }

    // What was left behind. Seat top is y = 0.42; the back run's seat spans z 0.2 to 0.62.
    const SEAT = 0.422;
    const ix = a.layout === 'booth' ? -0.25 : side * (L / 2 - DEPTH - 0.75) * 0.6 - side * 0.1;
    const cloth = (tint: string) => s.material(tint, { roughness: 0.92 });
    const briefcase = (at: P, rx: number, ry: number) => {
      const g = new THREE.Group();
      put(g, new THREE.BoxGeometry(0.42, 0.3, 0.09), s.material('#3a2a1e', { roughness: 0.5 }), [0, 0.15, 0]);
      put(g, new THREE.TorusGeometry(0.05, 0.008, 6, 12, Math.PI), s.material('#1c1612'), [0, 0.3, 0]);
      for (const x of [-0.12, 0.12]) put(g, new THREE.BoxGeometry(0.03, 0.035, 0.008), s.material('#d8b04a', { metalness: 0.7, roughness: 0.3 }), [x, 0.27, 0.047]);
      g.position.set(...at); g.rotation.set(rx, ry, 0);
      s.root.add(g);
    };
    if (a.left === 'coats') {
      const tints = ['#2a3040', '#b08a58', '#1e1e22', '#6a7078', '#4a2a2a', '#3a4a3a'];
      const count = Math.round(mix(3, 7, mood.density));
      for (let i = 0; i < count; i++) {
        const x = ix + (random() - 0.5) * 0.7, z = 0.4 + (random() - 0.5) * 0.12, y = SEAT + 0.05 + i * 0.03;
        const coat = s.ball([0.3 + random() * 0.08, 0.07, 0.19], [x, y, z], cloth(tints[i % tints.length]), 14);
        coat.rotation.set((random() - 0.5) * 0.3, random() * 3, (random() - 0.5) * 0.3);
        if (i % 2 === 0) s.tube([[x + 0.1, y, z + 0.1], [x + 0.14, SEAT + 0.02, 0.63], [x + 0.15, 0.27 + random() * 0.1, 0.665]], 0.035, cloth(tints[i % tints.length]));
      }
      s.tube([[ix - 0.3, SEAT + 0.1, 0.3], [ix, SEAT + 0.08 + count * 0.035, 0.42], [ix + 0.2, SEAT + 0.06, 0.6], [ix + 0.24, 0.3, 0.66]], 0.022, cloth(mood.cheer > 0.5 ? '#d8362c' : '#8a8e94'));
      briefcase([ix + side * -0.62, SEAT, 0.3], -0.22, (random() - 0.5) * 0.3);
    } else if (a.left === 'salaryman') {
      const suit = cloth(mood.warmth > 0.5 ? '#3a3a44' : '#232a3c');
      const lean = Math.atan2(0.06, 0.48);
      const front = s.box([0.46, 0.4, 0.016], [ix, 0.76, 0.175], suit); front.rotation.x = lean;
      s.box([0.46, 0.02, 0.2], [ix, 0.952, 0.07], suit);
      for (const x of [-1, 1]) { const sleeve = s.box([0.1, 0.42, 0.02], [ix + x * 0.26, 0.74, 0.185], suit); sleeve.rotation.set(lean, 0, x * 0.12); }
      s.box([0.1, 0.22, 0.004], [ix, 0.82, 0.172], s.material('#e8e8ee', { roughness: 0.6 })).rotation.x = lean;
      const tieMap = paint(32, 128, (c, w, h) => { c.fillStyle = mood.cheer > 0.5 ? '#c8262c' : '#22346e'; c.fillRect(0, 0, w, h); c.fillStyle = '#e8e4d8'; for (let y = -20; y < h; y += 18) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y + 14); c.lineTo(w, y + 20); c.lineTo(0, y + 6); c.fill(); } });
      const tieMat = new THREE.MeshStandardMaterial({ map: tieMap, roughness: 0.6 });
      const tx = ix + side * 0.5;
      const tie = s.box([0.07, 0.008, 0.34], [tx, SEAT + 0.004, 0.47], tieMat); tie.rotation.y = 0.2;
      s.box([0.07, 0.2, 0.008], [tx - 0.035, 0.34, 0.652], tieMat).rotation.z = 0.05;
      s.box([0.06, 0.03, 0.05], [tx + 0.03, SEAT + 0.018, 0.31], tieMat);
      for (const x of [0, 0.13]) { const shoe = s.ball([0.05, 0.035, 0.13], [ix - 0.1 + x + random() * 0.04, 0.035, 0.86 + x * 0.6], s.material('#16161a', { roughness: 0.3 }), 12); shoe.rotation.y = (random() - 0.5) * 1.2; }
      briefcase([ix - side * 0.55, 0, 0.73], -0.12, (random() - 0.5) * 0.5);
    } else if (a.left === 'bouquet') {
      const g = new THREE.Group();
      put(g, new THREE.ConeGeometry(0.14, 0.42, 14, 1, true), new THREE.MeshStandardMaterial({ color: mood.cheer > 0.5 ? '#f6d6e0' : '#e8e2d2', roughness: 0.7, side: THREE.DoubleSide }), [0, 0.21, 0]).rotation.x = Math.PI;
      const petals = mood.cheer > 0.6 ? ['#ff5a8a', '#ffd02a', '#ff8a2a', '#ffffff', '#f06fa6'] : mood.cheer > 0.3 ? ['#c8262c', '#a01c28', '#f4f0e8'] : ['#f4f0e8', '#e8e2d2', '#d8d0e8'];
      const heads = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ roughness: 0.7 }), 22);
      const m = new THREE.Matrix4();
      for (let i = 0; i < 22; i++) {
        const t = random() * 6.3, d = Math.sqrt(random()) * 0.12, size = 0.03 + random() * 0.022;
        m.makeScale(size, size * 0.8, size).setPosition(Math.cos(t) * d, 0.43 + (1 - d / 0.12) * 0.07 + random() * 0.02, Math.sin(t) * d);
        heads.setMatrixAt(i, m);
        heads.setColorAt(i, new THREE.Color(i % 5 === 4 ? '#4a8a3a' : petals[Math.floor(random() * petals.length)]));
      }
      heads.castShadow = true; g.add(heads);
      put(g, new THREE.CylinderGeometry(0.02, 0.014, 0.1, 8), s.material('#3a7a34'), [0, -0.03, 0]);
      put(g, new THREE.TorusGeometry(0.035, 0.008, 6, 14), s.material(mood.cheer > 0.5 ? '#d8262c' : '#d8b04a'), [0, 0.07, 0]).rotation.x = Math.PI / 2;
      g.position.set(ix + 0.2, SEAT + 0.11, 0.42); g.rotation.set(0.25, 0.4 + random() * 0.5, Math.PI / 2 - 0.12);
      g.rotation.order = 'YXZ';
      s.root.add(g);
      const card = s.box([0.09, 0.002, 0.06], [ix - 0.3, SEAT + 0.002, 0.5], s.material('#fffbe8')); card.rotation.y = random();
    } else if (a.left === 'handbag') {
      const tint = mood.cheer > 0.6 ? '#e0306a' : mood.cheer > 0.3 ? '#a8763e' : '#1e1e22';
      const leather = s.material(tint, { roughness: 0.35 });
      const g = new THREE.Group();
      put(g, new THREE.BoxGeometry(0.3, 0.19, 0.12), leather, [0, 0.095, 0]);
      put(g, new THREE.BoxGeometry(0.31, 0.07, 0.125), s.material(new THREE.Color(tint).multiplyScalar(0.75), { roughness: 0.35 }), [0, 0.16, 0]);
      for (const z of [-0.04, 0.04]) put(g, new THREE.TorusGeometry(0.09, 0.008, 6, 16, Math.PI), leather, [0, 0.19, z]).rotation.x = z * 6;
      put(g, new THREE.BoxGeometry(0.04, 0.03, 0.01), s.material('#d8b04a', { metalness: 0.7, roughness: 0.3 }), [0, 0.13, 0.065]);
      g.position.set(ix, SEAT, 0.36); g.rotation.y = (random() - 0.5) * 0.7;
      s.root.add(g);
      const phone = s.box([0.075, 0.009, 0.15], [ix + 0.3, SEAT + 0.005, 0.5], s.material('#16161a', { roughness: 0.3 })); phone.rotation.y = 0.4 + random();
      const lit = s.box([0.066, 0.002, 0.14], [ix + 0.3, SEAT + 0.0105, 0.5], new THREE.MeshStandardMaterial({ color: '#bfe6ff', emissive: '#8fd0ff', emissiveIntensity: 1.3 })); lit.rotation.y = phone.rotation.y; lit.castShadow = false;
    } else if (a.left === 'shopping') {
      const bag = s.mesh(new THREE.IcosahedronGeometry(1, 1), s.material('#f4f4f0', { roughness: 0.6, flatShading: true }), [ix, SEAT + 0.11, 0.4]);
      bag.scale.set(0.17, 0.12, 0.12); bag.rotation.y = random();
      s.box([0.2, 0.05, 0.005], [ix, SEAT + 0.12, 0.523], s.material(mood.warmth > 0.5 ? '#f08a2a' : '#2a9a5a'));
      for (const x of [-0.06, 0.06]) s.ring(0.04, 0.005, [ix + x, SEAT + 0.24, 0.4], s.material('#f4f4f0'), Math.PI);
      s.cylinder(0.033, 0.033, 0.12, [ix + 0.28, SEAT + 0.06, 0.5], s.material('#d8d8dc', { metalness: 0.7, roughness: 0.3 }), 14);
      const ux = ix - 0.4;
      s.rod([ux, 0.02, 0.92], [ux, 0.78, 0.67], 0.02, new THREE.MeshStandardMaterial({ color: '#dfeef2', transparent: true, opacity: 0.7, roughness: 0.2 }), 0.045);
      s.rod([ux, 0.02, 0.92], [ux, 0.95, 0.615], 0.006, s.material('#e8e8ec', { metalness: 0.6 }));
      s.ring(0.035, 0.009, [ux + 0.035, 0.95, 0.615], s.material('#f4f4f0'), Math.PI);
      const puddle = s.cylinder(0.14, 0.14, 0.002, [ux + 0.03, 0.001, 0.95], new THREE.MeshStandardMaterial({ color: '#5a6a78', transparent: true, opacity: 0.35, depthWrite: false, roughness: 0.05 }), 20);
      puddle.scale.z = 0.7; puddle.castShadow = false;
    }

    // Throw cushions on a crowded night, tape on a tired seat.
    const cushions = a.left === 'coats' ? 0 : Math.round(mood.density * 3 - 0.6);
    for (let i = 0; i < cushions; i++) {
      const tint = [vinyl.pipe, '#f0e6d0', '#d8b04a'][i % 3];
      const cushion = s.box([0.34, 0.34, 0.1], [side * (L / 2 - 0.2), SEAT + 0.17, 0.9 + i * 0.36], s.material(tint, { roughness: 0.8 }));
      cushion.rotation.set(0, Math.PI / 2 + (random() - 0.5) * 0.4, 0); cushion.rotation.x = (random() - 0.5) * 0.3;
      cushion.position.x -= side * 0.3;
    }
    for (let i = 0; i < Math.round(mood.wear * 5); i++) {
      const tape = s.box([0.12 + random() * 0.1, 0.002, 0.05], [(random() - 0.5) * (L - DEPTH * 2 - 0.3), SEAT + 0.001, 0.3 + random() * 0.25], s.material(random() < 0.5 ? '#9aa0a6' : '#2a2a2e', { roughness: 0.4 }));
      tape.rotation.y = random() * 3;
    }

    const base = mix(0.8, 2, mood.cheer);
    return s.finish({ update: (_dt, time) => { ledMat.emissiveIntensity = base * (1 + Math.sin(time * mix(0.5, 5, mood.energy)) * 0.2); } });
  },
});
