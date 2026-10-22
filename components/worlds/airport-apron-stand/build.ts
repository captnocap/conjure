import * as THREE from 'three';
import { type Placeable, Sculpture, choice, defineWorld, mix } from '@conjure/kit';

type P = [number, number, number];
type Ctx = CanvasRenderingContext2D;

const CAM: P = [0, 1.15, 27];
const FOV = 40, HALF = Math.tan(THREE.MathUtils.degToRad(FOV / 2));

const HOURS = {
  dawn: { top: '#8fa9cf', low: '#f6c9b0', sun: '#fff0d8', key: '#ffc9a0', power: 2.3, hemi: 1.05, dark: 0.55, lift: 13, haze: 0.5, wet: false },
  bluehour: { top: '#566c9c', low: '#c3b2be', sun: '#f2d6cf', key: '#b9c6ee', power: 1.1, hemi: 0.95, dark: 1, lift: 26, haze: 0.55, wet: false },
  redeye: { top: '#7f8a97', low: '#bcc0c4', sun: '#d4d8dc', key: '#cfd6e0', power: 0.9, hemi: 1.0, dark: 0.75, lift: 42, haze: 0.62, wet: true },
  golden: { top: '#5fa3dd', low: '#fbe6bd', sun: '#fffbe6', key: '#fff0c8', power: 3.0, hemi: 1.15, dark: 0, lift: 24, haze: 0.38, wet: false },
  fog: { top: '#cdd2d4', low: '#e2e4e2', sun: '#f2f3f1', key: '#eef0f0', power: 0.8, hemi: 1.25, dark: 0.5, lift: 45, haze: 0.9, wet: false },
  heat: { top: '#8cc0ea', low: '#f3ecd6', sun: '#ffffff', key: '#fffbe8', power: 3.2, hemi: 1.2, dark: 0, lift: 62, haze: 0.45, wet: false },
} as const;

class Batch {
  private rows: { m: THREE.Matrix4; c: THREE.Color }[] = [];
  put(size: P, at: P, colour: THREE.ColorRepresentation, euler: P = [0, 0, 0]) {
    this.rows.push({ m: new THREE.Matrix4().compose(new THREE.Vector3(...at), new THREE.Quaternion().setFromEuler(new THREE.Euler(...euler)), new THREE.Vector3(...size)), c: new THREE.Color(colour) });
  }
  mesh(geometry: THREE.BufferGeometry, material: THREE.Material, shadows = false) {
    const mesh = new THREE.InstancedMesh(geometry, material, Math.max(1, this.rows.length));
    mesh.count = this.rows.length;
    this.rows.forEach((row, index) => { mesh.setMatrixAt(index, row.m); mesh.setColorAt(index, row.c); });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.castShadow = shadows; mesh.receiveShadow = true; mesh.frustumCulled = false;
    return mesh;
  }
}

function painted(width: number, height: number, cw: number, ch: number, draw: (ctx: Ctx, w: number, h: number) => void, glow = 0) {
  const canvas = document.createElement('canvas'); canvas.width = cw; canvas.height = ch;
  draw(canvas.getContext('2d')!, cw, ch);
  const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 4;
  const material = new THREE.MeshStandardMaterial({ map, roughness: 0.85, emissive: '#ffffff', emissiveMap: map, emissiveIntensity: glow });
  return new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
}

