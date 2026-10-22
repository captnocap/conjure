import * as THREE from 'three';
import { choice, defineWorld, diorama, mix } from '@conjure/kit';

type P = [number, number, number];

function canvasOf(w: number, h: number) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  return { canvas, c: canvas.getContext('2d')! };
}
function textureOf(canvas: HTMLCanvasElement) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}
function paint(w: number, h: number, draw: (c: CanvasRenderingContext2D, w: number, h: number) => void) {
  const { canvas, c } = canvasOf(w, h);
  draw(c, w, h);
  return textureOf(canvas);
}

/** Many copies of one geometry in one draw call. */
class Batch {
  private list: THREE.Matrix4[] = [];
  constructor(private material: THREE.Material, private geometry: THREE.BufferGeometry = new THREE.BoxGeometry(1, 1, 1), private shadow = true) {}
  add(size: P, at: P, turn: P = [0, 0, 0]) {
    this.list.push(new THREE.Matrix4().compose(new THREE.Vector3(...at), new THREE.Quaternion().setFromEuler(new THREE.Euler(...turn)), new THREE.Vector3(...size)));
    return this;
  }
  build(root: THREE.Object3D) {
    const mesh = new THREE.InstancedMesh(this.geometry, this.material, Math.max(1, this.list.length));
    mesh.count = this.list.length;
    this.list.forEach((m, i) => mesh.setMatrixAt(i, m));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.castShadow = mesh.receiveShadow = this.shadow;
    mesh.frustumCulled = false;
    root.add(mesh);
    return mesh;
  }
}

const SIGNS = {
  serving: 'NOW SERVING: ∞, in red letters over the counter.',
  number: 'PLEASE TAKE A NUMBER.',
  wait: 'ESTIMATED WAIT: ETERNITY.',
  exit: 'NO EXIT.',
  forever: 'HAVE A NICE FOREVER.',
  queue: 'ONE QUEUE. NO EXCEPTIONS.',
} as const;
const SIGN_TEXT: Record<keyof typeof SIGNS, string> = { serving: 'NOW SERVING: ∞', number: 'PLEASE TAKE A NUMBER', wait: 'ESTIMATED WAIT: ETERNITY', exit: 'NO EXIT', forever: 'HAVE A NICE FOREVER', queue: 'ONE QUEUE. NO EXCEPTIONS.' };

