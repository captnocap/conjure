import * as THREE from 'three';
import { type Placeable, choice, defineWorld, diorama, mix } from '@conjure/kit';

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

function paint(w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default defineWorld({
  questions: {
    kind: choice('What kind of repair bench is it?', {
      factory: 'A clean bright factory service bay: white laminate, labelled bins, everything in its outline.',
      midnight: 'A cluttered warm midnight workshop: scarred wood, a desk bulb, salvage everywhere.',
      alley: 'A back-alley fix-it stall in a near future: corrugated wall, a neon sign, crates and tarp.',
      lab: 'A university robotics lab: grey steel, hazard tape, a whiteboard of equations.',
    }),
    mat: choice('What colour is the anti-static mat?', {
      blue: 'Standard ESD blue.', green: 'Cutting-mat green with a white grid.', grey: 'Worn grey rubber.', red: 'Dark red, like a surgeon\'s cloth.',
    }),
    scope: choice('What is on the oscilloscope screen?', {
      sine: 'A steady sine wave.', pulse: 'A heartbeat-like pulse train.', flat: 'A flat line.', noise: 'Jagged noise.', smile: 'A Lissajous curve that happens to look like a smile.',
    }),
    wall: choice('What hangs on the pegboard?', {
      tools: 'Hand tools, each in its place.',
      parts: 'Spare parts: hands, a row of eyes, blank face plates.',
      salvage: 'Coils of cable and salvaged heads staring down from a ledge.',
      schematics: 'Pinned schematics and photographs of faces.',
    }),
    sign: choice('What does the sign on the wall say?', {
      bay: 'SERVICE BAY 4', faces: 'WE FIX FACES', warranty: 'NO WARRANTY', late: 'OPEN LATE', touch: 'DO NOT POWER ON', none: 'No sign at all.',
    }),
    left: choice('What was left on the bench?', {
      coffee: 'A mug of coffee and a takeaway noodle box.',
      screws: 'A tray of sorted screws and a dismantled hand.',
      eyes: 'A neat row of glass eyes on a strip of foam.',
      manual: 'An open service manual and a multimeter.',
      nothing: 'Nothing; cleared and wiped down.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const dim = a.kind === 'midnight' || a.kind === 'alley';
    const SLOTS: readonly (readonly [number, number])[] = [[-1.0, 1.0], [-5.0, -0.5], [2.4, -2.5], [6.2, 0.9], [-5.3, 2.5]];
    const HEIGHTS = [0.05, 0.55, 1.36, -0.5, 0];
    const background = { factory: '#e3e8ea', midnight: '#a39a92', alley: '#8f9a9c', lab: '#dde2dc' }[a.kind];
    const { art: s, world } = diorama(context, { background, floor: null, width: 14.8, depth: 7.8, maxHeight: 2.6, radius: 1.22, pitch: 30, yaw: 26, slots: SLOTS });
    const root = s.root;
    // Calm the stage lights for night-time kinds; accents and the ring lamp do the rest.
    root.traverse((node) => {
      const light = node as THREE.Light;
      if (!light.isLight) return;
      if (dim) light.intensity *= (light as THREE.HemisphereLight).isHemisphereLight ? 0.72 : 0.78;
    });
    const add = (geometry: THREE.BufferGeometry, material: THREE.Material, x = 0, y = 0, z = 0, parent: THREE.Object3D = root) => {
      const mesh = new THREE.Mesh(geometry, material); mesh.position.set(x, y, z); mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh;
    };
    const rod = (from: THREE.Vector3, to: THREE.Vector3, r: number, material: THREE.Material, parent: THREE.Object3D = root) => {
      const d = to.clone().sub(from); const mesh = add(new THREE.CylinderGeometry(r, r, Math.max(d.length(), 1e-4), 8), material, 0, 0, 0, parent);
      mesh.position.copy(from).addScaledVector(d, 0.5); mesh.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); return mesh;
    };
    const cable = (pts: THREE.Vector3[], r: number, material: THREE.Material) => add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), pts.length * 8, r, 6), material);
    const mat = (hex: string, o: THREE.MeshStandardMaterialParameters = {}) => s.material(hex, o);
    const glowing = (hex: string, intensity: number) => new THREE.MeshStandardMaterial({ color: hex, emissive: hex, emissiveIntensity: intensity });

    const bx = -1.3, benchW = 12, benchD = 7.6;
    const topHex = { factory: '#eceeed', midnight: '#8a6444', alley: '#77706a', lab: '#b9bfc2' }[a.kind];
    const wallHex = { factory: '#dfe5e7', midnight: '#8d7868', alley: '#6f8588', lab: '#cfd8d0' }[a.kind];
    const steel = mat('#9aa2a6', { metalness: 0.7, roughness: 0.35 });
    const dark = mat('#222528', { roughness: 0.6 });
    const benchTop = add(new THREE.BoxGeometry(benchW, 0.4, benchD), mat(topHex, { roughness: a.kind === 'factory' ? 0.35 : 0.75 }), bx, -0.2, 0);
    world.ground = benchTop;
    // Apron with drawers.
    add(new THREE.BoxGeometry(benchW - 0.3, 1.0, 0.25), mat(a.kind === 'midnight' ? '#6b4a33' : a.kind === 'alley' ? '#4d5a5c' : '#c3c9cc'), bx, -0.9, benchD / 2 - 0.25);
    for (let i = 0; i < 3; i++) {
      add(new THREE.BoxGeometry(3.4, 0.7, 0.08), mat(a.kind === 'midnight' ? '#7b583c' : a.kind === 'alley' ? '#5f6d6f' : '#dfe3e4'), bx - 3.9 + i * 3.9, -0.9, benchD / 2 - 0.1);
      add(new THREE.BoxGeometry(1.1, 0.1, 0.12), steel, bx - 3.9 + i * 3.9, -0.85, benchD / 2 - 0.02);
    }
    if (a.kind === 'lab' || a.kind === 'factory') {
      const tape = paint(256, 32, (c) => { for (let i = 0; i < 16; i++) { c.fillStyle = i % 2 ? '#1a1a1a' : '#f2c230'; c.beginPath(); c.moveTo(i * 32 - 16, 0); c.lineTo(i * 32 + 16, 0); c.lineTo(i * 32, 32); c.lineTo(i * 32 - 32, 32); c.fill(); } });
      tape.wrapS = THREE.RepeatWrapping; tape.repeat.x = 6;
      add(new THREE.BoxGeometry(benchW, 0.02, 0.22), new THREE.MeshStandardMaterial({ map: tape, roughness: 0.6 }), bx, 0.012, benchD / 2 - 0.12);
    }

    // Anti-static mat with a grid, a snap and a coiled wrist strap.
    const matHex = { blue: '#3f79b8', green: '#3f8a5c', grey: '#7c8286', red: '#8a3434' }[a.mat];
    const grid = paint(512, 256, (c) => {
      c.fillStyle = matHex; c.fillRect(0, 0, 512, 256);
      c.strokeStyle = a.mat === 'green' ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.16)'; c.lineWidth = 1;
      for (let x = 0; x <= 512; x += 32) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, 256); c.stroke(); }
      for (let y = 0; y <= 256; y += 32) { c.beginPath(); c.moveTo(0, y); c.lineTo(512, y); c.stroke(); }
      c.strokeStyle = 'rgba(0,0,0,0.25)'; c.lineWidth = 6; c.strokeRect(3, 3, 506, 250);
      for (let i = 0; i < mood.wear * 60; i++) { c.fillStyle = `rgba(30,25,20,${0.08 + random() * 0.15})`; c.beginPath(); c.arc(random() * 512, random() * 256, 3 + random() * 16, 0, 7); c.fill(); }
      for (let i = 0; i < mood.wear * 25; i++) { c.strokeStyle = 'rgba(255,255,255,0.3)'; c.lineWidth = 1; c.beginPath(); const x = random() * 512, y = random() * 256; c.moveTo(x, y); c.lineTo(x + (random() - 0.5) * 80, y + (random() - 0.5) * 80); c.stroke(); }
    });
    add(new THREE.BoxGeometry(6.8, 0.05, 3.9), new THREE.MeshStandardMaterial({ map: grid, roughness: 0.85 }), bx + 0.3, 0.025, 1.1);
    add(new THREE.CylinderGeometry(0.1, 0.1, 0.05, 12), steel, bx + 3.45, 0.07, 2.8);
    const coil: THREE.Vector3[] = [];
    for (let i = 0; i <= 70; i++) { const t = i / 70; coil.push(V(bx + 3.45 + t * 1.6 + Math.sin(i * 0.9) * 0.07, 0.12 + Math.cos(i * 0.9) * 0.05 + (t > 0.9 ? 0 : 0.02), 2.8 + Math.sin(t * 3) * 0.5)); }
    cable(coil, 0.022, mat(a.mat === 'blue' ? '#2b2e33' : '#2c4f8a'));
    add(new THREE.TorusGeometry(0.2, 0.04, 6, 18), mat('#2c4f8a'), bx + 5.15, 0.06, 2.95).rotation.x = Math.PI / 2;

    // Back wall with pegboard.
    const wallZ = -benchD / 2 - 0.2, wallH = 6.2;
    if (a.kind === 'alley') {
      const corr = paint(256, 64, (c) => { for (let x = 0; x < 256; x++) { const v = 0.5 + 0.5 * Math.sin(x / 256 * Math.PI * 2 * 16); c.fillStyle = `rgb(${90 + v * 50},${112 + v * 50},${116 + v * 50})`; c.fillRect(x, 0, 1, 64); } for (let i = 0; i < 40 * mood.wear + 6; i++) { c.fillStyle = 'rgba(120,70,40,0.35)'; c.fillRect(random() * 256, random() * 64, 2 + random() * 6, 6 + random() * 30); } });
      corr.wrapS = THREE.RepeatWrapping; corr.repeat.x = 2;
      add(new THREE.BoxGeometry(14.8, wallH, 0.25), new THREE.MeshStandardMaterial({ map: corr, roughness: 0.7, metalness: 0.2 }), 0, wallH / 2 - 1.3, wallZ);
    } else add(new THREE.BoxGeometry(14.8, wallH, 0.25), mat(wallHex, { roughness: 0.9 }), 0, wallH / 2 - 1.3, wallZ);
    const pegW = 8.4, pegH = 2.7, pegY = 3.25, pegX = bx + 0.2, pegZ = wallZ + 0.19;
    const holes = paint(512, 192, (c) => {
      c.fillStyle = { factory: '#f3f1e8', midnight: '#a88a62', alley: '#3d4a4c', lab: '#e8e2cc' }[a.kind]; c.fillRect(0, 0, 512, 192);
      c.fillStyle = 'rgba(0,0,0,0.38)'; for (let x = 8; x < 512; x += 16) for (let y = 8; y < 192; y += 16) { c.beginPath(); c.arc(x, y, 2, 0, 7); c.fill(); }
    });
    add(new THREE.BoxGeometry(pegW, pegH, 0.1), new THREE.MeshStandardMaterial({ map: holes, roughness: 0.85 }), pegX, pegY, pegZ);
    for (const y of [-1, 1]) add(new THREE.BoxGeometry(pegW + 0.2, 0.12, 0.16), steel, pegX, pegY + y * (pegH / 2 + 0.05), pegZ);
    const hang = (i: number, n: number) => V(pegX - pegW / 2 + 0.7 + i * (pegW - 1.4) / Math.max(1, n - 1), pegY + 0.7, pegZ + 0.12);
    const eyeGlows: THREE.MeshStandardMaterial[] = [];
    if (a.wall === 'tools') {
      const handles = ['#d8402c', '#f2c230', '#2f5fa8', '#3f8a5c', '#e8862c'];
      for (let i = 0; i < 10; i++) {
        const p = hang(i, 10); const kindT = i % 5; const h = mat(handles[i % 5]);
        add(new THREE.CylinderGeometry(0.03, 0.03, 0.14, 6), steel, p.x, p.y + 0.12, p.z).rotation.x = Math.PI / 2;
        if (kindT === 0 || kindT === 3) { add(new THREE.CylinderGeometry(0.09, 0.07, 0.6, 10), h, p.x, p.y - 0.25, p.z); rod(V(p.x, p.y - 0.55, p.z), V(p.x, p.y - 1.45 - random() * 0.4, p.z), 0.028, steel); }
        else if (kindT === 1) { for (const side of [-1, 1]) { rod(V(p.x + side * 0.14, p.y - 0.75, p.z), V(p.x - side * 0.03, p.y, p.z), 0.045, h); rod(V(p.x - side * 0.02, p.y, p.z), V(p.x - side * 0.07, p.y + 0.45 - 0.5, p.z + 0.0), 0.03, steel); } add(new THREE.BoxGeometry(0.16, 0.5, 0.05), steel, p.x, p.y - 1.0 + 1.1, p.z).scale.set(1, 0.6, 1); }
        else if (kindT === 2) { rod(V(p.x, p.y, p.z), V(p.x, p.y - 1.2, p.z), 0.05, steel); add(new THREE.TorusGeometry(0.14, 0.05, 6, 14, Math.PI * 1.5), steel, p.x, p.y - 1.33, p.z).rotation.z = Math.PI * 0.75; }
        else { add(new THREE.TorusGeometry(0.33, 0.1, 8, 20), mat(handles[(i + 2) % 5]), p.x, p.y - 0.45, p.z + 0.02); }
      }
    } else if (a.wall === 'parts') {
      const shell = mat('#ece9e1', { roughness: 0.35 });
      for (let i = 0; i < 3; i++) {
        const p = hang(i, 8);
        const mask = add(new THREE.SphereGeometry(1, 16, 12), shell, p.x + 0.2, p.y - 0.55, p.z); mask.scale.set(0.42, 0.6, 0.16);
        for (const side of [-1, 1]) add(new THREE.SphereGeometry(0.08, 8, 6), dark, p.x + 0.2 + side * 0.16, p.y - 0.45, p.z + 0.13).scale.set(1.3, 0.7, 0.5);
        add(new THREE.BoxGeometry(0.16, 0.025, 0.03), dark, p.x + 0.2, p.y - 0.85, p.z + 0.11);
      }
      for (let i = 0; i < 2; i++) {
        const p = hang(3 + i, 8); const hx = p.x + 0.55;
        add(new THREE.BoxGeometry(0.42, 0.5, 0.12), steel, hx, p.y - 0.75, p.z);
        for (let f = 0; f < 4; f++) rod(V(hx - 0.16 + f * 0.105, p.y - 0.5, p.z), V(hx - 0.2 + f * 0.13, p.y + 0.05 - Math.abs(f - 1.5) * 0.08, p.z + 0.03), 0.04, steel);
        rod(V(hx + 0.2, p.y - 0.85, p.z), V(hx + 0.42, p.y - 0.55, p.z + 0.03), 0.04, steel);
        add(new THREE.CylinderGeometry(0.14, 0.17, 0.3, 10), dark, hx, p.y - 1.12, p.z);
      }
      add(new THREE.BoxGeometry(2.3, 0.08, 0.2), steel, pegX + 2.8, pegY - 0.25, pegZ + 0.14);
      for (let i = 0; i < 6; i++) {
        const ex = pegX + 1.85 + i * 0.38;
        add(new THREE.SphereGeometry(0.15, 12, 10), mat('#f4f2ea', { roughness: 0.2 }), ex, pegY - 0.06, pegZ + 0.16);
        const g = glowing(['#35b0ff', '#7a4a22', '#3f9a5c', '#ffae2a', '#b06bff', '#ff3524'][i], 0.5); eyeGlows.push(g);
        add(new THREE.SphereGeometry(0.075, 10, 8), g, ex, pegY - 0.06, pegZ + 0.275).scale.z = 0.4;
      }
    } else if (a.wall === 'salvage') {
      const cols = ['#222528', '#d8402c', '#f2c230', '#2f5fa8', '#e8e2d4'];
      for (let i = 0; i < 5; i++) { const p = hang(i, 9); const coilT = add(new THREE.TorusGeometry(0.34 + random() * 0.12, 0.07 + random() * 0.04, 6, 20), mat(cols[i]), p.x, p.y - 0.5, p.z + 0.03); coilT.scale.y = 1.25; rod(V(p.x + 0.2, p.y - 0.95, p.z + 0.03), V(p.x + 0.25 + random() * 0.2, p.y - 1.5 - random() * 0.5, p.z + 0.05), 0.03, mat(cols[i])); }
      add(new THREE.BoxGeometry(3.4, 0.1, 0.75), mat(a.kind === 'midnight' ? '#6b4a33' : '#8a9094'), pegX + 2.45, pegY - 0.5, pegZ + 0.4);
      for (let i = 0; i < 3; i++) {
        const hx = pegX + 1.4 + i * 1.05, hy = pegY - 0.02;
        const head = add(new THREE.SphereGeometry(1, 16, 12), mat(['#b9bfc2', '#d9cdb8', '#6d7478'][i], { metalness: i === 1 ? 0 : 0.4, roughness: 0.5 }), hx, hy, pegZ + 0.42); head.scale.set(0.34, 0.43, 0.38); head.rotation.set(0, (random() - 0.3) * 0.7, (random() - 0.5) * 0.3);
        add(new THREE.CylinderGeometry(0.14, 0.17, 0.2, 10), dark, hx, hy - 0.42, pegZ + 0.4);
        const g = glowing(i === 1 ? '#ff3524' : '#35e0ff', 1.2); eyeGlows.push(g);
        for (const side of [-1, 1]) if (!(i === 2 && side === 1)) add(new THREE.SphereGeometry(0.055, 8, 6), g, hx + side * 0.13 + 0.05, hy + 0.04, pegZ + 0.75);
      }
    } else {
      for (let i = 0; i < 6; i++) {
        const blue = i % 3 !== 2;
        const sheet = paint(128, 160, (c) => {
          c.fillStyle = blue ? '#2b5c9a' : '#efe9d8'; c.fillRect(0, 0, 128, 160); c.strokeStyle = blue ? '#dfeaff' : '#2a2622'; c.lineWidth = 2;
          if (blue) { c.beginPath(); c.ellipse(64, 70, 34, 46, 0, 0, 7); c.stroke(); c.beginPath(); c.arc(50, 62, 8, 0, 7); c.arc(78, 62, 8, 0, 7); c.stroke(); c.beginPath(); c.moveTo(64, 24); c.lineTo(64, 116); c.moveTo(30, 62); c.lineTo(98, 62); c.stroke(); for (let k = 0; k < 5; k++) { c.beginPath(); c.moveTo(100, 30 + k * 18); c.lineTo(122, 26 + k * 18); c.stroke(); } c.strokeRect(8, 130, 112, 22); }
          else { c.fillStyle = '#8a7f78'; c.fillRect(14, 14, 100, 110); c.fillStyle = '#d9a27c'; c.beginPath(); c.ellipse(64, 66, 28, 36, 0, 0, 7); c.fill(); c.fillStyle = '#2a2622'; c.beginPath(); c.arc(54, 60, 3, 0, 7); c.arc(74, 60, 3, 0, 7); c.fill(); c.fillRect(54, 82, 20, 2); }
        });
        const p = hang(i, 6);
        const paper = add(new THREE.PlaneGeometry(1.05, 1.3), new THREE.MeshStandardMaterial({ map: sheet, roughness: 0.8 }), p.x, p.y - 0.55 + (random() - 0.5) * 0.4, p.z + 0.02 + i * 0.002); paper.rotation.z = (random() - 0.5) * 0.25;
        add(new THREE.SphereGeometry(0.05, 8, 6), mat('#d8402c'), paper.position.x, paper.position.y + 0.58, p.z + 0.05);
      }
    }
    // Sign.
    const signText = { bay: 'SERVICE BAY 4', faces: 'WE FIX FACES', warranty: 'NO WARRANTY', late: 'OPEN LATE', touch: 'DO NOT POWER ON', none: '' }[a.sign];
    let neon: THREE.MeshStandardMaterial | null = null;
    if (signText) {
      const sx = pegX + pegW / 2 + 1.95, sy = 3.75;
      if (dim) {
        const neonHex = mood.warmth > 0.5 ? '#ff5a7a' : '#4ae0ff';
        const tex = paint(512, 128, (c) => { c.fillStyle = '#15171a'; c.fillRect(0, 0, 512, 128); c.strokeStyle = neonHex; c.lineWidth = 5; c.strokeRect(10, 10, 492, 108); c.fillStyle = '#ffffff'; c.font = 'bold 58px monospace'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(signText, 256, 66, 460); });
        neon = new THREE.MeshStandardMaterial({ map: tex, emissive: neonHex, emissiveMap: tex, emissiveIntensity: 1.6, roughness: 0.5 });
        add(new THREE.BoxGeometry(3.3, 0.85, 0.12), neon, sx, sy, wallZ + 0.2);
      } else {
        const sign = s.label(signText, 3.3, 0.75, [sx, sy, wallZ + 0.15], a.kind === 'lab' ? '#f4efe0' : '#22303a', a.kind === 'lab' ? '#b3202a' : '#f2c230');
        sign.castShadow = false;
      }
    }
    if (a.kind === 'lab') {
      const wb = paint(256, 128, (c) => { c.fillStyle = '#fbfbf8'; c.fillRect(0, 0, 256, 128); c.strokeStyle = '#2456a8'; c.lineWidth = 2; for (let i = 0; i < 6; i++) { c.beginPath(); let x = 14, y = 16 + i * 18; c.moveTo(x, y); while (x < 120 + random() * 110) { x += 6 + random() * 10; c.lineTo(x, y + (random() - 0.5) * 9); } c.stroke(); } c.strokeStyle = '#c8281e'; c.beginPath(); c.ellipse(200, 60, 26, 34, 0, 0, 7); c.stroke(); c.beginPath(); c.arc(190, 52, 5, 0, 7); c.arc(210, 52, 5, 0, 7); c.stroke(); });
      add(new THREE.BoxGeometry(3.3, 1.7, 0.08), new THREE.MeshStandardMaterial({ map: wb, roughness: 0.3 }), -6.2, 1.6, wallZ + 0.17).scale.set(0.6, 0.9, 1);
    }

    // Riser shelf at the back right, with bins beneath; slot 2 stands on it.
    const [rx, rz] = SLOTS[2];
    const shelfM = mat(a.kind === 'midnight' ? '#7b583c' : a.kind === 'alley' ? '#5d6466' : '#d5d9da');
    add(new THREE.BoxGeometry(4.3, 0.12, 1.9), shelfM, rx, 1.3, rz);
    for (const side of [-1, 1]) add(new THREE.BoxGeometry(0.12, 1.3, 1.9), shelfM, rx + side * 2.09, 0.65, rz);
    const binCols = mood.cheer > 0.5 ? ['#d8402c', '#f2c230', '#2f7fc8', '#3f9a5c'] : ['#8a3a30', '#b9983a', '#3a5f8a', '#4a6b52'];
    const bits: { at: readonly [number, number, number]; size: number; color?: THREE.ColorRepresentation }[] = [];
    for (let i = 0; i < 5; i++) {
      const x = rx - 1.6 + i * 0.8, c = binCols[(i + Math.floor(random() * 4)) % 4];
      const bin = add(new THREE.BoxGeometry(0.72, 0.5, 1.1), mat(c), x, 0.25, rz + 0.3);
      add(new THREE.BoxGeometry(0.6, 0.06, 0.95), dark, x, 0.5, rz + 0.3); void bin;
      add(new THREE.BoxGeometry(0.4, 0.16, 0.02), mat('#f4efe0'), x, 0.3, rz + 0.86);
      for (let k = 0; k < 5 + mood.density * 8; k++) bits.push({ at: [x + (random() - 0.5) * 0.5, 0.54 + random() * 0.05, rz + 0.3 + (random() - 0.5) * 0.8], size: 0.035 + random() * 0.04, color: ['#c9a04a', '#aab0b4', '#d8d2c4', '#3a3d42'][Math.floor(random() * 4)] });
    }
    // Wall bin rack on the left.
    for (let r = 0; r < 2; r++) for (let i = 0; i < 3; i++) {
      const b = add(new THREE.BoxGeometry(0.62, 0.42, 0.55), mat(binCols[(i + r) % 4]), -7.0 + i * 0.62, 3.0 + r * 0.56, wallZ + 0.4); b.rotation.x = 0.25;
    }

    // Oscilloscope.
    const scopeHex = mood.warmth > 0.66 ? '#ffb040' : mood.warmth < 0.33 ? '#45e6ff' : '#58f08a';
    const trace = paint(256, 160, (c) => {
      c.fillStyle = '#06110c'; c.fillRect(0, 0, 256, 160);
      c.strokeStyle = 'rgba(255,255,255,0.14)'; c.lineWidth = 1; for (let x = 0; x <= 256; x += 32) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, 160); c.stroke(); } for (let y = 0; y <= 160; y += 32) { c.beginPath(); c.moveTo(0, y); c.lineTo(256, y); c.stroke(); }
      c.strokeStyle = scopeHex; c.lineWidth = 4; c.shadowColor = scopeHex; c.shadowBlur = 8; c.beginPath();
      if (a.scope === 'smile') { for (let i = 0; i <= 60; i++) { const t = i / 60 * Math.PI; c.lineTo(128 - Math.cos(t) * 70, 70 + Math.sin(t) * 50); } c.stroke(); c.beginPath(); c.arc(92, 50, 7, 0, 7); c.stroke(); c.beginPath(); c.arc(164, 50, 7, 0, 7); }
      else for (let x = 0; x <= 256; x += 2) {
        const p = x / 256 * Math.PI * 2 * 4;
        const y = a.scope === 'sine' ? Math.sin(p) * 48 : a.scope === 'flat' ? 0 : a.scope === 'noise' ? (random() - 0.5) * 110 : (() => { const u = (x % 64) / 64; return u < 0.1 ? -u * 500 : u < 0.2 ? -50 + (u - 0.1) * 1100 : u < 0.3 ? 60 - (u - 0.2) * 600 : 0; })();
        c.lineTo(x, 80 - y);
      }
      c.stroke();
    });
    trace.wrapS = THREE.RepeatWrapping;
    const scope = new THREE.Group(); scope.position.set(bx - 1.5, 0, -2.55); scope.rotation.y = 0.2; root.add(scope);
    add(new THREE.BoxGeometry(2.2, 1.4, 1.3), mat(a.kind === 'midnight' || a.kind === 'alley' ? '#b9ad8e' : '#d9dcdc'), 0, 0.75, 0, scope);
    for (const x of [-1, 1]) add(new THREE.BoxGeometry(0.12, 0.1, 1.2), dark, x * 0.9, 0.05, 0, scope);
    const screenM = new THREE.MeshStandardMaterial({ map: trace, emissive: '#ffffff', emissiveMap: trace, emissiveIntensity: mix(0.9, 1.9, mood.energy), roughness: 0.3 });
    add(new THREE.PlaneGeometry(1.25, 0.95), screenM, -0.33, 0.82, 0.656, scope);
    add(new THREE.BoxGeometry(1.4, 1.1, 0.04), dark, -0.33, 0.82, 0.64, scope);
    for (let i = 0; i < 6; i++) { const k = add(new THREE.CylinderGeometry(0.085, 0.085, 0.1, 12), i % 3 ? dark : mat('#d8402c'), 0.62 + (i % 2) * 0.3, 1.2 - Math.floor(i / 2) * 0.35, 0.68, scope); k.rotation.x = Math.PI / 2; }
    add(new THREE.CylinderGeometry(0.05, 0.05, 0.1, 8), steel, 0.62, 0.22, 0.68, scope).rotation.x = Math.PI / 2;
    cable([V(bx - 0.85, 0.22, -1.85), V(bx - 0.6, 0.1, -1.2), V(bx - 1.6, 0.09, -0.4), V(bx - 2.6, 0.09, 0.3), V(bx - 2.3, 0.09, 0.9)], 0.03, dark);
    rod(V(bx - 2.3, 0.09, 0.9), V(bx - 1.95, 0.12, 1.25), 0.05, mat('#d8402c'));

    // Magnifier ring lamp over the hero slot.
    const [hx, hz] = SLOTS[0];
    const clampAt = V(bx + 3.9, 0, -3.2), elbow = V(bx + 3.4, 2.5, -2.4), ringAt = V(hx + 0.35, 3.75, hz - 0.2);
    add(new THREE.BoxGeometry(0.4, 0.5, 0.4), dark, clampAt.x, 0.2, clampAt.z);
    const armM = a.kind === 'midnight' ? mat('#3a3d42') : mat('#eef0ee', { roughness: 0.35 });
    rod(clampAt.clone().setY(0.4), elbow, 0.07, armM); rod(clampAt.clone().setY(0.4).add(V(0.12, 0, 0)), elbow.clone().add(V(0.12, 0, 0)), 0.03, steel);
    add(new THREE.SphereGeometry(0.14, 10, 8), dark, elbow.x, elbow.y, elbow.z);
    const neck = ringAt.clone().add(V(1.1, 0.15, -0.75));
    rod(elbow, neck, 0.07, armM); add(new THREE.SphereGeometry(0.13, 10, 8), dark, neck.x, neck.y, neck.z);
    const lamp = new THREE.Group(); lamp.position.copy(ringAt); lamp.rotation.set(Math.PI / 2 - 0.3, 0, 0.25); root.add(lamp);
    add(new THREE.TorusGeometry(0.95, 0.17, 10, 40), armM, 0, 0, 0, lamp);
    const coolHex = mood.warmth > 0.75 ? '#fff1d6' : '#dff3ff';
    const ringGlow = glowing(coolHex, mix(1.4, 2.8, mood.energy));
    add(new THREE.TorusGeometry(0.93, 0.085, 8, 40), ringGlow, 0, 0, 0.11, lamp);
    add(new THREE.CircleGeometry(0.78, 32), new THREE.MeshPhysicalMaterial({ color: '#e8f6ff', transparent: true, opacity: 0.16, roughness: 0.02, depthWrite: false, side: THREE.DoubleSide }), 0, 0, 0, lamp).castShadow = false;
    rod(V(0.95, 0, 0), V(1.35, 0, -0.35), 0.06, armM, lamp);
    const pool = new THREE.PointLight(coolHex, dim ? 60 : 26, 14, 2);
    pool.position.copy(ringAt).add(V(0, -0.2, 0.2)); root.add(pool);
    if (a.kind === 'midnight') {
      // A warm desk bulb at the left for the second pool of light.
      const bulbAt = V(-6.4, 2.5, -1.8);
      rod(V(-6.9, 0, -2.9), V(-6.9, 2.3, -2.6), 0.05, steel); rod(V(-6.9, 2.3, -2.6), bulbAt.clone().add(V(-0.1, 0.2, -0.1)), 0.05, steel);
      const shade = add(new THREE.ConeGeometry(0.5, 0.55, 16, 1, true), mat('#3f6a4a', { side: THREE.DoubleSide }), bulbAt.x, bulbAt.y + 0.1, bulbAt.z); shade.rotation.set(0.5, 0, -0.5);
      add(new THREE.SphereGeometry(0.16, 10, 8), glowing('#ffd9a0', 2.4), bulbAt.x + 0.06, bulbAt.y - 0.05, bulbAt.z + 0.06);
      const warm = new THREE.PointLight('#ffc070', 40, 12, 2); warm.position.copy(bulbAt).add(V(0.2, -0.2, 0.3)); root.add(warm);
    }

    // Head stand (slot 1): a little turntable.
    const [tx, tz] = SLOTS[1];
    add(new THREE.CylinderGeometry(1.25, 1.35, 0.14, 32), dark, tx, 0.07, tz);
    add(new THREE.CylinderGeometry(0.3, 0.4, 0.3, 16), steel, tx, 0.28, tz);
    add(new THREE.CylinderGeometry(1.22, 1.22, 0.12, 32), mat(a.kind === 'midnight' ? '#7b583c' : '#c9ced0'), tx, 0.49, tz);
    for (let i = 0; i < 12; i++) { const t = i / 12 * 6.283; add(new THREE.BoxGeometry(0.05, 0.13, 0.12), steel, tx + Math.cos(t) * 1.2, 0.49, tz + Math.sin(t) * 1.2).rotation.y = -t; }

    // Rolling cart (slot 3) beside the bench, a little lower.
    const [cx, cz] = SLOTS[3];
    const cartM = mat(a.kind === 'alley' ? '#a8452c' : a.kind === 'midnight' ? '#b0302a' : '#3f79b8', { metalness: 0.3, roughness: 0.5 });
    for (const y of [-0.56, -1.4]) {
      add(new THREE.BoxGeometry(2.5, 0.1, 3.5), cartM, cx, y, cz);
      for (const side of [-1, 1]) { add(new THREE.BoxGeometry(0.06, 0.22, 3.5), cartM, cx + side * 1.22, y + 0.12, cz); add(new THREE.BoxGeometry(2.5, 0.22, 0.06), cartM, cx, y + 0.12, cz + side * 1.72); }
    }
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) rod(V(cx + sx * 1.2, -1.7, cz + sz * 1.7), V(cx + sx * 1.2, -0.3, cz + sz * 1.7), 0.06, steel);
    rod(V(cx - 1.2, -0.1, cz + 1.75), V(cx + 1.2, -0.1, cz + 1.75), 0.05, steel);
    for (const sx of [-1, 1]) rod(V(cx + sx * 1.2, -0.3, cz + 1.7), V(cx + sx * 1.2, -0.1, cz + 1.75), 0.05, steel);
    add(new THREE.BoxGeometry(1.3, 0.6, 1.0), mat('#b89a6c'), cx - 0.3, -1.1, cz + 0.8).rotation.y = 0.2;
    add(new THREE.BoxGeometry(0.9, 0.4, 1.2), dark, cx + 0.4, -1.15, cz - 0.7);

    // Cable looms along the back of the bench and down from the pegboard.
    const loomCols = ['#d8402c', '#f2c230', '#2f5fa8', '#e8e2d4', '#222528', '#3f9a5c'];
    const looms = 3 + Math.round(mood.density * 4);
    for (let i = 0; i < looms; i++) {
      const y = 0.06 + (i % 3) * 0.05, z0 = -3.3 + (i % 2) * 0.16;
      cable([V(bx - 5.6, y, z0), V(bx - 3.9, y + 0.06, z0 + 0.25 + random() * 0.3), V(bx - 2.9, y, z0 + 0.5), V(bx - 0.1, y + 0.05, z0 + 0.1 + random() * 0.3), V(bx + 0.9, y, z0 + 0.45), V(bx + 1.6, y, z0 + 0.2)], 0.035, mat(loomCols[i % 6]));
    }
    for (const x of [bx - 4.5, bx - 0.1]) add(new THREE.BoxGeometry(0.1, 0.22, 0.6), dark, x, 0.1, -3.05);
    if (mood.density > 0.4 || a.kind === 'alley') for (let i = 0; i < 3; i++) { const x0 = pegX - pegW / 2 + 0.2 + i * 0.12; cable([V(x0, pegY - pegH / 2, pegZ + 0.1), V(x0 - 0.2, 1.4, pegZ + 0.3), V(x0 + 0.1 + i * 0.2, 0.4, -3.0), V(x0 + 0.5 + i * 0.3, 0.07, -2.4 + i * 0.2)], 0.03, mat(loomCols[(i + 3) % 6])); }

    // Soldering station at the front right of the bench.
    const sx0 = bx + 4.7, sz0 = 1.9;
    add(new THREE.BoxGeometry(0.9, 0.5, 0.8), mat(a.kind === 'factory' ? '#2f5fa8' : '#3a3d42'), sx0, 0.25, sz0);
    const led = glowing('#ff5a2a', 1.6); add(new THREE.BoxGeometry(0.4, 0.14, 0.02), led, sx0 - 0.1, 0.32, sz0 + 0.41);
    add(new THREE.CylinderGeometry(0.2, 0.25, 0.08, 14), dark, sx0 + 0.3, 0.04, sz0 + 1.0);
    const spring: THREE.Vector3[] = []; for (let i = 0; i <= 50; i++) spring.push(V(sx0 + 0.3 + Math.cos(i * 0.9) * 0.1, 0.1 + i * 0.012, sz0 + 1.0 - i * 0.008 + Math.sin(i * 0.9) * 0.1));
    cable(spring, 0.015, steel);
    rod(V(sx0 + 0.3, 0.15, sz0 + 0.98), V(sx0 + 0.3, 1.05, sz0 + 0.45), 0.04, mat('#f2c230')); rod(V(sx0 + 0.3, 0.08, sz0 + 1.02), V(sx0 + 0.3, 0.2, sz0 + 0.95), 0.015, steel);
    cable([V(sx0 + 0.3, 1.05, sz0 + 0.45), V(sx0 + 0.6, 0.9, sz0 - 0.2), V(sx0 + 0.55, 0.3, sz0 - 0.5), V(sx0 + 0.2, 0.3, sz0 - 0.42)], 0.025, dark);
    add(new THREE.BoxGeometry(0.4, 0.06, 0.3), mat('#e8c84a'), sx0 - 0.5, 0.03, sz0 + 1.0);

    // Whatever was left on the bench, at the front of the mat.
    const lx = bx + 2.2, lz = 2.55;
    let steam: THREE.Mesh | null = null;
    if (a.left === 'coffee') {
      add(new THREE.CylinderGeometry(0.2, 0.17, 0.42, 16), mat(mood.cheer > 0.5 ? '#f2c230' : '#e8e2d4', { roughness: 0.3 }), lx, 0.26, lz);
      add(new THREE.CylinderGeometry(0.17, 0.17, 0.02, 16), mat('#2a1a10', { roughness: 0.2 }), lx, 0.45, lz);
      add(new THREE.TorusGeometry(0.12, 0.03, 6, 14), mat('#e8e2d4'), lx + 0.22, 0.26, lz);
      steam = add(new THREE.ConeGeometry(0.09, 0.5, 8, 1, true), new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.16, depthWrite: false }), lx, 0.78, lz); steam.castShadow = false;
      const box = add(new THREE.BoxGeometry(0.42, 0.5, 0.42), mat('#f4efe0'), lx + 0.8, 0.3, lz + 0.1); box.rotation.y = 0.5;
      for (let i = 0; i < 2; i++) rod(V(lx + 0.75 + i * 0.06, 0.4, lz + 0.1), V(lx + 1.15 + i * 0.05, 0.95, lz - 0.1), 0.014, mat('#c9a56a'));
      add(new THREE.BoxGeometry(0.3, 0.02, 0.2), mat('#d8402c'), lx + 0.8, 0.3, lz + 0.325).rotation.y = 0.5;
    } else if (a.left === 'screws') {
      add(new THREE.BoxGeometry(1.2, 0.06, 0.8), dark, lx + 0.2, 0.08, lz);
      for (let i = 0; i < 3; i++) add(new THREE.BoxGeometry(0.03, 0.1, 0.8), dark, lx - 0.2 + i * 0.4, 0.1, lz);
      for (let k = 0; k < 46; k++) bits.push({ at: [lx - 0.3 + random() * 1.0, 0.13, lz - 0.32 + random() * 0.64], size: 0.022 + random() * 0.016, color: ['#c9a04a', '#aab0b4', '#3a3d42'][Math.floor(random() * 3)] });
      const hx2 = lx - 1.2, hz2 = lz + 0.1;
      add(new THREE.BoxGeometry(0.42, 0.1, 0.5), steel, hx2, 0.1, hz2);
      for (let f = 0; f < 4; f++) { rod(V(hx2 - 0.16 + f * 0.105, 0.1, hz2 - 0.25), V(hx2 - 0.2 + f * 0.13, 0.1, hz2 - 0.6), 0.04, steel); if (f !== 1) rod(V(hx2 - 0.2 + f * 0.13, 0.1, hz2 - 0.62), V(hx2 - 0.22 + f * 0.14, 0.1, hz2 - 0.85), 0.035, steel); }
      rod(V(hx2 + 0.1, 0.08, hz2 - 0.9), V(hx2 + 0.2, 0.08, hz2 - 1.15), 0.035, steel);
    } else if (a.left === 'eyes') {
      add(new THREE.BoxGeometry(2.3, 0.14, 0.5), mat('#2a2c30', { roughness: 0.95 }), lx, 0.12, lz);
      for (let i = 0; i < 6; i++) {
        add(new THREE.SphereGeometry(0.16, 14, 10), mat('#f6f4ee', { roughness: 0.15 }), lx - 0.9 + i * 0.36, 0.3, lz);
        const g = glowing(['#35b0ff', '#7a4a22', '#3f9a5c', '#ffae2a', '#b06bff', '#8a8f96'][i], 0.4); eyeGlows.push(g);
        const iris = add(new THREE.SphereGeometry(0.08, 10, 8), g, lx - 0.9 + i * 0.36 + 0.04, 0.36, lz + 0.12); iris.scale.z = 0.45;
      }
    } else if (a.left === 'manual') {
      const page = paint(256, 160, (c) => { c.fillStyle = '#f4f1e6'; c.fillRect(0, 0, 256, 160); c.strokeStyle = '#3a3a3a'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(128, 0); c.lineTo(128, 160); c.stroke(); for (let i = 0; i < 10; i++) { c.beginPath(); c.moveTo(14, 20 + i * 13); c.lineTo(50 + random() * 60, 20 + i * 13); c.stroke(); } c.beginPath(); c.ellipse(192, 70, 34, 46, 0, 0, 7); c.stroke(); c.beginPath(); c.arc(180, 60, 7, 0, 7); c.arc(204, 60, 7, 0, 7); c.stroke(); c.strokeStyle = '#c8281e'; for (let k = 0; k < 4; k++) { c.beginPath(); c.moveTo(210, 40 + k * 20); c.lineTo(244, 30 + k * 22); c.stroke(); } });
      const book = add(new THREE.BoxGeometry(1.5, 0.08, 1.0), new THREE.MeshStandardMaterial({ map: page, roughness: 0.8 }), lx, 0.09, lz); book.rotation.y = -0.15;
      add(new THREE.BoxGeometry(0.42, 0.14, 0.75), mat('#e8a020'), lx - 1.3, 0.12, lz).rotation.y = 0.3;
      add(new THREE.BoxGeometry(0.28, 0.02, 0.22), glowing('#b8d8a0', 0.5), lx - 1.33, 0.2, lz - 0.15).rotation.y = 0.3;
      cable([V(lx - 1.25, 0.1, lz + 0.35), V(lx - 1.0, 0.08, lz + 0.8), V(lx - 0.3, 0.08, lz + 0.9)], 0.018, mat('#d8402c'));
    }
    // Loose parts scattered with density; stains with wear.
    const loose = Math.round(mood.density * 40);
    for (let k = 0; k < loose; k++) bits.push({ at: [bx - 5.5 + random() * 10.5, 0.03, -2.0 + random() * 5.2], size: 0.02 + random() * 0.03, color: ['#c9a04a', '#aab0b4', '#3a3d42', '#d8402c'][Math.floor(random() * 4)] });
    if (bits.length) s.scatter(new THREE.CylinderGeometry(1, 1, 1.2, 6), new THREE.MeshStandardMaterial({ color: '#ffffff', metalness: 0.5, roughness: 0.4 }), bits);
    for (let i = 0; i < mood.wear * 9; i++) { const st = add(new THREE.CircleGeometry(0.2 + random() * 0.35, 14), new THREE.MeshStandardMaterial({ color: '#2a2018', transparent: true, opacity: 0.18, depthWrite: false }), bx - 5.4 + random() * 10.6, 0.004, -3 + random() * 6.5); st.rotation.x = -Math.PI / 2; st.castShadow = false; }
    if (a.kind === 'alley') {
      const crate = mat('#8a6a44');
      add(new THREE.BoxGeometry(1.2, 1.0, 1.1), crate, -6.6, 0.5, -3.0); add(new THREE.BoxGeometry(0.9, 0.7, 0.8), crate, -6.6, 1.35, -3.05).rotation.y = 0.3;
      const tarp = add(new THREE.BoxGeometry(14.8, 0.08, 1.5), mat('#3a6f9a', { side: THREE.DoubleSide }), 0, 4.95, wallZ + 0.8); tarp.rotation.x = 0.3;
    }

    // Raise the supporting cast onto the stand, shelf and cart after the stage has framed them.
    const basePlace = world.place.bind(world);
    world.place = (items: readonly Placeable[]) => {
      basePlace(items);
      items.forEach((item, index) => { item.holder.position.y += HEIGHTS[index % HEIGHTS.length]; item.holder.updateMatrixWorld(true); });
    };
    const flick = mood.wear > 0.6 || a.kind === 'alley';
    const ringBase = ringGlow.emissiveIntensity, poolBase = pool.intensity;
    world.update = (_dt, time) => {
      if (a.scope !== 'smile' && a.scope !== 'flat') trace.offset.x = (time * mix(0.1, 0.9, mood.energy)) % 1;
      const f = flick && Math.sin(time * 13.7) * Math.sin(time * 3.1) > 0.86 ? 0.55 : 1;
      ringGlow.emissiveIntensity = ringBase * f; pool.intensity = poolBase * f;
      if (neon) neon.emissiveIntensity = 1.6 * (Math.sin(time * 21) * Math.sin(time * 1.7) > 0.9 ? 0.4 : 1);
      led.emissiveIntensity = 1.2 + Math.sin(time * 2) * 0.5;
      eyeGlows.forEach((g, i) => { g.emissiveIntensity = 0.5 + mood.energy * (0.6 + 0.5 * Math.sin(time * 1.3 + i * 2.1)); });
      if (steam) { steam.position.y = 0.78 + Math.sin(time * 1.5) * 0.03; steam.rotation.y = time * 0.7; }
    };
    return world;
  },
});