export default defineWorld({
  questions: {
    hour: choice('What are the hour and the weather on the apron?', {
      dawn: 'Dawn: a peach horizon under pale blue, long shadows, floodlights still burning.',
      bluehour: 'The blue hour before sunrise: everything lilac-grey, every lamp and window lit.',
      redeye: 'A grey wet red-eye morning: drizzle, slick concrete, lights smeared in puddles.',
      golden: 'A bright clear morning straight off a 1960s postcard: blue sky, crisp shadows.',
      fog: 'Fog: the terminal and tower are ghosts and flights are delayed.',
      heat: 'White midday heat, the horizon wobbling, nothing moving.',
    }),
    terminal: choice('What kind of airport stands on the horizon?', {
      jetage: 'A 1960s jet-age terminal: a long glazed pier, a white concrete shell roof and a mushroom-topped control tower.',
      municipal: 'A small municipal airport: a brick building with a stubby tower cab on its roof, one arched hangar and a beacon.',
      megahub: 'A modern hub: an endless glass pier bristling with jet bridges and a needle of a tower.',
      airstrip: 'A remote airstrip: a tin shed, a radio mast, fuel drums and a cabin on stilts for a tower.',
    }),
    stand: choice('Which stand is this?', {
      one: 'Stand 1: the prestige spot right under the terminal windows.',
      thirteen: 'Stand 13: the one the crews are superstitious about.',
      fortyseven: 'Stand 47: a remote stand far out on the apron, reached by bus, the terminal a long way off.',
      cargo: 'Stand R9: the night-mail and cargo corner, away from the passengers.',
    }),
    surface: choice('What is the apron made of?', {
      concrete: 'Pale concrete slabs with tarred joints.',
      asphalt: 'Dark asphalt, patched and re-patched.',
      planking: 'A strip of old steel planking laid over grass, a wartime airfield still in use.',
      snow: 'Concrete swept clear between banks of ploughed snow.',
    }),
    state: choice('What is happening on the stand?', {
      empty: 'Nothing. It is waiting for the next arrival.',
      turnaround: 'A turnaround is being set up: cones at the wingtips, chocks ready, a ground power cart humming.',
      departed: 'A flight has just gone: fresh tyre scuffs curving away, a pair of chocks left behind, a paper cup rolling.',
      closed: 'The stand is closed: red and white barriers, a white cross painted over the number, weeds in the joints.',
    }),
    sky: choice('What is in the sky?', {
      empty: 'Nothing at all, a clean enormous sky.',
      contrail: 'One high contrail drawn straight across.',
      departure: 'A small airliner climbing away, gear still down.',
      streaks: 'Long thin bars of cloud lit from underneath.',
      moon: 'A pale moon still up.',
      birds: 'A loose flock of birds wheeling over the grass.',
    }),
  },

  build(a, context) {
    const art = new Sculpture(context);
    const { root } = art;
    const { mood, random } = context;
    const H = HOURS[a.hour];
    const dark = H.dark, wear = mood.wear;
    const low = new THREE.Color(H.low).lerp(new THREE.Color(mood.warmth > 0.5 ? '#ffb07a' : '#b5c8ea'), Math.abs(mood.warmth - 0.5) * 0.3);
    const lowHex = '#' + low.getHexString();
    const haze = (colour: THREE.ColorRepresentation, amount: number) => new THREE.Color(colour).lerp(low, Math.min(0.97, amount));
    const far = (colour: THREE.ColorRepresentation, amount: number = H.haze) => new THREE.MeshStandardMaterial({ color: haze(colour, amount), roughness: 0.9 });
    const lampHex = mood.warmth > 0.5 ? '#ffd28a' : '#eaf2ff';
    const snowy = a.surface === 'snow';

    // ---- Light.
    root.add(new THREE.HemisphereLight(new THREE.Color(H.top).lerp(new THREE.Color('#ffffff'), 0.45), new THREE.Color('#8d8a82'), H.hemi));
    const key = new THREE.DirectionalLight(H.key, H.power);
    key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.normalBias = 0.04; key.shadow.bias = -0.0004;
    root.add(key, key.target);
    const fill = new THREE.DirectionalLight('#dfe8ff', 0.55); fill.position.set(6, 9, 40); root.add(fill);
    const azimuth = THREE.MathUtils.degToRad(mix(128, 232, mood.daylight)), lift = THREE.MathUtils.degToRad(H.lift);
    const sunDir = new THREE.Vector3(Math.sin(azimuth) * Math.cos(lift), Math.sin(lift), Math.cos(azimuth) * Math.cos(lift));

    // ---- Ground.
    const baseHex = { concrete: '#b7b4a9', asphalt: '#6e6f73', planking: '#8f9a68', snow: '#e6eaec' }[a.surface];
    const standHex = { concrete: '#b7b4a9', asphalt: '#6e6f73', planking: '#8d8273', snow: '#a9adae' }[a.surface];
    const groundMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(baseHex).lerp(low, 0.12), roughness: H.wet ? 0.3 : 0.96, metalness: H.wet ? 0.3 : 0 });
    const ground = art.mesh(new THREE.PlaneGeometry(2400, 2400), groundMat, [0, 0, -500]);
    ground.rotation.x = -Math.PI / 2; ground.castShadow = false;
    const flatMat = (hex: THREE.ColorRepresentation, extra: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color: hex, roughness: H.wet ? 0.35 : 0.92, metalness: H.wet ? 0.25 : 0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, ...extra });
    const flat = (w: number, d: number, at: P, material: THREE.Material, yaw = 0) => {
      const m = art.mesh(new THREE.PlaneGeometry(w, d), material, at); m.rotation.set(-Math.PI / 2, 0, yaw); m.castShadow = false; return m;
    };
    if (a.surface === 'planking' || snowy) flat(46, 190, [0, 0.008, -60], flatMat(new THREE.Color(standHex).lerp(low, 0.1)));
    // Slab joints, or the ribs of steel planking, or asphalt patches.
    const joints = new Batch(), jointHex = a.surface === 'asphalt' ? '#4d4e52' : a.surface === 'planking' ? '#6f6557' : '#6f6c64';
    const halfW = a.surface === 'planking' || snowy ? 23 : 90;
    if (a.surface === 'planking') for (let z = 28; z > -150; z -= 0.75) joints.put([halfW * 2, 0.02, 0.07], [0, 0.012, z], jointHex);
    else if (a.surface !== 'asphalt') {
      for (let z = 30; z > -150; z -= 6) joints.put([halfW * 2, 0.02, 0.09], [0, 0.012, z + (random() - 0.5) * 0.05], jointHex);
      for (let x = -halfW + 3; x < halfW; x += 6) joints.put([0.09, 0.02, 180], [x, 0.012, -60], jointHex);
    } else for (let i = 0; i < 26; i++) joints.put([2 + random() * 7, 0.02, 1.5 + random() * 6], [(random() - 0.5) * 60, 0.011, 24 - random() * 110], random() > 0.5 ? '#5d5e63' : '#7b7c80', [0, random() * 0.3, 0]);
    root.add(joints.mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ roughness: 0.95 })));
    // Cracks, wandering off the joints as the place wears.
    const cracks = new Batch();
    for (let i = 0; i < wear * 26; i++) { let x = (random() - 0.5) * 30, z = 22 - random() * 60, dir = random() * 3; for (let k = 0; k < 5; k++) { const len = 0.5 + random() * 1.2; cracks.put([len, 0.02, 0.035], [x, 0.013, z], '#55524c', [0, dir, 0]); x += Math.cos(dir) * len * 0.9; z -= Math.sin(dir) * len * 0.9; dir += (random() - 0.5) * 1.2; } }
    root.add(cracks.mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ roughness: 1 })));

    // ---- Painted markings.
    const yellow = flatMat(haze('#eec41c', wear * 0.18)), white = flatMat(haze('#efeee6', wear * 0.15)), red = flatMat(haze('#c93a2e', wear * 0.15));
    const closed = a.state === 'closed';
    flat(0.32, 118, [0, 0.016, -34], yellow);                               // stand centreline
    flat(170, 0.32, [0, 0.016, -93], yellow);                               // the taxilane it leaves from
    for (const z of [12, 5, -3]) flat(2.6, 0.3, [0, 0.016, z], yellow);     // stop bars
    for (const x of [-21, 21]) flat(0.22, 86, [x, 0.016, -18], red);        // equipment restraint lines
    flat(42.2, 0.22, [0, 0.016, 25], red);
    for (let x = -80; x < 80; x += 6) flat(3, 0.18, [x, 0.016, -78], white); // service road dashes
    // Hatched no-parking box beside the stand.
    for (let i = 0; i < 8; i++) flat(0.2, 5.2, [10.5 + i * 0.9, 0.016, 15], yellow, 0.7);
    flat(8, 0.2, [13.6, 0.016, 12.9], yellow); flat(8, 0.2, [13.6, 0.016, 17.1], yellow);
    const number = { one: '1', thirteen: '13', fortyseven: '47', cargo: 'R9' }[a.stand];
    const ground7 = painted(3.5, 2.2, 512, 320, (c, w, h) => {
      c.fillStyle = '#' + new THREE.Color(standHex).lerp(low, 0.1).getHexString(); c.fillRect(0, 0, w, h);
      c.fillStyle = '#eec41c'; c.font = `bold ${h * 0.86}px sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(number, w / 2, h * 0.54);
      // Paint flaked off by tyres.
      c.fillStyle = '#' + new THREE.Color(standHex).lerp(low, 0.1).getHexString();
      for (let i = 0; i < 40 + wear * 260; i++) c.fillRect(random() * w, random() * h, 2 + random() * 9, 1 + random() * 4);
      if (closed) { c.strokeStyle = '#f1f0e8'; c.lineWidth = 26; c.beginPath(); c.moveTo(w * 0.1, h * 0.08); c.lineTo(w * 0.9, h * 0.92); c.moveTo(w * 0.9, h * 0.08); c.lineTo(w * 0.1, h * 0.92); c.stroke(); }
    });
    (ground7.material as THREE.MeshStandardMaterial).polygonOffset = true; (ground7.material as THREE.MeshStandardMaterial).polygonOffsetFactor = -3; (ground7.material as THREE.MeshStandardMaterial).polygonOffsetUnits = -3;
    ground7.rotation.x = -Math.PI / 2; ground7.position.set(-2.45, 0.018, 15.2); ground7.receiveShadow = true; root.add(ground7);

    // Oil stains and tyre scuffs along the centreline where engines and wheels have stood.
    const stainGeo = new THREE.CircleGeometry(1, 18); stainGeo.rotateX(-Math.PI / 2);
    const stains = new Batch();
    for (let i = 0; i < 10 + wear * 46; i++) {
      const lane = [0, -5.5, 5.5, -11, 11][Math.floor(random() * 5)], r = 0.25 + random() * random() * 1.6;
      stains.put([r, 1, r * (0.5 + random() * 0.9)], [lane + (random() - 0.5) * 2.4, 0.02, 20 - random() * 62], random() > 0.3 ? '#3a3631' : '#5a4a3a', [0, random() * 3, 0]);
    }
    const stainMesh = stains.mesh(stainGeo, new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.2 + wear * 0.22, depthWrite: false })); stainMesh.receiveShadow = false; root.add(stainMesh);
    if (a.state === 'departed' || wear > 0.5) {
      const scuffMat = new THREE.MeshBasicMaterial({ color: '#2a2826', transparent: true, opacity: 0.32, depthWrite: false, side: THREE.DoubleSide });
      for (const off of [-0.45, 0.45, -5.9, -5.0, 5.0, 5.9]) {
        const pts: THREE.Vector3[] = [];
        for (let i = 0; i <= 24; i++) { const t = i / 24; pts.push(new THREE.Vector3(off + Math.pow(t, 2.2) * 34, 0.022, 8 - t * 70)); }
        const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.19, 3, false), scuffMat); tube.scale.y = 0.02; tube.position.y = 0.022; root.add(tube);
      }
    }
    // Puddles holding the sky.
    if (H.wet || (snowy && mood.warmth > 0.5)) {
      const puddles = new Batch();
      for (let i = 0; i < 16; i++) { const r = 0.8 + random() * 2.6; puddles.put([r, 1, r * (0.3 + random() * 0.4)], [(random() - 0.5) * 34, 0.024, 21 - random() * 55], '#ffffff', [0, random() * 3, 0]); }
      const pm = puddles.mesh(stainGeo, new THREE.MeshStandardMaterial({ color: haze(H.top, 0.5), roughness: 0.04, metalness: 0.85 })); root.add(pm);
    }
    if (snowy) {
      const snow = art.material('#eef1f3', { roughness: 1 });
      for (const side of [-1, 1]) for (let i = 0; i < 14; i++) art.ball([3 + random() * 3, 0.7 + random() * 1.1, 4 + random() * 5], [side * (24.5 + random() * 2.5), 0, 20 - i * 9 + random() * 3], snow, 10).castShadow = false;
    }
    if (a.surface === 'planking' || closed) {
      const weeds = new Batch();
      for (let i = 0; i < (closed ? 150 : 90); i++) { const edge = a.surface === 'planking' && random() > 0.35; const x = edge ? (random() > 0.5 ? 1 : -1) * (23 + random() * 9) : Math.round((random() - 0.5) * 8) * 6 + 3 + (random() - 0.5) * 0.3; const s = 0.12 + random() * 0.3; weeds.put([s, s * 2.2, s], [x, s, 22 - random() * 70], random() > 0.5 ? '#6f7d45' : '#93934f'); }
      root.add(weeds.mesh(new THREE.ConeGeometry(0.5, 1, 5), new THREE.MeshStandardMaterial({ roughness: 1 })));
    }

    // ---- Stand furniture: number board, floodlight masts, taxiway lights.
    const steel = art.material('#8f979a', { metalness: 0.5, roughness: 0.5 });
    art.cylinder(0.06, 0.07, 3.2, [10.9, 1.6, -9], steel, 10);
    const board = painted(1.9, 1.5, 256, 200, (c, w, h) => {
      c.fillStyle = '#eec41c'; c.fillRect(0, 0, w, h); c.strokeStyle = '#1d1f22'; c.lineWidth = 10; c.strokeRect(5, 5, w - 10, h - 10);
      c.fillStyle = '#1d1f22'; c.font = `bold ${h * 0.7}px sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(number, w / 2, h * 0.55);
      if (closed) { c.fillStyle = '#c62d2a'; c.fillRect(0, h * 0.4, w, h * 0.22); c.fillStyle = '#ffffff'; c.font = `bold ${h * 0.17}px sans-serif`; c.fillText('CLOSED', w / 2, h * 0.52); }
    }, 0.15 + dark * 0.75);
    board.position.set(10.9, 3.7, -8.95); board.castShadow = true; root.add(board);
    art.box([2.0, 1.6, 0.08], [10.9, 3.7, -9.0], art.material('#2a2d30'));
    const lampGlow = new THREE.MeshBasicMaterial({ color: dark > 0.3 ? lampHex : '#c9cdce' });
    const lampPositions: P[] = [];
    const mast = (x: number, z: number, h: number) => {
      const amount = Math.min(0.85, H.haze * Math.min(1, Math.abs(z) / 150));
      const m = far('#7d8588', amount);
      art.cylinder(0.18, 0.4, h, [x, h / 2, z], m, 8).castShadow = z > -70;
      art.box([5.2, 1.5, 0.3], [x, h + 0.6, z], m).castShadow = false;
      for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) { const lamp = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.5), lampGlow); lamp.position.set(x - 1.8 + i * 1.2, h + 0.3 + j * 0.65, z + 0.17); root.add(lamp); }
      lampPositions.push([x, h + 0.6, z + 0.3]);
    };
    mast(-21, -62, 24); mast(23, -70, 24); mast(-78, -120, 26); mast(84, -128, 26); mast(-150, -160, 26); mast(160, -165, 26);
    if (dark > 0.3) {
      // Soft discs of light round each lamp bank and a pool on the concrete beneath.
      const haloMat = new THREE.MeshBasicMaterial({ color: lampHex, transparent: true, opacity: 0.06 + dark * 0.1, depthWrite: false });
      for (const p of lampPositions) { const halo = new THREE.Mesh(new THREE.CircleGeometry(3.2, 20), haloMat); halo.position.set(...p); root.add(halo); }
      const poolMat = new THREE.MeshBasicMaterial({ color: lampHex, transparent: true, opacity: 0.07 + dark * 0.07, depthWrite: false });
      for (const [x, z] of [[-10, -30], [12, -34], [0, 2]] as const) { const pool = new THREE.Mesh(new THREE.CircleGeometry(15, 28), poolMat); pool.rotation.x = -Math.PI / 2; pool.position.set(x, 0.03, z); root.add(pool); }
    }
    const blues = new Batch();
    for (let x = -170; x <= 170; x += 9) { blues.put([0.22, 0.22, 0.22], [x, 0.3, -99], '#3f7bff'); blues.put([0.22, 0.22, 0.22], [x + 4, 0.3, -86], '#3f7bff'); }
    for (let x = -300; x <= 300; x += 14) blues.put([0.3, 0.3, 0.3], [x, 0.35, -330], dark > 0.3 ? '#fff3c0' : '#d9d9d2');
    const blueMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
    root.add(blues.mesh(new THREE.SphereGeometry(1, 8, 6), blueMat));

    // ---- The horizon: terminal, tower, hangars, parked airliners, a low dark tree line.
    const T = { one: 150, thirteen: 195, fortyseven: 330, cargo: 230 }[a.stand];
    const hz: number = H.haze * Math.min(1.25, 0.7 + T / 600);
    const lit = 0.1 + dark * 0.9;
    const windows = (w: number, h: number, cols: number, rows: number, wall: string, glass: string, share: number) => painted(w, h, 512, Math.max(32, Math.round((512 * h) / w)), (c, cw, ch) => {
      c.fillStyle = '#' + haze(wall, hz).getHexString(); c.fillRect(0, 0, cw, ch);
      const gw = cw / cols, gh = ch / rows;
      for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
        const on = random() < share;
        c.fillStyle = '#' + (on ? haze(lampHex, hz * 0.35) : haze(glass, hz)).getHexString();
        c.fillRect(i * gw + gw * 0.12, j * gh + gh * 0.16, gw * 0.76, gh * 0.68);
      }
    }, lit * 0.8);
    const sign = (text: string, w: number, h: number, at: P, ink: string, paper: string) => { const m = painted(w, h, 512, Math.max(32, Math.round((512 * h) / w)), (c, cw, ch) => { c.fillStyle = '#' + haze(paper, hz).getHexString(); c.fillRect(0, 0, cw, ch); c.fillStyle = '#' + haze(ink, hz * 0.6).getHexString(); c.font = `bold ${ch * 0.74}px sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, cw / 2, ch * 0.54, cw * 0.94); }, lit * 0.7); m.position.set(...at); root.add(m); };
    const add = (mesh: THREE.Mesh, at: P) => { mesh.position.set(...at); mesh.castShadow = false; root.add(mesh); return mesh; };
    const cabGlow = new THREE.MeshStandardMaterial({ color: haze('#3f6f78', hz * 0.6), emissive: '#9fe6d8', emissiveIntensity: lit * 0.9, roughness: 0.2 });
    const obstruction = new THREE.MeshBasicMaterial({ color: '#ff3a2a' });
    const beaconMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
    let beaconAt: P = [0, 0, 0];
    const zT = -T;
    const hw = HALF * (T + CAM[2]);
    if (a.terminal === 'jetage') {
      art.box([230, 7, 20], [-20, 3.5, zT - 10], far('#d9d5c8', hz)).castShadow = false;
      add(windows(226, 4.2, 70, 1, '#d9d5c8', '#4f6f7f', 0.25 + dark * 0.6), [-20, 3.9, zT + 0.1]);
      art.box([234, 0.7, 23], [-20, 7.3, zT - 10], far('#f1efe6', hz)).castShadow = false;
      // Observation deck rail and the folded-plate canopy edge.
      const zig = new Batch(); for (let i = 0; i < 58; i++) zig.put([2.9, 2.9, 22], [-134 + i * 4, 7.6, zT - 10], haze('#f1efe6', hz), [0, 0, Math.PI / 4]);
      root.add(zig.mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ roughness: 0.9 })));
      // The shell roof of the main hall.
      const shell = art.mesh(new THREE.CylinderGeometry(30, 30, 46, 28, 1, false, -Math.PI / 2, Math.PI), far('#f4f2ea', hz), [-0.45 * hw, 4, zT - 30]); shell.rotation.x = Math.PI / 2; shell.scale.y = 1; shell.castShadow = false;
      add(windows(52, 20, 13, 5, '#f4f2ea', '#4f6f7f', 0.3 + dark * 0.6), [-0.45 * hw, 12, zT - 6.8]).scale.set(1, 1, 1);
      sign('INTERNATIONAL', 44, 3.8, [0.1 * hw, 11.2, zT - 4], '#f6f4ea', '#3a4a66');
      for (const x of [0.1 * hw - 20, 0.1 * hw + 20]) art.box([0.6, 3.6, 0.6], [x, 9.3, zT - 4.2], far('#6f757a', hz)).castShadow = false;
      // Mushroom tower.
      const tx = 0.6 * hw, tz = zT - 26;
      art.lathe([[3.4, 0], [2.4, 14], [2.2, 30], [3.4, 37], [7.4, 40]], far('#e6e2d6', hz), [tx, 0, tz]).castShadow = false;
      art.cylinder(8.4, 7.2, 4.2, [tx, 42.1, tz], cabGlow, 20).castShadow = false;
      art.cylinder(9.4, 9.4, 0.8, [tx, 44.6, tz], far('#f1efe6', hz), 20).castShadow = false;
      art.cylinder(0.25, 0.25, 9, [tx, 49.5, tz], far('#6f757a', hz), 6).castShadow = false;
      beaconAt = [tx, 54.3, tz];
    } else if (a.terminal === 'municipal') {
      art.box([86, 9, 16], [10, 4.5, zT - 8], far('#a8644a', hz)).castShadow = false;
      add(windows(82, 6.4, 22, 2, '#a8644a', '#3f4f5c', 0.2 + dark * 0.6), [10, 4.6, zT + 0.1]);
      art.box([88, 0.9, 17], [10, 9.3, zT - 8], far('#e6dcc4', hz)).castShadow = false;
      art.box([13, 9, 13], [10, 14, zT - 9], far('#a8644a', hz)).castShadow = false;
      art.cylinder(6.2, 5.2, 4, [10, 20.6, zT - 9], cabGlow, 8).castShadow = false;
      art.cylinder(7, 7, 0.6, [10, 22.9, zT - 9], far('#e6dcc4', hz), 8).castShadow = false;
      sign('MUNICIPAL AIRPORT', 46, 3.6, [10, 11.6, zT + 0.2], '#f6f0dc', '#5a3a2c');
      art.cylinder(0.12, 0.12, 12, [-24, 15, zT - 4], far('#d9d9d2', hz), 6).castShadow = false;
      art.box([4.6, 2.6, 0.1], [-21.6, 19.5, zT - 4], far(mood.cheer > 0.5 ? '#c93a2e' : '#3a5a8a', hz * 0.8)).castShadow = false;
      // The arched hangar.
      const hangar = art.mesh(new THREE.CylinderGeometry(22, 22, 44, 24, 1, false, -Math.PI / 2, Math.PI), far('#8f9a9c', hz), [-0.62 * hw, 0, zT - 30]); hangar.rotation.x = Math.PI / 2; hangar.scale.y = 1; hangar.castShadow = false;
      art.box([30, 13, 0.6], [-0.62 * hw, 6.5, zT - 7.8], far('#55606a', hz)).castShadow = false;
      // Beacon on its own lattice tower.
      const bx = 0.66 * hw;
      for (const dx of [-1.6, 1.6]) art.rod([bx + dx, 0, zT - 14], [bx + dx * 0.3, 26, zT - 14], 0.22, far('#b4452e', hz));
      for (let i = 0; i < 6; i++) art.rod([bx - 1.6 + i * 0.2, i * 4.2, zT - 14], [bx + 1.6 - (i + 1) * 0.2, (i + 1) * 4.2, zT - 14], 0.12, far('#b4452e', hz));
      beaconAt = [bx, 27, zT - 14];
    } else if (a.terminal === 'megahub') {
      art.box([520, 13, 30], [0, 6.5, zT - 30], far('#9fb4c0', hz)).castShadow = false;
      add(windows(516, 11, 120, 3, '#b9c6cc', '#56798c', 0.3 + dark * 0.6), [0, 6.6, zT - 14.9]);
      const wave = new Batch(); for (let i = 0; i < 52; i++) wave.put([10.4, 1.2 + Math.sin(i * 0.7) * 0.5, 36], [-255 + i * 10, 13.8 + Math.sin(i * 0.7) * 1.3, zT - 30], haze('#eef2f3', hz));
      root.add(wave.mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ roughness: 0.6, metalness: 0.3 })));
      // Jet bridges reaching out on their legs.
      const bridges = new Batch();
      for (let i = 0; i < 9; i++) { const x = -200 + i * 50 + (random() - 0.5) * 6; bridges.put([3.4, 3.2, 26], [x, 5.6, zT - 2], haze('#d9dde0', hz), [0, (random() - 0.5) * 0.5, 0]); bridges.put([1.2, 4.2, 1.2], [x, 2.1, zT + 8], haze('#7d8588', hz)); bridges.put([5, 4.2, 5], [x, 5.8, zT + 12], haze('#c9ced1', hz)); }
      root.add(bridges.mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ roughness: 0.8 })));
      const tx = -0.5 * hw, tz = zT - 60;
      art.cylinder(2.6, 4.2, 74, [tx, 37, tz], far('#dfe3e4', hz), 14).castShadow = false;
      art.lathe([[2.6, 0], [8.6, 5], [9.6, 8]], far('#dfe3e4', hz), [tx, 70, tz]).castShadow = false;
      art.cylinder(10.6, 9.6, 5, [tx, 80.5, tz], cabGlow, 22).castShadow = false;
      art.lathe([[10.8, 0], [7, 2.6], [1, 3.6], [0.3, 12]], far('#eef2f3', hz), [tx, 83, tz]).castShadow = false;
      beaconAt = [tx, 95.4, tz];
    } else {
      art.box([15, 4.6, 9], [18, 2.3, zT * 0.55 - 5], far('#9aa3a0', hz * 0.6)).castShadow = false;
      const roofA = art.box([16, 0.3, 6], [18, 5.4, zT * 0.55 - 2.6], far('#a8573c', hz * 0.6)); roofA.rotation.x = 0.34; roofA.castShadow = false;
      const roofB = art.box([16, 0.3, 6], [18, 5.4, zT * 0.55 - 7.4], far('#a8573c', hz * 0.6)); roofB.rotation.x = -0.34; roofB.castShadow = false;
      sign('AERODROME', 11, 1.5, [18, 3.6, zT * 0.55 - 0.4], '#f1ead2', '#4a5a50');
      // Stilted watch cabin.
      const cx = -30, cz = zT * 0.55 - 6;
      for (const [dx, dz] of [[-2, -2], [2, -2], [2, 2], [-2, 2]] as const) art.rod([cx + dx * 1.3, 0, cz + dz * 1.3], [cx + dx, 9, cz + dz], 0.18, far('#5a4a3a', hz * 0.6));
      art.box([6, 3.2, 6], [cx, 10.6, cz], cabGlow).castShadow = false; art.box([7.4, 0.4, 7.4], [cx, 12.5, cz], far('#a8573c', hz * 0.6)).castShadow = false;
      art.rod([cx - 4, 0, cz + 3], [cx - 3, 9, cz + 3], 0.1, far('#5a4a3a', hz * 0.6));
      // Radio mast and guys, fuel drums, a fence running out of sight.
      const mx = 62, mz = zT * 0.55 - 20;
      art.cylinder(0.2, 0.3, 46, [mx, 23, mz], far('#b4452e', hz * 0.7), 6).castShadow = false;
      for (const t of [0, 2.1, 4.2]) art.rod([mx, 40, mz], [mx + Math.cos(t) * 22, 0, mz + Math.sin(t) * 22], 0.05, far('#55606a', hz * 0.7));
      beaconAt = [mx, 46.4, mz];
      const drums = new Batch(); for (let i = 0; i < 14; i++) drums.put([0.6, 0.9, 0.6], [30 + (i % 5) * 1.3 + random() * 0.2, 0.45 + Math.floor(i / 10) * 0.9, zT * 0.55 + 1 + Math.floor((i % 10) / 5) * 1.3], haze(['#b4452e', '#3f6a8a', '#d9c23a'][i % 3], hz * 0.5));
      root.add(drums.mesh(new THREE.CylinderGeometry(1, 1, 1, 10), new THREE.MeshStandardMaterial({ roughness: 0.7 })));
      const posts = new Batch(); for (let x = -260; x <= 260; x += 5) posts.put([0.14, 1.4, 0.14], [x, 0.7, zT * 0.55 - 34], haze('#6f6557', hz * 0.7));
      posts.put([520, 0.06, 0.06], [0, 1.2, zT * 0.55 - 34], haze('#8d8d86', hz * 0.7)); posts.put([520, 0.06, 0.06], [0, 0.7, zT * 0.55 - 34], haze('#8d8d86', hz * 0.7));
      root.add(posts.mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ roughness: 1 })));
    }
    const beaconLamp = add(new THREE.Mesh(new THREE.SphereGeometry(a.terminal === 'megahub' ? 1.1 : 0.8, 10, 8), a.terminal === 'airstrip' ? obstruction : beaconMat), beaconAt);
    const beaconHalo = add(new THREE.Mesh(new THREE.CircleGeometry(a.terminal === 'megahub' ? 9 : 6, 18), new THREE.MeshBasicMaterial({ color: '#eaffea', transparent: true, opacity: 0, depthWrite: false })), beaconAt);
    void beaconLamp;

    // Other airliners parked along the horizon, side on, more of them when the place is busy.
    const liveries = ['#c93a2e', '#1f4fa3', '#1f8f8c', '#e0701c', '#2f7a55', '#7a1f2e'];
    const parked = a.terminal === 'airstrip' ? Math.round(mood.density) : Math.round(mix(0.6, 5.4, mood.density));
    for (let i = 0; i < parked; i++) {
      const side = i % 2 ? 1 : -1, k = Math.floor(i / 2);
      const px = side * (58 + k * 62) + (random() - 0.5) * 16, pz = zT * (a.terminal === 'airstrip' ? 0.5 : 0.72) + (random() - 0.5) * 14, flip = random() > 0.5 ? 1 : -1;
      const g = new THREE.Group(); g.position.set(px, 0, pz); g.scale.set(flip, 1, 1); root.add(g);
      const hzP = hz * 0.8, body = far('#eef0ee', hzP), tint = far(liveries[Math.floor(random() * liveries.length)], hzP), grey = far('#8f979a', hzP);
      const part = (geometry: THREE.BufferGeometry, material: THREE.Material, at: P, rot: P = [0, 0, 0]) => { const m = new THREE.Mesh(geometry, material); m.position.set(...at); m.rotation.set(...rot); g.add(m); return m; };
      part(new THREE.CapsuleGeometry(1.9, 30, 6, 14), body, [0, 4.4, 0], [0, 0, Math.PI / 2]);
      part(new THREE.BoxGeometry(31, 0.5, 0.1), tint, [0, 4.7, 1.9]);
      const finShape = new THREE.Shape([[-12, 0], [-17, 7.6], [-19.6, 7.6], [-17.4, 0]].map(([x, y]) => new THREE.Vector2(x, y)));
      part(new THREE.ExtrudeGeometry(finShape, { depth: 0.4, bevelEnabled: false }), tint, [0, 6, -0.2]);
      part(new THREE.BoxGeometry(5, 0.3, 30), grey, [1.5, 3.4, 0], [0, -0.35, 0]);
      part(new THREE.BoxGeometry(3, 0.25, 11), grey, [-15.8, 5.2, 0], [0, -0.3, 0]);
      for (const x of [9, -2]) part(new THREE.CylinderGeometry(0.22, 0.22, 2.6, 6), grey, [x, 1.3, 0]);
      for (const z of [-6, 6]) part(new THREE.CylinderGeometry(1.0, 1.0, 3.6, 10), grey, [3.4, 2.6, z], [0, 0, Math.PI / 2]);
    }
    // Tree line and the odd far landmark, almost dissolved.
    const treeline = painted(1700, 26, 1024, 32, (c, w, h) => {
      c.clearRect(0, 0, w, h); c.fillStyle = '#' + haze(snowy ? '#7f8a8c' : '#5f7058', Math.min(0.92, H.haze + 0.28)).getHexString();
      let y = h * 0.6; c.beginPath(); c.moveTo(0, h);
      for (let x = 0; x <= w; x += 3) { y += (random() - 0.5) * 3.2; y = Math.max(h * 0.3, Math.min(h * 0.82, y)); c.lineTo(x, y - (random() < 0.02 ? 6 : 0)); }
      c.lineTo(w, h); c.fill();
    });
    (treeline.material as THREE.MeshStandardMaterial).alphaTest = 0.5; (treeline.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.55; treeline.position.set(0, 12, -585); root.add(treeline);

    // ---- Sky.
    const sky = (() => {
      const canvas = document.createElement('canvas'); canvas.width = 1280; canvas.height = 640;
      const c = canvas.getContext('2d')!, w = 1280, h = 640;
      const grad = c.createLinearGradient(0, h, 0, 0);
      grad.addColorStop(0, lowHex); grad.addColorStop(0.16, '#' + new THREE.Color(lowHex).lerp(new THREE.Color(H.top), 0.35).getHexString()); grad.addColorStop(0.62, H.top); grad.addColorStop(1, '#' + new THREE.Color(H.top).multiplyScalar(0.9).getHexString());
      c.fillStyle = grad; c.fillRect(0, 0, w, h);
      const W = 740, Ht = 370, dist = 600 + CAM[2];
      const sx = w * (0.5 - (Math.tan(azimuth - Math.PI) * dist) / W * -1 * -1), sy = h * (1 - (Math.tan(lift) * dist + 12) / Ht);
      if (a.hour !== 'fog' && a.hour !== 'redeye') {
        const glow = c.createRadialGradient(sx, sy, 0, sx, sy, w * 0.34);
        glow.addColorStop(0, H.sun); glow.addColorStop(0.07, H.sun); glow.addColorStop(0.1, 'rgba(255,240,215,0.55)'); glow.addColorStop(1, 'rgba(255,240,215,0)');
        c.fillStyle = glow; c.fillRect(0, 0, w, h);
      } else { c.fillStyle = 'rgba(255,255,255,0.06)'; for (let i = 0; i < 30; i++) { c.beginPath(); c.ellipse(random() * w, h * (0.2 + random() * 0.8), 300 + random() * 400, 14 + random() * 30, 0, 0, 7); c.fill(); } }
      const ink = '#' + new THREE.Color(H.top).lerp(new THREE.Color('#ffffff'), 0.75).getHexString();
      if (a.sky === 'contrail') {
        const g2 = c.createLinearGradient(w * 0.08, 0, w * 0.86, 0); g2.addColorStop(0, 'rgba(255,255,255,0)'); g2.addColorStop(0.7, ink); g2.addColorStop(1, '#ffffff');
        c.strokeStyle = g2; c.lineWidth = 5; c.lineCap = 'round'; c.beginPath(); c.moveTo(w * 0.08, h * 0.44); c.lineTo(w * 0.86, h * 0.13); c.stroke();
        c.lineWidth = 11; c.globalAlpha = 0.35; c.beginPath(); c.moveTo(w * 0.08, h * 0.44); c.lineTo(w * 0.55, h * 0.255); c.stroke(); c.globalAlpha = 1;
        c.fillStyle = '#5a6066'; c.fillRect(w * 0.862, h * 0.124, 7, 3);
      } else if (a.sky === 'departure') {
        c.save(); c.translate(w * (0.3 + random() * 0.36), h * (0.36 + random() * 0.12)); c.rotate(-0.22); c.fillStyle = '#' + haze('#4a5058', 0.3).getHexString();
        c.beginPath(); c.ellipse(0, 0, 30, 4.2, 0, 0, 7); c.fill();
        c.beginPath(); c.moveTo(-26, -2); c.lineTo(-36, -15); c.lineTo(-30, -15); c.lineTo(-18, -2); c.fill();
        c.beginPath(); c.moveTo(6, 0); c.lineTo(-10, 14); c.lineTo(-3, 14); c.lineTo(14, 0); c.fill();
        c.fillRect(-2, 3, 2, 8); c.fillRect(14, 3, 2, 7); c.fillRect(-4, 10, 6, 3); c.fillRect(12, 9, 5, 3);
        c.restore();
      } else if (a.sky === 'streaks') {
        for (let i = 0; i < 9; i++) { const y = h * (0.45 + random() * 0.42), x = random() * w, len = 180 + random() * 420; const g3 = c.createLinearGradient(x, 0, x + len, 0); const tone = '#' + new THREE.Color(H.sun).lerp(new THREE.Color(mood.warmth > 0.5 ? '#ff9a6a' : '#ffffff'), 0.4).getHexString(); g3.addColorStop(0, 'rgba(255,255,255,0)'); g3.addColorStop(0.5, tone); g3.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g3; c.globalAlpha = 0.75; c.beginPath(); c.ellipse(x + len / 2, y, len / 2, 3 + random() * 6, 0, 0, 7); c.fill(); c.globalAlpha = 1; }
      } else if (a.sky === 'moon') {
        const mx = w * (0.28 + random() * 0.44), my = h * (0.2 + random() * 0.2); c.fillStyle = ink; c.globalAlpha = 0.95; c.beginPath(); c.arc(mx, my, 20, 0, 7); c.fill();
        c.globalAlpha = 1; c.fillStyle = H.top; c.beginPath(); c.arc(mx + 9, my - 5, 18, 0, 7); c.fill();
      } else if (a.sky === 'birds') {
        c.strokeStyle = '#' + haze('#3a3f46', 0.25).getHexString(); c.lineWidth = 2; c.lineCap = 'round';
        const bx = w * (0.3 + random() * 0.4), by = h * (0.5 + random() * 0.15);
        for (let i = 0; i < 26; i++) { const x = bx + (random() - 0.5) * 300, y = by + (random() - 0.5) * 120, s = 4 + random() * 6; c.beginPath(); c.moveTo(x - s, y - s * 0.4); c.quadraticCurveTo(x - s * 0.4, y - s * 0.7, x, y); c.quadraticCurveTo(x + s * 0.4, y - s * 0.7, x + s, y - s * 0.4); c.stroke(); }
      }
      const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace;
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(W, Ht), new THREE.MeshBasicMaterial({ map, fog: false }));
      mesh.position.set(0, Ht / 2 - 12, -600); root.add(mesh);
      return mesh;
    })();

    // ---- What is happening on the stand. Dressing keeps to the edges of the frame so the cast has the middle.
    const spot = (d: number, f: number): [number, number] => [f * HALF * d, CAM[2] - d];
    const orange = art.material('#f0641e'), coneBand = art.material('#f1efe6');
    const coneAt = (x: number, z: number, fallen = false) => {
      if (fallen) { const c = art.cylinder(0.03, 0.14, 0.5, [x, 0.14, z], orange, 12); c.rotation.set(0, random() * 3, Math.PI / 2 - 0.24); return; }
      art.cylinder(0.03, 0.14, 0.5, [x, 0.29, z], orange, 12); art.box([0.36, 0.035, 0.36], [x, 0.02, z], orange); art.cylinder(0.073, 0.094, 0.1, [x, 0.32, z], coneBand, 12);
    };
    const chock = (x: number, z: number, yaw: number) => { const c = art.cylinder(0.14, 0.14, 0.5, [x, 0.1, z], art.material('#f1bd16', { roughness: 0.9 }), 3); c.rotation.set(Math.PI / 2, 0, yaw); };
    if (a.state === 'turnaround') {
      for (const [d, f] of [[11, -0.88], [11, 0.9], [21, -0.9], [21, 0.9], [34, -0.88], [34, 0.86]] as const) { const [x, z] = spot(d, f); coneAt(x, z, random() < wear * 0.3); }
      // Ground power cart with its cable run out.
      const [gx, gz] = spot(29, 0.8);
      const cart = art.material('#eebb1a', { roughness: 0.6 });
      art.box([2.6, 1.2, 1.5], [gx, 1.0, gz], cart); art.box([2.7, 0.14, 1.6], [gx, 1.67, gz], art.material('#2a2d30'));
      for (let i = 0; i < 6; i++) art.box([0.05, 0.6, 0.02], [gx - 0.9 + i * 0.22, 1.0, gz + 0.76], art.material('#2a2d30'));
      for (const dx of [-0.9, 0.9]) for (const dz of [-0.75, 0.75]) art.cylinder(0.3, 0.3, 0.2, [gx + dx, 0.3, gz + dz], art.material('#1b1c1e'), 14).rotation.x = Math.PI / 2;
      art.rod([gx - 1.3, 0.5, gz], [gx - 2.6, 0.4, gz + 0.4], 0.04, steel);
      art.tube([[gx - 0.4, 0.5, gz + 0.8], [gx - 1.6, 0.05, gz + 2.5], [gx - 3.8, 0.05, gz + 2.0], [gx - 5.2, 0.05, gz + 3.4], [gx - 6.6, 0.05, gz + 3.0]], 0.05, art.material('#1b1c1e'));
      art.ball([0.09, 0.09, 0.09], [gx + 1.0, 1.82, gz + 0.5], new THREE.MeshBasicMaterial({ color: '#56e07a' }), 8);
      const [kx, kz] = spot(17, -0.74); chock(kx, kz, 0.3); chock(kx + 0.5, kz + 0.3, 1.2);
    } else if (a.state === 'departed') {
      const [kx, kz] = spot(12, -0.5); chock(kx, kz, 0.2); chock(kx + 0.7, kz - 0.4, 1.4);
      art.tube([[kx, 0.12, kz], [kx + 0.3, 0.02, kz + 0.5], [kx + 0.7, 0.12, kz - 0.4]], 0.014, art.material('#1b1c1e'));
      const [ux, uz] = spot(8.5, 0.55); const cup = art.cylinder(0.045, 0.035, 0.11, [ux, 0.045, uz], art.material('#f4f1e6'), 10); cup.rotation.set(0, random() * 3, Math.PI / 2);
      const [hx, hz2] = spot(9.5, -0.35); art.ring(0.09, 0.012, [hx, 0.02, hz2], art.material('#1b1c1e'), Math.PI).rotation.x = Math.PI / 2;
      for (const dx of [-0.09, 0.09]) art.ball([0.045, 0.03, 0.055], [hx + dx, 0.03, hz2], art.material('#c62d2a'), 8);
    } else if (closed) {
      const barrier = new Batch();
      for (const side of [-1, 1]) for (let i = 0; i < 7; i++) { const [x, z] = spot(10 + i * 5.5, side * 0.86); barrier.put([0.5, 0.85, 1.9], [x, 0.43, z], i % 2 ? '#d93a2e' : '#f1f0e8', [0, side * 0.34 + (random() - 0.5) * wear * 0.6, 0]); }
      root.add(barrier.mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ roughness: 0.6 }), true));
      const [fx, fz] = spot(13, 0.62); coneAt(fx, fz, true);
    }

    // ---- Drizzle.
    let rain: THREE.InstancedMesh | null = null;
    const drops = Array.from({ length: H.wet ? 420 : 0 }, () => ({ x: (random() - 0.5) * 44, y: random() * 16, z: 24 - random() * 46, v: 9 + random() * 5 }));
    if (H.wet) {
      rain = new THREE.InstancedMesh(new THREE.BoxGeometry(0.012, 0.5, 0.012), new THREE.MeshBasicMaterial({ color: '#e8eef4', transparent: true, opacity: 0.4, depthWrite: false }), drops.length);
      rain.frustumCulled = false; root.add(rain);
    }
    const matrix = new THREE.Matrix4();
    const fall = (dt: number) => {
      if (!rain) return;
      drops.forEach((drop, i) => { drop.y -= drop.v * dt * mix(0.5, 1.4, mood.energy); if (drop.y < 0) drop.y += 16; matrix.makeTranslation(drop.x + drop.y * 0.06, drop.y, drop.z); rain!.setMatrixAt(i, matrix); });
      rain.instanceMatrix.needsUpdate = true;
    };
    fall(0);

    // ---- Camera: low, tilted a little up, so two thirds of the frame is sky.
    const camera = new THREE.PerspectiveCamera(FOV, 1, 0.3, 1600);
    camera.position.set(...CAM);
    camera.lookAt(0, CAM[1] + Math.tan(THREE.MathUtils.degToRad(6.5)) * CAM[2], 0);

    // Near true size; small things are helped a little, and the hero stands as close as it needs to fill the frame.
    const shown = (item: Placeable) => Math.min(1.5, Math.max(1, 2.4 / Math.max(item.height, 0.05)));
    const place = (items: readonly Placeable[]) => {
      let heroD = 19;
      const taken: { x: number; z: number; r: number }[] = [];
      items.forEach((item, index) => {
        let scale = shown(item);
        const r = Math.max(item.radius * scale, 0.2), h = item.height * scale;
        if (index === 0) {
          heroD = Math.min(80, Math.max(9, r / (HALF * 0.46), h / 0.33));
          // Anything too big even for the far apron is brought down to fit.
          const fit = Math.min(1, (80 * HALF * 0.46) / r, (80 * 0.33) / h);
          if (heroD >= 80) scale *= fit;
          item.holder.scale.setScalar(scale);
          item.holder.position.set(0, 0, CAM[2] - heroD);
          item.holder.rotation.y = (random() > 0.5 ? 1 : -1) * (0.08 + random() * 0.16);
          taken.push({ x: 0, z: CAM[2] - heroD, r: r * (heroD >= 80 ? fit : 1) });
          return;
        }
        // Supporting spots: [distance, lateral fraction of the half frame, radius allowed as a fraction of it].
        const spots = [
          [Math.max(8, heroD * 0.86), -0.73, 0.21], [heroD * 1.08 + 1, 0.74, 0.22], [heroD * 1.5 + 4, -0.6, 0.34],
          [heroD * 1.9 + 6, 0.56, 0.38], [heroD * 2.6 + 10, -0.3, 0.42], [heroD * 3.4 + 14, 0.32, 0.44], [heroD * 4.2 + 18, -0.58, 0.4],
        ].map(([d, f, rf]) => { const dd = Math.min(d, 125); return { x: f * HALF * dd, z: CAM[2] - dd, room: rf * HALF * dd, tall: dd * 0.36 }; });
        const free = spots.filter((spotAt) => !taken.some((t) => Math.hypot(t.x - spotAt.x, t.z - spotAt.z) < 0.5));
        const fits = (spotAt: (typeof spots)[number]) => Math.min(spotAt.room / r, spotAt.tall / h);
        const pick = free.find((spotAt) => fits(spotAt) >= 1) ?? free.reduce((best, spotAt) => (fits(spotAt) > fits(best) ? spotAt : best), free[0] ?? spots[index % spots.length]);
        scale *= Math.min(1, fits(pick));
        item.holder.scale.setScalar(scale);
        item.holder.position.set(pick.x, 0, pick.z);
        item.holder.rotation.y = -Math.sign(pick.x) * (0.15 + random() * 0.35);
        taken.push({ x: pick.x, z: pick.z, r });
      });
      const centreZ = CAM[2] - heroD;
      key.target.position.set(0, 0, centreZ);
      key.position.set(0, 0, centreZ).addScaledVector(sunDir, 160);
      const span = Math.max(20, heroD * 1.25);
      const shadow = key.shadow.camera;
      shadow.left = shadow.bottom = -span; shadow.right = shadow.top = span;
      shadow.near = 1; shadow.far = 420;
      shadow.updateProjectionMatrix();
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld(true);
    };

    const phase = random() * 6;
    return {
      object: root,
      camera,
      background: low.clone(),
      capacity: 7,
      ground,
      keyLight: key,
      place,
      update(dt, time) {
        fall(Math.min(dt, 0.1));
        // The aerodrome beacon sweeps green then white; an obstruction lamp just pulses.
        const turn = (time * mix(0.25, 0.6, mood.energy) + phase) % 1;
        const flash = turn < 0.08 ? 1 : turn > 0.5 && turn < 0.58 ? 2 : 0;
        if (a.terminal === 'airstrip') obstruction.color.set(Math.sin(time * 2 + phase) > 0 ? '#ff3a2a' : '#7a2a22');
        else beaconMat.color.set(flash === 1 ? '#7dff9a' : flash === 2 ? '#ffffff' : '#8d9496');
        (beaconHalo.material as THREE.MeshBasicMaterial).opacity = flash && a.terminal !== 'airstrip' ? 0.35 * (0.3 + dark * 0.7) : 0;
        (beaconHalo.material as THREE.MeshBasicMaterial).color.set(flash === 1 ? '#7dff9a' : '#ffffff');
        blueMat.color.setScalar(0.85 + Math.sin(time * 3 + phase) * 0.15);
      },
      dispose() { key.shadow.map?.dispose(); sky.geometry.dispose(); art.finish().dispose(); },
    };
  },
});