export default defineWorld({
  questions: {
    counter: choice('What is happening at the reception window?', {
      closed: 'The frosted window is shut with a CLOSED sign hung in it.',
      open: 'A slot in the frosted glass is open: warm light and a dark shape moving behind it.',
      back: 'A BACK IN 5 MINUTES sign, which has been there longer than that.',
      shutter: 'A steel roller shutter pulled all the way down over the counter.',
    }),
    chairs: choice('What colour are the bolted plastic chairs?', {
      orange: 'Municipal orange.',
      beige: 'Beige that used to be white.',
      teal: 'Hospital teal.',
      grey: 'Grey, the colour of forms.',
      maroon: 'Dark maroon, a theatre lobby gone wrong.',
    }),
    clock: choice('What is the wall clock doing?', {
      stopped: 'Stopped at one minute to five.',
      nohands: 'It has no hands at all.',
      backwards: 'The hands run backwards.',
      ordinary: 'Keeping ordinary time, which is somehow worse.',
      infinity: 'Every number on the face is an infinity sign.',
    }),
    floor: choice('What is the floor, apart from the cracks?', {
      lino: 'Beige and brown checked lino tiles.',
      terrazzo: 'Speckled grey terrazzo.',
      carpet: 'Thin blue-grey office carpet, scorched along the cracks.',
      concrete: 'Bare poured concrete.',
    }),
    sign: choice('What does the big sign over the counter say?', SIGNS),
    elevator: choice('What are the elevator doors doing?', {
      closed: 'Closed, only the down arrow lit.',
      parted: 'Parted a hand\'s width with red light leaking through.',
      open: 'Standing open on a dark shaft lit red from below.',
    }),
    plant: choice('What about the plant in the corner?', {
      dead: 'A long-dead potted plant, brown stems bent over, leaves on the floor.',
      plastic: 'A plastic ficus, too green, the only thing here that will never die.',
      burnt: 'Burnt to black sticks, a few embers still in the pot.',
      none: 'No plant, just a ring on the floor where one stood.',
    }),
    notice: choice('What is on the wall poster?', {
      hang: 'A motivational poster: HANG IN THERE.',
      rules: 'A list of rules, every line beginning NO.',
      wanted: 'A WANTED poster with a blank silhouette.',
      exit: 'An EXIT sign with an arrow pointing straight down.',
      none: 'A pale rectangle where a poster was.',
    }),
    dressing: choice('What else furnishes the room?', {
      magazines: 'A low table fanned with ancient magazines.',
      vending: 'A vending machine, lit, offering nothing you would want.',
      cooler: 'A water cooler with a bubbling bottle.',
      tv: 'A wall-mounted television showing colour bars.',
      none: 'Nothing else. The room is the furniture.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const W = 14, D = 11, WALL_H = 3.6;
    const BACK = -D / 2, LEFT = -W / 2;
    const { art: s, world } = diorama(context, {
      background: '#e4e1d6', floor: null, width: W, depth: D, maxHeight: 2.6, radius: 1.3, pitch: 30, yaw: 26,
      scale: [0.7, 1.4],
      slots: [[0, -1.6], [-3.7, -1.3], [3.7, -1.3], [0, 1.7, 0, 0.9], [1.9, -4.65, 1.1, 0.35], [-5.3, 0.4, 0, 0.8]],
    });
    const root = s.root;
    const glowTint = new THREE.Color('#ff6a1a').lerp(new THREE.Color('#ffb060'), mood.warmth * 0.35);
    const glowStrength = mix(0.9, 2.2, mood.warmth);

    // ---- Light: flat fluorescent from above, infernal from below ----
    for (const child of root.children) {
      if ((child as THREE.HemisphereLight).isHemisphereLight) { (child as THREE.HemisphereLight).intensity = 1.9; (child as THREE.HemisphereLight).groundColor.set('#8a6a50'); }
    }
    if (world.keyLight) { world.keyLight.intensity = 1.5; world.keyLight.color.set('#f4f1e2'); }
    root.add(new THREE.HemisphereLight('#2a2420', glowTint, mix(0.35, 0.9, mood.warmth)));
    const ember = new THREE.PointLight(glowTint, mix(3, 9, mood.warmth), 9, 1.8);
    ember.position.set(-0.3, 0.6, 0.2);
    root.add(ember);

    // ---- Floor with glowing cracks ----
    const PX = 72;
    const floorCanvas = canvasOf(W * PX, D * PX), crackCanvas = canvasOf(W * PX, D * PX);
    const fc = floorCanvas.c, cc = crackCanvas.c;
    const fw = W * PX, fh = D * PX;
    if (a.floor === 'lino') {
      for (let y = 0; y < fh; y += PX * 0.5) for (let x = 0; x < fw; x += PX * 0.5) { fc.fillStyle = ((x + y) / (PX * 0.5)) % 2 < 1 ? '#d8cfae' : '#8a6f4e'; fc.fillRect(x, y, PX * 0.5 - 1, PX * 0.5 - 1); }
    } else if (a.floor === 'terrazzo') {
      fc.fillStyle = '#b9b7ad'; fc.fillRect(0, 0, fw, fh);
      for (let i = 0; i < 9000; i++) { fc.fillStyle = ['#6a6a66', '#e4e1d6', '#8a7a6a', '#4a4a48'][i % 4]; fc.beginPath(); fc.arc(random() * fw, random() * fh, 1 + random() * 3, 0, 7); fc.fill(); }
    } else if (a.floor === 'carpet') {
      fc.fillStyle = '#5a6678'; fc.fillRect(0, 0, fw, fh);
      for (let i = 0; i < 14000; i++) { fc.fillStyle = random() < 0.5 ? 'rgba(20,25,35,0.25)' : 'rgba(180,190,210,0.18)'; fc.fillRect(random() * fw, random() * fh, 2, 3); }
    } else {
      fc.fillStyle = '#a3a19a'; fc.fillRect(0, 0, fw, fh);
      for (let i = 0; i < 12000; i++) { fc.fillStyle = random() < 0.5 ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.07)'; fc.fillRect(random() * fw, random() * fh, 3, 3); }
      fc.strokeStyle = 'rgba(70,70,70,0.4)'; fc.lineWidth = 3; for (let x = 0; x < fw; x += PX * 2.5) { fc.beginPath(); fc.moveTo(x, 0); fc.lineTo(x, fh); fc.stroke(); }
    }
    // Grime where feet go: toward the counter and along the aisle.
    const worn = fc.createLinearGradient(0, fh, 0, 0); worn.addColorStop(0, `rgba(40,30,20,${mood.wear * 0.15})`); worn.addColorStop(1, `rgba(40,30,20,${mood.wear * 0.45})`);
    fc.fillStyle = worn; fc.fillRect(0, 0, fw, fh);
    for (let k = 0; k < mood.wear * 16; k++) { fc.fillStyle = 'rgba(30,20,15,0.3)'; fc.beginPath(); fc.ellipse(random() * fw, random() * fh, 10 + random() * 40, 6 + random() * 20, random() * 3, 0, 7); fc.fill(); }
    // Cracks: a fracture web spreading from two or three impact points, dark on the floor and lit on the glow map.
    cc.fillStyle = '#000'; cc.fillRect(0, 0, fw, fh);
    const webs = 2 + Math.round(mood.wear * 0.5 + mood.warmth * 0.5);
    const stroke = (points: [number, number][], main: boolean) => {
      fc.save(); fc.strokeStyle = '#120806'; fc.lineWidth = main ? 4 : 2.5; fc.lineCap = 'round'; fc.lineJoin = 'round';
      fc.beginPath(); points.forEach(([px, py], j) => (j ? fc.lineTo(px, py) : fc.moveTo(px, py))); fc.stroke();
      if (a.floor === 'carpet' || mood.wear > 0.6) { fc.strokeStyle = 'rgba(25,12,6,0.45)'; fc.lineWidth = main ? 14 : 8; fc.stroke(); }
      fc.restore();
      cc.save(); cc.lineCap = 'round'; cc.lineJoin = 'round';
      cc.strokeStyle = '#ff7a20'; cc.lineWidth = main ? 3.2 : 2; cc.shadowColor = '#ff5a10'; cc.shadowBlur = main ? 9 : 5;
      cc.beginPath(); points.forEach(([px, py], j) => (j ? cc.lineTo(px, py) : cc.moveTo(px, py))); cc.stroke();
      cc.shadowBlur = 0; cc.strokeStyle = '#fff2c0'; cc.lineWidth = main ? 1.4 : 0.8; cc.stroke();
      cc.restore();
    };
    for (let i = 0; i < webs; i++) {
      const ox = fw * (0.3 + random() * 0.4), oy = fh * (0.35 + random() * 0.4);
      const arms = 4 + Math.floor(random() * 3);
      for (let k = 0; k < arms; k++) {
        let x = ox, y = oy, angle = (k / arms) * Math.PI * 2 + random() * 0.8;
        const points: [number, number][] = [[x, y]];
        const steps = 6 + Math.floor(random() * 8);
        for (let j = 0; j < steps; j++) {
          angle += (random() - 0.5) * 0.7;
          const len = 20 + random() * 45;
          x += Math.cos(angle) * len; y += Math.sin(angle) * len;
          points.push([x, y]);
          // A side branch now and then.
          if (random() < 0.35) {
            let bx = x, by = y, ba = angle + (random() < 0.5 ? 1 : -1) * (0.6 + random() * 0.8);
            const branch: [number, number][] = [[bx, by]];
            for (let m = 0; m < 2 + Math.floor(random() * 4); m++) { ba += (random() - 0.5) * 0.6; const l = 12 + random() * 30; bx += Math.cos(ba) * l; by += Math.sin(ba) * l; branch.push([bx, by]); }
            stroke(branch, false);
          }
        }
        stroke(points, true);
      }
      // The impact point itself glows as a small hole.
      const hole = cc.createRadialGradient(ox, oy, 2, ox, oy, 26);
      hole.addColorStop(0, '#fff0c0'); hole.addColorStop(0.5, '#ff7a20'); hole.addColorStop(1, 'rgba(255,90,16,0)');
      cc.fillStyle = hole; cc.beginPath(); cc.arc(ox, oy, 26, 0, 7); cc.fill();
      fc.fillStyle = '#120806'; fc.beginPath(); fc.arc(ox, oy, 7 + random() * 5, 0, 7); fc.fill();
    }
    const floorMap = textureOf(floorCanvas.canvas), crackMap = textureOf(crackCanvas.canvas);
    const floorMat = new THREE.MeshStandardMaterial({ map: floorMap, emissive: glowTint, emissiveMap: crackMap, emissiveIntensity: glowStrength, roughness: a.floor === 'terrazzo' ? 0.4 : 0.9 });
    const edgeMat = s.material('#3a332c', { roughness: 1 });
    const floor = new THREE.Mesh(new THREE.BoxGeometry(W, 0.24, D), [edgeMat, edgeMat, floorMat, edgeMat, edgeMat, edgeMat]);
    floor.position.set(0, -0.12, 0);
    floor.receiveShadow = true;
    root.add(floor);
    world.ground = floor;

    // ---- Walls: beige tile with a dark dado ----
    const tileWall = (wM: number, hM: number) => paint(Math.round(wM * 64), Math.round(hM * 64), (c, w, h) => {
      c.fillStyle = '#cfc5a8'; c.fillRect(0, 0, w, h);
      const t = 64 * 0.3;
      for (let y = 0; y < h; y += t) for (let x = 0; x < w; x += t) {
        const dado = y > h - 64 * 1.1;
        c.fillStyle = dado ? `hsl(28, ${30 + random() * 8}%, ${34 + random() * 6}%)` : `hsl(44, ${26 + random() * 10}%, ${76 + random() * 6}%)`;
        c.fillRect(x + 1, y + 1, t - 2, t - 2);
      }
      c.fillStyle = '#5a4634'; c.fillRect(0, h - 64 * 1.1 - 3, w, 6);
      for (let k = 0; k < mood.wear * 30; k++) { c.fillStyle = 'rgba(50,30,15,0.25)'; c.fillRect(random() * w, h - 64 * 1.3 - random() * 64 * 0.6, 10 + random() * 50, 4 + random() * 20); }
      const scorch = c.createLinearGradient(0, h, 0, h - 64 * 1.6); scorch.addColorStop(0, `rgba(30,15,5,${0.15 + mood.warmth * 0.3})`); scorch.addColorStop(1, 'rgba(30,15,5,0)');
      c.fillStyle = scorch; c.fillRect(0, 0, w, h);
    });
    const wallSide = s.material('#b9b0a0', { roughness: 0.9 });
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(W, WALL_H, 0.24), [wallSide, wallSide, wallSide, wallSide, new THREE.MeshStandardMaterial({ map: tileWall(W, WALL_H), roughness: 0.55 }), wallSide]);
    backWall.position.set(0, WALL_H / 2, BACK - 0.12); backWall.receiveShadow = true; root.add(backWall);
    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.24, WALL_H, D), [new THREE.MeshStandardMaterial({ map: tileWall(D, WALL_H), roughness: 0.55 }), wallSide, wallSide, wallSide, wallSide, wallSide]);
    leftWall.position.set(LEFT - 0.12, WALL_H / 2, 0); leftWall.receiveShadow = true; root.add(leftWall);
    s.box([W + 0.24, 0.12, 0.08], [0, 0.06, BACK + 0.04], s.material('#2a2420'));
    s.box([0.08, 0.12, D], [LEFT + 0.04, 0.06, 0], s.material('#2a2420'));

    // ---- Ceiling lights: tubes floating where the ceiling would be ----
    const litMat = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#f3f6ff', emissiveIntensity: 1.4, roughness: 0.6 });
    const tubes = new Batch(litMat, undefined, false);
    let flicker: THREE.Mesh | null = null;
    for (const x of [-4.2, 0, 4.2]) for (const z of [-3.4, -0.2, 3]) {
      if (!flicker && mood.energy > 0.45 && x === -4.2 && z === -0.2) {
        flicker = s.box([2.4, 0.08, 0.3], [x, 3.55, z], litMat.clone());
        flicker.castShadow = false;
        continue;
      }
      tubes.add([2.4, 0.08, 0.3], [x, 3.55, z]);
    }
    tubes.build(root);
    const housings = new Batch(s.material('#d8d8d2'), undefined, false);
    for (const x of [-4.2, 0, 4.2]) for (const z of [-3.4, -0.2, 3]) housings.add([2.6, 0.06, 0.5], [x, 3.62, z]);
    housings.build(root);

    // ---- The reception counter and its frosted window ----
    const CW = 5.2, CH = 1.1, CD = 0.7;
    const counterZ = BACK + CD / 2 + 0.05;
    const laminate = s.material('#a98556', { roughness: 0.45 });
    const panel = s.material('#8c6e45', { roughness: 0.7 });
    s.box([CW, CH - 0.05, CD], [0, (CH - 0.05) / 2, counterZ], panel);
    s.box([CW + 0.08, 0.05, CD + 0.08], [0, CH - 0.025, counterZ], laminate);
    s.box([CW, 0.12, 0.04], [0, 0.06, counterZ + CD / 2 - 0.02], s.material('#2a2420'));
    // The frosted screen above, in a steel frame, with the office vaguely behind it.
    const frame = s.material('#9aa0a4', { metalness: 0.7, roughness: 0.4 });
    const glassZ = BACK + 0.2;
    for (const x of [-CW / 2, 0, CW / 2]) s.box([0.06, 1.3, 0.06], [x, CH + 0.65, glassZ], frame);
    s.box([CW + 0.06, 0.06, 0.06], [0, CH + 1.3, glassZ], frame);
    s.box([CW + 0.06, 0.06, 0.06], [0, CH + 0.03, glassZ], frame);
    const office = s.material('#d7b98a', { emissive: '#ffd9a0', emissiveIntensity: a.counter === 'open' ? 0.5 : 0.12 });
    s.box([CW - 0.1, 1.24, 0.02], [0, CH + 0.65, BACK + 0.05], office).castShadow = false;
    if (a.counter !== 'shutter') {
      // A shape behind the glass, if someone is in.
      if (a.counter === 'open' || random() < 0.5) {
        const shape = s.material('#5a3a30', { roughness: 1 });
        const sx = (random() - 0.5) * 3;
        s.mesh(new THREE.CapsuleGeometry(0.22, 0.5, 4, 10), shape, [sx, CH + 0.5, BACK + 0.1]);
        s.ball([0.14, 0.16, 0.14], [sx, CH + 1.02, BACK + 0.1], shape, 12);
      }
      const frost = new THREE.MeshStandardMaterial({ color: '#f1f4f2', transparent: true, opacity: 0.82, roughness: 0.3, depthWrite: false });
      for (const x of [-CW / 4, CW / 4]) {
        const pane = s.mesh(new THREE.PlaneGeometry(CW / 2 - 0.08, 1.22), frost, [x, CH + 0.65, glassZ + 0.01]);
        pane.castShadow = false; pane.renderOrder = 3;
      }
      if (a.counter === 'open') {
        s.box([0.7, 0.3, 0.06], [-0.4, CH + 0.3, glassZ + 0.02], s.material('#2a1a14'));
        s.box([0.7, 0.04, 0.1], [-0.4, CH + 0.14, glassZ + 0.03], frame);
      }
      const notice = a.counter === 'closed' ? 'CLOSED' : a.counter === 'back' ? 'BACK IN 5 MIN' : null;
      if (notice) {
        for (const x of [-0.25, 0.25]) s.rod([x, CH + 1.28, glassZ + 0.03], [x * 0.9, CH + 1.08, glassZ + 0.04], 0.004, s.material('#444'));
        s.label(notice, 0.6, 0.22, [0, CH + 0.96, glassZ + 0.045], '#a01818', '#f4efd9').rotation.z = (random() - 0.5) * 0.08;
      }
    } else {
      const ribs = new Batch(s.material('#8d9398', { metalness: 0.6, roughness: 0.45 }));
      for (let i = 0; i < 24; i++) ribs.add([CW - 0.1, 0.045, 0.03], [0, CH + 0.07 + i * 0.052, glassZ + 0.02]);
      ribs.build(root);
      s.box([CW, 0.12, 0.12], [0, CH + 1.32, glassZ], frame);
      s.label('CLOSED', 0.9, 0.28, [0, CH + 0.7, glassZ + 0.04], '#f4efd9', '#8c1c22').rotation.z = (random() - 0.5) * 0.1;
    }
    // Bell, pen on a chain, and a little bowl of mints nobody takes.
    const chrome = s.material('#d3d7da', { metalness: 0.9, roughness: 0.2 });
    s.lathe([[0, 0], [0.06, 0], [0.06, 0.01], [0.055, 0.03], [0.04, 0.05], [0.02, 0.065], [0, 0.07]], chrome, [-1.8, CH, counterZ + 0.15]);
    s.rod([-1.3, CH + 0.005, counterZ + 0.2], [-1.15, CH + 0.005, counterZ + 0.05], 0.006, s.material('#1b4fa0'));
    s.cylinder(0.1, 0.08, 0.05, [-0.6, CH + 0.025, counterZ + 0.15], s.material('#dfe3e6', { metalness: 0.6, roughness: 0.3 }), 16);

    // ---- The big sign and the clock ----
    const signMap = paint(1024, 160, (c, w, h) => {
      c.fillStyle = '#1b1416'; c.fillRect(0, 0, w, h);
      c.fillStyle = '#ff3b2a'; c.shadowColor = '#ff3b2a'; c.shadowBlur = 16; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.font = 'bold 92px sans-serif'; c.fillText(SIGN_TEXT[a.sign], w / 2, h / 2 + 4, w - 60);
      c.shadowBlur = 0; c.fillStyle = 'rgba(0,0,0,0.45)';
      for (let x = 0; x < w; x += 6) c.fillRect(x, 0, 2, h);
      for (let y = 0; y < h; y += 6) c.fillRect(0, y, w, 2);
    });
    s.box([5.4, 0.9, 0.12], [0, 2.95, BACK + 0.06], s.material('#2a2428'));
    const signFace = s.mesh(new THREE.PlaneGeometry(5.2, 0.78), new THREE.MeshStandardMaterial({ map: signMap, emissive: '#ffffff', emissiveMap: signMap, emissiveIntensity: 1.1, roughness: 0.4 }), [0, 2.95, BACK + 0.125]);
    signFace.castShadow = false;
    const clockX = 4.7, clockY = 2.6;
    const clockFace = paint(256, 256, (c, w, h) => {
      c.fillStyle = '#f3efe4'; c.beginPath(); c.arc(w / 2, h / 2, w / 2 - 2, 0, 7); c.fill();
      c.fillStyle = '#1f1f24'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = 'bold 28px sans-serif';
      for (let i = 1; i <= 12; i++) { const t = (i / 12) * Math.PI * 2 - Math.PI / 2; c.fillText(a.clock === 'infinity' ? '∞' : String(i), w / 2 + Math.cos(t) * 98, h / 2 + Math.sin(t) * 98); }
      c.fillStyle = '#1f1f24'; c.beginPath(); c.arc(w / 2, h / 2, 6, 0, 7); c.fill();
    });
    s.cylinder(0.42, 0.42, 0.08, [clockX, clockY, BACK + 0.04], s.material('#1f1f24'), 36).rotation.x = Math.PI / 2;
    s.mesh(new THREE.CircleGeometry(0.38, 36), new THREE.MeshStandardMaterial({ map: clockFace, roughness: 0.7 }), [clockX, clockY, BACK + 0.085]).castShadow = false;
    const hourHand = s.box([0.03, 0.22, 0.01], [0, 0.09, 0], s.material('#1f1f24'));
    const minuteHand = s.box([0.02, 0.33, 0.01], [0, 0.14, 0], s.material('#1f1f24'));
    const hour = new THREE.Group(), minute = new THREE.Group();
    hour.add(hourHand); minute.add(minuteHand);
    hour.position.set(clockX, clockY, BACK + 0.095); minute.position.set(clockX, clockY, BACK + 0.1);
    const stoppedHour = -(4 + 59 / 60) / 12 * Math.PI * 2, stoppedMinute = -(59 / 60) * Math.PI * 2;
    hour.rotation.z = stoppedHour; minute.rotation.z = stoppedMinute;
    if (a.clock !== 'nohands') root.add(hour, minute);

    // ---- Chairs: bolted banks, facing the counter ----
    const plasticTint = { orange: '#d9802d', beige: '#cfc3a3', teal: '#3d7f86', grey: '#8d9196', maroon: '#6e2a35' }[a.chairs];
    const shells = new Batch(s.material(plasticTint, { roughness: 0.45 }));
    const steel = new Batch(s.material('#8e9397', { metalness: 0.7, roughness: 0.4 }));
    const bank = (cx: number, cz: number, count: number, yaw: number) => {
      const pitch = 0.56;
      const base = new THREE.Matrix4().makeRotationY(yaw).setPosition(cx, 0, cz);
      const put = (batch: Batch, size: P, at: P, turn: P = [0, 0, 0]) => {
        const m = new THREE.Matrix4().compose(new THREE.Vector3(...at), new THREE.Quaternion().setFromEuler(new THREE.Euler(...turn)), new THREE.Vector3(1, 1, 1));
        const world = base.clone().multiply(m);
        const pos = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
        world.decompose(pos, q, sc);
        batch.add(size, pos.toArray() as P, new THREE.Euler().setFromQuaternion(q).toArray().slice(0, 3) as P);
      };
      const span = (count - 1) * pitch;
      put(steel, [span + 0.5, 0.05, 0.06], [0, 0.36, 0.05]);
      for (const lx of [-span / 2 - 0.1, span / 2 + 0.1]) { put(steel, [0.03, 0.36, 0.03], [lx, 0.18, 0.05]); put(steel, [0.1, 0.015, 0.26], [lx, 0.008, 0.05]); }
      for (let i = 0; i < count; i++) {
        const lx = -span / 2 + i * pitch;
        put(shells, [0.48, 0.04, 0.44], [lx, 0.43, 0.1]);
        put(shells, [0.48, 0.42, 0.035], [lx, 0.66, -0.13], [-0.16, 0, 0]);
        put(shells, [0.48, 0.07, 0.07], [lx, 0.42, -0.12]);
      }
    };
    bank(-3.8, 2.6, 5, 0); bank(3.8, 2.6, 5, 0);
    bank(-3.8, 4.5, 5, 0); bank(3.8, 4.5, 5, 0);
    bank(-6.2, -2.6, 3, Math.PI / 2);
    shells.build(root); steel.build(root);
    // Litter under the chairs when the room is crowded.
    if (mood.density > 0.3) {
      const litter = new Batch(new THREE.MeshStandardMaterial({ color: '#f0bccb', roughness: 0.9, side: THREE.DoubleSide }), new THREE.PlaneGeometry(0.06, 0.08), false);
      const n = Math.round(mood.density * 50);
      for (let i = 0; i < n; i++) litter.add([1, 1, 1], [(random() - 0.5) * 11, 0.004, (random() - 0.5) * 9], [-Math.PI / 2, 0, random() * 3]);
      litter.build(root);
    }

    // ---- Ticket dispenser on a post, by the counter ----
    const dx = 3.1, dz = -3.4;
    s.lathe([[0, 0], [0.22, 0], [0.23, 0.02], [0.2, 0.045], [0.05, 0.07], [0.035, 0.12], [0, 0.12]], s.material('#1b1d20'), [dx, 0, dz]);
    s.cylinder(0.028, 0.028, 1.3, [dx, 0.7, dz], s.material('#b8bec2', { metalness: 0.8, roughness: 0.32 }), 14);
    s.box([0.26, 0.17, 0.16], [dx, 1.35, dz], s.material('#c4232a', { roughness: 0.35 }));
    s.box([0.2, 0.05, 0.05], [dx, 1.28, dz + 0.1], s.material('#c4232a', { roughness: 0.35 }));
    s.label('TAKE ONE', 0.18, 0.05, [dx, 1.37, dz + 0.081], '#fbeedd', '#c4232a');
    s.mesh(new THREE.PlaneGeometry(0.07, 0.12), new THREE.MeshStandardMaterial({ color: '#f5c6d4', side: THREE.DoubleSide, roughness: 0.9 }), [dx, 1.2, dz + 0.13]).rotation.x = 0.3;

    // ---- Elevator doors in the left wall ----
    const ez = 1.6, eW = 1.0, eH = 2.15;
    const doorMat = s.material('#b9bdc0', { metalness: 0.8, roughness: 0.32 });
    s.box([0.1, eH + 0.1, eW + 0.2], [LEFT + 0.03, (eH + 0.1) / 2, ez], frame);
    const slide = { closed: 0, parted: 0.06, open: eW / 2 + 0.02 }[a.elevator];
    if (a.elevator !== 'closed') {
      // The wall thickens behind the doors to hold the shaft; only its inside faces are dark.
      const thick = new THREE.Mesh(new THREE.BoxGeometry(1.1, WALL_H, eW + 0.8), wallSide);
      thick.position.set(LEFT - 0.24 - 0.55, WALL_H / 2, ez); thick.receiveShadow = true; root.add(thick);
      const lining = new THREE.Mesh(new THREE.BoxGeometry(1.1, eH + 0.1, eW), new THREE.MeshStandardMaterial({ color: '#1a1416', roughness: 1, side: THREE.BackSide }));
      lining.position.set(LEFT - 0.5, eH / 2, ez); root.add(lining);
      const pit = new THREE.MeshStandardMaterial({ color: glowTint, emissive: glowTint, emissiveIntensity: glowStrength });
      s.mesh(new THREE.PlaneGeometry(0.9, eW - 0.1), pit, [LEFT - 0.55, 0.012, ez]).rotation.set(-Math.PI / 2, 0, 0);
      if (a.elevator === 'parted') s.mesh(new THREE.PlaneGeometry(0.12, eH - 0.1), pit, [LEFT - 0.2, eH / 2, ez]).rotation.y = Math.PI / 2;
    }
    for (const side of [-1, 1]) {
      const z = ez + side * (eW / 4 + slide);
      if (a.elevator === 'open' && Math.abs(z - ez) > eW / 2) continue;
      s.box([0.04, eH - 0.04, eW / 2], [LEFT + 0.08, eH / 2, z], doorMat);
    }
    const indMap = paint(128, 48, (c, w, h) => { c.fillStyle = '#0b0a0c'; c.fillRect(0, 0, w, h); c.fillStyle = '#ff3b2a'; c.shadowColor = '#ff3b2a'; c.shadowBlur = 8; c.beginPath(); c.moveTo(30, 10); c.lineTo(50, 10); c.lineTo(50, 24); c.lineTo(60, 24); c.lineTo(40, 42); c.lineTo(20, 24); c.lineTo(30, 24); c.closePath(); c.fill(); c.font = 'bold 30px monospace'; c.textBaseline = 'middle'; c.fillText('B9', 68, 26); });
    s.box([0.08, 0.2, 0.5], [LEFT + 0.06, eH + 0.32, ez], s.material('#15161a'));
    s.mesh(new THREE.PlaneGeometry(0.44, 0.16), new THREE.MeshStandardMaterial({ map: indMap, emissive: '#ffffff', emissiveMap: indMap, emissiveIntensity: 1.1 }), [LEFT + 0.101, eH + 0.32, ez]).rotation.y = Math.PI / 2;
    s.box([0.02, 0.2, 0.1], [LEFT + 0.09, 1.1, ez + eW / 2 + 0.25], frame);
    s.ball([0.01, 0.022, 0.022], [LEFT + 0.1, 1.07, ez + eW / 2 + 0.25], new THREE.MeshStandardMaterial({ color: '#ffd9a0', emissive: '#ffb347', emissiveIntensity: 1.6 }), 8).castShadow = false;
    s.box([0.8, 0.012, 0.6], [LEFT + 0.55, 0.006, ez], s.material('#4a3a2c', { roughness: 1 }));

    // ---- Plant in the corner ----
    const px = LEFT + 0.8, pz = BACK + 0.9;
    if (a.plant !== 'none') {
      s.lathe([[0, 0], [0.2, 0], [0.24, 0.3], [0.26, 0.33], [0.22, 0.33], [0.2, 0.3], [0, 0.3]], s.material(a.plant === 'plastic' ? '#e9e4d2' : '#b8603a', { roughness: 0.9 }), [px, 0, pz]);
      s.cylinder(0.2, 0.2, 0.02, [px, 0.3, pz], s.material(a.plant === 'burnt' ? '#2a2420' : '#4a3a2c'), 16);
      const stem = s.material(a.plant === 'plastic' ? '#3f7a3a' : a.plant === 'burnt' ? '#1a1412' : '#6b5438', { roughness: 0.9 });
      const leaf = s.material(a.plant === 'plastic' ? '#4faa48' : a.plant === 'burnt' ? '#1a1412' : '#8a6a3a', { roughness: a.plant === 'plastic' ? 0.2 : 0.95 });
      for (let i = 0; i < 6; i++) {
        const t = (i / 6) * Math.PI * 2 + random();
        const droop = a.plant === 'plastic' ? 0.0 : a.plant === 'burnt' ? 0.5 : 0.9;
        const top: P = [px + Math.cos(t) * 0.25 * (0.5 + droop), 0.3 + (1 - droop * 0.6) * (0.6 + random() * 0.4), pz + Math.sin(t) * 0.25 * (0.5 + droop)];
        s.tube([[px, 0.3, pz], [px + Math.cos(t) * 0.12, 0.3 + 0.5 * (1 - droop * 0.3), pz + Math.sin(t) * 0.12], top], 0.012, stem);
        if (a.plant !== 'burnt') for (let j = 0; j < 3; j++) { const l = s.box([0.08, 0.004, 0.16], [top[0] + (random() - 0.5) * 0.15, top[1] - j * 0.05, top[2] + (random() - 0.5) * 0.15], leaf); l.rotation.set((random() - 0.5) * 1.2, random() * 3, (random() - 0.5) * 1.2); }
      }
      if (a.plant === 'dead') for (let i = 0; i < 9; i++) s.box([0.08, 0.004, 0.14], [px + (random() - 0.5) * 1.1, 0.004, pz + (random() - 0.5) * 1.1], leaf).rotation.y = random() * 3;
      if (a.plant === 'burnt') s.scatter(new THREE.SphereGeometry(1, 6, 5), new THREE.MeshStandardMaterial({ color: '#ff8a2a', emissive: '#ff5a10', emissiveIntensity: 2 }), Array.from({ length: 7 }, () => ({ at: [px + (random() - 0.5) * 0.25, 0.32, pz + (random() - 0.5) * 0.25] as P, size: 0.012 })));
    } else {
      s.mesh(new THREE.RingGeometry(0.18, 0.26, 24), new THREE.MeshStandardMaterial({ color: '#5a4a3a', transparent: true, opacity: 0.5, depthWrite: false }), [px, 0.003, pz]).rotation.x = -Math.PI / 2;
    }

    // ---- The poster on the left wall ----
    const posterMap = paint(256, 352, (c, w, h) => {
      c.fillStyle = a.notice === 'none' ? '#e2d8bd' : '#f3eee0'; c.fillRect(0, 0, w, h);
      c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#1f1f24';
      if (a.notice === 'hang') {
        const sky = c.createLinearGradient(0, 0, 0, h * 0.7); sky.addColorStop(0, '#ff9a4a'); sky.addColorStop(1, '#ffd9a0'); c.fillStyle = sky; c.fillRect(12, 12, w - 24, h * 0.66);
        c.strokeStyle = '#4a3a2a'; c.lineWidth = 10; c.beginPath(); c.moveTo(30, 60); c.lineTo(w - 30, 60); c.stroke();
        c.fillStyle = '#3a2a1a'; c.beginPath(); c.ellipse(w / 2, 120, 34, 26, 0, 0, 7); c.fill(); c.fillRect(w / 2 - 10, 60, 20, 60);
        c.fillStyle = '#1f1f24'; c.font = 'bold 34px sans-serif'; c.fillText('HANG IN', w / 2, h * 0.8); c.fillText('THERE', w / 2, h * 0.9);
      } else if (a.notice === 'rules') {
        c.font = 'bold 30px sans-serif'; c.fillText('RULES', w / 2, 40);
        c.font = '19px sans-serif'; c.textAlign = 'left';
        ['NO talking', 'NO leaving', 'NO questions', 'NO food', 'NO hope', 'NO refunds', 'NO exceptions', 'NO'].forEach((line, i) => c.fillText(line, 24, 84 + i * 32));
      } else if (a.notice === 'wanted') {
        c.font = 'bold 44px serif'; c.fillText('WANTED', w / 2, 44);
        c.fillStyle = '#3a3a3e'; c.beginPath(); c.arc(w / 2, 150, 46, 0, 7); c.fill(); c.beginPath(); c.ellipse(w / 2, 270, 80, 70, 0, Math.PI, 0); c.fill();
        c.fillStyle = '#1f1f24'; c.font = 'bold 22px serif'; c.fillText('YOU', w / 2, h - 40);
      } else if (a.notice === 'exit') {
        c.fillStyle = '#1f7a3a'; c.fillRect(12, 12, w - 24, h - 24);
        c.fillStyle = '#ffffff'; c.font = 'bold 64px sans-serif'; c.fillText('EXIT', w / 2, 90);
        c.beginPath(); c.moveTo(w / 2 - 30, 150); c.lineTo(w / 2 + 30, 150); c.lineTo(w / 2 + 30, 240); c.lineTo(w / 2 + 70, 240); c.lineTo(w / 2, 320); c.lineTo(w / 2 - 70, 240); c.lineTo(w / 2 - 30, 240); c.closePath(); c.fill();
      } else {
        c.fillStyle = 'rgba(80,60,30,0.3)'; for (const [x, y] of [[20, 20], [w - 20, 20], [20, h - 20], [w - 20, h - 20]]) { c.beginPath(); c.arc(x, y, 5, 0, 7); c.fill(); }
      }
    });
    const posterZ = -1.2;
    if (a.notice !== 'none') s.box([0.05, 1.35, 1.0], [LEFT + 0.02, 2.1, posterZ], s.material('#2a2420'));
    s.mesh(new THREE.PlaneGeometry(0.92, 1.26), new THREE.MeshStandardMaterial({ map: posterMap, roughness: 0.9 }), [LEFT + (a.notice === 'none' ? 0.003 : 0.051), 2.1, posterZ]).rotation.y = Math.PI / 2;

    // ---- Extra dressing ----
    let cooler: THREE.MeshStandardMaterial | null = null;
    if (a.dressing === 'magazines') {
      const tx = -6.0, tz = 3.6;
      s.box([0.9, 0.04, 0.6], [tx, 0.42, tz], laminate);
      for (const x of [-0.4, 0.4]) for (const z of [-0.25, 0.25]) s.cylinder(0.015, 0.015, 0.4, [tx + x, 0.2, tz + z], s.material('#3a3a3c', { metalness: 0.6 }), 8);
      for (let i = 0; i < 7; i++) s.box([0.22, 0.008, 0.3], [tx - 0.3 + i * 0.1, 0.45 + i * 0.004, tz + (random() - 0.5) * 0.1], s.material(['#d3453a', '#2d6fb5', '#efe3c6', '#3e9b63', '#e9c43a', '#8a3d8a', '#f0f0f0'][i])).rotation.y = -0.4 + i * 0.12;
    } else if (a.dressing === 'vending') {
      const vx = 5.9, vz = -3.9;
      s.box([0.9, 1.9, 0.8], [vx, 0.95, vz], s.material('#2d3f7a', { roughness: 0.5 }));
      const shelfMap = paint(128, 256, (c, w, h) => { c.fillStyle = '#0d0d12'; c.fillRect(0, 0, w, h); for (let r = 0; r < 5; r++) for (let k = 0; k < 4; k++) { c.fillStyle = ['#d3453a', '#e9c43a', '#3e9b63', '#f0f0f0', '#8a3d8a'][(r + k) % 5]; c.fillRect(10 + k * 28, 14 + r * 46, 20, 32); } c.fillStyle = '#ffffff'; c.font = 'bold 14px sans-serif'; c.textAlign = 'center'; c.fillText('SNAX', w / 2, 246); });
      s.mesh(new THREE.PlaneGeometry(0.6, 1.3), new THREE.MeshStandardMaterial({ map: shelfMap, emissive: '#ffffff', emissiveMap: shelfMap, emissiveIntensity: 0.7 }), [vx - 0.1, 1.1, vz + 0.401]).castShadow = false;
      s.box([0.16, 0.4, 0.02], [vx + 0.32, 1.2, vz + 0.4], s.material('#1a1a1e'));
      s.box([0.5, 0.18, 0.02], [vx - 0.1, 0.28, vz + 0.4], s.material('#1a1a1e'));
    } else if (a.dressing === 'cooler') {
      const cx = -6.1, cz = 4.0;
      s.box([0.34, 0.9, 0.36], [cx, 0.47, cz], s.material('#e3d7b4', { roughness: 0.6 }));
      cooler = new THREE.MeshStandardMaterial({ color: glowTint, emissive: glowTint, emissiveIntensity: 0.8, transparent: true, opacity: 0.85 });
      s.lathe([[0.045, 0], [0.09, 0.08], [0.14, 0.2], [0.14, 0.5], [0.1, 0.57], [0, 0.58]], cooler, [cx, 0.95, cz]);
      s.cylinder(0.075, 0.09, 0.05, [cx, 0.94, cz], s.material('#2b2d30'), 16);
      for (const [i, x] of [-0.06, 0.06].entries()) s.box([0.035, 0.012, 0.045], [cx + x, 0.78, cz + 0.19], s.material(i ? '#8a1016' : '#c8242a'));
    } else if (a.dressing === 'tv') {
      const tvMap = paint(256, 144, (c, w, h) => { const bars = ['#c0c0c0', '#c0c000', '#00c0c0', '#00c000', '#c000c0', '#c00000', '#0000c0']; bars.forEach((b, i) => { c.fillStyle = b; c.fillRect((i * w) / 7, 0, w / 7 + 1, h * 0.75); }); c.fillStyle = '#111'; c.fillRect(0, h * 0.75, w, h * 0.25); c.fillStyle = '#fff'; c.font = 'bold 18px monospace'; c.textAlign = 'center'; c.fillText('PLEASE STAND BY', w / 2, h * 0.9); });
      s.box([0.08, 0.72, 1.2], [LEFT + 0.08, 2.4, 3.6], s.material('#15161a'));
      s.mesh(new THREE.PlaneGeometry(1.1, 0.62), new THREE.MeshStandardMaterial({ map: tvMap, emissive: '#ffffff', emissiveMap: tvMap, emissiveIntensity: 0.9 }), [LEFT + 0.121, 2.4, 3.6]).rotation.y = Math.PI / 2;
      s.box([0.3, 0.04, 0.04], [LEFT + 0.2, 2.1, 3.6], frame);
    }

    const rate = mix(0.3, 2.5, mood.energy);
    const phase = random() * 10;
    const baseUpdate = world.update;
    world.update = (dt, time) => {
      baseUpdate?.(dt, time);
      const t = time * rate + phase;
      floorMat.emissiveIntensity = glowStrength * (0.88 + 0.12 * Math.sin(t * 1.7) * Math.sin(t * 0.6));
      ember.intensity = mix(3, 9, mood.warmth) * (0.85 + 0.15 * Math.sin(t * 2.3));
      if (flicker) { const on = Math.sin(t * 19) * Math.sin(t * 5.3) + Math.sin(t * 1.1) > -0.1; (flicker.material as THREE.MeshStandardMaterial).emissiveIntensity = on ? 1.4 : 0.1; }
      if (a.clock === 'backwards') { minute.rotation.z = stoppedMinute + time * 0.6 * rate; hour.rotation.z = stoppedHour + time * 0.05 * rate; }
      else if (a.clock === 'ordinary' || a.clock === 'infinity') { minute.rotation.z = stoppedMinute - time * 0.1 * rate; hour.rotation.z = stoppedHour - time * 0.0083 * rate; }
      if (cooler) cooler.emissiveIntensity = 0.8 + 0.2 * Math.sin(t * 3);
    };
    return world;
  },
});
