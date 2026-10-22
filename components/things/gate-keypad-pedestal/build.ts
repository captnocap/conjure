import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

const SCREEN = {
  enter: 'ENTER CODE', denied: 'ACCESS DENIED', welcome: 'WELCOME', closed: 'GATE CLOSED 10PM', stars: '* * * * _', pastdue: 'SEE OFFICE', dead: '',
} as const;

function paint(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function signTexture(text: string, ink: string, paper: string) {
  return paint(384, 200, (ctx) => {
    ctx.fillStyle = paper; ctx.fillRect(0, 0, 384, 200);
    ctx.strokeStyle = ink; ctx.lineWidth = 8; ctx.strokeRect(10, 10, 364, 180);
    const words = text.split(' ');
    const lines: string[] = [];
    for (const word of words) {
      if (lines.length && (lines[lines.length - 1] + ' ' + word).length <= 11) lines[lines.length - 1] += ' ' + word;
      else lines.push(word);
    }
    ctx.fillStyle = ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const size = Math.min(150 / lines.length, 62);
    ctx.font = `bold ${size}px sans-serif`;
    lines.forEach((line, i) => ctx.fillText(line, 192, 100 + (i - (lines.length - 1) / 2) * size * 1.05, 340));
  });
}

export default defineThing({
  questions: {
    screen: choice('What does the keypad display say?', {
      enter: 'ENTER CODE: patient, waiting for anyone.',
      denied: 'ACCESS DENIED: the code no longer works.',
      welcome: 'WELCOME: the gate is about to move.',
      closed: 'GATE CLOSED 10PM: you came too late.',
      stars: 'Four stars and a cursor: someone is halfway through typing.',
      pastdue: 'SEE OFFICE: the account is past due.',
      dead: 'Nothing. The display is dark and the pad is dead.',
    }),
    glow: choice('What colour does the pad glow?', {
      green: 'Soft green, old backlit rubber keys.',
      amber: 'Amber, like a dashboard at night.',
      white: 'Cold blue-white LEDs, newly fitted.',
      red: 'Red, an alarm panel more than a welcome.',
    }),
    gate: choice('What is the gate behind it made of?', {
      chainlink: 'Galvanised chain-link in a tube frame.',
      pickets: 'Black steel pickets with pointed tops.',
      panel: 'Solid ribbed steel sheet you cannot see through.',
      slats: 'Chain-link threaded with green privacy slats.',
    }),
    position: choice('Where does the gate stand?', {
      closed: 'Fully shut across the entrance.',
      ajar: 'Stopped a body\'s width open, as if jammed or held.',
      open: 'Rolled most of the way back.',
      derailed: 'Off its track and leaning, forced or hit.',
    }),
    top: choice('What runs along the top of the gate?', {
      razor: 'A coil of razor wire.',
      barbed: 'Three strands of barbed wire on angled arms.',
      none: 'Nothing; it is only a gate.',
    }),
    sign: choice('What sign hangs on the gate?', {
      trespass: 'NO TRESPASSING', camera: 'SMILE YOU ARE ON CAMERA', hours: 'ACCESS HOURS 6AM-10PM', vacancy: 'UNITS AVAILABLE', auction: 'LIEN SALE SATURDAY', none: 'No sign.',
    }),
    bollard: choice('What state is the bollard beside the post in?', {
      bent: 'Leaning hard where a truck clipped it, paint scraped to steel.',
      upright: 'Straight and freshly painted.',
      flat: 'Sheared off and lying on its side by its stump.',
      pair: 'Two bollards, one straight and one bent.',
    }),
    note: noul('Has someone taped a handwritten note to the keypad box?'),
    camera: noul('Is there a security camera on the post, watching?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const glowTint = { green: '#58e08a', amber: '#ffb347', white: '#cfe6ff', red: '#ff4a3d' }[a.glow];
    const alive = a.screen !== 'dead';
    const galv = s.material('#a9b0ae', { metalness: 0.7, roughness: 0.42 });
    const rust = s.material('#7a4a2c', { roughness: 0.95 });
    const black = s.material('#23272a', { roughness: 0.6, metalness: 0.3 });
    const yellow = s.material('#e8b820', { roughness: 0.55 });
    const concrete = s.material('#9d9b93', { roughness: 0.95 });
    const sign = (text: string, w: number, h: number, ink: string, paper: string) =>
      s.mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: signTexture(text, ink, paper), roughness: 0.8, side: THREE.DoubleSide }));

    // ---- Sliding gate section, set back behind the post.
    const GW = 2.3, GH = 1.95, GZ = -0.7;
    const slide = { closed: 0, ajar: 0.45, open: 0.95, derailed: 0.2 }[a.position];
    const gate = new THREE.Group();
    const into = (mesh: THREE.Object3D) => { s.root.remove(mesh); gate.add(mesh); return mesh; };
    const frame = a.gate === 'pickets' ? black : galv;
    for (const y of [0.16, GH]) into(s.rod([-GW / 2, y, 0], [GW / 2, y, 0], 0.035, frame));
    for (const x of [-GW / 2, 0, GW / 2]) into(s.rod([x, 0.16, 0], [x, GH, 0], 0.035, frame));
    if (a.gate === 'chainlink' || a.gate === 'slats') {
      const mesh = paint(256, 256, (ctx) => {
        ctx.clearRect(0, 0, 256, 256);
        if (a.gate === 'slats') {
          for (let i = 0; i < 16; i++) { ctx.fillStyle = random() < mood.wear * 0.3 ? 'rgba(0,0,0,0)' : i % 2 ? '#3f6b4c' : '#356043'; ctx.fillRect(i * 16 + 2, 0, 12, 256); }
        }
        ctx.strokeStyle = '#aeb5b2'; ctx.lineWidth = 6;
        for (let i = -8; i < 16; i++) {
          ctx.beginPath(); ctx.moveTo(i * 32, 0); ctx.lineTo(i * 32 + 256, 256); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(i * 32 + 256, 0); ctx.lineTo(i * 32, 256); ctx.stroke();
        }
      });
      mesh.wrapS = mesh.wrapT = THREE.RepeatWrapping;
      mesh.repeat.set(GW / 0.75, GH / 0.75);
      into(s.mesh(new THREE.PlaneGeometry(GW, GH - 0.16), new THREE.MeshStandardMaterial({ map: mesh, alphaTest: 0.4, side: THREE.DoubleSide, metalness: 0.4, roughness: 0.6 }), [0, (GH + 0.16) / 2, 0]));
    } else if (a.gate === 'pickets') {
      const picket = new THREE.CylinderGeometry(0.014, 0.014, GH + 0.1, 6);
      const tip = new THREE.ConeGeometry(0.03, 0.12, 6);
      const count = Math.floor(GW / 0.13);
      const bars = new THREE.InstancedMesh(picket, black, count), tips = new THREE.InstancedMesh(tip, black, count);
      const m = new THREE.Matrix4();
      for (let i = 0; i < count; i++) {
        const x = -GW / 2 + 0.07 + i * 0.13;
        bars.setMatrixAt(i, m.makeTranslation(x, 0.16 + (GH + 0.1) / 2 - 0.08, 0));
        tips.setMatrixAt(i, m.makeTranslation(x, GH + 0.2, 0));
      }
      bars.castShadow = tips.castShadow = true;
      gate.add(bars, tips);
    } else {
      const sheet = new THREE.PlaneGeometry(GW, GH - 0.16, 88, 1);
      const p = sheet.attributes.position;
      for (let i = 0; i < p.count; i++) p.setZ(i, Math.floor((p.getX(i) + GW / 2) / (GW / 88)) % 4 < 2 ? 0.02 : -0.01);
      sheet.computeVertexNormals();
      into(s.mesh(sheet, s.material(mood.cheer > 0.5 ? '#4f7fa0' : '#6c736f', { metalness: 0.4, roughness: 0.6, side: THREE.DoubleSide }), [0, (GH + 0.16) / 2, 0]));
    }
    // Diagonal brace and guide wheels on the track.
    into(s.rod([-GW / 2, 0.16, 0.01], [0, GH, 0.01], 0.02, frame));
    for (const x of [-GW / 2 + 0.3, GW / 2 - 0.3]) into(s.cylinder(0.08, 0.08, 0.05, [x, 0.08, 0], black, 14)).rotation.x = Math.PI / 2;
    if (a.top === 'razor') {
      const points: THREE.Vector3[] = [];
      const loops = 15;
      for (let i = 0; i <= loops * 10; i++) {
        const t = i / 10, r = 0.2 + Math.sin(t * 2.1) * 0.02;
        points.push(new THREE.Vector3(-GW / 2 + (t / loops) * GW, GH + 0.22 + Math.cos(t * Math.PI * 2) * r, Math.sin(t * Math.PI * 2) * r));
      }
      const coil = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), loops * 20, 0.008, 4), galv);
      coil.castShadow = true;
      gate.add(coil);
      const barbs = new THREE.InstancedMesh(new THREE.BoxGeometry(0.05, 0.012, 0.004), galv, points.length);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
      points.forEach((point, i) => { e.set(i * 0.63, i * 1.1, i * 0.37); barbs.setMatrixAt(i, m.compose(point, q.setFromEuler(e), new THREE.Vector3(1, 1, 1))); });
      gate.add(barbs);
    } else if (a.top === 'barbed') {
      for (const x of [-GW / 2, 0, GW / 2]) into(s.rod([x, GH, 0], [x, GH + 0.36, 0.22], 0.018, frame));
      for (let k = 1; k <= 3; k++) into(s.rod([-GW / 2, GH + k * 0.12, k * 0.073], [GW / 2, GH + k * 0.12, k * 0.073], 0.005, galv));
    }
    if (a.sign !== 'none') {
      const words = { trespass: 'NO TRESPASSING', camera: 'SMILE YOU ARE ON CAMERA', hours: 'ACCESS HOURS 6AM-10PM', vacancy: 'UNITS AVAILABLE', auction: 'LIEN SALE SATURDAY' }[a.sign];
      const [ink, paper] = a.sign === 'trespass' ? ['#ffffff', '#c22a22'] : a.sign === 'vacancy' ? ['#ffffff', '#2f7d4f'] : a.sign === 'auction' ? ['#1b1b1b', '#f0d23a'] : ['#1d2d5a', '#f2f0e6'];
      const plate = into(sign(words, 0.95, 0.5, ink, paper));
      plate.position.set(-GW / 4, 1.15, 0.05);
      plate.rotation.z = (random() - 0.5) * 0.1 * (0.3 + mood.wear);
    }
    gate.position.set(-slide, 0, GZ);
    if (a.position === 'derailed') { gate.rotation.x = -0.2; gate.rotation.y = 0.12; gate.position.y = -0.02; }
    s.root.add(gate);
    // Track, receiver post, and the fixed fence stub the gate slides behind.
    s.box([GW + 1.3, 0.04, 0.08], [-0.4, 0.02, GZ], galv);
    s.box([GW + 1.9, 0.03, 2.5], [-0.15, -0.015, 0.05], s.material('#6f6e6a', { roughness: 0.98 }));
    for (const x of [GW / 2 + 0.12, -GW / 2 - 0.95]) { s.box([0.1, GH + 0.25, 0.1], [x, (GH + 0.25) / 2, GZ - 0.14], frame); s.box([0.14, 0.02, 0.14], [x, GH + 0.26, GZ - 0.14], frame); }
    s.rod([-GW / 2 - 0.95, GH + 0.15, GZ - 0.14], [GW / 2 + 0.12, GH + 0.15, GZ - 0.14], 0.03, frame);
    // Operator box.
    s.box([0.42, 0.75, 0.36], [GW / 2 + 0.55, 0.42, GZ - 0.2], s.material('#8c948f', { metalness: 0.4 }));
    s.box([0.5, 0.06, 0.44], [GW / 2 + 0.55, 0.03, GZ - 0.2], concrete);

    // ---- The gooseneck pedestal.
    const PX = 0.75, PZ = 0.6;
    const post = s.material(mood.wear > 0.7 ? '#6b5a48' : '#30363a', { metalness: 0.5, roughness: 0.5 });
    s.cylinder(0.2, 0.22, 0.12, [PX, 0.06, PZ], concrete, 18);
    s.box([0.2, 0.012, 0.2], [PX, 0.126, PZ], post);
    const headY = 1.15, headX = PX - 0.5;
    s.tube([[PX, 0.12, PZ], [PX, 0.6, PZ], [PX, 0.98, PZ], [PX - 0.1, headY + 0.03, PZ], [PX - 0.26, headY + 0.03, PZ], [headX + 0.14, headY, PZ]], 0.045, post);
    const head = new THREE.Group();
    const inHead = (mesh: THREE.Object3D) => { s.root.remove(mesh); head.add(mesh); return mesh; };
    inHead(s.box([0.3, 0.46, 0.14], [0, 0, 0], s.material('#c5cacb', { metalness: 0.75, roughness: 0.35 })));
    inHead(s.box([0.36, 0.025, 0.26], [0, 0.245, 0.04], post)).rotation.x = 0.18;
    const face = paint(256, 400, (ctx) => {
      ctx.fillStyle = '#1b1e21'; ctx.fillRect(0, 0, 256, 400);
      // Display.
      ctx.fillStyle = alive ? '#06130c' : '#0c0d0e'; ctx.fillRect(22, 18, 212, 62);
      if (alive) {
        ctx.fillStyle = a.screen === 'denied' || a.screen === 'pastdue' ? '#ff5a48' : glowTint;
        ctx.font = `bold ${SCREEN[a.screen].length > 11 ? 21 : 28}px monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(SCREEN[a.screen], 128, 50, 200);
      }
      // Keys.
      const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];
      const worn = new Set([Math.floor(random() * 12), Math.floor(random() * 12), Math.floor(random() * 12), Math.floor(random() * 12)]);
      keys.forEach((key, i) => {
        const x = 30 + (i % 3) * 68, y = 98 + Math.floor(i / 3) * 52;
        ctx.fillStyle = alive ? glowTint : '#44484a';
        ctx.globalAlpha = worn.has(i) && mood.wear > 0.4 ? 0.45 : 1;
        ctx.fillRect(x, y, 58, 42);
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#101214'; ctx.font = 'bold 28px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(key, x + 29, y + 22);
      });
      // Intercom grille and call button.
      ctx.fillStyle = '#4c5154';
      for (let r = 0; r < 4; r++) for (let c = 0; c < 9; c++) { ctx.beginPath(); ctx.arc(34 + c * 18, 322 + r * 16, 5, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = alive ? '#ff4a3d' : '#5a2a26'; ctx.beginPath(); ctx.arc(218, 346, 18, 0, Math.PI * 2); ctx.fill();
    });
    const faceMat = new THREE.MeshStandardMaterial({ map: face, emissiveMap: face, emissive: '#ffffff', emissiveIntensity: alive ? mix(0.9, 1.6, mood.daylight > 0.5 ? (mood.daylight - 0.5) * 2 : 0.2) : 0.05, roughness: 0.5 });
    inHead(s.mesh(new THREE.PlaneGeometry(0.27, 0.42), faceMat, [0, 0, 0.0715]));
    if (a.note) {
      const note = inHead(s.label(['CODE CHANGED', 'CALL DAD', 'BACK SOON', 'DO NOT LET HIM IN', 'SORRY'][Math.floor(random() * 5)], 0.24, 0.1, [0.05, -0.29, 0.075], '#1d2d5a', '#f6f08e'));
      note.rotation.z = (random() - 0.5) * 0.3;
    }
    head.position.set(headX, headY, PZ);
    head.rotation.y = -0.55; head.rotation.x = -0.12;
    s.root.add(head);
    if (a.camera) {
      s.rod([PX, 0.98, PZ], [PX, 2.5, PZ], 0.03, post);
      s.rod([PX, 2.45, PZ], [PX - 0.2, 2.5, PZ + 0.1], 0.015, post);
      const cam = s.box([0.1, 0.1, 0.28], [PX - 0.25, 2.45, PZ + 0.18], s.material('#e9ebe8'));
      cam.rotation.set(0.35, -0.5, 0);
      const lens = s.cylinder(0.03, 0.03, 0.02, [PX - 0.31, 2.4, PZ + 0.3], new THREE.MeshStandardMaterial({ color: '#200', emissive: '#ff2a1a', emissiveIntensity: 1.5 }), 10);
      lens.rotation.set(Math.PI / 2 + 0.35, 0, 0.5);
    }

    // ---- Bollards.
    const bollard = (x: number, z: number, lean: number, fallen = false) => {
      const g = new THREE.Group();
      const add = (mesh: THREE.Object3D) => { s.root.remove(mesh); g.add(mesh); };
      const paintCol = lean ? s.material('#c9a52a', { roughness: 0.8 }) : yellow;
      add(s.cylinder(0.075, 0.075, 1.0, [0, 0.5, 0], paintCol, 16));
      add(s.ball([0.075, 0.04, 0.075], [0, 1.0, 0], paintCol, 14));
      for (const y of [0.72, 0.86]) add(s.cylinder(0.077, 0.077, 0.05, [0, y, 0], black, 16));
      if (lean) { add(s.box([0.03, 0.3, 0.08], [0.066, 0.55, 0], galv)); add(s.box([0.03, 0.14, 0.05], [0.067, 0.28, 0.03], rust)); }
      g.position.set(x, 0, z);
      if (fallen) { g.rotation.z = -Math.PI / 2 + 0.03; g.position.set(x + 0.15, 0.08, z + 0.2); g.rotation.y = 0.5; s.cylinder(0.075, 0.08, 0.12, [x, 0.06, z], rust, 12); }
      else { g.rotation.z = -lean; g.rotation.x = lean * 0.3; }
      s.root.add(g);
      s.cylinder(0.16, 0.16, 0.03, [x, 0.015, z], concrete, 14);
    };
    const BX = PX + 0.55, BZ = PZ + 0.25;
    if (a.bollard === 'bent') bollard(BX, BZ, 0.32 + random() * 0.2);
    else if (a.bollard === 'upright') bollard(BX, BZ, 0);
    else if (a.bollard === 'flat') bollard(BX, BZ, 0.1, true);
    else { bollard(BX, BZ, 0.3 + random() * 0.2); bollard(BX, BZ - 0.8, 0); }

    // Painted stop bar and whatever the wind left.
    s.box([1.5, 0.004, 0.12], [-0.55, 0.004, PZ + 0.1], s.material('#e6e2d0', { roughness: 0.9 }));
    for (let i = 0; i < mood.wear * 8; i++) s.box([0.06 + random() * 0.08, 0.004, 0.05 + random() * 0.06], [-1.4 + random() * 2.6, 0.004, GZ + 0.15 + random() * 0.3], s.material(random() < 0.5 ? '#b99a62' : '#7a6a4a')).rotation.y = random() * 3;

    const pulse = alive && mood.energy > 0.35 ? faceMat : null;
    const base = faceMat.emissiveIntensity;
    return s.finish({ update: pulse ? (_dt, time) => { pulse.emissiveIntensity = base * (0.82 + 0.18 * Math.sin(time * mix(1.5, 9, mood.energy))); } : undefined });
  },
});
