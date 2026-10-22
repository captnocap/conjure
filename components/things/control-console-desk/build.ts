import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

const ENAMEL = {
  cream: 'Cream enamel gone slightly yellow, the classic control-room colour.',
  eau: 'Pale eau-de-nil green enamel, hospital and power-station calm.',
  bluegrey: 'Cool blue-grey hammered paint, naval and bureaucratic.',
  olive: 'Drab military olive, a bunker console.',
  black: 'Black crackle finish with bright trim, an older and more sinister machine.',
} as const;
const ENAMEL_HEX: Record<keyof typeof ENAMEL, [string, string]> = {
  cream: ['#e6dcc0', '#cfc6a8'], eau: ['#bcd2bd', '#a3bba6'], bluegrey: ['#9fadb6', '#8996a0'], olive: ['#7d8460', '#6b724f'], black: ['#2e3033', '#414549'],
};
const LAMP = { green: '#1fd95f', amber: '#ffa91f', red: '#ff2a1c', white: '#fff6d8', off: '#4a504b' };

function painted(w: number, h: number, draw: (c: CanvasRenderingContext2D, w: number, h: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  draw(canvas.getContext('2d')!, w, h);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/** Side profile (z, y) swept along x: kneehole, writing ledge, sloped board, upright, back. */
const PROFILE: [number, number][] = [[0.5, 0.7], [0.5, 0.76], [0.14, 0.76], [-0.22, 1.06], [-0.27, 1.42], [-0.5, 1.42], [-0.5, 0], [0.1, 0], [0.1, 0.7]];
function shell(width: number) {
  const shape = new THREE.Shape();
  PROFILE.forEach(([z, y], i) => (i ? shape.lineTo(z, y) : shape.moveTo(z, y)));
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: width, bevelEnabled: false });
  geometry.rotateY(-Math.PI / 2);
  geometry.translate(width / 2, 0, 0);
  return geometry;
}

