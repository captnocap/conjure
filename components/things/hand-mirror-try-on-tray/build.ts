import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

const SKINS = ['#f1d3bd', '#e0b08c', '#c68a5e', '#9a623c', '#6b4226', '#4a2c1a'];
const HAIRS = ['#17151a', '#4a2c1b', '#b8491f', '#d9a94e', '#d9d8d2', '#ff3fa0', '#2456e6'];

function roundedRect(w: number, d: number, r: number) {
  const shape = new THREE.Shape();
  const x = -w / 2, y = -d / 2;
  shape.moveTo(x + r, y);
  shape.lineTo(x + w - r, y); shape.quadraticCurveTo(x + w, y, x + w, y + r);
  shape.lineTo(x + w, y + d - r); shape.quadraticCurveTo(x + w, y + d, x + w - r, y + d);
  shape.lineTo(x + r, y + d); shape.quadraticCurveTo(x, y + d, x, y + d - r);
  shape.lineTo(x, y + r); shape.quadraticCurveTo(x, y, x + r, y);
  return shape;
}

export default defineThing({
  questions: {
    visit: choice('Whose visit was this?', {
      firstwig: 'Someone choosing a first wig after losing their hair: a box of tissues, a soft cotton cap and a care leaflet.',
      performer: 'A performer getting ready: false lashes, a lipstick, scattered sequins and far too many pins.',
      teenager: 'A teenager trying things for fun: a phone, bright scrunchies and star stickers.',
      hiding: 'Someone who does not want to be found: dark glasses, folded cash and a photograph torn in two.',
      elder: 'A church elder who has come here for forty years: a string of pearls, a pair of gloves, clip-on earrings.',
    }),
    reflects: choice('What does the mirror reflect?', {
      ceiling: 'Nobody: only the shop ceiling and its fluorescent tubes.',
      scalp: 'A bare head and shoulders with no features, before the wig goes on.',
      newhair: 'The same head crowned with new hair, and the beginning of a smile.',
      eye: 'One eye, very close, looking back.',
      heads: 'The shelves behind: rows of faceless heads in wigs.',
      door: 'The shop door standing open and a small figure walking out into the light.',
    }),
    left: choice('What was left behind?', {
      scarf: 'Only the headscarf, folded neatly: they walked out wearing the wig.',
      hurry: 'Everything, in a hurry: the scarf dropped in a heap, the cap inside out, pins spilled across the counter.',
      tissues: 'Crumpled tissues.',
      lock: 'A lock of their own hair tied with a ribbon.',
      note: 'A handwritten thank-you card tucked under the mirror.',
      ring: 'A ring, taken off and forgotten on the velvet.',
      nothing: 'Nothing. The tray has been reset for the next customer, scarf and all gone.',
    }),
    scarf: choice('If the headscarf is there, what is it like?', {
      paisley: 'Paisley in deep reds and golds.',
      floral: 'Small flowers on cream, soft from washing.',
      silk: 'Plain silk with a contrast border.',
      wax: 'Bold wax print in orange, blue and yellow rings.',
      leopard: 'Leopard print.',
      black: 'Plain black jersey.',
    }),
    mirror: choice('What kind of hand mirror is it?', {
      silver: 'An ornate silver vanity mirror with a beaded rim, an heirloom.',
      salon: 'A cheap pink plastic salon mirror.',
      tortoise: 'Tortoiseshell, round and warm.',
      gilt: 'Gilt and oval, a little theatrical.',
      black: 'Plain black lacquer, professional.',
    }),
    velvet: choice('What colour is the velvet?', {
      burgundy: 'Deep burgundy.',
      navy: 'Midnight navy.',
      emerald: 'Emerald green.',
      black: 'Black.',
      rose: 'Dusty rose.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const jitter = (amount: number) => (random() - 0.5) * 2 * amount;
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const canvasTexture = (w: number, h: number, paint: (ctx: CanvasRenderingContext2D) => void) => {
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      paint(canvas.getContext('2d')!);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      return texture;
    };
    const TW = 0.46, TD = 0.32, FLOOR = 0.014;
    const skin = pick(SKINS), hair = pick(HAIRS);

    // ---- tray
    const frameLook = {
      silver: { color: '#cfd3d8', metalness: 0.9, roughness: 0.25 },
      salon: { color: '#f0a8c4', metalness: 0, roughness: 0.35 },
      tortoise: { color: '#7a4a1e', metalness: 0.1, roughness: 0.25 },
      gilt: { color: '#d1a53a', metalness: 0.85, roughness: 0.28 },
      black: { color: '#1b1b1f', metalness: 0.2, roughness: 0.2 },
    }[a.mirror];
    const frame = s.material(frameLook.color, { metalness: frameLook.metalness, roughness: frameLook.roughness });
    const velvetColour = new THREE.Color({ burgundy: '#6e1228', navy: '#17224f', emerald: '#0f5a3c', black: '#1c1b20', rose: '#c28a94' }[a.velvet]);
    const velvet = s.material(velvetColour, { roughness: 1 });
    const flat = (geo: THREE.BufferGeometry) => geo.rotateX(-Math.PI / 2);
    const outer = roundedRect(TW, TD, 0.03);
    s.mesh(flat(new THREE.ExtrudeGeometry(outer, { depth: FLOOR - 0.002, bevelEnabled: false })), frame);
    const rim = roundedRect(TW, TD, 0.03);
    rim.holes.push(roundedRect(TW - 0.024, TD - 0.024, 0.02));
    s.mesh(flat(new THREE.ExtrudeGeometry(rim, { depth: 0.034, bevelEnabled: true, bevelThickness: 0.003, bevelSize: 0.003, bevelSegments: 2 })), frame);
    s.mesh(flat(new THREE.ShapeGeometry(roundedRect(TW - 0.022, TD - 0.022, 0.02))), velvet, [0, FLOOR, 0]);
    // velvet nap: a few brushed patches where hands have smoothed it
    const nap = new THREE.MeshStandardMaterial({ color: velvetColour.clone().multiplyScalar(1.35), roughness: 1, transparent: true, opacity: 0.35, depthWrite: false });
    for (let i = 0; i < 4 + mood.wear * 6; i++) {
      const patch = s.mesh(new THREE.CircleGeometry(0.03 + random() * 0.04, 14), nap, [jitter(TW * 0.36), FLOOR + 0.0006, jitter(TD * 0.32)]);
      patch.rotation.x = -Math.PI / 2; patch.scale.x = 1.8; patch.castShadow = false;
    }

    // ---- what the mirror shows
    const reflection = canvasTexture(256, 320, (ctx) => {
      const warm = mood.warmth, W = 256, H = 320;
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, warm > 0.5 ? '#f3e6cf' : '#dfe8ee');
      bg.addColorStop(1, warm > 0.5 ? '#b99f84' : '#8fa0ad');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
      const head = (withHair: boolean) => {
        ctx.fillStyle = '#5a5560'; ctx.beginPath(); ctx.ellipse(128, 330, 120, 70, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = skin; ctx.fillRect(108, 210, 40, 60);
        if (withHair) { ctx.fillStyle = hair; ctx.beginPath(); ctx.ellipse(128, 150, 88, 104, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(40, 150, 176, 110); }
        ctx.fillStyle = skin; ctx.beginPath(); ctx.ellipse(128, 160, 58, 76, 0, 0, Math.PI * 2); ctx.fill();
        if (withHair) {
          ctx.fillStyle = hair; ctx.beginPath(); ctx.ellipse(128, 100, 62, 34, 0, Math.PI, 0); ctx.fill();
          ctx.strokeStyle = 'rgba(40,20,20,0.75)'; ctx.lineWidth = 4; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.arc(128, 188, 22, 0.25, Math.PI - 0.25); ctx.stroke();
        } else {
          ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.beginPath(); ctx.ellipse(110, 112, 26, 14, -0.4, 0, Math.PI * 2); ctx.fill();
        }
      };
      if (a.reflects === 'ceiling') {
        ctx.strokeStyle = 'rgba(90,100,110,0.45)'; ctx.lineWidth = 2;
        for (let i = -4; i < 9; i++) { ctx.beginPath(); ctx.moveTo(i * 60, 0); ctx.lineTo(i * 60 - 120, H); ctx.stroke(); }
        for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(0, i * 64 + 20); ctx.lineTo(W, i * 64 - 20); ctx.stroke(); }
        ctx.fillStyle = '#ffffff'; ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 22;
        for (const x of [70, 170]) { ctx.save(); ctx.translate(x, 150); ctx.rotate(0.38); ctx.fillRect(-11, -110, 22, 220); ctx.restore(); }
        ctx.shadowBlur = 0;
      } else if (a.reflects === 'scalp') head(false);
      else if (a.reflects === 'newhair') head(true);
      else if (a.reflects === 'eye') {
        ctx.fillStyle = skin; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.beginPath(); ctx.ellipse(128, 150, 120, 62, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#f6f2ea'; ctx.beginPath(); ctx.moveTo(22, 165); ctx.quadraticCurveTo(128, 70, 234, 165); ctx.quadraticCurveTo(128, 230, 22, 165); ctx.fill();
        ctx.fillStyle = pick(['#4a2c1b', '#2f1c12', '#3a5a3a', '#3a5a7a']); ctx.beginPath(); ctx.arc(128, 156, 44, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#0c0a0c'; ctx.beginPath(); ctx.arc(128, 156, 20, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(144, 140, 9, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#1a1214'; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(22, 165); ctx.quadraticCurveTo(128, 70, 234, 165); ctx.stroke();
        ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(22, 165); ctx.quadraticCurveTo(128, 230, 234, 165); ctx.stroke();
        if (mood.cheer < 0.55) {
          ctx.fillStyle = 'rgba(210,235,255,0.9)'; ctx.beginPath(); ctx.moveTo(80, 205); ctx.quadraticCurveTo(62, 250, 80, 262); ctx.quadraticCurveTo(98, 250, 80, 205); ctx.fill();
        }
      } else if (a.reflects === 'heads') {
        for (let row = 0; row < 3; row++) {
          const y = 70 + row * 100;
          ctx.fillStyle = 'rgba(60,60,70,0.55)'; ctx.fillRect(0, y + 38, W, 6);
          for (let i = 0; i < 4; i++) {
            const x = 34 + i * 62 + (row % 2) * 10;
            ctx.fillStyle = '#f6f4ee'; ctx.beginPath(); ctx.ellipse(x, y, 19, 26, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(x - 7, y + 20, 14, 18);
            ctx.fillStyle = pick(HAIRS); ctx.beginPath(); ctx.ellipse(x, y - 9, 24, 22, 0, Math.PI, 0); ctx.fill(); ctx.fillRect(x - 24, y - 10, 9, 30); ctx.fillRect(x + 15, y - 10, 9, 30);
          }
        }
      } else {
        ctx.fillStyle = '#3a3440'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#fff6dc'; ctx.shadowColor = '#fff6dc'; ctx.shadowBlur = 26; ctx.fillRect(78, 50, 100, 220); ctx.shadowBlur = 0;
        ctx.fillStyle = '#2a242e'; ctx.beginPath(); ctx.ellipse(128, 176, 12, 15, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.moveTo(108, 270); ctx.lineTo(114, 196); ctx.lineTo(142, 196); ctx.lineTo(148, 270); ctx.fill();
        ctx.fillStyle = 'rgba(255,246,220,0.25)'; ctx.beginPath(); ctx.moveTo(78, 270); ctx.lineTo(178, 270); ctx.lineTo(230, 320); ctx.lineTo(26, 320); ctx.fill();
      }
      // glare, and tarnish or cracks with wear
      ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.beginPath(); ctx.moveTo(150, 0); ctx.lineTo(200, 0); ctx.lineTo(60, H); ctx.lineTo(10, H); ctx.fill();
      for (let i = 0; i < mood.wear * 40; i++) {
        const t = random() * 6.3, r = 0.82 + random() * 0.2;
        ctx.fillStyle = 'rgba(60,50,40,0.5)'; ctx.beginPath(); ctx.arc(128 + Math.cos(t) * 128 * r, 160 + Math.sin(t) * 160 * r, 2 + random() * 9, 0, 6.3); ctx.fill();
      }
      if (mood.wear > 0.7) {
        ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 2;
        const cx = 60 + random() * 130, cy = 80 + random() * 160;
        for (let i = 0; i < 7; i++) {
          let x = cx, y = cy; const t = i / 7 * 6.3 + jitter(0.3);
          ctx.beginPath(); ctx.moveTo(x, y);
          for (let k = 0; k < 5; k++) { x += Math.cos(t + jitter(0.5)) * 45; y += Math.sin(t + jitter(0.5)) * 45; ctx.lineTo(x, y); }
          ctx.stroke();
        }
      }
    });

    // ---- hand mirror, built upright in its own frame then laid back on a prop
    const mirror = new THREE.Group();
    const madd = <T extends THREE.Mesh>(mesh: T) => { mesh.castShadow = mesh.receiveShadow = true; mirror.add(mesh); return mesh; };
    const round = a.mirror === 'tortoise' || a.mirror === 'salon';
    const RX = round ? 0.082 : 0.074, RY = round ? 0.082 : 0.096, HANDLE = 0.125;
    const oval = new THREE.Shape();
    oval.absellipse(0, 0, RX + 0.012, RY + 0.012, 0, Math.PI * 2, false);
    madd(new THREE.Mesh(new THREE.ExtrudeGeometry(oval, { depth: 0.008, bevelEnabled: true, bevelThickness: 0.003, bevelSize: 0.003, bevelSegments: 2, curveSegments: 32 }).translate(0, 0, -0.011), frame)).position.y = HANDLE + RY;
    const glass = madd(new THREE.Mesh(new THREE.CircleGeometry(1, 40), new THREE.MeshStandardMaterial({ map: reflection, emissiveMap: reflection, emissive: '#ffffff', emissiveIntensity: 0.4, roughness: 0.12 })));
    glass.scale.set(RX, RY, 1); glass.position.set(0, HANDLE + RY, 0.0006); glass.castShadow = false;
    if (a.mirror === 'silver' || a.mirror === 'gilt') {
      const beads = Array.from({ length: 34 }, (_unused, i) => {
        const t = i / 34 * Math.PI * 2;
        return { at: [Math.cos(t) * (RX + 0.007), HANDLE + RY + Math.sin(t) * (RY + 0.007), 0.001] as [number, number, number], size: 1 };
      });
      mirror.add(s.scatter(new THREE.SphereGeometry(0.0045, 8, 6), frame, beads));
      madd(new THREE.Mesh(new THREE.LatheGeometry([[0.006, 0], [0.012, 0.008], [0.008, 0.03], [0.013, 0.07], [0.009, 0.1], [0.016, HANDLE + 0.006]].map(([x, y]) => new THREE.Vector2(x, y)), 14), frame)).scale.z = 0.7;
      const crest = madd(new THREE.Mesh(new THREE.SphereGeometry(0.014, 10, 8), frame));
      crest.scale.set(1.6, 1, 0.5); crest.position.set(0, HANDLE + RY * 2 + 0.016, -0.004);
    } else {
      const grip = madd(new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.011, HANDLE + 0.012, 14).translate(0, (HANDLE + 0.012) / 2 - 0.002, -0.006), frame));
      grip.scale.z = 0.6;
      if (a.mirror === 'salon') madd(new THREE.Mesh(new THREE.TorusGeometry(0.01, 0.003, 6, 16), frame)).position.set(0, -0.006, -0.004);
    }
    const tilt = mix(0.98, 1.12, random()), MS = 1.35;
    const mx = -0.095, mz = 0.07;
    mirror.scale.setScalar(MS);
    mirror.rotation.order = 'YXZ';
    mirror.rotation.set(-(Math.PI / 2 - tilt), 0.28 + jitter(0.12), 0);
    mirror.position.set(mx, FLOOR + 0.014, mz);
    s.root.add(mirror);
    // the little brass prop it leans on
    const propAt = new THREE.Vector3(0, (HANDLE + RY * 1.2) * MS * Math.sin(tilt), -(HANDLE + RY * 1.2) * MS * Math.cos(tilt)).applyAxisAngle(new THREE.Vector3(0, 1, 0), mirror.rotation.y);
    const brass = s.material('#b9923c', { metalness: 0.85, roughness: 0.3 });
    s.rod([mx + propAt.x, FLOOR, mz + propAt.z - 0.05], [mx + propAt.x, FLOOR + propAt.y, mz + propAt.z - 0.012], 0.004, brass);
    s.cylinder(0.026, 0.028, 0.006, [mx + propAt.x, FLOOR + 0.003, mz + propAt.z - 0.05], brass, 14);

    // ---- wig cap
    const insideOut = a.left === 'hurry';
    const capColour = a.visit === 'firstwig' ? pick(['#f3d9d0', '#dfe9f2', '#f2ead0']) : pick(['#c9a27c', '#2a2326', '#8a5c3c']);
    const capMaterial = new THREE.MeshStandardMaterial({ color: capColour, roughness: 0.95, side: THREE.DoubleSide });
    const capGeo = new THREE.SphereGeometry(0.075, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.55);
    {
      const p = capGeo.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const lump = 1 + Math.sin(p.getX(i) * 90 + p.getZ(i) * 60) * (insideOut ? 0.16 : 0.05);
        p.setXYZ(i, p.getX(i) * lump, p.getY(i) * (insideOut ? 0.28 : 0.55) * lump, p.getZ(i) * lump);
      }
      capGeo.computeVertexNormals();
    }
    const cx = 0.115, cz = -0.045;
    const cap = s.mesh(capGeo, capMaterial, [cx, FLOOR + 0.008, cz]);
    cap.rotation.set(insideOut ? Math.PI + 0.3 : jitter(0.1), random() * 6, insideOut ? 0.4 : jitter(0.1));
    if (insideOut) cap.position.y = FLOOR + 0.03;
    const band = s.ring(0.071, 0.005, [cx, FLOOR + (insideOut ? 0.03 : 0.006), cz], s.material(new THREE.Color(capColour).multiplyScalar(0.75), { roughness: 0.9 }));
    band.rotation.set(Math.PI / 2 + (insideOut ? 0.3 : 0), 0, 0);

    // ---- hairpins
    const spill = a.left === 'hurry';
    const pinCount = a.left === 'nothing' ? 6 : Math.round(mix(6, 22, mood.density) * (a.visit === 'performer' ? 1.8 : 1));
    const pins = new THREE.InstancedMesh(new THREE.BoxGeometry(0.05, 0.0016, 0.004), s.material(a.visit === 'teenager' ? '#ff5aa8' : '#2a2326', { metalness: 0.7, roughness: 0.35 }), pinCount);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < pinCount; i++) {
      if (a.left === 'nothing') dummy.position.set(0.15 + (i % 2) * 0.006, FLOOR + 0.002, 0.07 + i * 0.008), dummy.rotation.set(0, 0, 0);
      else if (spill && i % 3 === 0) dummy.position.set(jitter(0.25), 0.001, TD / 2 + 0.02 + random() * 0.06), dummy.rotation.set(0, random() * 6, 0);
      else dummy.position.set(0.02 + random() * 0.18, FLOOR + 0.002 + random() * 0.002, 0.03 + random() * 0.1), dummy.rotation.set(0, random() * 6, jitter(0.1));
      dummy.updateMatrix();
      pins.setMatrixAt(i, dummy.matrix);
    }
    pins.castShadow = true;
    s.root.add(pins);
    // a small dish the pins belong in
    s.lathe([[0.001, 0], [0.03, 0], [0.042, 0.012], [0.039, 0.012], [0.028, 0.004], [0.001, 0.004]], frame, [0.02, FLOOR, -0.1]);

    // ---- the headscarf, beside the tray
    const scarfTexture = canvasTexture(256, 256, (ctx) => {
      const fill = (c: string) => { ctx.fillStyle = c; ctx.fillRect(0, 0, 256, 256); };
      if (a.scarf === 'paisley') {
        fill('#8f1a2a');
        for (let i = 0; i < 46; i++) {
          ctx.save(); ctx.translate(random() * 256, random() * 256); ctx.rotate(random() * 6);
          ctx.fillStyle = pick(['#e2b23c', '#f3e3b0', '#1f5a5a', '#d8602a']);
          ctx.beginPath(); ctx.moveTo(0, -16); ctx.bezierCurveTo(18, -10, 14, 14, 0, 14); ctx.bezierCurveTo(-12, 14, -10, -2, 0, -16); ctx.fill();
          ctx.fillStyle = '#8f1a2a'; ctx.beginPath(); ctx.arc(1, 5, 4, 0, 6.3); ctx.fill();
          ctx.restore();
        }
      } else if (a.scarf === 'floral') {
        fill('#f4ead6');
        for (let i = 0; i < 70; i++) {
          const x = random() * 256, y = random() * 256;
          ctx.fillStyle = pick(['#d8607a', '#7a8fd0', '#e0a03a', '#b05aa0']);
          for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.arc(x + Math.cos(k * 1.26) * 6, y + Math.sin(k * 1.26) * 6, 4.5, 0, 6.3); ctx.fill(); }
          ctx.fillStyle = '#f2d23a'; ctx.beginPath(); ctx.arc(x, y, 3, 0, 6.3); ctx.fill();
        }
      } else if (a.scarf === 'silk') {
        const base = pick(['#2f6f8f', '#d9b23c', '#7a2f8f', '#e8e2d2', '#c2484a']);
        fill(base);
        ctx.strokeStyle = pick(['#f3e9d0', '#17161a', '#d9b23c']); ctx.lineWidth = 26; ctx.strokeRect(0, 0, 256, 256);
        const sheen = ctx.createLinearGradient(0, 0, 256, 256);
        sheen.addColorStop(0.3, 'rgba(255,255,255,0)'); sheen.addColorStop(0.5, 'rgba(255,255,255,0.35)'); sheen.addColorStop(0.7, 'rgba(255,255,255,0)');
        ctx.fillStyle = sheen; ctx.fillRect(0, 0, 256, 256);
      } else if (a.scarf === 'wax') {
        fill('#1f3f9a');
        for (let i = 0; i < 16; i++) {
          const x = (i % 4) * 64 + 32, y = Math.floor(i / 4) * 64 + 32;
          for (const [r, c] of [[30, '#f28a1a'], [22, '#f6d23a'], [13, '#1f3f9a'], [6, '#f28a1a']] as const) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.3); ctx.fill(); }
        }
      } else if (a.scarf === 'leopard') {
        fill('#d19a4a');
        for (let i = 0; i < 90; i++) {
          const x = random() * 256, y = random() * 256;
          ctx.fillStyle = '#2a1a10'; ctx.beginPath(); ctx.ellipse(x, y, 9 + random() * 5, 7 + random() * 4, random() * 3, 0, 6.3); ctx.fill();
          ctx.fillStyle = '#9a622a'; ctx.beginPath(); ctx.ellipse(x + 1, y + 1, 5, 4, 0, 0, 6.3); ctx.fill();
        }
      } else {
        fill('#1c1b20');
        ctx.strokeStyle = 'rgba(255,255,255,0.07)';
        for (let i = 0; i < 64; i++) { ctx.beginPath(); ctx.moveTo(0, i * 4); ctx.lineTo(256, i * 4); ctx.stroke(); }
      }
    });
    const scarfMaterial = new THREE.MeshStandardMaterial({ map: scarfTexture, roughness: a.scarf === 'silk' ? 0.35 : 0.85, side: THREE.DoubleSide });
    const sx = TW / 2 + 0.105, sz = 0.03;
    if (a.left === 'hurry') {
      // dropped in a heap: a lumpy mound of cloth
      const heap = new THREE.SphereGeometry(0.11, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2);
      const p = heap.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), z = p.getZ(i);
        const fold = 0.55 + Math.sin(x * 60 + z * 23) * 0.2 + Math.sin(z * 71 - x * 17) * 0.16;
        p.setY(i, p.getY(i) * fold * 0.75);
        p.setX(i, x * (1 + Math.sin(z * 50) * 0.12)); p.setZ(i, z * (1 + Math.sin(x * 40) * 0.12));
      }
      heap.computeVertexNormals();
      s.mesh(heap, scarfMaterial, [sx, 0, sz]).rotation.y = random() * 6;
      const tail = s.mesh(new THREE.PlaneGeometry(0.1, 0.2, 4, 8), scarfMaterial, [sx - 0.1, 0.004, sz + 0.1]);
      tail.rotation.set(-Math.PI / 2, 0, 0.7 + jitter(0.3));
    } else if (a.left !== 'nothing') {
      const layers = 4;
      for (let i = 0; i < layers; i++) {
        const fold = s.mesh(new THREE.BoxGeometry(0.17 - i * 0.004, 0.007, 0.17 - i * 0.004), scarfMaterial, [sx + jitter(0.004), 0.004 + i * 0.0075, sz + jitter(0.004)]);
        fold.rotation.y = 0.2 + jitter(0.03);
      }
      // the rolled edge of the fold facing the viewer
      const roll = s.cylinder(0.008, 0.008, 0.165, [sx - 0.016, 0.018, sz + 0.086], scarfMaterial, 10);
      roll.rotation.set(0, 0.2, Math.PI / 2);
    }

    // ---- what was left on the velvet
    const gold = s.material('#d6a528', { metalness: 0.95, roughness: 0.2 });
    if (a.left === 'tissues' || a.visit === 'firstwig') {
      const tissue = s.material('#fbf9f4', { roughness: 0.95, flatShading: true });
      const n = a.left === 'tissues' ? 4 : 1;
      for (let i = 0; i < n; i++) {
        const ball = s.mesh(new THREE.IcosahedronGeometry(0.024 + random() * 0.01, 1), tissue, [-0.02 + jitter(0.07) + i * 0.02, FLOOR + 0.02, -0.02 + jitter(0.05)]);
        const p = ball.geometry.attributes.position;
        for (let k = 0; k < p.count; k++) p.setXYZ(k, p.getX(k) * mix(0.7, 1.25, random()), p.getY(k) * mix(0.6, 1.1, random()), p.getZ(k) * mix(0.7, 1.25, random()));
        ball.geometry.computeVertexNormals();
        ball.rotation.y = random() * 6;
      }
    }
    if (a.left === 'lock') {
      const lock = s.material(hair, { roughness: 0.4 });
      for (let i = 0; i < 5; i++) {
        const off = (i - 2) * 0.004;
        s.tube([[0.0, FLOOR + 0.006, 0.1 + off], [0.05, FLOOR + 0.008, 0.115 + off], [0.1, FLOOR + 0.006, 0.1 + off * 2], [0.15, FLOOR + 0.005, 0.12 + off * 3]], 0.0035, lock);
      }
      s.ring(0.011, 0.004, [0.03, FLOOR + 0.008, 0.108], s.material('#d8203a', { roughness: 0.4 })).rotation.y = Math.PI / 2;
    } else if (a.left === 'note') {
      const card = s.label('THANK YOU', 0.13, 0.085, [mx + 0.02, FLOOR + 0.003, mz - 0.01], '#2a3a6a', '#fbf6e6');
      card.rotation.set(-Math.PI / 2, 0, -0.25 + jitter(0.1));
    } else if (a.left === 'ring') {
      const ring = s.ring(0.0095, 0.0018, [0.06 + jitter(0.03), FLOOR + 0.0025, 0.105 + jitter(0.01)], gold);
      ring.rotation.x = Math.PI / 2;
    }

    // ---- traces of the visitor, on the counter round the tray
    const bx = -TW / 2 - 0.085, bz = -0.05;
    if (a.visit === 'firstwig') {
      const boxColour = pick(['#b8d4e8', '#e8c8d4', '#cfe3c8']);
      s.box([0.12, 0.08, 0.12], [bx, 0.04, bz], s.material(boxColour, { roughness: 0.8 }));
      const puff = s.mesh(new THREE.ConeGeometry(0.035, 0.07, 5, 1, true), s.material('#fbf9f4', { roughness: 0.95, side: THREE.DoubleSide }), [bx, 0.1, bz]);
      puff.rotation.set(Math.PI + 0.2, 0.6, 0.15);
      const leaflet = s.label('CARING FOR YOUR WIG', 0.11, 0.15, [bx + 0.02, 0.002, bz + 0.16], '#3a5a7a', '#f4f1e6');
      leaflet.rotation.set(-Math.PI / 2, 0, 0.2 + jitter(0.15));
    } else if (a.visit === 'performer') {
      const red = s.material('#c2162a', { roughness: 0.3 });
      s.cylinder(0.011, 0.011, 0.05, [bx + 0.03, 0.025, bz], gold, 12);
      s.cylinder(0.006, 0.009, 0.022, [bx + 0.03, 0.06, bz], red, 10);
      s.cylinder(0.012, 0.012, 0.035, [bx + 0.08, 0.012, bz + 0.05], gold, 12).rotation.z = Math.PI / 2;
      const lash = s.material('#111014', { roughness: 0.8, side: THREE.DoubleSide });
      for (const side of [-1, 1]) {
        const arc = s.mesh(new THREE.RingGeometry(0.014, 0.027, 14, 1, 0.3, Math.PI - 0.6), lash, [-0.02 + side * 0.035, FLOOR + 0.002, 0.125]);
        arc.rotation.set(-Math.PI / 2, 0, Math.PI + side * 0.15);
      }
      const sequins = Array.from({ length: Math.round(mix(25, 90, mood.density)) }, () => ({
        at: [jitter(0.3), random() < 0.5 ? FLOOR + 0.0012 : 0.001, jitter(0.2)] as [number, number, number], size: mix(0.6, 1.4, random()), color: pick(['#ffd23a', '#ff5aa8', '#6ad8ff', '#ffffff', '#c8ff5a']),
      })).map((point) => (Math.abs(point.at[0]) > TW / 2 - 0.02 || Math.abs(point.at[2]) > TD / 2 - 0.02 ? { ...point, at: [point.at[0] * 1.15, 0.001, point.at[2] * 1.2 + 0.02] as [number, number, number] } : { ...point, at: [point.at[0], FLOOR + 0.0012, point.at[2]] as [number, number, number] }));
      s.scatter(new THREE.CylinderGeometry(0.004, 0.004, 0.0008, 8), new THREE.MeshStandardMaterial({ color: '#ffffff', metalness: 0.8, roughness: 0.15, emissive: '#ffffff', emissiveIntensity: 0.15 }), sequins);
    } else if (a.visit === 'teenager') {
      const phone = s.box([0.075, 0.009, 0.155], [bx, 0.0045, bz + 0.02], s.material('#1b1b1f', { roughness: 0.3 }));
      phone.rotation.y = 0.3;
      const screen = canvasTexture(64, 128, (ctx) => {
        const g = ctx.createLinearGradient(0, 0, 64, 128); g.addColorStop(0, '#ff8ac8'); g.addColorStop(1, '#6ac8ff');
        ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 128);
        ctx.fillStyle = '#ffffff'; for (let i = 0; i < 3; i++) ctx.fillRect(8, 20 + i * 30, 30 + random() * 20, 16);
      });
      const glow = s.mesh(new THREE.PlaneGeometry(0.066, 0.143), new THREE.MeshStandardMaterial({ map: screen, emissiveMap: screen, emissive: '#ffffff', emissiveIntensity: 0.7 }), [bx, 0.0096, bz + 0.02]);
      glow.rotation.set(-Math.PI / 2, 0, 0.3); glow.castShadow = false;
      for (let i = 0; i < 3; i++) {
        const scrunchie = s.ring(0.026, 0.011, [bx + 0.02 + i * 0.03, 0.011 + i * 0.006, bz + 0.16 + jitter(0.02)], s.material(pick(['#ff5aa8', '#a8e61f', '#8f3fe0', '#18c7b5', '#ffe21f']), { roughness: 0.9 }));
        scrunchie.rotation.set(Math.PI / 2 + jitter(0.2), 0, 0);
      }
      const star = new THREE.Shape();
      for (let i = 0; i < 10; i++) { const r = i % 2 ? 0.006 : 0.014, t = i / 10 * 6.283; if (i) star.lineTo(Math.cos(t) * r, Math.sin(t) * r); else star.moveTo(r, 0); }
      const starGeo = new THREE.ShapeGeometry(star).rotateX(-Math.PI / 2);
      s.scatter(starGeo, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.4, emissive: '#ffe21f', emissiveIntensity: 0.3 }), Array.from({ length: 7 }, () => ({
        at: [jitter(0.19), FLOOR + 0.0015, jitter(0.12)] as [number, number, number], size: mix(0.8, 1.5, random()), color: pick(['#ffe21f', '#ff5aa8', '#6ad8ff']),
      })));
    } else if (a.visit === 'hiding') {
      const dark = s.material('#111014', { roughness: 0.2 });
      for (const side of [-1, 1]) {
        s.cylinder(0.027, 0.027, 0.004, [bx + side * 0.032, 0.02, bz + 0.1], dark, 18).rotation.x = Math.PI / 2 - 0.25;
        s.rod([bx + side * 0.058, 0.022, bz + 0.098], [bx + side * 0.062, 0.004, bz - 0.02], 0.002, dark);
      }
      s.rod([bx - 0.008, 0.026, bz + 0.1], [bx + 0.008, 0.026, bz + 0.1], 0.0025, dark);
      const cash = s.material('#7fa27a', { roughness: 0.9 });
      for (let i = 0; i < 4; i++) s.box([0.15, 0.0015, 0.065], [bx + jitter(0.01), 0.001 + i * 0.0016, bz + 0.17 + jitter(0.01)], cash).rotation.y = 0.3 + jitter(0.1);
      const photo = (dx: number, turn: number) => {
        const half = s.mesh(new THREE.PlaneGeometry(0.04, 0.075), new THREE.MeshStandardMaterial({ map: canvasTexture(64, 96, (ctx) => {
          ctx.fillStyle = '#f4efe2'; ctx.fillRect(0, 0, 64, 96); ctx.fillStyle = '#8a9aa6'; ctx.fillRect(5, 5, 54, 70);
          ctx.fillStyle = skin; ctx.beginPath(); ctx.ellipse(dx < 0 ? 58 : 6, 40, 22, 28, 0, 0, 6.3); ctx.fill();
          ctx.fillStyle = hair; ctx.beginPath(); ctx.ellipse(dx < 0 ? 58 : 6, 26, 25, 18, 0, Math.PI, 0); ctx.fill();
        }), roughness: 0.6 }), [0.06 + dx, FLOOR + 0.002, 0.11]);
        half.rotation.set(-Math.PI / 2, 0, turn);
      };
      photo(-0.03, 0.25); photo(0.03, -0.3);
    } else {
      const pearl = new THREE.MeshStandardMaterial({ color: '#f6f0e4', roughness: 0.25, metalness: 0.2 });
      s.scatter(new THREE.SphereGeometry(0.0045, 8, 6), pearl, Array.from({ length: 44 }, (_unused, i) => {
        const t = i / 44 * Math.PI * 2;
        return { at: [0.07 + Math.cos(t) * 0.055 * (1 + Math.sin(t * 3) * 0.15), FLOOR + 0.0045, 0.1 + Math.sin(t) * 0.03] as [number, number, number], size: 1 };
      }));
      const glove = s.material(pick(['#f6f2e6', '#17161a', '#b9a2c8']), { roughness: 0.9 });
      for (const side of [0, 1]) {
        const gx = bx + side * 0.03, gz = bz + 0.06 + side * 0.04, y = 0.012 + side * 0.014;
        s.ball([0.042, 0.012, 0.08], [gx, y, gz], glove, 10).rotation.y = 0.35 + side * 0.4;
        for (let f = 0; f < 4; f++) s.ball([0.009, 0.008, 0.04], [gx - 0.06 + f * 0.017, y, gz + 0.085 - f * 0.004], glove, 6).rotation.y = 0.35 + side * 0.4;
      }
      for (const side of [-1, 1]) s.ball([0.011, 0.007, 0.011], [-0.02 + side * 0.018, FLOOR + 0.006, 0.125], gold, 10);
    }

    return s.finish({ footprint: 0.34 });
  },
});
