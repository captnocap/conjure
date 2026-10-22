import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

const FABRICS = {
  grey: 'Mid grey tweed, the colour of nothing.',
  oatmeal: 'Oatmeal beige with flecks.',
  blue: 'Dusty corporate blue.',
  mauve: 'Mauve, a 1990s optimism.',
  green: 'Forest green, a law firm or an insurer.',
  rust: 'Rust orange, left over from the 1970s.',
} as const;
const FABRIC_HEX: Record<keyof typeof FABRICS, string> = { grey: '#8e9296', oatmeal: '#c2b79c', blue: '#6f86a3', mauve: '#a08a9c', green: '#5f7a66', rust: '#b06f4a' };
const PLATES = { none: 'No name plate, just an empty holder.', accounts: 'ACCOUNTS', sales: 'SALES', it: 'I.T. SUPPORT', claims: 'CLAIMS', temp: 'TEMP', manager: 'ASST. MANAGER' } as const;

type Item = { at: [number, number, number]; rot?: [number, number, number]; scale?: [number, number, number]; color?: THREE.ColorRepresentation };

export default defineThing({
  questions: {
    occupant: choice('Who sits here?', {
      newhire: 'A new hire: almost nothing yet, a welcome folder and one hopeful plant.',
      lifer: 'A twenty-year lifer: layers of yellowed paper, a cardigan, a service plaque, a tired plant.',
      striver: 'A striver: award plaques in a row, a trophy, everything squared to the desk edge.',
      parent: 'A parent: crayon drawings, framed family photos, a lunch bag.',
      hermit: 'A night-owl loner: toy figures along the monitor, a pyramid of cans, fairy lights.',
      temp: 'A temp: nothing personal at all, only a coat and a bag.',
    }),
    state: choice('What state is the pod in?', {
      occupied: 'In use right now: coffee steaming, a jacket over the partition, the owner just out of frame.',
      vacant: 'Tidy and switched off, gone home.',
      overtime: 'Overtime: the only light still on, takeaway cartons by the keyboard.',
      cleared: 'Cleared out: bare pins and pale rectangles on the fabric, a box on the desk, cables hanging.',
      birthday: 'Decorated for a birthday: streamers, balloons, a banner and a cake.',
      buried: 'Buried: towers of paper and folders on every surface and the floor.',
    }),
    fabric: choice('What colour is the partition fabric?', FABRICS),
    pinned: choice('What mostly covers the partition walls?', {
      memos: 'Memos, phone lists and printed emails, overlapping.',
      photos: 'Snapshots: holidays, pets, children.',
      postits: 'A mosaic of sticky notes.',
      calendar: 'A big wall calendar with the days crossed off.',
      poster: 'A motivational poster.',
      nothing: 'Almost nothing.',
    }),
    screen: choice('If the computer is on, what is on the screen?', {
      spreadsheet: 'A spreadsheet, rows without end.',
      terminal: 'Green text on black.',
      solitaire: 'A game of solitaire.',
      screensaver: 'A screensaver drifting through stars.',
      bluescreen: 'A blue error screen.',
    }),
    height: choice('How high are the partitions?', {
      low: 'Low, chest height: everyone can see everyone.',
      standard: 'Standard, just above a seated head, with an overhead storage bin.',
      tall: 'Tall privacy panels with an overhead storage bin.',
    }),
    plate: choice('What does the name plate by the opening say?', PLATES),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const S = 0.9;
    const H = { low: 1.12, standard: 1.42, tall: 1.7 }[a.height];
    const cleared = a.state === 'cleared';
    const personal = !cleared && a.occupant !== 'temp';
    const fabricColour = new THREE.Color(FABRIC_HEX[a.fabric]).lerp(new THREE.Color('#8d8674'), mood.wear * 0.3);
    const fabric = s.material(fabricColour, { roughness: 1 });
    const trim = s.material('#4a4d51', { roughness: 0.5 });
    const laminate = s.material(mood.warmth > 0.6 ? '#d9cdb0' : '#cfcfc8', { roughness: 0.45 });
    const beige = s.material(new THREE.Color('#d8d0b8').lerp(new THREE.Color('#c9b77c'), mood.wear * 0.4), { roughness: 0.55 });
    const dark = s.material('#2a2c2f');
    const paperWhite = s.material('#f4f1e6', { roughness: 0.95 });
    const add = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, at: [number, number, number]) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...at);
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    const inst = (geometry: THREE.BufferGeometry, material: THREE.Material, items: Item[], parent: THREE.Object3D = s.root) => {
      if (!items.length) { geometry.dispose(); return null; }
      const mesh = new THREE.InstancedMesh(geometry, material, items.length);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
      items.forEach((item, i) => {
        e.set(...(item.rot ?? [0, 0, 0]));
        m.compose(new THREE.Vector3(...item.at), q.setFromEuler(e), new THREE.Vector3(...(item.scale ?? [1, 1, 1])));
        mesh.setMatrixAt(i, m);
        mesh.setColorAt(i, new THREE.Color(item.color ?? '#ffffff'));
      });
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    const paint = (cw: number, ch: number, draw: (ctx: CanvasRenderingContext2D) => void, glow = 0) => {
      const canvas = document.createElement('canvas');
      canvas.width = cw; canvas.height = ch;
      draw(canvas.getContext('2d')!);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      return new THREE.MeshStandardMaterial({ map: texture, roughness: 0.7, ...(glow ? { emissive: new THREE.Color('#ffffff'), emissiveMap: texture, emissiveIntensity: glow } : {}) });
    };

    // --- Partitions: back wall, left wall and a short right return.
    const T = 0.06;
    const panel = (cx: number, cz: number, length: number, alongX: boolean) => {
      const size: [number, number, number] = alongX ? [length, H - 0.1, T] : [T, H - 0.1, length];
      s.box(size, [cx, 0.1 + (H - 0.1) / 2, cz], fabric);
      s.box(alongX ? [length, 0.1, T + 0.01] : [T + 0.01, 0.1, length], [cx, 0.05, cz], trim);
      s.box(alongX ? [length, 0.025, T + 0.012] : [T + 0.012, 0.025, length], [cx, H + 0.0125, cz], trim);
    };
    for (const x of [-S / 2, S / 2]) panel(x, -S, S, true);
    for (const z of [-S / 2, S / 2]) panel(-S, z, S, false);
    panel(S, -S + 0.33, 0.66, false);
    for (const [x, z] of [[-S, -S], [0, -S], [S, -S], [-S, 0], [-S, S], [S, -S + 0.66]] as const) s.box([T + 0.014, H + 0.03, T + 0.014], [x, (H + 0.03) / 2, z], trim);
    const wallZ = -S + T / 2 + 0.003, wallX = -S + T / 2 + 0.003;

    // --- Desk: an L of laminate along both walls.
    const deskY = 0.74, deskD = 0.62;
    const edge = s.material('#5a5650');
    s.box([2 * S - T, 0.035, deskD], [0, deskY, -S + T / 2 + deskD / 2], laminate);
    s.box([deskD, 0.035, 2 * S - T - deskD], [-S + T / 2 + deskD / 2, deskY, deskD / 2], laminate);
    s.box([2 * S - T - deskD, 0.037, 0.012], [deskD / 2, deskY, -S + T / 2 + deskD], edge);
    s.box([0.012, 0.037, 2 * S - T - deskD], [-S + T / 2 + deskD, deskY, deskD / 2], edge);
    s.box([0.03, deskY, deskD - 0.04], [S - T / 2 - 0.02, deskY / 2, -S + T / 2 + deskD / 2], laminate);
    // Pedestal drawers under the open end of the left run.
    const pedZ = S - 0.3;
    s.box([deskD - 0.1, deskY - 0.07, 0.42], [-S + T / 2 + deskD / 2, (deskY - 0.07) / 2 + 0.03, pedZ], s.material('#9a9d9c', { metalness: 0.2, roughness: 0.5 }));
    for (let i = 0; i < 3; i++) {
      const y = 0.14 + i * 0.2 + (i === 0 ? 0.02 : 0);
      s.box([0.012, 0.18, 0.38], [-S + T / 2 + deskD - 0.045, y + 0.03, pedZ], s.material('#aeb1b0', { metalness: 0.2, roughness: 0.5 }));
      s.box([0.014, 0.02, 0.14], [-S + T / 2 + deskD - 0.038, y + 0.08, pedZ], dark);
    }

    // --- Overhead bin with a task light, or a desk lamp when the walls are low.
    const hasBin = a.height !== 'low';
    const lampOn = a.state === 'overtime' || a.state === 'occupied' || (a.state !== 'vacant' && !cleared && Math.abs(mood.daylight - 0.5) > 0.3);
    const lampGlow = lampOn ? (a.state === 'overtime' ? 2.2 : 1.1) : 0;
    const warm = new THREE.Color().setHSL(mix(0.55, 0.11, mood.warmth), 0.7, 0.8);
    const lightMat = new THREE.MeshStandardMaterial({ color: lampOn ? warm : '#b9bbb4', emissive: warm, emissiveIntensity: lampGlow });
    const binX = 0.4, binW = 0.92, binY = H - 0.24;
    if (hasBin) {
      s.box([binW, 0.36, 0.36], [binX, binY, -S + T / 2 + 0.18], s.material('#a4a7a6', { metalness: 0.15, roughness: 0.5 }));
      s.box([binW - 0.03, 0.3, 0.012], [binX, binY + 0.01, -S + T / 2 + 0.365], laminate);
      s.box([0.2, 0.015, 0.02], [binX, binY - 0.12, -S + T / 2 + 0.38], dark);
      s.box([binW * 0.8, 0.03, 0.08], [binX, binY - 0.195, -S + T / 2 + 0.2], lightMat).castShadow = false;
      if (lampOn) {
        const pool = s.box([binW * 0.9, 0.004, 0.42], [binX, deskY + 0.021, -S + T / 2 + 0.3], new THREE.MeshBasicMaterial({ color: warm, transparent: true, opacity: a.state === 'overtime' ? 0.5 : 0.25, depthWrite: false }));
        pool.castShadow = false;
      }
    } else {
      const lx = 0.62, lz = -S + 0.2;
      s.cylinder(0.07, 0.08, 0.02, [lx, deskY + 0.028, lz], dark, 16);
      s.rod([lx, deskY + 0.03, lz], [lx - 0.08, deskY + 0.26, lz + 0.02], 0.008, dark);
      s.rod([lx - 0.08, deskY + 0.26, lz + 0.02], [lx - 0.2, deskY + 0.38, lz + 0.1], 0.008, dark);
      const shade = s.mesh(new THREE.ConeGeometry(0.08, 0.1, 16, 1, true), s.material('#3b5a48', { side: THREE.DoubleSide }), [lx - 0.22, deskY + 0.36, lz + 0.12]);
      shade.rotation.set(0.5, 0, 0.5);
      s.ball([0.03, 0.03, 0.03], [lx - 0.225, deskY + 0.34, lz + 0.13], lightMat, 10).castShadow = false;
    }

    // --- The computer in the corner: desktop case, CRT, keyboard, mouse.
    const pc = new THREE.Group();
    pc.position.set(-S + 0.42, deskY + 0.0175, -S + 0.42);
    pc.rotation.y = Math.PI / 4 + (cleared ? 0.7 : (random() - 0.5) * 0.15);
    if (cleared) pc.position.set(-S + 0.36, deskY + 0.0175, -S + 0.34);
    s.root.add(pc);
    const screenOn = a.state === 'occupied' || a.state === 'overtime' || a.state === 'buried' || (a.state === 'birthday' && a.screen !== 'bluescreen');
    add(pc, new THREE.BoxGeometry(0.42, 0.1, 0.38), beige, [0, 0.05, 0]);
    add(pc, new THREE.BoxGeometry(0.12, 0.012, 0.004), dark, [0.1, 0.065, 0.191]);
    add(pc, new THREE.BoxGeometry(0.02, 0.012, 0.006), new THREE.MeshStandardMaterial({ color: screenOn ? '#58e070' : '#445046', emissive: '#58e070', emissiveIntensity: screenOn ? 1 : 0 }), [-0.16, 0.04, 0.191]);
    add(pc, new THREE.CylinderGeometry(0.1, 0.12, 0.03, 16), beige, [0, 0.115, 0]);
    add(pc, new THREE.BoxGeometry(0.38, 0.33, 0.1), beige, [0, 0.295, 0.13]);
    add(pc, new THREE.BoxGeometry(0.34, 0.29, 0.2), beige, [0, 0.295, 0.0]);
    add(pc, new THREE.BoxGeometry(0.24, 0.21, 0.12), beige, [0, 0.29, -0.14]);
    const glass = screenOn
      ? paint(256, 192, (ctx) => {
        if (a.screen === 'spreadsheet') {
          ctx.fillStyle = '#f2f4f0'; ctx.fillRect(0, 0, 256, 192);
          ctx.fillStyle = '#2f7a4a'; ctx.fillRect(0, 0, 256, 18);
          ctx.strokeStyle = '#a9b0aa'; ctx.lineWidth = 1;
          for (let x = 0; x < 256; x += 42) { ctx.beginPath(); ctx.moveTo(x, 18); ctx.lineTo(x, 192); ctx.stroke(); }
          for (let y = 18; y < 192; y += 14) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(256, y); ctx.stroke(); }
          ctx.fillStyle = '#30343a';
          for (let i = 0; i < 46; i++) ctx.fillRect(4 + Math.floor(random() * 6) * 42, 22 + Math.floor(random() * 12) * 14, 12 + random() * 22, 6);
          ctx.fillStyle = '#c0392b'; for (let i = 0; i < 5; i++) ctx.fillRect(4 + 5 * 42, 22 + Math.floor(random() * 12) * 14, 26, 6);
        } else if (a.screen === 'terminal') {
          ctx.fillStyle = '#06120a'; ctx.fillRect(0, 0, 256, 192);
          ctx.fillStyle = '#4dff7a';
          for (let i = 0; i < 13; i++) ctx.fillRect(10, 10 + i * 13, 30 + random() * 190, 5);
          ctx.fillRect(10, 10 + 13 * 13, 10, 8);
        } else if (a.screen === 'solitaire') {
          ctx.fillStyle = '#1f7a3d'; ctx.fillRect(0, 0, 256, 192);
          for (let c = 0; c < 7; c++) for (let r = 0; r <= c; r++) {
            ctx.fillStyle = r === c ? '#fbfbf5' : '#2f4fa8'; ctx.fillRect(10 + c * 34, 56 + r * 11, 28, 38);
            if (r === c) { ctx.fillStyle = random() < 0.5 ? '#c0392b' : '#1b1b1b'; ctx.fillRect(14 + c * 34, 60 + r * 11, 7, 9); }
          }
          for (let c = 0; c < 4; c++) { ctx.fillStyle = '#fbfbf5'; ctx.fillRect(112 + c * 34, 8, 28, 38); }
          ctx.fillStyle = '#2f4fa8'; ctx.fillRect(10, 8, 28, 38);
        } else if (a.screen === 'screensaver') {
          ctx.fillStyle = '#03040c'; ctx.fillRect(0, 0, 256, 192);
          for (let i = 0; i < 90; i++) { const size = random() * 3 + 1; ctx.fillStyle = `rgba(255,255,255,${0.4 + random() * 0.6})`; ctx.fillRect(random() * 256, random() * 192, size, size); }
          for (let i = 0; i < 5; i++) { ctx.fillStyle = ['#ff5a4f', '#58c7ff', '#ffd23f', '#7dff7a'][i % 4]; const x = random() * 220, y = random() * 160, w = 12 + random() * 16; ctx.fillRect(x, y, w, w * 0.8); }
        } else {
          ctx.fillStyle = '#1433b8'; ctx.fillRect(0, 0, 256, 192);
          ctx.fillStyle = '#e9ecff'; ctx.fillRect(98, 22, 60, 14);
          for (let i = 0; i < 8; i++) ctx.fillRect(22, 52 + i * 14, 120 + random() * 90, 5);
        }
      }, mix(0.7, 1.1, mood.energy))
      : new THREE.MeshStandardMaterial({ color: '#27322d', roughness: 0.15 });
    const tube = add(pc, new THREE.PlaneGeometry(0.31, 0.25), glass, [0, 0.3, 0.1815]);
    tube.castShadow = false;
    const kb = new THREE.Group();
    kb.position.set(0.02, 0, 0.36);
    kb.rotation.y = (random() - 0.5) * 0.2;
    pc.add(kb);
    add(kb, new THREE.BoxGeometry(0.44, 0.025, 0.16), beige, [0, 0.0125, 0]);
    const keys: Item[] = [];
    for (let r = 0; r < 5; r++) for (let c = 0; c < 15; c++) keys.push({ at: [-0.196 + c * 0.028, 0.028, -0.056 + r * 0.028], color: (r === 0 || c > 12) ? '#b9b2a0' : '#eee8d6' });
    inst(new THREE.BoxGeometry(0.022, 0.008, 0.022), new THREE.MeshStandardMaterial({ roughness: 0.6 }), keys, kb);
    add(pc, new THREE.BoxGeometry(0.22, 0.004, 0.19), s.material(mood.cheer > 0.5 ? '#3f6fb5' : '#3a3d42'), [0.38, 0.002, 0.33]);
    add(pc, new THREE.BoxGeometry(0.06, 0.028, 0.1), beige, [0.37, 0.016, 0.33]);
    if (cleared) {
      const cable = s.material('#2a2c2f');
      s.tube([[-S + 0.2, deskY + 0.05, -S + 0.2], [-S + 0.12, deskY + 0.03, 0.1], [-S + 0.14, deskY - 0.02, 0.5], [-S + deskD - 0.02, deskY - 0.2, 0.52], [-S + deskD - 0.02, deskY - 0.48, 0.5]], 0.006, cable);
      s.tube([[0.1, deskY + 0.02, -S + deskD - 0.1], [0.2, deskY + 0.02, -S + deskD], [0.22, deskY - 0.25, -S + deskD + 0.01], [0.2, deskY - 0.45, -S + deskD + 0.01]], 0.005, cable);
    }

    // --- Phone on the right of the back run.
    const phoneX = hasBin ? 0.68 : 0.3, phoneZ = -S + 0.36;
    const phoneMat = s.material('#3a3d42');
    const phone = s.box([0.2, 0.05, 0.22], [phoneX, deskY + 0.045, phoneZ], phoneMat);
    phone.rotation.x = 0.12;
    const handset = s.mesh(new THREE.CapsuleGeometry(0.022, 0.16, 4, 8), phoneMat, [phoneX - 0.065, deskY + 0.085, phoneZ]);
    handset.rotation.x = Math.PI / 2 + 0.12;
    const message = !cleared && a.state !== 'occupied';
    const blink = s.box([0.02, 0.012, 0.02], [phoneX + 0.07, deskY + 0.078, phoneZ - 0.07], new THREE.MeshStandardMaterial({ color: '#ff3b2f', emissive: '#ff3b2f', emissiveIntensity: message ? 1.2 : 0 }));
    blink.castShadow = false;

    // --- What is pinned to the fabric.
    const pinLow = deskY + 0.14;
    const backMax = hasBin ? binX - binW / 2 - 0.04 : S - 0.1;
    const spot = (w: number, h: number, layer: number): { at: [number, number, number]; rot: [number, number, number]; back: boolean } => {
      const back = random() < (backMax + S) / (backMax + S + 2 * S - 0.2);
      const y = mix(pinLow + h / 2, H - 0.06 - h / 2, random());
      const tilt = (random() - 0.5) * 0.22;
      return back
        ? { at: [mix(-S + 0.1 + w / 2, backMax - w / 2, random()), y, wallZ + layer], rot: [0, 0, tilt], back }
        : { at: [wallX + layer, y, mix(-S + 0.15 + w / 2, S - 0.1 - w / 2, random())], rot: [tilt, Math.PI / 2, 0], back };
    };
    const sheet = () => new THREE.BoxGeometry(1, 1, 0.002);
    const plain = () => new THREE.MeshStandardMaterial({ roughness: 0.9 });
    const sheets: Item[] = [], borders: Item[] = [], pictures: Item[] = [], ghosts: Item[] = [], pins: Item[] = [];
    let layer = 0.002;
    const pinUp = (w: number, h: number, colour: THREE.ColorRepresentation, target: Item[] = sheets) => {
      layer += 0.0012;
      const p = spot(w, h, layer);
      target.push({ at: p.at, rot: p.rot, scale: [w, h, 1], color: colour });
      return p;
    };
    const amount = (few: number, many: number) => Math.round(mix(few, many, mood.density) * (a.occupant === 'newhire' ? 0.3 : a.occupant === 'lifer' ? 1.3 : a.occupant === 'temp' ? 0.4 : 1));
    const paperTones = ['#f4f1e6', '#efe9d2', '#e8efe9', '#f4e9a8', '#e6edf6'].map((c) => new THREE.Color(c).lerp(new THREE.Color('#d2b96f'), mood.wear * (a.occupant === 'lifer' ? 0.55 : 0.25)));
    const brights = ['#e36b4f', '#4f9fd8', '#62b86a', '#e8b23a', '#b06fc4', '#3fb5a8', '#d85a8a'];
    if (cleared) {
      // Ghosts where things hung, and the pins left behind.
      const pale = fabricColour.clone().lerp(new THREE.Color('#ffffff'), 0.22);
      for (let i = 0; i < amount(4, 9); i++) {
        const w = mix(0.1, 0.3, random()), h = mix(0.1, 0.3, random());
        const p = pinUp(w, h, pale, ghosts);
        if (random() < 0.7) pins.push({ at: [p.at[0] + (p.back ? (random() - 0.5) * w : 0.004), p.at[1] + h / 2 - 0.01, p.at[2] + (p.back ? 0.004 : (random() - 0.5) * w)], color: brights[i % 7] });
      }
    } else {
      const big = a.pinned === 'calendar' || a.pinned === 'poster';
      if (big) {
        const bw = Math.min(0.46, backMax + S - 0.3), bh = Math.min(0.58, H - pinLow - 0.12);
        const art = a.pinned === 'calendar'
          ? paint(256, 320, (ctx) => {
            ctx.fillStyle = '#f7f4ea'; ctx.fillRect(0, 0, 256, 320);
            ctx.fillStyle = mood.cheer > 0.5 ? '#d9534a' : '#3d5f8a'; ctx.fillRect(0, 0, 256, 70);
            ctx.fillStyle = '#ffffff'; ctx.font = 'bold 34px sans-serif'; ctx.textAlign = 'center';
            ctx.fillText(['JANUARY', 'MARCH', 'AUGUST', 'NOVEMBER'][Math.floor(random() * 4)], 128, 48);
            ctx.strokeStyle = '#9aa0a6'; ctx.lineWidth = 2;
            const done = Math.floor(random() * 30);
            for (let r = 0; r < 5; r++) for (let c = 0; c < 7; c++) {
              const x = 8 + c * 34.5, y = 82 + r * 46;
              ctx.strokeStyle = '#9aa0a6'; ctx.lineWidth = 2; ctx.strokeRect(x, y, 34.5, 46);
              if (r * 7 + c < done) { ctx.strokeStyle = '#c0271d'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x + 6, y + 8); ctx.lineTo(x + 28, y + 38); ctx.moveTo(x + 28, y + 8); ctx.lineTo(x + 6, y + 38); ctx.stroke(); }
            }
          })
          : paint(256, 320, (ctx) => {
            const sky = ctx.createLinearGradient(0, 0, 0, 240);
            sky.addColorStop(0, mood.cheer > 0.5 ? '#2a5fa8' : '#3a3550'); sky.addColorStop(1, mood.cheer > 0.5 ? '#f6c56a' : '#c9785a');
            ctx.fillStyle = '#111'; ctx.fillRect(0, 0, 256, 320);
            ctx.fillStyle = sky; ctx.fillRect(16, 16, 224, 224);
            ctx.fillStyle = '#fff1c2'; ctx.beginPath(); ctx.arc(170, 150, 26, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#1f2a33'; ctx.beginPath(); ctx.moveTo(16, 240); ctx.lineTo(90, 110); ctx.lineTo(140, 190); ctx.lineTo(190, 140); ctx.lineTo(240, 240); ctx.fill();
            ctx.fillStyle = '#f2efe4'; ctx.font = 'bold 26px serif'; ctx.textAlign = 'center';
            ctx.fillText(mood.cheer > 0.6 ? 'TEAMWORK' : mood.cheer > 0.3 ? 'PERSEVERANCE' : 'HANG IN THERE', 128, 284, 220);
          });
        const poster = s.mesh(new THREE.BoxGeometry(bw, bh, 0.004), art, [-S + 0.14 + bw / 2 + (backMax + S - 0.24 - bw) * random(), pinLow + 0.04 + bh / 2 + (H - pinLow - 0.12 - bh) * random(), wallZ + 0.003]);
        poster.rotation.z = (random() - 0.5) * 0.06;
        if (bw < 0.3) { poster.position.set(wallX + 0.003, poster.position.y, 0.25); poster.rotation.set(0, Math.PI / 2, 0); poster.scale.set(0.46 / bw, 1, 1); }
        layer = 0.006;
      }
      const kind = big ? 'memos' : a.pinned;
      if (kind === 'memos') for (let i = 0; i < amount(big ? 2 : 6, big ? 7 : 20); i++) pinUp(mix(0.12, 0.17, random()), mix(0.16, 0.22, random()), paperTones[Math.floor(random() * paperTones.length)]);
      if (kind === 'photos') for (let i = 0; i < amount(5, 16); i++) {
        const wide = random() < 0.6, w = wide ? 0.13 : 0.1, h = wide ? 0.1 : 0.13;
        const p = pinUp(w, h, '#f7f5ee', borders);
        pictures.push({ at: [p.at[0] + (p.back ? 0 : 0.0012), p.at[1] + 0.006, p.at[2] + (p.back ? 0.0012 : 0)], rot: p.rot, scale: [w * 0.84, h * 0.72, 1], color: new THREE.Color(brights[Math.floor(random() * 7)]).lerp(new THREE.Color('#8a8f96'), mix(0.5, 0.05, mood.cheer)) });
      }
      if (kind === 'postits') {
        const notes = ['#f6e05a', '#f6e05a', '#f59ac0', '#9be08a', '#8fd0f2', '#f5a95a'];
        for (let i = 0; i < amount(10, 44); i++) pinUp(0.075, 0.075, notes[Math.floor(random() * (mood.cheer > 0.4 ? 6 : 2))]);
      }
      if (kind === 'nothing') for (let i = 0; i < amount(0, 2); i++) pinUp(0.15, 0.2, paperTones[0]);
      if (a.occupant === 'parent') {
        for (let i = 0; i < 2 + Math.round(mood.density * 2); i++) {
          const drawing = paint(128, 96, (ctx) => {
            ctx.fillStyle = '#fbf8ee'; ctx.fillRect(0, 0, 128, 96);
            ctx.lineWidth = 5; ctx.lineCap = 'round';
            ctx.strokeStyle = '#f2b01e'; ctx.beginPath(); ctx.arc(100, 22, 12, 0, Math.PI * 2); ctx.stroke();
            ctx.strokeStyle = brights[Math.floor(random() * 7)]; ctx.strokeRect(18, 46, 38, 34);
            ctx.beginPath(); ctx.moveTo(14, 46); ctx.lineTo(37, 22); ctx.lineTo(60, 46); ctx.stroke();
            ctx.strokeStyle = brights[Math.floor(random() * 7)];
            for (const x of [76, 96]) { ctx.beginPath(); ctx.arc(x, 52, 7, 0, Math.PI * 2); ctx.moveTo(x, 59); ctx.lineTo(x, 82); ctx.stroke(); }
            ctx.strokeStyle = '#44b56b'; ctx.beginPath(); ctx.moveTo(0, 88); ctx.lineTo(128, 86); ctx.stroke();
          });
          layer += 0.0015;
          const p = spot(0.22, 0.165, layer);
          const mesh = s.mesh(new THREE.BoxGeometry(0.22, 0.165, 0.002), drawing, p.at);
          mesh.rotation.set(...p.rot);
        }
      }
      if (a.occupant === 'striver') {
        const wood = s.material('#5b3a24');
        const gold = s.material('#d9b659', { metalness: 0.5, roughness: 0.3 });
        const n = 2 + Math.round(mood.density * 2);
        for (let i = 0; i < n; i++) {
          const z = -0.2 + i * 0.2;
          s.box([0.012, 0.18, 0.14], [wallX + 0.008, H - 0.2, z], wood);
          s.box([0.004, 0.1, 0.09], [wallX + 0.016, H - 0.2, z], gold);
        }
      }
    }
    inst(sheet(), plain(), sheets);
    inst(sheet(), plain(), borders);
    inst(sheet(), plain(), pictures);
    inst(sheet(), new THREE.MeshStandardMaterial({ roughness: 1 }), ghosts);
    inst(new THREE.SphereGeometry(0.008, 6, 4), plain(), pins);

    // --- Desk-top life. Spots along the two runs.
    const backRun = (t: number, depth = 0.5): [number, number, number] => [mix(-0.15, S - 0.2, t), deskY + 0.0175, -S + T / 2 + deskD * depth];
    const leftRun = (t: number, depth = 0.5): [number, number, number] => [-S + T / 2 + deskD * depth, deskY + 0.0175, mix(-0.05, S - 0.12, t)];
    const stack = (at: [number, number, number], count: number, lean = 0.02) => {
      const items: Item[] = [];
      let y = at[1], dx = 0, dz = 0;
      for (let i = 0; i < count; i++) {
        const thick = mix(0.004, 0.03, random());
        dx += (random() - 0.5) * lean; dz += (random() - 0.5) * lean;
        items.push({ at: [at[0] + dx, y + thick / 2, at[2] + dz], rot: [0, (random() - 0.5) * 0.5, 0], scale: [mix(0.21, 0.24, random()), thick, mix(0.28, 0.31, random())], color: random() < 0.35 ? ['#d8c48a', '#c9b06e', '#b9c7a1', '#d99a7a', '#9db3c9'][Math.floor(random() * 5)] : paperTones[Math.floor(random() * 3)] });
        y += thick;
      }
      return items;
    };
    const paperwork: Item[] = [];
    const mug = (at: [number, number, number], colour: string, steamy: boolean) => {
      s.cylinder(0.04, 0.036, 0.09, [at[0], at[1] + 0.045, at[2]], s.material(colour, { roughness: 0.3 }), 14);
      s.ring(0.025, 0.007, [at[0] + 0.045, at[1] + 0.045, at[2]], s.material(colour, { roughness: 0.3 }));
      s.cylinder(0.034, 0.034, 0.003, [at[0], at[1] + 0.09, at[2]], s.material('#3a2416'), 12);
      if (!steamy) return [];
      const vapour = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.35, depthWrite: false });
      return [0, 1, 2].map((i) => { const puff = s.ball([0.018, 0.03, 0.018], [at[0], at[1] + 0.13 + i * 0.05, at[2]], vapour, 8); puff.castShadow = false; puff.userData.base = at[1] + 0.13; puff.userData.phase = i / 3; return puff; });
    };
    const plant = (at: [number, number, number], vigour: number) => {
      s.lathe([[0, 0], [0.05, 0], [0.07, 0.1], [0.078, 0.1], [0.078, 0.115], [0, 0.115]], s.material('#b5613f'), at);
      const leaf = s.material(new THREE.Color('#8c7a3c').lerp(new THREE.Color('#3f9447'), vigour));
      for (let i = 0; i < Math.round(mix(5, 13, vigour)); i++) {
        const angle = random() * Math.PI * 2, reach = mix(0.08, 0.2, random()), rise = mix(0.1, 0.24, random()) * mix(0.5, 1, vigour);
        s.tube([[at[0], at[1] + 0.11, at[2]], [at[0] + Math.cos(angle) * reach * 0.4, at[1] + 0.11 + rise, at[2] + Math.sin(angle) * reach * 0.4], [at[0] + Math.cos(angle) * reach, at[1] + 0.11 + rise * 0.5, at[2] + Math.sin(angle) * reach], [at[0] + Math.cos(angle) * reach * 1.2, at[1] + 0.08, at[2] + Math.sin(angle) * reach * 1.2]], 0.007, leaf);
      }
    };
    let steam: THREE.Mesh[] = [];
    const bobbers: THREE.Object3D[] = [];
    const flames: THREE.Mesh[] = [];

    if (!cleared) {
      // Letter trays on the left run, always.
      const trayAt = leftRun(0.55, 0.42);
      const trayMat = s.material('#3a3d42');
      const loads = a.state === 'buried' ? 14 : amount(2, 9);
      for (let i = 0; i < 2; i++) {
        s.box([0.26, 0.012, 0.34], [trayAt[0], trayAt[1] + 0.006 + i * 0.09, trayAt[2]], trayMat);
        for (const side of [-1, 1]) s.box([0.008, 0.05, 0.34], [trayAt[0] + side * 0.13, trayAt[1] + 0.03 + i * 0.09, trayAt[2]], trayMat);
        paperwork.push(...stack([trayAt[0], trayAt[1] + 0.012 + i * 0.09, trayAt[2]], Math.max(1, Math.round(loads * (i ? 0.6 : 0.4))), 0.012).map((item) => ({ ...item, scale: [item.scale![0], Math.min(item.scale![1], 0.008), item.scale![2]] as [number, number, number] })));
      }
      // A pen cup and a loose stack.
      const cup = backRun(0.25, 0.25);
      s.cylinder(0.035, 0.035, 0.1, [cup[0], cup[1] + 0.05, cup[2]], dark, 12);
      for (let i = 0; i < 4; i++) s.rod([cup[0] + (random() - 0.5) * 0.03, cup[1] + 0.05, cup[2] + (random() - 0.5) * 0.03], [cup[0] + (random() - 0.5) * 0.08, cup[1] + 0.17, cup[2] + (random() - 0.5) * 0.08], 0.004, s.material(['#2b4c9b', '#c0392b', '#e3b020', '#222'][i]));
      if (mood.density > 0.25 || a.state === 'buried') paperwork.push(...stack(backRun(0.55, 0.62), amount(2, 8)));
    }
    if (a.state === 'occupied') {
      steam = mug(backRun(0.05, 0.7), personal && mood.cheer > 0.5 ? '#e0563a' : '#f2f0e8', true);
      // A jacket over the right return.
      const cloth = s.material(mood.cheer > 0.6 ? '#7b6a4d' : '#3b4252', { roughness: 0.95 });
      s.box([0.12, 0.42, 0.4], [S, H - 0.17, -S + 0.36], cloth);
      for (const side of [-1, 1]) s.rod([S + side * 0.065, H - 0.02, -S + 0.2 + (side > 0 ? 0.3 : 0)], [S + side * 0.07, H - 0.6, -S + 0.2 + (side > 0 ? 0.32 : -0.02)], 0.04, cloth).scale.z = 0.5;
    } else if (a.state === 'overtime') {
      mug(backRun(0.05, 0.7), '#f2f0e8', false);
      const carton = s.material('#f4f1e6');
      for (let i = 0; i < 2 + Math.round(mood.density * 2); i++) {
        const at = backRun(0.3 + i * 0.16, 0.72 - (i % 2) * 0.2);
        const pail = s.mesh(new THREE.CylinderGeometry(0.055, 0.04, 0.1, 4), carton, [at[0], at[1] + 0.05, at[2]]);
        pail.rotation.y = random() * 2;
        s.box([0.03, 0.03, 0.002], [at[0], at[1] + 0.05, at[2] + 0.036], s.material('#c0271d')).rotation.y = pail.rotation.y;
        if (i === 0) for (const dx of [-0.01, 0.012]) s.rod([at[0] + dx, at[1] + 0.06, at[2]], [at[0] + dx + 0.06, at[1] + 0.2, at[2] + 0.05], 0.003, s.material('#c9a777'));
      }
    } else if (cleared) {
      // The packed box, and nothing else.
      const at = backRun(0.5, 0.5);
      const card = s.material('#b58f5e', { roughness: 0.95 });
      s.box([0.38, 0.24, 0.3], [at[0], at[1] + 0.12, at[2]], card);
      s.box([0.34, 0.01, 0.26], [at[0], at[1] + 0.245, at[2]], s.material('#3d5f8a'));
      s.box([0.14, 0.2, 0.012], [at[0] + 0.06, at[1] + 0.3, at[2] - 0.05], s.material('#2c2622')).rotation.x = -0.25;
      plant([at[0] - 0.1, at[1] + 0.2, at[2] + 0.03], mix(0.9, 0.3, mood.wear));
      const dust = new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.25, depthWrite: false });
      for (let i = 0; i < 3; i++) { const at2 = leftRun(0.2 + i * 0.3, 0.45); s.box([0.2, 0.002, 0.26], [at2[0], at2[1] + 0.002, at2[2]], dust).castShadow = false; }
    } else if (a.state === 'buried') {
      for (let i = 0; i < 5 + Math.round(mood.density * 4); i++) {
        const onLeft = i % 2 === 0;
        const at = onLeft ? leftRun(random(), mix(0.3, 0.7, random())) : backRun(random() * 0.9, mix(0.3, 0.7, random()));
        paperwork.push(...stack(at, Math.round(mix(8, 26, random())), 0.014));
      }
      for (let i = 0; i < 3; i++) paperwork.push(...stack([mix(-0.1, 0.6, random()), 0, mix(0.0, 0.7, random())], Math.round(mix(10, 30, random())), 0.014));
    } else if (a.state === 'birthday') {
      const party = ['#e23d4f', '#f2b01e', '#3f8fe0', '#44b56b', '#b06fc4'];
      // Streamers swagged along the partition tops.
      const swag = (from: [number, number, number], to: [number, number, number], colour: string) => {
        const mid: [number, number, number] = [(from[0] + to[0]) / 2, Math.min(from[1], to[1]) - mix(0.12, 0.25, random()), (from[2] + to[2]) / 2];
        const ribbon = s.tube([from, [(from[0] + mid[0]) / 2, (from[1] + mid[1]) / 2 - 0.05, (from[2] + mid[2]) / 2], mid, [(to[0] + mid[0]) / 2, (to[1] + mid[1]) / 2 - 0.05, (to[2] + mid[2]) / 2], to], 0.012, s.material(colour, { roughness: 0.6, emissive: colour, emissiveIntensity: 0.15 }));
        ribbon.scale.set(1, 1, 1);
      };
      swag([-S + 0.05, H, -S + 0.06], [0, H, -S + 0.06], party[0]);
      swag([0, H, -S + 0.06], [S - 0.05, H, -S + 0.06], party[1]);
      swag([-S + 0.06, H, -S + 0.05], [-S + 0.06, H, 0], party[2]);
      swag([-S + 0.06, H, 0], [-S + 0.06, H, S - 0.05], party[3]);
      const banner = s.label('HAPPY BIRTHDAY', Math.min(0.8, backMax + S - 0.16), 0.13, [(-S + backMax) / 2 + 0.03, H - 0.14, wallZ + 0.012], '#ffffff', mood.cheer > 0.4 ? '#e23d4f' : '#7a5a8a');
      banner.rotation.z = (random() - 0.5) * 0.05;
      // Balloons tied to the wall ends.
      const tie = (x: number, z: number, count: number) => {
        for (let i = 0; i < count; i++) {
          const g = new THREE.Group();
          const colour = party[Math.floor(random() * 5)];
          const length = mix(0.25, 0.55, random()) * mix(0.5, 1, mood.cheer);
          add(g, new THREE.CylinderGeometry(0.002, 0.002, length, 4), paperWhite, [0, length / 2, 0]);
          add(g, new THREE.SphereGeometry(0.13, 18, 12), s.material(colour, { roughness: 0.25, emissive: colour, emissiveIntensity: 0.15 }), [0, length + 0.14, 0]).scale.set(1, 1.18, 1);
          g.position.set(x, H, z);
          g.rotation.set((random() - 0.5) * 0.7, 0, (random() - 0.5) * 0.7);
          g.userData.tilt = [g.rotation.x, g.rotation.z, random() * 6];
          s.root.add(g);
          bobbers.push(g);
        }
      };
      tie(-S, S, 2 + Math.round(mood.density * 2));
      tie(S, -S + 0.66, 1 + Math.round(mood.density));
      // Cake.
      const at = backRun(0.5, 0.62);
      s.cylinder(0.15, 0.15, 0.008, [at[0], at[1] + 0.004, at[2]], paperWhite, 24);
      s.cylinder(0.12, 0.12, 0.09, [at[0], at[1] + 0.053, at[2]], s.material(mood.cheer > 0.5 ? '#f7c6d6' : '#f1ead8'), 24);
      s.cylinder(0.123, 0.123, 0.02, [at[0], at[1] + 0.03, at[2]], s.material('#7a4a30'), 24);
      const flame = new THREE.MeshStandardMaterial({ color: '#ffd23f', emissive: '#ffb020', emissiveIntensity: 2 });
      const candles = 3 + Math.floor(random() * 5);
      for (let i = 0; i < candles; i++) {
        const t = i / candles * Math.PI * 2;
        s.cylinder(0.005, 0.005, 0.05, [at[0] + Math.cos(t) * 0.07, at[1] + 0.122, at[2] + Math.sin(t) * 0.07], s.material(party[i % 5]), 6);
        const f = s.ball([0.008, 0.014, 0.008], [at[0] + Math.cos(t) * 0.07, at[1] + 0.158, at[2] + Math.sin(t) * 0.07], flame, 6);
        f.castShadow = false; flames.push(f);
      }
      const confetti: Item[] = [];
      for (let i = 0; i < 70; i++) {
        const onDesk = random() < 0.5;
        confetti.push({ at: onDesk ? [mix(-0.2, S - 0.1, random()), deskY + 0.02, -S + mix(0.1, deskD, random())] : [mix(-0.2, S, random()), 0.003, mix(-0.2, S, random())], rot: [0, random() * 3, 0], color: party[Math.floor(random() * 5)] });
      }
      inst(new THREE.BoxGeometry(0.02, 0.002, 0.012), plain(), confetti);
    }
    inst(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ roughness: 0.9 }), paperwork);

    // --- The occupant's own things.
    if (personal) {
      if (a.occupant === 'newhire') {
        const at = leftRun(0.15, 0.5);
        const folder = s.box([0.23, 0.012, 0.31], [at[0], at[1] + 0.006, at[2]], s.material('#2f8a86'));
        folder.rotation.y = 0.2;
        const welcome = s.label('WELCOME', 0.18, 0.05, [at[0], at[1] + 0.0135, at[2]], '#ffffff', '#2f8a86');
        welcome.rotation.set(-Math.PI / 2, 0, Math.PI / 2 - 0.2); welcome.castShadow = false;
        plant(backRun(0.8, 0.3), 1);
      } else if (a.occupant === 'lifer') {
        plant(leftRun(0.08, 0.3), mix(0.6, 0.1, mood.wear));
        const at = backRun(0.38, 0.22);
        s.box([0.16, 0.12, 0.02], [at[0], at[1] + 0.06, at[2]], s.material('#5b3a24')).rotation.x = -0.2;
        s.box([0.12, 0.07, 0.004], [at[0], at[1] + 0.062, at[2] + 0.012], s.material('#d9b659', { metalness: 0.5, roughness: 0.3 })).rotation.x = -0.2;
        const wool = s.material(mood.cheer > 0.5 ? '#8a5a6b' : '#6b6f5a', { roughness: 1 });
        s.box([0.4, 0.36, 0.1], [-S, H - 0.15, 0.45], wool).rotation.y = Math.PI / 2;
        const mugs = ['#e0563a', '#3d5a6e', '#f2f0e8', '#62b86a'];
        for (let i = 0; i < 2 + Math.round(mood.density * 2); i++) mug(leftRun(0.25 + i * 0.09, 0.78), mugs[i % 4], false);
      } else if (a.occupant === 'striver') {
        const gold = s.material('#d9b13b', { metalness: 0.55, roughness: 0.3, emissive: '#7a5a10', emissiveIntensity: mix(0.05, 0.3, mood.cheer) });
        const at = leftRun(0.1, 0.35);
        s.box([0.08, 0.04, 0.08], [at[0], at[1] + 0.02, at[2]], s.material('#3a2a20'));
        s.lathe([[0, 0], [0.03, 0], [0.011, 0.03], [0.011, 0.08], [0.045, 0.12], [0.058, 0.21], [0.05, 0.21], [0.04, 0.13], [0, 0.11]], gold, [at[0], at[1] + 0.04, at[2]]);
        const pad = backRun(0.5, 0.7);
        s.box([0.22, 0.012, 0.3], [pad[0], pad[1] + 0.006, pad[2]], s.material('#f6e05a'));
        s.rod([pad[0] + 0.14, pad[1] + 0.008, pad[2] - 0.13], [pad[0] + 0.14, pad[1] + 0.008, pad[2] + 0.02], 0.005, s.material('#1d2433'));
      } else if (a.occupant === 'parent') {
        for (let i = 0; i < 2 + Math.round(mood.density); i++) {
          const at = backRun(0.3 + i * 0.17, 0.2);
          const frame = s.box([0.13, 0.16, 0.014], [at[0], at[1] + 0.08, at[2]], s.material(['#2c2622', '#d9b659', '#f4f1e6'][i % 3]));
          frame.rotation.set(-0.2, (random() - 0.5) * 0.5, 0);
          const pic = s.box([0.1, 0.13, 0.004], [at[0], at[1] + 0.081, at[2] + 0.0075], s.material(brights[Math.floor(random() * 7)]));
          pic.rotation.copy(frame.rotation);
        }
        const bag = leftRun(0.1, 0.4);
        s.box([0.16, 0.22, 0.11], [bag[0], bag[1] + 0.11, bag[2]], s.material('#b58f5e', { roughness: 1 })).rotation.y = 0.4;
        s.box([0.165, 0.03, 0.115], [bag[0], bag[1] + 0.225, bag[2]], s.material('#a07b4c', { roughness: 1 })).rotation.set(0.2, 0.4, 0);
      } else if (a.occupant === 'hermit') {
        const toys: Item[] = [], heads: Item[] = [];
        for (let i = 0; i < 4 + Math.round(mood.density * 4); i++) {
          const at = backRun(-0.02 + i * 0.085, 0.14);
          const colour = brights[i % 7];
          toys.push({ at: [at[0], at[1] + 0.03, at[2]], scale: [1, 1 + random() * 0.6, 1], color: colour });
          heads.push({ at: [at[0], at[1] + 0.075 + random() * 0.02, at[2]], color: random() < 0.5 ? colour : '#e9c4a2' });
        }
        inst(new THREE.BoxGeometry(0.04, 0.06, 0.03), plain(), toys);
        inst(new THREE.SphereGeometry(0.02, 8, 6), plain(), heads);
        const cans: Item[] = [];
        const base = leftRun(0.12, 0.32);
        const rowsOfCans = 2 + Math.round(mood.density * 2);
        for (let r = 0; r < rowsOfCans; r++) for (let c = 0; c < rowsOfCans - r; c++) cans.push({ at: [base[0], base[1] + 0.06 + r * 0.12, base[2] + (c - (rowsOfCans - r - 1) / 2) * 0.068], color: ['#3be08a', '#1d2433', '#e23d4f'][(r + c) % 3] });
        inst(new THREE.CylinderGeometry(0.032, 0.032, 0.12, 12), new THREE.MeshStandardMaterial({ metalness: 0.4, roughness: 0.35 }), cans);
        const bulbs: Item[] = [];
        for (let i = 0; i < 22; i++) {
          const t = i / 21;
          const along = t < 0.5 ? [mix(-S + 0.05, S - 0.05, t * 2), -S + 0.045] : [-S + 0.045, mix(-S + 0.05, S - 0.05, (t - 0.5) * 2)];
          bulbs.push({ at: [along[0], H + 0.035 - Math.abs(Math.sin(t * 22)) * 0.03, along[1]], color: ['#ffd23f', '#ff6a4f', '#58c7ff', '#7dff7a'][i % 4] });
        }
        const lights = inst(new THREE.SphereGeometry(0.014, 8, 6), new THREE.MeshStandardMaterial({ emissive: '#ffffff', emissiveIntensity: 0.7, roughness: 0.3 }), bulbs);
        if (lights) lights.castShadow = false;
      }
    } else if (!cleared) {
      // The temp: a coat on the partition and a bag on the desk.
      const cloth = s.material('#55606b', { roughness: 0.95 });
      s.box([0.44, 0.6, 0.11], [-S, H - 0.27, 0.45], cloth).rotation.y = Math.PI / 2;
      const at = leftRun(0.12, 0.45);
      s.box([0.3, 0.2, 0.14], [at[0], at[1] + 0.1, at[2]], s.material('#3a3d42', { roughness: 0.8 })).rotation.y = 0.5;
    }

    // --- Wastebasket by the opening and the name plate on the wall end.
    const binAt: [number, number, number] = [S - 0.22, 0, -S + deskD + 0.28];
    s.lathe([[0, 0], [0.11, 0], [0.14, 0.3], [0.133, 0.3], [0.105, 0.012], [0, 0.012]], s.material('#4a4d51'), binAt);
    if (!cleared) {
      const wads: Item[] = [];
      const count = a.state === 'buried' ? 16 : amount(1, 9);
      for (let i = 0; i < count; i++) {
        const spilled = i > 6;
        wads.push({ at: [binAt[0] + (random() - 0.5) * (spilled ? 0.5 : 0.16), spilled ? 0.03 : 0.1 + i * 0.035, binAt[2] + (spilled ? 0.1 + random() * 0.3 : (random() - 0.5) * 0.16)], rot: [random() * 3, random() * 3, 0], scale: [1, 0.75, 1], color: '#f4f1e6' });
      }
      inst(new THREE.IcosahedronGeometry(0.04, 0), plain(), wads);
    }
    s.box([0.26, 0.085, 0.012], [-S + T / 2 + 0.13, H - 0.11, S + 0.02], trim);
    if (a.plate !== 'none' && !cleared) {
      const plate = s.label(PLATES[a.plate], 0.24, 0.065, [-S + T / 2 + 0.13, H - 0.11, S + 0.028], '#1d2433', '#e9e4d0');
      plate.castShadow = false;
    }
    // Carpet-level grime and coffee rings with wear.
    if (mood.wear > 0.5) {
      const ringMat = new THREE.MeshStandardMaterial({ color: '#6b4a2a', transparent: true, opacity: mix(0, 0.45, mood.wear), depthWrite: false });
      for (let i = 0; i < 4; i++) { const at = random() < 0.5 ? backRun(random(), 0.7) : leftRun(random(), 0.7); const ring = s.ring(0.035, 0.004, [at[0], at[1] + 0.003, at[2]], ringMat); ring.rotation.x = Math.PI / 2; ring.castShadow = false; }
    }

    const pace = mix(0.4, 1.6, mood.energy);
    const flicker = glass.emissiveIntensity;
    return s.finish({
      update: (_dt, time) => {
        for (const puff of steam) {
          const t = (time * 0.25 * pace + puff.userData.phase) % 1;
          puff.position.y = puff.userData.base + t * 0.16;
          (puff.material as THREE.MeshBasicMaterial).opacity = 0.35 * (1 - t);
        }
        for (const g of bobbers) {
          const [tx, tz, phase] = g.userData.tilt as [number, number, number];
          g.rotation.x = tx + Math.sin(time * 1.1 * pace + phase) * 0.06;
          g.rotation.z = tz + Math.cos(time * 0.9 * pace + phase) * 0.06;
        }
        for (const [i, f] of flames.entries()) f.scale.y = 0.014 * (1 + Math.sin(time * 11 + i * 2) * 0.25);
        if (screenOn) glass.emissiveIntensity = flicker * (1 + Math.sin(time * 37) * 0.03 * pace);
        if (message) (blink.material as THREE.MeshStandardMaterial).emissiveIntensity = Math.sin(time * 3 * pace) > 0 ? 1.4 : 0.1;
      },
    });
  },
});