export default defineThing({
  questions: {
    board: choice('What do the indicator lamps say?', {
      calm: 'A calm board: nearly every lamp steady green, nothing asking for attention.',
      watch: 'Mostly green with a scatter of amber cautions, something drifting.',
      alarm: 'A rash of red across the board, many of them flashing.',
      dead: 'Every lamp dark but one: power lost or the plant long shut down.',
      test: 'Lamp test: every bulb lit at once in all colours, a Christmas tree.',
    }),
    touched: choice('Which control was a hand last on?', {
      none: 'None: the guard is down, the key is out, nothing has been touched in hours.',
      trip: 'The big red emergency trip button: its guard is flipped up and the button is pushed in.',
      key: 'The keyed lockout: the key is in and turned, a red tag swinging from it.',
      selector: 'The large pistol-grip selector, wrenched hard over to its last position with a warning tag hung on it.',
    }),
    layout: choice('How big is the console?', {
      desk: 'A single one-man desk section.',
      long: 'A long straight bench board for two operators.',
      wings: 'A centre desk with two angled wing sections wrapping around the operator.',
    }),
    upright: choice('What fills the upright panel at the back?', {
      gauges: 'A row of big round dial gauges.',
      lamps: 'A dense matrix of small status lamps in rows.',
      scope: 'A round green oscilloscope screen flanked by lamps.',
      mimic: 'A painted mimic diagram of pipes and valves with lamps at the junctions.',
    }),
    enamel: choice('What finish is the steel?', ENAMEL),
    ledge: choice('What is on the writing ledge?', {
      neat: 'A closed logbook squared to the edge and a full mug of tea gone cold.',
      writing: 'The logbook open mid-entry with a pen across it and a half-drunk mug.',
      spilt: 'The mug knocked over, tea pooled across loose log sheets.',
      bare: 'Nothing: wiped clean, or never used.',
    }),
    chair: choice('Where is the operator\'s chair?', {
      tucked: 'Tucked squarely under the ledge, the seat empty.',
      turned: 'Pushed back and swivelled away, as if someone just stood up.',
      toppled: 'Knocked over on its side behind the desk.',
      none: 'There is no chair.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const [bodyHex, insetHex] = ENAMEL_HEX[a.enamel];
    const body = s.material(bodyHex, { roughness: 0.45, metalness: 0.15 });
    const trim = s.material(a.enamel === 'black' ? '#b9bcbb' : '#3d4443', { roughness: 0.5, metalness: 0.4 });
    const dark = s.material('#1f2324', { roughness: 0.6 });
    const chrome = s.material('#d6dadb', { metalness: 0.85, roughness: 0.25 });
    const bakelite = s.material('#17191a', { roughness: 0.35 });
    const ink = a.enamel === 'black' ? '#e9e4d2' : '#20262a';

    const steady: { m: THREE.Matrix4; c: string }[] = [];
    const flashing: { m: THREE.Matrix4; c: string }[] = [];
    const toggles: THREE.Matrix4[] = [];
    const collars: THREE.Matrix4[] = [];
    const bezels: THREE.Matrix4[] = [];
    const needles: THREE.Object3D[] = [];
    let lampIndex = 0;
    const lampColour = (): [string, boolean] => {
      const r = random();
      lampIndex++;
      const broken = random() < mood.wear * 0.25;
      if (a.board === 'dead') return [lampIndex === 7 ? LAMP.amber : LAMP.off, false];
      if (broken) return [LAMP.off, false];
      if (a.board === 'calm') return [r < 0.82 ? LAMP.green : r < 0.9 ? LAMP.white : LAMP.off, false];
      if (a.board === 'watch') return [r < 0.5 ? LAMP.green : r < 0.82 ? LAMP.amber : LAMP.off, r > 0.74 && r < 0.82];
      if (a.board === 'alarm') return [r < 0.62 ? LAMP.red : r < 0.82 ? LAMP.amber : r < 0.9 ? LAMP.green : LAMP.off, r < 0.3];
      return [[LAMP.red, LAMP.amber, LAMP.green, LAMP.white][Math.floor(r * 4)], false];
    };

    const section = (width: number, main: boolean) => {
      const g = new THREE.Group();
      const add = <T extends THREE.Object3D>(parent: THREE.Object3D, child: T) => { parent.add(child); return child; };
      add(g, s.mesh(shell(width), body));
      for (const side of [-1, 1]) {
        const cheek = add(g, s.mesh(shell(0.035), trim, [side * (width / 2), 0, 0]));
        cheek.scale.set(1, 1.012, 1.03);
      }
      // Kneehole: kick plate, louvres and a foot rail.
      add(g, s.box([width - 0.12, 0.5, 0.01], [0, 0.4, 0.102], trim));
      for (let i = 0; i < 6; i++) add(g, s.box([width * 0.5, 0.012, 0.012], [0, 0.2 + i * 0.035, 0.11], dark));
      add(g, s.rod([-width / 2, 0.13, 0.3], [width / 2, 0.13, 0.3], 0.014, chrome));
      add(g, s.box([width, 0.012, 0.03], [0, 0.762, 0.49], chrome));

      const slope = add(g, new THREE.Group());
      slope.position.set(0, 0.76, 0.14);
      slope.rotation.x = -Math.atan2(0.36, 0.3);
      const SL = 0.469;
      const up = add(g, new THREE.Group());
      up.position.set(0, 1.06, -0.22);
      up.rotation.x = -Math.atan2(0.05, 0.36);
      const UL = 0.363;
      const world = (parent: THREE.Object3D, x: number, y: number, z: number, rx = 0, rz = 0, scale = 1) => {
        g.updateMatrixWorld(true);
        const local = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, 0, rz)), new THREE.Vector3(scale, scale, scale));
        return parent.matrixWorld.clone().multiply(local);
      };
      const lamp = (parent: THREE.Object3D, x: number, y: number, size = 1) => {
        const [c, flash] = lampColour();
        (flash ? flashing : steady).push({ m: world(parent, x, y, 0.008, 0, 0, size), c });
        bezels.push(world(parent, x, y, 0.005, 0, 0, size));
      };
      g.userData.populate = () => {
        // Engraved inset plates.
        const plate = (parent: THREE.Object3D, length: number, groups: number) => {
          const texture = painted(1024, Math.round(1024 * length / width), (c, w, h) => {
            c.fillStyle = insetHex; c.fillRect(0, 0, w, h);
            c.strokeStyle = ink; c.lineWidth = 3; c.globalAlpha = 0.7;
            for (let i = 0; i < groups; i++) c.strokeRect(14 + i * (w - 28) / groups + 6, 14, (w - 28) / groups - 12, h - 28);
            c.globalAlpha = 1;
            for (let i = 0; i < 34 * mood.wear; i++) {
              c.fillStyle = `rgba(70,50,30,${0.05 + random() * 0.12})`;
              c.beginPath(); c.ellipse(random() * w, random() * h, 20 + random() * 60, 8 + random() * 22, random() * 3, 0, 7); c.fill();
            }
          });
          const mesh = add(parent, s.mesh(new THREE.PlaneGeometry(width - 0.06, length - 0.03), new THREE.MeshStandardMaterial({ map: texture, roughness: 0.5 }), [0, length / 2, 0.003]));
          mesh.castShadow = false;
        };
        const groups = Math.max(2, Math.round(width / 0.5));
        plate(slope, SL, groups);
        plate(up, UL, main ? 1 : groups);

        // Pilot lamps along the top of the upright.
        const pilots = Math.round(width / 0.085);
        for (let i = 0; i < pilots; i++) lamp(up, (i - (pilots - 1) / 2) * 0.085, UL - 0.045, 1.5);

        const bank = (x0: number, x1: number, rows: number) => {
          const cols = Math.max(2, Math.round((x1 - x0) / mix(0.1, 0.066, mood.density)));
          for (let r = 0; r < rows; r++)
            for (let i = 0; i < cols; i++) {
              const x = x0 + (i + 0.5) * (x1 - x0) / cols, y = 0.08 + r * (SL - 0.12) / rows;
              collars.push(world(slope, x, y, 0.006));
              toggles.push(world(slope, x, y, 0.012, (random() < 0.5 ? -1 : 1) * 0.55));
              lamp(slope, x, y + 0.06);
            }
        };
        const selector = (x: number, y: number, radius: number, turn: number) => {
          add(slope, s.cylinder(radius * 1.5, radius * 1.5, 0.004, [x, y, 0.005], chrome, 20)).rotation.x = Math.PI / 2;
          const knob = add(slope, new THREE.Group());
          knob.position.set(x, y, 0.006);
          knob.rotation.z = turn;
          add(knob, s.cylinder(radius * 0.8, radius, radius * 0.9, [0, 0, radius * 0.45], bakelite, 16)).rotation.x = Math.PI / 2;
          add(knob, s.box([radius * 0.35, radius * 2.3, radius * 0.5], [0, radius * 0.2, radius * 1.1], bakelite));
          add(knob, s.box([radius * 0.1, radius * 0.8, 0.004], [0, radius * 0.85, radius * 1.36], s.material('#f1ead8')));
          return knob;
        };

        if (!main) {
          bank(-width / 2 + 0.06, width / 2 - 0.06, 2);
          for (let r = 0; r < 2; r++) for (let i = 0; i < Math.round(width / 0.07); i++) lamp(up, (i - (Math.round(width / 0.07) - 1) / 2) * 0.07, 0.09 + r * 0.09, 1.1);
          return;
        }
        const extra = (width - 1.5) / 2;
        bank(-width / 2 + 0.06, -0.26, 2);
        if (extra > 0.1) bank(0.76, width / 2 - 0.06, 2);

        // Rotary selectors: two small, one large pistol grip.
        selector(-0.14, 0.33, 0.026, (random() - 0.5) * 2);
        selector(0.14, 0.33, 0.026, (random() - 0.5) * 2);
        const grip = selector(0, 0.15, 0.05, a.touched === 'selector' ? -1.25 : (random() - 0.5) * 0.3);
        for (const dx of [-0.14, 0, 0.14]) lamp(slope, dx, 0.42);
        for (const dx of [-0.1, 0.1]) lamp(slope, dx, 0.2);
        const tagMaterial = s.material('#d8261c', { roughness: 0.7, side: THREE.DoubleSide });
        if (a.touched === 'selector') {
          const tag = add(slope, s.box([0.075, 0.12, 0.003], [0.085, 0.07, 0.03], tagMaterial));
          tag.rotation.set(0.25, 0, 0.3 + random() * 0.3);
          add(tag, s.box([0.05, 0.012, 0.004], [0, 0.02, 0.001], s.material('#f4efe2')));
          add(tag, s.box([0.05, 0.012, 0.004], [0, -0.01, 0.001], s.material('#f4efe2')));
          grip.position.z += 0.004;
        }

        // Emergency trip: striped collar, mushroom button, hinged clear guard.
        const tx = 0.4, ty = 0.2;
        const stripes = painted(128, 128, (c) => {
          c.fillStyle = '#f2c81e'; c.fillRect(0, 0, 128, 128);
          c.fillStyle = '#17191a';
          for (let i = -4; i < 8; i++) { c.beginPath(); c.moveTo(i * 32, 0); c.lineTo(i * 32 + 16, 0); c.lineTo(i * 32 + 144, 128); c.lineTo(i * 32 + 128, 128); c.fill(); }
        });
        add(slope, s.mesh(new THREE.PlaneGeometry(0.19, 0.19), new THREE.MeshStandardMaterial({ map: stripes, roughness: 0.6 }), [tx, ty, 0.005])).castShadow = false;
        const pressed = a.touched === 'trip';
        add(slope, s.cylinder(0.03, 0.035, 0.03, [tx, ty, 0.02], dark, 18)).rotation.x = Math.PI / 2;
        const button = add(slope, s.lathe([[0, 0.026], [0.03, 0.024], [0.052, 0.014], [0.055, 0.004], [0.03, 0], [0, 0]], s.material('#d21f17', { roughness: 0.3, emissive: '#7a0d08', emissiveIntensity: pressed ? 0.9 : 0.25 }), [tx, ty, pressed ? 0.02 : 0.036]));
        button.rotation.x = Math.PI / 2;
        const guard = add(slope, new THREE.Group());
        guard.position.set(tx, ty + 0.085, 0.01);
        guard.rotation.x = pressed ? -1.9 : 0;
        const glass = new THREE.MeshStandardMaterial({ color: '#ff9a8a', transparent: true, opacity: 0.3, roughness: 0.1, depthWrite: false, side: THREE.DoubleSide });
        add(guard, s.box([0.15, 0.17, 0.075], [0, -0.085, 0.045], glass)).castShadow = false;
        add(guard, s.box([0.16, 0.012, 0.012], [0, 0, 0.006], chrome));
        add(guard, s.box([0.16, 0.012, 0.012], [0, -0.17, 0.084], chrome));
        for (const side of [-1, 1]) add(guard, s.box([0.008, 0.17, 0.008], [side * 0.076, -0.085, 0.084], chrome));

        // Keyed lockout.
        const kx = 0.62, ky = 0.2;
        add(slope, s.cylinder(0.034, 0.034, 0.012, [kx, ky, 0.008], chrome, 20)).rotation.x = Math.PI / 2;
        add(slope, s.cylinder(0.018, 0.018, 0.02, [kx, ky, 0.014], s.material('#b08a3a', { metalness: 0.8, roughness: 0.3 }), 14)).rotation.x = Math.PI / 2;
        lamp(slope, kx, ky + 0.09, 1.4);
        lamp(slope, tx, ty + 0.2, 1.4);
        lamp(slope, kx, ky + 0.2, 1.4);
        if (a.touched === 'key') {
          const key = add(slope, new THREE.Group());
          key.position.set(kx, ky, 0.024);
          key.rotation.z = -1.1;
          add(key, s.box([0.008, 0.02, 0.04], [0, 0, 0.02], chrome));
          add(key, s.cylinder(0.022, 0.022, 0.006, [0, 0, 0.055], chrome, 14)).rotation.z = Math.PI / 2;
          const tag = add(slope, s.box([0.07, 0.13, 0.003], [kx + 0.03, ky - 0.1, 0.028], tagMaterial));
          tag.rotation.set(0.3, 0, -0.2 - random() * 0.3);
          add(tag, s.box([0.045, 0.012, 0.004], [0, 0.02, 0.001], s.material('#f4efe2')));
          add(slope, s.rod([kx, ky, 0.07], [kx + 0.02, ky - 0.045, 0.04], 0.003, chrome));
        }

        // Upright instruments.
        const lower = UL - 0.09;
        if (a.upright === 'gauges') {
          const n = Math.round(width / 0.36);
          for (let i = 0; i < n; i++) {
            const x = (i - (n - 1) / 2) * (width - 0.2) / n, r = 0.115;
            const value = a.board === 'alarm' ? (random() < 0.6 ? 0.97 : random()) : a.board === 'dead' ? 0 : a.board === 'watch' ? 0.45 + random() * 0.4 : 0.35 + random() * 0.25;
            const dial = painted(128, 128, (c) => {
              c.fillStyle = '#f3eedd'; c.beginPath(); c.arc(64, 64, 62, 0, 7); c.fill();
              c.lineWidth = 9;
              c.strokeStyle = '#3d9a52'; c.beginPath(); c.arc(64, 64, 50, Math.PI * 0.75, Math.PI * 1.75); c.stroke();
              c.strokeStyle = '#e0a11f'; c.beginPath(); c.arc(64, 64, 50, Math.PI * 1.75, Math.PI * 2.0); c.stroke();
              c.strokeStyle = '#cf2a1e'; c.beginPath(); c.arc(64, 64, 50, Math.PI * 2.0, Math.PI * 2.25); c.stroke();
              c.strokeStyle = '#20262a'; c.lineWidth = 3;
              for (let t = 0; t <= 10; t++) { const q = Math.PI * (0.75 + t * 0.15); c.beginPath(); c.moveTo(64 + Math.cos(q) * 40, 64 + Math.sin(q) * 40); c.lineTo(64 + Math.cos(q) * 56, 64 + Math.sin(q) * 56); c.stroke(); }
            });
            add(up, s.cylinder(r * 1.12, r * 1.12, 0.03, [x, lower / 2 + 0.005, 0.012], dark, 28)).rotation.x = Math.PI / 2;
            add(up, s.mesh(new THREE.CircleGeometry(r, 28), new THREE.MeshStandardMaterial({ map: dial, roughness: 0.4 }), [x, lower / 2 + 0.005, 0.029])).castShadow = false;
            const needle = add(up, new THREE.Group());
            needle.position.set(x, lower / 2 + 0.005, 0.033);
            needle.rotation.z = Math.PI * (0.75 - value * 1.5);
            needle.userData.rest = needle.rotation.z;
            needle.userData.live = a.board !== 'dead';
            add(needle, s.box([0.012, r * 0.92, 0.004], [0, r * 0.34, 0], s.material('#b3221a')));
            add(needle, s.cylinder(0.016, 0.016, 0.008, [0, 0, 0], dark, 10)).rotation.x = Math.PI / 2;
            needles.push(needle);
          }
        } else if (a.upright === 'lamps') {
          const cols = Math.round((width - 0.14) / 0.06);
          for (let r = 0; r < 4; r++) for (let i = 0; i < cols; i++) lamp(up, (i - (cols - 1) / 2) * 0.06, 0.05 + r * 0.06, 1.15);
        } else if (a.upright === 'scope') {
          const live = a.board !== 'dead';
          const trace = painted(256, 256, (c) => {
            c.fillStyle = live ? '#0d2a18' : '#151a17'; c.fillRect(0, 0, 256, 256);
            c.strokeStyle = 'rgba(120,255,160,0.25)'; c.lineWidth = 1;
            for (let i = 1; i < 8; i++) { c.beginPath(); c.moveTo(i * 32, 0); c.lineTo(i * 32, 256); c.moveTo(0, i * 32); c.lineTo(256, i * 32); c.stroke(); }
            if (!live) return;
            c.strokeStyle = '#8dffb0'; c.lineWidth = 6; c.beginPath();
            const wild = a.board === 'alarm' ? 80 : a.board === 'watch' ? 40 : 18;
            for (let x = 0; x <= 256; x += 4) { const y = 128 + Math.sin(x * 0.07 + random()) * wild * (a.board === 'alarm' ? random() : 1); if (x) c.lineTo(x, y); else c.moveTo(x, y); }
            c.stroke();
          });
          add(up, s.cylinder(0.14, 0.15, 0.04, [0, lower / 2 + 0.005, 0.016], dark, 28)).rotation.x = Math.PI / 2;
          add(up, s.mesh(new THREE.CircleGeometry(0.122, 28), new THREE.MeshStandardMaterial({ map: trace, emissiveMap: trace, emissive: '#ffffff', emissiveIntensity: live ? 0.9 : 0, roughness: 0.2 }), [0, lower / 2 + 0.005, 0.038])).castShadow = false;
          for (const side of [-1, 1]) {
            const cols = Math.round((width / 2 - 0.3) / 0.07);
            for (let r = 0; r < 3; r++) for (let i = 0; i < cols; i++) lamp(up, side * (0.24 + i * 0.07), 0.06 + r * 0.075, 1.15);
          }
        } else {
          const nodes: [number, number][] = [];
          const mimic = painted(1024, Math.round(1024 * lower / (width - 0.1)), (c, w, h) => {
            c.fillStyle = a.enamel === 'black' ? '#3d4347' : '#ece6d2'; c.fillRect(0, 0, w, h);
            const pipes = ['#2b6cb0', '#c0392b', '#2f8f4e', '#c98a16'];
            c.lineWidth = 16; c.lineCap = 'square'; c.lineJoin = 'miter';
            for (let p = 0; p < 4; p++) {
              c.strokeStyle = pipes[p];
              let x = 40, y = h * (0.2 + p * 0.2);
              c.beginPath(); c.moveTo(x, y);
              while (x < w - 60) {
                x += 80 + random() * 140; c.lineTo(Math.min(x, w - 40), y);
                if (random() < 0.5 && x < w - 100) { nodes.push([x / w, y / h]); y = h * (0.15 + Math.floor(random() * 4) * 0.23); c.lineTo(x, y); }
              }
              c.stroke();
            }
            c.fillStyle = '#20262a';
            for (const [u, v] of nodes) { c.beginPath(); c.moveTo(u * w - 22, v * h - 16); c.lineTo(u * w + 22, v * h + 16); c.lineTo(u * w + 22, v * h - 16); c.lineTo(u * w - 22, v * h + 16); c.fill(); }
          });
          add(up, s.mesh(new THREE.PlaneGeometry(width - 0.1, lower - 0.02), new THREE.MeshStandardMaterial({ map: mimic, roughness: 0.55 }), [0, lower / 2 + 0.005, 0.006])).castShadow = false;
          for (const [u, v] of nodes) lamp(up, (u - 0.5) * (width - 0.1), lower / 2 + 0.005 + (0.5 - v) * (lower - 0.02) - 0.035, 1.3);
        }
      };
      return g;
    };

    const mainWidth = a.layout === 'long' ? 2.5 : 1.5;
    const centre = section(mainWidth, true);
    s.root.add(centre);
    const sections = [centre];
    if (a.layout === 'wings')
      for (const side of [-1, 1]) {
        const wing = section(0.85, false);
        const angle = 0.55;
        wing.rotation.y = -side * angle;
        wing.position.set(side * (0.75 + 0.42 * Math.cos(angle)), 0, 0.42 * Math.sin(angle) + 0.06);
        s.root.add(wing);
        sections.push(wing);
      }
    s.root.updateMatrixWorld(true);
    for (const g of sections) (g.userData.populate as () => void)();

    // Instanced lamps, toggles and collars.
    const instanced = (geometry: THREE.BufferGeometry, material: THREE.Material, list: readonly THREE.Matrix4[], colours?: readonly string[]) => {
      const mesh = new THREE.InstancedMesh(geometry, material, Math.max(list.length, 1));
      mesh.count = list.length;
      list.forEach((m, i) => { mesh.setMatrixAt(i, m); if (colours) mesh.setColorAt(i, new THREE.Color(colours[i])); });
      mesh.castShadow = true;
      s.root.add(mesh);
      return mesh;
    };
    const lampGeometry = () => new THREE.SphereGeometry(0.015, 10, 6).scale(1, 1, 0.7);
    instanced(lampGeometry(), new THREE.MeshBasicMaterial({ color: '#ffffff' }), steady.map((l) => l.m), steady.map((l) => l.c));
    const flashMaterial = new THREE.MeshBasicMaterial({ color: '#ffffff' });
    instanced(lampGeometry(), flashMaterial, flashing.map((l) => l.m), flashing.map((l) => l.c));
    instanced(new THREE.CylinderGeometry(0.011, 0.011, 0.008, 10).rotateX(Math.PI / 2), chrome, collars);
    instanced(new THREE.CylinderGeometry(0.0205, 0.0205, 0.006, 12).rotateX(Math.PI / 2), dark, bezels);
    instanced(new THREE.CylinderGeometry(0.004, 0.006, 0.034, 8).rotateX(Math.PI / 2).translate(0, 0, 0.017), chrome, toggles);

    // The ledge: logbook, tea and the small litter of a long shift.
    const ly = 0.766;
    const paper = s.material('#f1ecdc', { roughness: 0.9 });
    const tea = s.material('#6b4321', { roughness: 0.25 });
    const mug = (x: number, z: number, state: 'full' | 'half' | 'over') => {
      const group = new THREE.Group();
      group.position.set(x, ly, z);
      s.root.add(group);
      const enamelMug = s.material('#f3f1ea', { roughness: 0.35 });
      const cup = s.lathe([[0.03, 0], [0.038, 0.005], [0.04, 0.09], [0.036, 0.09], [0.034, 0.012], [0, 0.012]], enamelMug);
      const handle = s.ring(0.022, 0.006, [0.05, 0.048, 0], enamelMug);
      group.add(cup, handle);
      if (state !== 'over') {
        const level = state === 'full' ? 0.08 : 0.045;
        group.add(s.cylinder(0.035, 0.035, 0.004, [0, level, 0], tea, 16));
        group.rotation.y = random() * 6;
      } else {
        group.rotation.set(0, random() * 6, Math.PI / 2);
        group.position.y += 0.04;
      }
    };
    if (a.ledge !== 'bare') {
      const bx = -0.32 + (random() - 0.5) * 0.1, bz = 0.33;
      if (a.ledge === 'neat') {
        const book = s.box([0.24, 0.035, 0.31], [bx, ly + 0.018, bz], s.material('#2f5a44', { roughness: 0.7 }));
        s.box([0.23, 0.027, 0.3], [bx + 0.004, ly + 0.018, bz], paper);
        s.label('LOG', 0.12, 0.05, [bx, ly + 0.0365, bz - 0.06], '#2f5a44', '#efe7cf').rotation.x = -Math.PI / 2;
        book.scale.z = 1.01;
        mug(0.42, 0.33, 'full');
      } else if (a.ledge === 'writing') {
        const lines = painted(256, 256, (c) => {
          c.fillStyle = '#f4efdf'; c.fillRect(0, 0, 256, 256);
          c.strokeStyle = '#8aa0b8'; c.lineWidth = 1;
          for (let i = 1; i < 16; i++) { c.beginPath(); c.moveTo(0, i * 16); c.lineTo(256, i * 16); c.stroke(); }
          c.strokeStyle = '#1c2a55'; c.lineWidth = 2;
          for (let i = 1; i < 9; i++) { c.beginPath(); c.moveTo(14, i * 16 - 4); for (let x = 14; x < 60 + random() * 180; x += 6) c.lineTo(x, i * 16 - 4 + (random() - 0.5) * 6); c.stroke(); }
        });
        const page = new THREE.MeshStandardMaterial({ map: lines, roughness: 0.9 });
        s.box([0.46, 0.012, 0.31], [bx, ly + 0.006, bz], s.material('#2f5a44'));
        for (const side of [-1, 1]) {
          const leaf = s.box([0.215, 0.014, 0.295], [bx + side * 0.11, ly + 0.017, bz], page);
          leaf.rotation.z = -side * 0.06;
        }
        s.rod([bx - 0.02, ly + 0.03, bz + 0.07], [bx + 0.12, ly + 0.03, bz - 0.03], 0.005, s.material('#1c2a55'));
        mug(0.42, 0.33, 'half');
      } else {
        const sheets = 4 + Math.floor(random() * 4 + mood.density * 4);
        for (let i = 0; i < sheets; i++) {
          const sheet = s.box([0.21, 0.002, 0.297], [-0.45 + random() * 0.9, ly + 0.002 + i * 0.002, 0.3 + random() * 0.08], paper);
          sheet.rotation.y = (random() - 0.5) * 1.6;
        }
        const px = 0.25 + random() * 0.2;
        s.cylinder(0.16, 0.16, 0.004, [px - 0.1, ly + 0.02, 0.34], tea, 24).scale.set(1.3, 1, 0.75);
        s.cylinder(0.05, 0.05, 0.004, [px - 0.33, ly + 0.021, 0.4], tea, 14);
        // Tea running off the edge and down to the floor.
        s.box([0.05, 0.004, 0.1], [px - 0.1, ly + 0.02, 0.46], tea);
        s.box([0.03, 0.09, 0.004], [px - 0.1, ly - 0.05, 0.503], tea);
        s.box([0.012, 0.05, 0.004], [px - 0.06, ly - 0.03, 0.503], tea);
        s.cylinder(0.16, 0.16, 0.004, [px - 0.1, 0.002, 0.62], tea, 20).scale.set(1, 1, 0.7);
        mug(px + 0.08, 0.36, 'over');
      }
      const litter = Math.round(mood.density * 4);
      for (let i = 0; i < litter; i++) {
        const x = (i % 2 ? 1 : -1) * (0.05 + random() * (mainWidth / 2 - 0.2)), z = 0.24 + random() * 0.18;
        if (i === 0) { s.cylinder(0.05, 0.04, 0.02, [x, ly + 0.01, z], s.material('#9aa3a5', { metalness: 0.6 }), 14); s.rod([x - 0.02, ly + 0.025, z], [x + 0.045, ly + 0.03, z + 0.02], 0.004, paper); }
        else if (i === 1) s.box([0.2, 0.008, 0.28], [x, ly + 0.004, z], s.material('#8a6b45')).rotation.y = (random() - 0.5) * 0.8;
        else s.rod([x - 0.06, ly + 0.005, z], [x + 0.06, ly + 0.005, z + (random() - 0.5) * 0.1], 0.004, s.material(i === 2 ? '#d9a514' : '#b3221a'));
      }
    }

    // Operator's swivel chair.
    if (a.chair !== 'none') {
      const chair = new THREE.Group();
      const vinyl = s.material(a.enamel === 'eau' || a.enamel === 'olive' ? '#5b3b2a' : '#3f5a4b', { roughness: 0.55 });
      for (let i = 0; i < 5; i++) {
        const q = i * Math.PI * 0.4;
        chair.add(s.rod([0, 0.07, 0], [Math.cos(q) * 0.3, 0.04, Math.sin(q) * 0.3], 0.018, chrome));
        chair.add(s.ball([0.028, 0.028, 0.028], [Math.cos(q) * 0.3, 0.028, Math.sin(q) * 0.3], dark, 8));
      }
      chair.add(s.cylinder(0.025, 0.03, 0.4, [0, 0.27, 0], chrome, 12));
      chair.add(s.box([0.46, 0.08, 0.44], [0, 0.5, 0], vinyl));
      chair.add(s.box([0.42, 0.34, 0.06], [0, 0.85, 0.22], vinyl));
      chair.add(s.rod([0, 0.48, 0.2], [0, 0.72, 0.25], 0.014, chrome));
      if (a.chair === 'tucked') chair.position.set((random() - 0.5) * 0.1, 0, 0.78);
      else if (a.chair === 'turned') { chair.position.set(0.2 + random() * 0.3, 0, 1.25 + random() * 0.2); chair.rotation.y = 0.9 + random() * 1.4; }
      else { chair.position.set(-0.2 + random() * 0.5, 0.24, 1.3); chair.rotation.set(0, random() * 6, Math.PI / 2); }
      s.root.add(chair);
    }

    const rate = mix(1.5, 7, mood.energy);
    const lit = new THREE.Color('#ffffff'), dim = new THREE.Color('#3a3530');
    return s.finish({
      update: (_dt, time) => {
        flashMaterial.color.copy(Math.sin(time * rate) > 0 ? lit : dim);
        for (const needle of needles) if (needle.userData.live) needle.rotation.z = needle.userData.rest + Math.sin(time * rate * 0.6 + needle.position.x * 9) * 0.03 * (0.4 + mood.energy);
      },
    });
  },
});
