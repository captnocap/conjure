import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

const SHIRTS = { red: '#c4281f', blue: '#2450a8', green: '#2c7a3f', yellow: '#e8b81c', white: '#ece8dc', orange: '#e06a1c' } as const;
const SIGN = { muffler: 'MUFFLERS', axe: 'FIREWOOD', hotdog: 'EAT', tyre: 'TIRES', flag: 'WELCOME', nothing: 'USED CARS' } as const;

function paint(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default defineThing({
  questions: {
    character: choice('Which giant is he?', {
      classic: 'The standard service-station man: short-sleeved shirt, slacks, dark side-parted hair.',
      lumberjack: 'A bearded lumberjack in a plaid shirt, suspenders and a knit cap.',
      cowboy: 'A cowboy in a ten-gallon hat, vest and neckerchief.',
      spaceman: 'A silver-suited spaceman with a clear bubble helmet and a backpack.',
      halfwit: 'The grinning country bumpkin in a straw hat with freckles and jug ears.',
    }),
    holding: choice('What is in his cupped hands?', {
      muffler: 'A car muffler with its pipes.',
      axe: 'A long-handled axe.',
      hotdog: 'A giant hot dog with mustard.',
      tyre: 'A whitewall tyre.',
      flag: 'A pole with a SALE flag.',
      nothing: 'Nothing: the hands cup empty air where something used to be.',
    }),
    shirt: choice('What colour is his shirt?', {
      red: 'Red.', blue: 'Blue.', green: 'Green.', yellow: 'Yellow.', white: 'White.', orange: 'Orange.',
    }),
    face: choice('What expression is painted on him?', {
      stern: 'Stern and square-jawed, staring over the highway.',
      smile: 'A friendly closed-mouth smile.',
      grin: 'A wide toothy grin.',
      vacant: 'A blank, slightly cross-eyed stare.',
      wink: 'One eye closed in a wink.',
    }),
    fate: choice('What has happened to him over the years?', {
      repainted: 'Lovingly repainted by a local signwriter in colours a little too bright.',
      original: 'Untouched since the 1960s, standing as he was made.',
      armless: 'One arm has broken off at the shoulder, leaving a stub and rebar; what he held lies at his feet.',
      headless: 'A storm took his head off; it sits on the ground beside his boots.',
      leaning: 'He leans badly, held up by guy wires and a timber prop.',
    }),
    base: choice('What does he stand on?', {
      pad: 'A bare concrete pad with a steel brace up his back.',
      pedestal: 'A painted block pedestal lettered with what the business sells.',
      tyres: 'A ring of half-buried white-painted tyres.',
    }),
    height: score('How tall is he?', ['A four-metre junior', 'The standard six metres', 'A towering nine metres']),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const fresh = a.fate === 'repainted';
    const chalk = fresh ? mood.wear * 0.12 : 0.12 + mood.wear * 0.5;
    const gloss = fresh ? 0.28 : mix(0.5, 0.95, mood.wear);
    const coat = (hex: string) => {
      const c = new THREE.Color(hex);
      if (fresh) { const hsl = { h: 0, s: 0, l: 0 }; c.getHSL(hsl); c.setHSL(hsl.h, Math.min(1, hsl.s * 1.25), hsl.l); }
      return c.lerp(new THREE.Color('#d9d4c6'), chalk);
    };
    const hexOf = (c: THREE.Color) => `#${c.getHexString()}`;
    const gel = (hex: string) => new THREE.MeshStandardMaterial({ color: coat(hex), roughness: gloss });
    const space = a.character === 'spaceman';
    const shirtHex = space ? '#c9ced2' : SHIRTS[a.shirt];
    const trouserHex = space ? '#b9bfc4' : a.character === 'classic' ? (a.shirt === 'white' ? '#27408a' : '#ebe7da') : a.character === 'halfwit' ? '#3d5fa8' : '#2a4a86';
    const skinHex = fresh ? '#f0a57e' : '#e3b08a';
    const hairHex = a.character === 'halfwit' ? '#c8742a' : a.character === 'lumberjack' ? '#4a2c18' : '#241a14';
    const skin = gel(skinHex), trousers = gel(trouserHex), boot = gel(a.character === 'cowboy' ? '#6b3d1e' : space ? '#e9ecee' : '#1e1c1b');
    const sleeve = a.character === 'classic' || a.character === 'halfwit' ? skin : gel(shirtHex);
    const upper = gel(shirtHex);
    const iron = s.material('#6a5a4c', { metalness: 0.5, roughness: 0.7 });
    const raw = s.material('#b9b08f', { roughness: 1 });

    const fig = new THREE.Group();
    s.root.add(fig);
    const f = <T extends THREE.Object3D>(node: T) => { fig.add(node); return node; };
    const cracks = (ctx: CanvasRenderingContext2D, w: number, h: number, amount: number) => {
      ctx.strokeStyle = 'rgba(40,30,22,0.75)';
      for (let i = 0; i < amount; i++) {
        let x = random() * w, y = random() * h;
        ctx.lineWidth = 1 + random() * 1.5;
        ctx.beginPath(); ctx.moveTo(x, y);
        for (let k = 0; k < 6; k++) { x += (random() - 0.5) * 34; y += random() * 26; ctx.lineTo(x, y); }
        ctx.stroke();
        if (random() < 0.4) { ctx.fillStyle = 'rgba(190,180,150,0.9)'; ctx.beginPath(); ctx.ellipse(x, y, 6 + random() * 16, 5 + random() * 12, random() * 3, 0, 6.3); ctx.fill(); }
      }
    };
    const crackCount = fresh ? mood.wear * 4 : 4 + mood.wear * 34;

    // ---- legs and boots ---------------------------------------------------------
    for (const side of [-1, 1]) {
      f(s.rod([side * 0.4, 0.4, 0], [side * 0.34, 2.95, 0], 0.25, trousers, 0.33));
      f(s.ball([0.3, 0.26, 0.52], [side * 0.41, 0.24, 0.14], boot, 14));
      f(s.cylinder(0.27, 0.28, 0.3, [side * 0.4, 0.5, 0], boot, 14));
    }
    f(s.ball([0.7, 0.42, 0.46], [0, 2.95, 0], trousers, 16));
    const belt = f(s.cylinder(0.6, 0.6, 0.16, [0, 3.2, 0], gel(space ? '#3c4046' : '#2a1c12'), 20));
    belt.scale.z = 0.66;
    f(s.box([0.2, 0.17, 0.05], [0, 3.2, 0.4], gel('#d4af37')));

    // ---- torso ----------------------------------------------------------------
    const torsoMap = paint(512, 256, (ctx) => {
      ctx.fillStyle = hexOf(coat(shirtHex)); ctx.fillRect(0, 0, 512, 256);
      const mid = 256;
      if (a.character === 'lumberjack') {
        ctx.fillStyle = 'rgba(0,0,0,0.38)';
        for (let x = 0; x < 512; x += 44) ctx.fillRect(x, 0, 20, 256);
        for (let y = 0; y < 256; y += 44) ctx.fillRect(0, y, 512, 20);
        ctx.fillStyle = hexOf(coat('#3a2a1c'));
        for (const x of [mid - 62, mid + 46]) ctx.fillRect(x, 0, 16, 256);
      } else if (a.character === 'cowboy') {
        ctx.fillStyle = hexOf(coat('#5a3a1e'));
        ctx.fillRect(0, 30, mid - 44, 226); ctx.fillRect(mid + 44, 30, 512, 226);
      } else if (space) {
        ctx.fillStyle = '#2b3036'; ctx.fillRect(mid - 50, 70, 100, 66);
        for (let i = 0; i < 6; i++) { ctx.fillStyle = ['#ff3b30', '#ffd60a', '#32d74b', '#0a84ff'][i % 4]; ctx.fillRect(mid - 40 + (i % 3) * 30, 80 + Math.floor(i / 3) * 28, 18, 16); }
        ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 3;
        for (let y = 40; y < 256; y += 50) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(512, y); ctx.stroke(); }
      } else if (a.character === 'halfwit') {
        ctx.fillStyle = hexOf(coat('#3d5fa8'));
        ctx.fillRect(mid - 70, 96, 140, 160);
        for (const x of [mid - 62, mid + 46]) ctx.fillRect(x, 0, 16, 110);
        ctx.fillStyle = '#d4af37';
        for (const x of [mid - 54, mid + 54]) { ctx.beginPath(); ctx.arc(x, 104, 7, 0, 6.3); ctx.fill(); }
      }
      if (!space && a.character !== 'halfwit') {
        ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(mid - 2, 20, 4, 236);
        ctx.fillStyle = '#f4f0e2';
        for (let y = 56; y < 256; y += 44) { ctx.beginPath(); ctx.arc(mid, y, 5, 0, 6.3); ctx.fill(); }
        ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 3;
        ctx.strokeRect(mid + 30, 70, 44, 40);
      }
      // open collar showing the neck
      ctx.fillStyle = hexOf(coat(space ? '#8d9296' : skinHex));
      ctx.beginPath(); ctx.moveTo(mid - 34, 0); ctx.lineTo(mid, 44); ctx.lineTo(mid + 34, 0); ctx.closePath(); ctx.fill();
      cracks(ctx, 512, 256, crackCount);
      if (fresh) { ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(mid - 150, 0, 26, 256); }
    });
    const torso = f(s.lathe([[0.56, 0], [0.6, 0.3], [0.72, 1.0], [0.86, 1.6], [0.88, 1.85], [0.62, 2.05], [0.25, 2.14], [0.22, 2.38]], new THREE.MeshStandardMaterial({ map: torsoMap, roughness: gloss }), [0, 3.1, 0]));
    torso.rotation.y = Math.PI;
    torso.scale.z = 0.62;
    if (space) f(s.box([0.9, 1.2, 0.4], [0, 4.4, -0.6], gel('#d8dcdf')));

    // ---- arms -----------------------------------------------------------------
    const lost = a.fate === 'armless' ? (random() < 0.5 ? -1 : 1) : 0;
    const handAt: Record<number, THREE.Vector3> = {};
    for (const side of [-1, 1]) {
      f(s.ball([0.33, 0.33, 0.33], [side * 0.93, 4.82, 0], upper, 14));
      if (side === lost) {
        f(s.cylinder(0.2, 0.26, 0.25, [side * 0.98, 4.55, 0.02], raw, 9));
        for (let i = 0; i < 3; i++) f(s.rod([side * 0.98, 4.5, 0], [side * (0.98 + (random() - 0.5) * 0.3), 4.1 - random() * 0.25, (random() - 0.5) * 0.3], 0.018, iron));
        continue;
      }
      const elbow: [number, number, number] = [side * 1.03, 3.86, 0.14];
      const wrist: [number, number, number] = [side * 0.66, 3.9 + side * 0.06, 0.98];
      f(s.rod([side * 0.95, 4.78, 0], elbow, 0.27, upper, 0.23));
      f(s.ball([0.24, 0.24, 0.24], elbow, sleeve, 12));
      f(s.rod(elbow, wrist, 0.22, sleeve, 0.17));
      // his right hand (-x) is palm up, his left palm down: the classic pose
      const hand = f(s.ball([0.2, 0.11, 0.3], [wrist[0] - side * 0.04, wrist[1] + side * 0.02, wrist[2] + 0.22], space ? gel('#e9ecee') : skin, 12));
      hand.rotation.z = side * 0.25;
      f(s.ball([0.07, 0.07, 0.16], [wrist[0] - side * 0.2, wrist[1], wrist[2] + 0.18], space ? gel('#e9ecee') : skin, 8));
      handAt[side] = hand.position.clone();
    }

    // ---- head -----------------------------------------------------------------
    const head = new THREE.Group();
    const faceMap = paint(512, 256, (ctx) => {
      ctx.fillStyle = hexOf(coat(skinHex)); ctx.fillRect(0, 0, 512, 256);
      const hair = hexOf(coat(hairHex));
      ctx.fillStyle = hair;
      ctx.fillRect(0, 0, 512, 74);
      ctx.fillRect(236, 0, 276, 168); ctx.fillRect(0, 0, 22, 168);
      ctx.fillRect(22, 60, 16, 60); ctx.fillRect(218, 60, 18, 60);
      if (a.character === 'classic') { ctx.beginPath(); ctx.moveTo(40, 74); ctx.quadraticCurveTo(150, 96, 218, 70); ctx.lineTo(218, 60); ctx.lineTo(40, 60); ctx.fill(); }
      const cx = 128;
      if (a.character === 'lumberjack') {
        ctx.beginPath(); ctx.moveTo(22, 120); ctx.quadraticCurveTo(cx, 150, 236, 120); ctx.lineTo(236, 256); ctx.lineTo(22, 256); ctx.closePath(); ctx.fill();
      }
      const ink = '#1c1410';
      ctx.lineCap = 'round';
      for (const side of [-1, 1]) {
        const ex = cx + side * 28 + (a.face === 'vacant' ? -side * 3 : 0), ey = 108;
        const closed = a.face === 'wink' && side === 1;
        ctx.strokeStyle = ink; ctx.lineWidth = 4;
        if (closed) { ctx.beginPath(); ctx.arc(ex, ey - 2, 10, 0.2, Math.PI - 0.2); ctx.stroke(); }
        else {
          ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(ex, ey, 12, a.face === 'vacant' ? 11 : 8, 0, 0, 6.3); ctx.fill(); ctx.stroke();
          ctx.fillStyle = '#2a4d7a'; ctx.beginPath(); ctx.arc(ex + (a.face === 'vacant' ? -side * 5 : 0), ey + (a.face === 'vacant' ? 2 : 0), 5, 0, 6.3); ctx.fill();
        }
        ctx.lineWidth = 7; ctx.strokeStyle = hair;
        ctx.beginPath();
        const frown = a.face === 'stern' ? 6 : a.face === 'vacant' ? -5 : 0;
        ctx.moveTo(ex - side * 14, ey - 20 + frown); ctx.lineTo(ex + side * 15, ey - 22 - frown * 0.3); ctx.stroke();
        if (a.character === 'halfwit') { ctx.fillStyle = 'rgba(150,80,40,0.7)'; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(ex + (random() - 0.5) * 26, ey + 22 + random() * 10, 2, 0, 6.3); ctx.fill(); } }
      }
      ctx.strokeStyle = '#7a2a22'; ctx.lineWidth = 5; ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      if (a.face === 'stern') { ctx.moveTo(cx - 20, 164); ctx.lineTo(cx + 20, 164); ctx.stroke(); }
      else if (a.face === 'vacant') { ctx.ellipse(cx, 166, 8, 6, 0, 0, 6.3); ctx.stroke(); }
      else if (a.face === 'grin') {
        ctx.moveTo(cx - 28, 154); ctx.quadraticCurveTo(cx, 190, cx + 28, 154); ctx.closePath(); ctx.fill(); ctx.stroke();
        if (a.character === 'halfwit') { ctx.fillStyle = '#1c1410'; ctx.fillRect(cx - 4, 156, 8, 12); }
      } else { ctx.arc(cx, 150, 26, 0.5, Math.PI - 0.5); ctx.stroke(); }
      cracks(ctx, 512, 256, crackCount * 0.6);
    });
    const skull = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), new THREE.MeshStandardMaterial({ map: faceMap, roughness: gloss }));
    skull.scale.set(0.42, 0.52, 0.45);
    skull.castShadow = true;
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), skin);
    nose.position.set(0, -0.06, 0.45);
    const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.2, 0.5), a.character === 'lumberjack' ? gel(hairHex) : skin);
    jaw.position.set(0, -0.36, 0.06);
    head.add(skull, nose, jaw);
    for (const side of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), skin);
      const big = a.character === 'halfwit' ? 1.8 : 1;
      ear.scale.set(0.05 * big, 0.11 * big, 0.08 * big);
      ear.position.set(side * 0.43, -0.02, 0);
      head.add(ear);
    }
    const hatMaterial = gel(a.character === 'cowboy' ? '#e9e2cf' : a.character === 'halfwit' ? '#e2c46a' : a.character === 'lumberjack' ? '#b8281f' : '#333');
    if (a.character === 'cowboy' || a.character === 'halfwit') {
      const tall = a.character === 'cowboy';
      const hat = new THREE.Mesh(new THREE.LatheGeometry([[0.0, tall ? 0.5 : 0.36], [0.3, tall ? 0.52 : 0.36], [0.4, 0.06], [0.85, 0.02], [0.9, tall ? 0.14 : 0.0], [0.86, 0], [0, 0]].map(([x, y]) => new THREE.Vector2(x, y)), 24), hatMaterial);
      (hat.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
      hat.position.y = 0.28;
      hat.rotation.x = -0.08;
      head.add(hat);
    } else if (a.character === 'lumberjack') {
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.47, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.45), hatMaterial);
      cap.position.y = 0.08; cap.scale.y = 1.2;
      const pom = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), gel('#f1ead6'));
      pom.position.y = 0.66;
      head.add(cap, pom);
    } else if (space) {
      const bubble = new THREE.Mesh(new THREE.SphereGeometry(0.74, 20, 14), new THREE.MeshPhysicalMaterial({ color: '#dff3ff', transparent: true, opacity: 0.22, roughness: 0.05, depthWrite: false }));
      bubble.position.y = 0.06;
      const collar = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.09, 8, 24), gel('#8d9296'));
      collar.rotation.x = Math.PI / 2; collar.position.y = -0.5;
      const aerial = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.5, 5), iron);
      aerial.position.set(0.4, 0.9, -0.2);
      head.add(bubble, collar, aerial);
    }
    head.traverse((node) => { node.castShadow = true; });
    if (a.fate === 'headless') {
      head.position.set(1.55 + random() * 0.3, 0.5, 0.8 + random() * 0.4);
      head.rotation.set(-0.25, -0.5 + random() * 0.6, 0.5 + random() * 0.4);
      s.root.add(head);
      f(s.cylinder(0.24, 0.23, 0.12, [0, 5.42, 0], raw, 10));
      for (let i = 0; i < 4; i++) f(s.rod([(random() - 0.5) * 0.2, 5.4, (random() - 0.5) * 0.2], [(random() - 0.5) * 0.5, 5.75 + random() * 0.25, (random() - 0.5) * 0.4], 0.018, iron));
    } else {
      head.position.set(0, 5.86, 0.02);
      fig.add(head);
    }

    // ---- what he holds ----------------------------------------------------------
    const prop = new THREE.Group();
    const p = <T extends THREE.Object3D>(node: T) => { prop.add(node); return node; };
    const steelish = new THREE.MeshStandardMaterial({ color: new THREE.Color('#b9bec2').lerp(new THREE.Color('#8a5a36'), fresh ? 0 : mood.wear * 0.8), metalness: 0.7, roughness: mix(0.3, 0.8, mood.wear) });
    if (a.holding === 'muffler') {
      const can = p(s.cylinder(0.24, 0.24, 1.25, [0, 0, 0], steelish, 18));
      can.rotation.z = Math.PI / 2; can.scale.set(1, 1, 0.72);
      for (const x of [-0.6, 0.6]) { const seam = p(s.ring(0.24, 0.025, [x, 0, 0], steelish)); seam.rotation.y = Math.PI / 2; seam.scale.set(0.72, 1, 1); }
      p(s.rod([-1.15, 0, 0.04], [-0.62, 0, 0.04], 0.07, steelish));
      p(s.rod([0.62, 0, -0.04], [1.2, 0, -0.04], 0.07, steelish));
    } else if (a.holding === 'axe') {
      p(s.rod([-1.0, -0.12, 0], [1.15, 0.5, 0], 0.055, gel('#b98a4e')));
      const blade = new THREE.Shape();
      blade.moveTo(0, -0.12); blade.lineTo(0.5, -0.36); blade.lineTo(0.56, 0.36); blade.lineTo(0, 0.14); blade.lineTo(-0.2, 0.12); blade.lineTo(-0.2, -0.1);
      const axeHead = p(s.mesh(new THREE.ExtrudeGeometry(blade, { depth: 0.07, bevelEnabled: false }).translate(0, 0, -0.035), steelish, [1.05, 0.5, 0]));
      axeHead.rotation.z = Math.PI / 2 + 0.28;
    } else if (a.holding === 'hotdog') {
      for (const z of [-0.13, 0.13]) { const bun = p(s.mesh(new THREE.CapsuleGeometry(0.2, 1.3, 6, 12), gel('#d9a55a'), [0, -0.04, z])); bun.rotation.z = Math.PI / 2; }
      const sausage = p(s.mesh(new THREE.CapsuleGeometry(0.15, 1.7, 6, 12), gel('#a8402a'), [0, 0.12, 0])); sausage.rotation.z = Math.PI / 2;
      p(s.tube(Array.from({ length: 12 }, (_u, i) => [-0.75 + i * 0.136, 0.27, (i % 2 ? 0.07 : -0.07)] as [number, number, number]), 0.03, gel('#f2c81a')));
    } else if (a.holding === 'tyre') {
      const rubber = s.material('#1b1b1d', { roughness: 0.9 });
      p(s.ring(0.5, 0.2, [0, 0.42, 0.05], rubber));
      p(s.ring(0.36, 0.05, [0, 0.42, 0.2], gel('#f1ede2')));
      p(s.cylinder(0.3, 0.3, 0.1, [0, 0.42, 0.05], steelish, 16)).rotation.x = Math.PI / 2;
    } else if (a.holding === 'flag') {
      p(s.rod([-0.6, -0.3, 0.1], [-0.6, 2.6, 0.1], 0.04, gel('#f1ede2')));
      const flag = p(s.label('SALE', 1.5, 0.8, [0.17, 2.15, 0.1], '#ffffff', hexOf(coat('#c4281f'))));
      flag.rotation.y = -0.15;
      p(s.ball([0.08, 0.08, 0.08], [-0.6, 2.64, 0.1], gel('#d4af37'), 8));
    }
    prop.traverse((node) => { node.castShadow = true; });
    if (a.holding !== 'nothing') {
      if (lost) {
        prop.position.set(lost * 1.3, a.holding === 'tyre' ? 0.22 : 0.26, 1.2);
        prop.rotation.set(a.holding === 'tyre' ? -Math.PI / 2 : 0, random() * 1.2 - 0.6, a.holding === 'flag' ? Math.PI / 2 - 0.05 : 0);
        if (a.holding === 'tyre') prop.position.z = 1.7;
        if (a.holding === 'flag') prop.position.set(lost * 0.4, 0.12, 1.5);
        s.root.add(prop);
      } else { prop.position.set(0, 4.06, 1.2); fig.add(prop); }
    }

    // ---- stance, base and fate ---------------------------------------------------
    const size = mix(0.68, 1.45, a.height);
    let lift = 0;
    const concrete = s.material('#b9b6ab', { roughness: 1 });
    if (a.base === 'pedestal') {
      lift = 0.9 * Math.sqrt(size);
      s.box([2.4 * size, lift, 1.7 * size], [0, lift / 2, 0], gel(space ? '#27408a' : shirtHex === '#ece8dc' ? '#c4281f' : '#ece8dc'));
      s.label(SIGN[a.holding], 2.2 * size, lift * 0.74, [0, lift / 2, 0.851 * size], hexOf(coat(shirtHex === '#ece8dc' ? '#ffffff' : shirtHex)), hexOf(coat(shirtHex === '#ece8dc' ? '#c4281f' : '#ece8dc')));
    } else {
      s.box([2.3 * size, 0.14, 1.8 * size], [0, 0.07, 0], concrete);
      lift = 0.14;
      if (a.base === 'tyres') {
        const white = gel('#ece8dc');
        for (let i = 0; i < 10; i++) {
          const angle = (i / 10) * Math.PI * 2;
          const tyre = s.ring(0.3, 0.11, [Math.cos(angle) * 1.5 * size, 0.08, Math.sin(angle) * 1.25 * size], white);
          tyre.rotation.y = -angle + Math.PI / 2;
        }
      } else {
        s.rod([0, 0.1, -0.95 * size], [0, 3.9 * size, -0.42 * size], 0.06, iron);
      }
    }
    fig.scale.setScalar(size);
    fig.position.y = lift;
    if (a.fate === 'headless') { head.scale.setScalar(size); head.position.multiplyScalar(size); head.position.y = 0.5 * size + (a.base === 'pedestal' ? 0 : 0.0); }
    if (lost && a.holding !== 'nothing') { prop.scale.setScalar(size); prop.position.x *= size; prop.position.z *= size; prop.position.y *= size; }
    if (a.fate === 'leaning') {
      const tilt = (random() < 0.5 ? -1 : 1) * mix(0.1, 0.19, random());
      fig.rotation.z = tilt;
      fig.rotation.x = -0.05;
      const shoulder = new THREE.Vector3(0, 4.8 * size, 0).applyEuler(fig.rotation).add(fig.position);
      const away = -Math.sign(tilt);
      s.rod([shoulder.x, shoulder.y, shoulder.z], [away * 3.3 * size, 0.05, 1.2 * size], 0.014, iron);
      s.rod([shoulder.x, shoulder.y, shoulder.z], [away * 3.3 * size, 0.05, -1.2 * size], 0.014, iron);
      const hip = new THREE.Vector3(-away * 0.5, 3.2 * size, 0).applyEuler(fig.rotation).add(fig.position);
      s.rod([-away * 2.3 * size, 0, 0.2], [hip.x, hip.y, hip.z], 0.07, s.material('#8a6a48', { roughness: 1 }));
    }

    return s.finish({ footprint: 1.5 * size });
  },
});
