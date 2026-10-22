import * as THREE from 'three';
import { type Placeable, choice, defineWorld, disposeTree, mix } from '@conjure/kit';

type P3 = [number, number, number];
interface Inst { at: P3; scale: P3; turn?: number; color?: THREE.ColorRepresentation }

const ERAS = {
  modern: 'A modern ward: pale sea-green walls, a teal dado, flush pale doors and recessed ceiling panels.',
  seventies: 'A 1970s block: mustard dado, orange-brown doors, a varnished timber handrail and bare strip lights.',
  infirmary: 'An old infirmary: a tall arched corridor in cream and bottle-green gloss paint, heavy doors, hanging globe lamps.',
  children: 'A children’s ward: sky-blue walls with painted balloons and clouds, every door a different bright colour.',
} as const;
const PALETTE: Record<keyof typeof ERAS, { wall: string; dado: string; floor: string; floor2: string; door: string; frame: string; rail: string; ceiling: string; accent: string; height: number }> = {
  modern: { wall: '#c3dad6', dado: '#7fb4b1', floor: '#9cbcb8', floor2: '#86aaa7', door: '#dfe6e2', frame: '#5f9396', rail: '#eef2ef', ceiling: '#b4cbc8', accent: '#2f9a9a', height: 2.75 },
  seventies: { wall: '#d2cfb0', dado: '#b8913f', floor: '#a7a686', floor2: '#7f7f62', door: '#bd6d3c', frame: '#5c4832', rail: '#8a5c34', ceiling: '#bdbda4', accent: '#c8742a', height: 2.7 },
  infirmary: { wall: '#cfd5bd', dado: '#5f8f72', floor: '#979c8b', floor2: '#6f7868', door: '#47705a', frame: '#2f4c3c', rail: '#3f3c36', ceiling: '#c2c9b2', accent: '#8a2f2f', height: 3.3 },
  children: { wall: '#c2d6e6', dado: '#f0c860', floor: '#9dc0cc', floor2: '#86adbb', door: '#e2574c', frame: '#f4f1e6', rail: '#e2574c', ceiling: '#bccfda', accent: '#e2574c', height: 2.75 },
};
const SIGNS = { ward: 'WARD 4', maternity: 'MATERNITY', icu: 'INTENSIVE CARE', oncology: 'ONCOLOGY', children: 'CHILDREN’S WARD', cardiology: 'CARDIOLOGY', emergency: 'EMERGENCY' } as const;

function paint(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

export default defineWorld({
  questions: {
    era: choice('What kind of hospital is this?', ERAS),
    night: choice('What is happening on the ward tonight?', {
      quiet: 'Dead quiet: every door shut, only the night lights and the station lamp.',
      awake: 'Someone cannot sleep: one door ajar spilling the blue flicker of a television, another a warm bedside lamp.',
      emergency: 'Something is wrong: one door flung wide with hard white light pouring out and a red call light flashing above it.',
      dawn: 'Nearly morning: grey-pink light growing at the far end, the first ceiling lights coming back on.',
    }),
    floor: choice('What is the floor like?', {
      lines: 'Plain polished linoleum with coloured wayfinding lines running along it.',
      checker: 'Checkerboard lino tiles buffed to a shine.',
      terrazzo: 'Speckled terrazzo with a dark border strip along each wall.',
    }),
    station: choice('What is the nurses’ station bay like?', {
      warm: 'Warm and occupied-looking: a desk lamp, a glowing monitor, the one welcoming pool of light.',
      cold: 'Lit by a hard blue-white tube, clinical and wide awake.',
      festive: 'Strung with fairy lights and paper decorations: a holiday night shift.',
      dim: 'Unattended and almost dark, only a screen glowing.',
    }),
    sign: choice('What does the hanging sign say?', SIGNS),
    end: choice('What is at the far end of the corridor?', {
      doors: 'Double fire doors with round windows under a lit green exit sign.',
      window: 'A tall window on the night: city lights and a moon.',
      lift: 'Steel lift doors with a lit floor indicator.',
    }),
    trace: choice('What has been left standing in the corridor?', {
      none: 'Nothing: bare floor all the way down.',
      cleaner: 'A yellow wet-floor sign and a mop bucket: the cleaner is somewhere near.',
      linen: 'A wheeled cage of white and blue linen bags.',
      vending: 'A drinks vending machine humming against the wall, its front the brightest thing after the station.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const pal = PALETTE[a.era];
    const root = new THREE.Group();
    const HW = 1.7, H = pal.height, Z0 = 10.5, Z1 = -26, PITCH = 3.6, DOOR_W = 1.1, DOOR_H = 2.1;
    const BAY_Z0 = 3.4, BAY_Z1 = -2.4, BAY_X = -4.0, BS = (BAY_Z0 + BAY_Z1) / 2 - 1.8, EXIT_Z = -8.6;
    const CAM: P3 = [0.95, 1.55, 8.4];
    const dawn = a.night === 'dawn';
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    // The dusk is baked into every painted surface, so only the things that glow stay bright.
    const worn = (tint: THREE.ColorRepresentation) => new THREE.Color(tint).lerp(new THREE.Color('#8f8a78'), mood.wear * 0.22).lerp(new THREE.Color(dawn ? '#8c96a8' : '#3a7c86'), dawn ? 0.36 : 0.48).multiplyScalar(dawn ? 0.8 : 0.72);
    const add = <T extends THREE.Object3D>(object: T, parent: THREE.Object3D = root) => { parent.add(object); return object; };
    const std = (tint: THREE.ColorRepresentation, options: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color: worn(tint), roughness: 0.78, ...options });
    const lit = (tint: THREE.ColorRepresentation, power = 1) => new THREE.MeshStandardMaterial({ color: '#111111', emissive: tint, emissiveIntensity: power, roughness: 0.6 });
    const box = (size: P3, at: P3, material: THREE.Material, shadow = false, parent: THREE.Object3D = root) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
      mesh.position.set(...at); mesh.castShadow = shadow; mesh.receiveShadow = true;
      return add(mesh, parent);
    };
    const instances = (geometry: THREE.BufferGeometry, material: THREE.Material, list: Inst[], shadow = false) => {
      const mesh = new THREE.InstancedMesh(geometry, material, Math.max(1, list.length));
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
      list.forEach((item, i) => {
        m.compose(new THREE.Vector3(...item.at), q.setFromAxisAngle(up, item.turn ?? 0), new THREE.Vector3(...item.scale));
        mesh.setMatrixAt(i, m);
        if (item.color !== undefined) mesh.setColorAt(i, new THREE.Color(item.color));
      });
      mesh.count = list.length;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.castShadow = shadow; mesh.receiveShadow = true;
      return add(mesh);
    };
    const cube = () => new THREE.BoxGeometry(1, 1, 1);
    const plate = (text: string, width: number, height: number, ink: string, paper: string, glow = 0) => {
      const map = paint(512, Math.max(48, Math.round(512 * height / width)), (ctx) => {
        const h = ctx.canvas.height;
        ctx.fillStyle = paper; ctx.fillRect(0, 0, 512, h);
        ctx.fillStyle = ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = `bold ${Math.min(h * 0.62, 760 / Math.max(text.length, 1))}px sans-serif`;
        ctx.fillText(text, 256, h / 2 + 2, 480);
      });
      const material = new THREE.MeshStandardMaterial({ map, roughness: 0.6, emissive: '#ffffff', emissiveMap: map, emissiveIntensity: glow, side: THREE.DoubleSide });
      return add(new THREE.Mesh(new THREE.PlaneGeometry(width, height), material));
    };

    // ---- Light: a blue-green dusk that never goes black, plus the glowing things.
    const cool = new THREE.Color().setHSL(mix(0.52, 0.45, mood.warmth), 0.45, 0.62);
    const hemi = add(new THREE.HemisphereLight(cool, new THREE.Color('#3f7472'), dawn ? 0.85 : 0.72));
    if (dawn) hemi.color.lerp(new THREE.Color('#e6cfd4'), 0.4);
    const key = new THREE.DirectionalLight(new THREE.Color().setHSL(mix(0.55, 0.1, mood.warmth * 0.7 + (a.station === 'warm' ? 0.3 : 0)), 0.4, 0.86), a.station === 'dim' ? 0.35 : 0.5);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.normalBias = 0.04; key.shadow.bias = -0.0004; key.shadow.radius = 5;
    add(key); add(key.target);
    const stationTint = { warm: '#ffd9a0', cold: '#cfe6ff', festive: '#ffcf9a', dim: '#9fc4d6' }[a.station];
    const stationPower = { warm: 1, cold: 1.05, festive: 0.85, dim: 0.28 }[a.station];
    const pool = add(new THREE.SpotLight(stationTint, 62 * stationPower, 11, 0.95, 0.85, 1.4));
    pool.position.set(-2.3, H - 0.1, 2.1 + BS);
    pool.target.position.set(-2.0, 0, 1.9 + BS);
    add(pool.target);

    // ---- Which doors exist, and which are open.
    interface Door { side: -1 | 1; z: number; state: 'closed' | 'tv' | 'lamp' | 'alarm'; number: number }
    const doors: Door[] = [];
    let ward = 1 + Math.floor(random() * 30);
    for (let z = -4.6; z > Z1 + 1.5; z -= PITCH) doors.push({ side: -1, z, state: 'closed', number: ward++ });
    for (let z = 5.8; z > Z1 + 1.5; z -= PITCH) doors.push({ side: 1, z, state: 'closed', number: ward++ });
    const at = (side: number, z: number) => doors.find((door) => door.side === side && Math.abs(door.z - z) < 0.1);
    if (a.night === 'awake') { at(1, -1.4)!.state = 'tv'; at(-1, -11.8)!.state = 'lamp'; }
    if (a.night === 'emergency') { at(-1, -8.2)!.state = 'alarm'; if (mood.density > 0.5) at(1, -8.6)!.state = 'lamp'; }
    if (a.night === 'quiet' && mood.density > 0.6) at(1, -5)!.state = 'lamp';
    if (dawn) { at(1, -1.4)!.state = 'lamp'; if (mood.density > 0.4) at(-1, -15.4)!.state = 'lamp'; }
    const GLOW = { tv: '#8fc8ff', lamp: '#ffcf8a', alarm: '#f4fbff', closed: '#000000' } as const;

    // ---- Ceiling lights: mostly off at night.
    const fixtures: { z: number; level: number }[] = [];
    for (let i = 0, z = 6.6; z > Z1 + 1; z -= PITCH, i++) {
      let level = i % 3 === 1 ? 0.55 : 0.07;
      if (a.night === 'emergency') level = i % 2 === 0 ? 0.8 : 0.3;
      if (dawn) level = i % 2 === 0 ? 0.6 : 0.12;
      fixtures.push({ z, level });
    }
    const failing = mood.wear > 0.55 ? fixtures.find((fixture) => fixture.level > 0.4 && fixture.z < -4) : undefined;

    // ---- Floor: painted lino with the reflections of everything that glows.
    const FX0 = BAY_X - 0.2, FX1 = HW + 0.2, FZ0 = Z1 - 0.4, FZ1 = Z0, PX = 36;
    const reflect = (x: number, y: number, z: number): [number, number] => { const t = CAM[1] / (CAM[1] + y); return [CAM[0] + (x - CAM[0]) * t, CAM[2] + (z - CAM[2]) * t]; };
    const floorMap = paint(Math.round((FX1 - FX0) * PX), Math.round((FZ1 - FZ0) * PX), (ctx) => {
      const fx = (x: number) => (x - FX0) * PX, fz = (z: number) => (z - FZ0) * PX;
      const W = ctx.canvas.width, L = ctx.canvas.height;
      ctx.fillStyle = '#' + worn(pal.floor).getHexString(); ctx.fillRect(0, 0, W, L);
      if (a.floor === 'checker') {
        ctx.fillStyle = '#' + worn(pal.floor2).getHexString();
        const tile = 0.6;
        for (let ix = 0; ix * tile < FX1 - FX0; ix++) for (let iz = 0; iz * tile < FZ1 - FZ0; iz++) if ((ix + iz) % 2) ctx.fillRect(ix * tile * PX, iz * tile * PX, tile * PX, tile * PX);
      } else if (a.floor === 'terrazzo') {
        for (let i = 0; i < 9000; i++) { ctx.fillStyle = pick(['rgba(255,255,255,0.18)', 'rgba(20,40,40,0.3)', 'rgba(150,120,90,0.25)']); ctx.fillRect(random() * W, random() * L, 1.5 + random() * 2, 1.5 + random() * 2); }
        ctx.fillStyle = '#' + worn(pal.floor2).multiplyScalar(0.8).getHexString();
        ctx.fillRect(fx(-HW), 0, 0.22 * PX, fz(BAY_Z1)); ctx.fillRect(fx(-HW), fz(BAY_Z0), 0.22 * PX, L); ctx.fillRect(fx(HW - 0.22), 0, 0.22 * PX, L);
      } else {
        const stripes = [pal.accent, '#e0b83a', '#d0584a'].map((tint) => '#' + worn(tint).multiplyScalar(1.25).getHexString());
        stripes.slice(0, 2 + (mood.density > 0.5 ? 1 : 0)).forEach((tint, i) => {
          ctx.fillStyle = tint; ctx.globalAlpha = 0.85;
          const x = 0.75 + i * 0.16;
          ctx.fillRect(fx(x), 0, 0.09 * PX, L);
          if (i === 0) ctx.fillRect(fx(-HW), fz(-3.3), (x + HW) * PX, 0.09 * PX);
        });
        ctx.globalAlpha = 1;
      }
      // Wear: scuffs and trolley tracks.
      ctx.strokeStyle = 'rgba(40,50,50,0.16)';
      for (let i = 0; i < mood.wear * 120; i++) { ctx.lineWidth = 0.5 + random() * 1.5; const x = fx(mix(-HW, HW, random())), z = random() * L; ctx.beginPath(); ctx.moveTo(x, z); ctx.lineTo(x + (random() - 0.5) * 14, z + (random() - 0.5) * 70); ctx.stroke(); }
      // Sheen down the middle, where the buffer has been.
      const sheen = ctx.createLinearGradient(fx(-HW), 0, fx(HW), 0);
      sheen.addColorStop(0, 'rgba(0,20,25,0.22)'); sheen.addColorStop(0.5, 'rgba(255,255,255,0.06)'); sheen.addColorStop(1, 'rgba(0,20,25,0.22)');
      ctx.fillStyle = sheen; ctx.fillRect(fx(-HW), 0, HW * 2 * PX, L);
      const streak = (x: number, z: number, wide: number, long: number, tint: string, alpha: number) => {
        ctx.save(); ctx.translate(fx(x), fz(z)); ctx.scale(wide * PX, long * PX);
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
        g.addColorStop(0, tint); g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.globalAlpha = alpha; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 1, 0, 6.3); ctx.fill(); ctx.restore();
      };
      // Each ceiling light, mirrored in the polish.
      for (const fixture of fixtures) { const [x, z] = reflect(0, H, fixture.z); streak(x, z, 0.3, 1.5, '#eafcff', fixture.level * 0.7); streak(0, fixture.z, 1.3, 1.5, '#dff6f4', fixture.level * 0.22); }
      // Door spills.
      for (const door of doors) if (door.state !== 'closed') {
        const power = door.state === 'alarm' ? 0.95 : 0.65, reach = door.state === 'alarm' ? 3.0 : 2.1;
        const g = ctx.createLinearGradient(fx(door.side * HW), 0, fx(door.side * (HW - reach)), 0);
        g.addColorStop(0, GLOW[door.state]); g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.save(); ctx.globalAlpha = power; ctx.fillStyle = g; ctx.beginPath();
        ctx.moveTo(fx(door.side * HW), fz(door.z + 0.5)); ctx.lineTo(fx(door.side * HW), fz(door.z - 0.5));
        ctx.lineTo(fx(door.side * (HW - reach)), fz(door.z - 1.5)); ctx.lineTo(fx(door.side * (HW - reach)), fz(door.z + 0.9));
        ctx.closePath(); ctx.fill(); ctx.restore();
      }
      // The station pool and the exit sign's green smear.
      streak(-2.2, 2.0 + BS, 2.3, 2.7, stationTint, 0.3 * stationPower);
      const [ex, ez] = reflect(0.2, H - 0.3, EXIT_Z);
      streak(ex, ez, 0.4, 1.6, '#5cffa8', 0.55); streak(0.2, EXIT_Z, 1.3, 2.2, '#5cffa8', 0.25);
      const [tx, tz] = reflect(0, 1.6, Z1);
      streak(tx, tz, 0.5, 3.2, a.end === 'window' ? '#bcd0ff' : dawn ? '#ffd6d6' : '#c8ffe2', dawn ? 0.6 : 0.4);
      if (a.era === 'children') for (let i = 0; i < 14; i++) { ctx.fillStyle = pick(['#e2574c', '#f0c82a', '#3fa35c', '#2f8fe0']); ctx.globalAlpha = 0.35; const z = 5 - i * 1.9; for (const d of [-0.12, 0.12]) { ctx.beginPath(); ctx.ellipse(fx(-0.4 + d + (i % 2) * 0.1), fz(z + d * 2), 5, 8, 0.2, 0, 6.3); ctx.fill(); } }
      ctx.globalAlpha = 1;
    });
    const floor = add(new THREE.Mesh(new THREE.PlaneGeometry(FX1 - FX0, FZ1 - FZ0), new THREE.MeshStandardMaterial({ map: floorMap, roughness: mix(0.36, 0.6, mood.wear), metalness: 0.05 })));
    floor.rotation.x = -Math.PI / 2;
    floor.position.set((FX0 + FX1) / 2, 0, (FZ0 + FZ1) / 2);
    floor.receiveShadow = true;

    // ---- Walls: piers between doorways, lintels above them, a dado and a handrail.
    const wallMat = std(pal.wall), dadoMat = std(pal.dado, { roughness: 0.55 }), frameMat = std(pal.frame, { roughness: 0.5 }), railMat = std(pal.rail, { roughness: 0.4, metalness: a.era === 'modern' ? 0.2 : 0 });
    const dark = std('#39474a', { roughness: 0.6 }), steel = std('#b9c2c4', { metalness: 0.7, roughness: 0.35 });
    const piers: Inst[] = [], dados: Inst[] = [], rails: Inst[] = [], skirts: Inst[] = [], brackets: Inst[] = [], bumpers: Inst[] = [];
    const run = (side: number, zA: number, zB: number) => {
      const len = zA - zB, mid = (zA + zB) / 2;
      if (len < 0.05) return;
      piers.push({ at: [side * (HW + 0.1), H / 2, mid], scale: [0.2, H, len] });
      dados.push({ at: [side * (HW - 0.008), 0.52, mid], scale: [0.02, 1.04, len] });
      skirts.push({ at: [side * (HW - 0.014), 0.06, mid], scale: [0.03, 0.12, len] });
      bumpers.push({ at: [side * (HW - 0.02), 0.34, mid], scale: [0.03, 0.16, len] });
      if (len > 0.6) {
        rails.push({ at: [side * (HW - 0.085), 0.92, mid], scale: [0.045, 0.06, len - 0.16] });
        for (let z = zA - 0.25; z > zB + 0.1; z -= 1.15) brackets.push({ at: [side * (HW - 0.045), 0.89, z], scale: [0.09, 0.03, 0.03] });
      }
    };
    for (const side of [-1, 1] as const) {
      const edges = doors.filter((door) => door.side === side).map((door) => door.z).sort((p, q) => q - p);
      let from = side === -1 ? BAY_Z1 : Z0;
      if (side === -1) run(-1, Z0, BAY_Z0);
      for (const z of edges) { run(side, from, z + DOOR_W / 2); from = z - DOOR_W / 2; }
      run(side, from, Z1);
    }
    instances(cube(), wallMat, piers);
    instances(cube(), wallMat, doors.map((door) => ({ at: [door.side * (HW + 0.1), (DOOR_H + H) / 2, door.z] as P3, scale: [0.2, H - DOOR_H, DOOR_W] as P3 })));
    instances(cube(), dadoMat, dados); instances(cube(), dark, skirts); instances(cube(), railMat, rails, true); instances(cube(), steel, brackets);
    instances(cube(), std(pal.frame, { roughness: 0.6 }), bumpers);
    // Bay walls, end wall, the wall behind the camera, ceiling.
    box([0.2, H, BAY_Z0 - BAY_Z1 + 0.4], [BAY_X - 0.1, H / 2, (BAY_Z0 + BAY_Z1) / 2], wallMat);
    for (const z of [BAY_Z0 + 0.1, BAY_Z1 - 0.1]) box([-BAY_X - HW, H, 0.2], [(BAY_X - HW) / 2, H / 2, z], wallMat);
    box([HW * 2 + 0.4, H, 0.2], [0, H / 2, Z1 - 0.1], wallMat);
    box([HW * 2 + 0.4, H, 0.2], [0, H / 2, Z0 + 0.1], wallMat);
    const ceilMap = paint(64, 64, (ctx) => { ctx.fillStyle = '#' + worn(pal.ceiling).getHexString(); ctx.fillRect(0, 0, 64, 64); ctx.strokeStyle = 'rgba(40,60,60,0.35)'; ctx.lineWidth = 2; ctx.strokeRect(0, 0, 64, 64); });
    ceilMap.wrapS = ceilMap.wrapT = THREE.RepeatWrapping; ceilMap.repeat.set((FX1 - FX0) / 0.6, (FZ1 - FZ0) / 0.6);
    const ceiling = add(new THREE.Mesh(new THREE.PlaneGeometry(FX1 - FX0, FZ1 - FZ0), new THREE.MeshStandardMaterial({ map: a.era === 'infirmary' ? null : ceilMap, color: a.era === 'infirmary' ? worn(pal.ceiling) : '#ffffff', roughness: 0.95 })));
    ceiling.rotation.x = Math.PI / 2; ceiling.position.set((FX0 + FX1) / 2, H, (FZ0 + FZ1) / 2);
    // Bulkhead over the bay opening, carrying the station's name.
    box([0.16, 0.5, BAY_Z0 - BAY_Z1], [-HW, H - 0.25, (BAY_Z0 + BAY_Z1) / 2], dadoMat);
    const signPaper = '#' + new THREE.Color(a.era === 'children' ? '#2f6fb0' : pal.frame).multiplyScalar(0.8).getHexString();
    const name = plate('NURSES’ STATION', 2.6, 0.26, '#f6fbfa', signPaper, a.station === 'dim' ? 0.25 : 0.7);
    name.position.set(-HW + 0.085, H - 0.25, 1.7 + BS); name.rotation.y = Math.PI / 2;

    // ---- Doors.
    const tints = a.era === 'children' ? ['#e2574c', '#f0b62a', '#3fa35c', '#2f8fe0', '#a05fc8', '#f08a2a'] : [pal.door];
    const jambs: Inst[] = [], heads: Inst[] = [], leaves: Inst[] = [], panes: Inst[] = [], kicks: Inst[] = [], handles: Inst[] = [], numbers: Inst[] = [], calls: Inst[] = [], charts: Inst[] = [];
    const flicker: { material: THREE.MeshBasicMaterial; base: THREE.Color; kind: 'tv' | 'alarm' }[] = [];
    let alarmLamp: THREE.MeshBasicMaterial | null = null;
    doors.forEach((door, index) => {
      const { side, z } = door, x = side * HW;
      for (const dz of [-0.585, 0.585]) jambs.push({ at: [x + side * 0.04, DOOR_H / 2 + 0.02, z + dz], scale: [0.16, DOOR_H + 0.04, 0.07] });
      heads.push({ at: [x + side * 0.04, DOOR_H + 0.045, z], scale: [0.16, 0.09, 1.24] });
      numbers.push({ at: [x - side * 0.006, 1.6, z + 0.82], scale: [0.012, 0.15, 0.24] });
      charts.push({ at: [x - side * 0.03, 1.18, z + 0.84], scale: [0.05, 0.3, 0.25] });
      const tint = worn(tints[index % tints.length]);
      const warmWindow = door.state === 'closed' && random() < mix(0.05, 0.3, mood.density);
      const callOn = door.state === 'alarm' || (door.state === 'closed' && random() < mood.energy * 0.12);
      if (door.state !== 'alarm') calls.push({ at: [x - side * 0.05, DOOR_H + 0.26, z], scale: [0.05, 0.05, 0.05], color: callOn ? '#ffb347' : '#6f8a8c' });
      if (door.state === 'closed') {
        leaves.push({ at: [x + side * 0.05, DOOR_H / 2, z], scale: [0.045, DOOR_H - 0.02, DOOR_W - 0.02], color: tint });
        panes.push({ at: [x + side * 0.024, 1.5, z + 0.26], scale: [0.012, a.era === 'infirmary' ? 0.34 : 0.62, a.era === 'infirmary' ? 0.34 : 0.17], color: warmWindow ? '#e8c890' : '#3d6672' });
        kicks.push({ at: [x + side * 0.025, 0.16, z], scale: [0.008, 0.28, DOOR_W - 0.06] });
        handles.push({ at: [x + side * 0.0, 1.02, z - 0.42], scale: [0.06, 0.03, 0.15] });
      } else {
        // An open doorway: a glowing room behind, the leaf swung inward.
        const glow = new THREE.Color(GLOW[door.state]);
        const room = new THREE.MeshBasicMaterial({ color: glow.clone().multiplyScalar(door.state === 'alarm' ? 1 : 0.8), side: THREE.BackSide });
        const cell = add(new THREE.Mesh(new THREE.BoxGeometry(2.4, DOOR_H + 0.3, 2.6), room));
        cell.position.set(x + side * 1.42, DOOR_H / 2 + 0.1, z);
        if (door.state !== 'lamp') flicker.push({ material: room, base: room.color.clone(), kind: door.state });
        // A hint of the bed inside.
        box([1.0, 0.5, 2.0], [x + side * 1.5, 0.45, z - 0.3], new THREE.MeshBasicMaterial({ color: glow.clone().multiplyScalar(0.55) }));
        box([1.0, 0.9, 0.08], [x + side * 1.5, 0.75, z - 1.25], new THREE.MeshBasicMaterial({ color: glow.clone().multiplyScalar(0.4) }));
        const swing = door.state === 'alarm' ? 1.45 : mix(0.5, 1.0, random());
        const hinge = add(new THREE.Group());
        hinge.position.set(x + side * 0.1, 0, z - DOOR_W / 2);
        box([0.045, DOOR_H - 0.02, DOOR_W - 0.02], [0, DOOR_H / 2, DOOR_W / 2], new THREE.MeshStandardMaterial({ color: tint, roughness: 0.6 }), false, hinge);
        hinge.rotation.y = side * swing;
        const lamp = add(new THREE.PointLight(glow, door.state === 'alarm' ? 30 : 6, 8, 1.7));
        lamp.position.set(x - side * 0.5, 1.4, z);
        if (door.state === 'alarm') {
          alarmLamp = new THREE.MeshBasicMaterial({ color: '#ff3b2a' });
          const dome = add(new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 8), alarmLamp));
          dome.position.set(x - side * 0.06, DOOR_H + 0.28, z);
        }
      }
    });
    instances(cube(), frameMat, jambs); instances(cube(), frameMat, heads);
    instances(cube(), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6 }), leaves);
    instances(cube(), new THREE.MeshBasicMaterial({ color: '#ffffff' }), panes);
    instances(cube(), steel, kicks); instances(cube(), steel, handles);
    instances(cube(), std('#eef2ee', { roughness: 0.5 }), numbers); instances(cube(), std('#d6e2e4', { roughness: 0.3 }), charts);
    instances(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshBasicMaterial({ color: '#ffffff' }), calls);

    // ---- Ceiling fixtures by era.
    const lampTint = new THREE.Color().setHSL(mix(0.5, 0.12, mood.warmth * 0.6), 0.35, 0.9);
    const lampColour = (level: number) => new THREE.Color('#587476').lerp(lampTint, Math.min(1, level * 1.5));
    const steady = fixtures.filter((fixture) => fixture !== failing);
    const fixtureGeometry = a.era === 'infirmary' ? new THREE.SphereGeometry(0.2, 16, 12) : new THREE.BoxGeometry(a.era === 'seventies' ? 0.22 : 0.6, 0.04, 1.2);
    const fixtureY = a.era === 'infirmary' ? H - 0.75 : H - 0.015;
    instances(fixtureGeometry, new THREE.MeshBasicMaterial({ color: '#ffffff' }), steady.map((fixture) => ({ at: [0, fixtureY, fixture.z] as P3, scale: [1, 1, 1] as P3, color: lampColour(fixture.level) })));
    if (a.era === 'infirmary') {
      instances(new THREE.CylinderGeometry(0.012, 0.012, 0.6, 6), dark, fixtures.map((fixture) => ({ at: [0, H - 0.3, fixture.z] as P3, scale: [1, 1, 1] as P3 })));
      // Plaster arches springing from the walls.
      for (let z = 2.2; z > Z1; z -= PITCH) { const arch = add(new THREE.Mesh(new THREE.TorusGeometry(HW + 0.02, 0.11, 6, 24, Math.PI), wallMat)); arch.position.set(0, H - HW + 0.1, z + 0.9); arch.scale.y = 0.98; }
    }
    let failingMat: THREE.MeshBasicMaterial | null = null, failingLight: THREE.PointLight | null = null;
    if (failing) {
      failingMat = new THREE.MeshBasicMaterial({ color: lampColour(failing.level) });
      const tube = add(new THREE.Mesh(fixtureGeometry.clone(), failingMat)); tube.position.set(0, fixtureY, failing.z);
    }
    [...fixtures].filter((fixture) => fixture.level > 0.4).sort((p, q) => Math.abs(p.z - 0) - Math.abs(q.z - 0)).slice(0, 2).forEach((fixture) => {
      const lamp = add(new THREE.PointLight(lampTint, 11 * fixture.level, 8, 1.6));
      lamp.position.set(0, H - 0.35, fixture.z);
      if (fixture === failing) failingLight = lamp;
    });

    // ---- Hanging signs: the ward name, and the green exit sign.
    const wardSign = plate(SIGNS[a.sign], 1.5, 0.3, '#f4fbfa', signPaper, 0.55);
    wardSign.position.set(0.35, H - 0.42, -3.6);
    box([1.56, 0.36, 0.04], [0.35, H - 0.42, -3.625], dark);
    for (const dx of [-0.6, 0.6]) box([0.015, 0.25, 0.015], [0.35 + dx, H - 0.12, -3.62], steel);
    const exitMap = paint(256, 104, (ctx) => {
      ctx.fillStyle = '#0f9d58'; ctx.fillRect(0, 0, 256, 104);
      ctx.fillStyle = '#f4fff8'; ctx.font = 'bold 62px sans-serif'; ctx.textBaseline = 'middle'; ctx.fillText('EXIT', 96, 55);
      // Running figure and arrow.
      ctx.beginPath(); ctx.arc(52, 24, 9, 0, 6.3); ctx.fill();
      ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.strokeStyle = '#f4fff8';
      ctx.beginPath(); ctx.moveTo(50, 38); ctx.lineTo(42, 62); ctx.lineTo(26, 84); ctx.moveTo(42, 62); ctx.lineTo(60, 72); ctx.lineTo(62, 90); ctx.moveTo(48, 44); ctx.lineTo(68, 50); ctx.moveTo(48, 44); ctx.lineTo(30, 50); ctx.stroke();
    });
    const exitMat = new THREE.MeshStandardMaterial({ map: exitMap, emissive: '#ffffff', emissiveMap: exitMap, emissiveIntensity: 1.5, roughness: 0.4 });
    const exitSign = (x: number, y: number, z: number, wide: number) => {
      const face = add(new THREE.Mesh(new THREE.PlaneGeometry(wide, wide * 0.4), exitMat)); face.position.set(x, y, z + 0.035);
      box([wide + 0.05, wide * 0.4 + 0.05, 0.06], [x, y, z], dark);
    };
    exitSign(0.2, H - 0.3, EXIT_Z, 0.82);
    for (const dx of [-0.3, 0.3]) box([0.015, 0.12, 0.015], [0.2 + dx, H - 0.06, EXIT_Z], steel);
    const exitGlow = add(new THREE.PointLight('#48ff9a', 7, 7, 1.6)); exitGlow.position.set(0.2, H - 0.45, EXIT_Z + 0.3);

    // ---- The far end.
    const EZ = Z1 + 0.02;
    if (a.end === 'doors') {
      for (const side of [-1, 1]) {
        box([1.08, 2.15, 0.06], [side * 0.56, 1.075, EZ + 0.03], std(pal.door === '#e2574c' ? '#e9e4d4' : pal.door));
        const port = add(new THREE.Mesh(new THREE.CircleGeometry(0.2, 20), new THREE.MeshBasicMaterial({ color: dawn ? '#ffd9d2' : '#bff2dc' }))); port.position.set(side * 0.56, 1.55, EZ + 0.065);
        box([0.9, 0.3, 0.012], [side * 0.56, 0.2, EZ + 0.065], steel);
      }
      box([2.4, 0.12, 0.1], [0, 2.22, EZ + 0.05], frameMat);
      exitSign(0, 2.5, EZ + 0.06, 1.0);
    } else if (a.end === 'window') {
      const sky = paint(128, 192, (ctx) => {
        const g = ctx.createLinearGradient(0, 0, 0, 192);
        g.addColorStop(0, dawn ? '#6f86b8' : '#22355e'); g.addColorStop(0.7, dawn ? '#f0b8a8' : '#3f5f8a'); g.addColorStop(1, dawn ? '#ffd9b0' : '#5a7896');
        ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 192);
        if (!dawn) { ctx.fillStyle = '#f6f2dc'; ctx.beginPath(); ctx.arc(88, 42, 13, 0, 6.3); ctx.fill(); }
        ctx.fillStyle = '#16233a';
        for (let x = 0; x < 128; x += 14) { const h = 30 + random() * 50; ctx.fillRect(x, 192 - h, 12, h); ctx.fillStyle = '#ffd98a'; for (let i = 0; i < 5; i++) if (random() < 0.5) ctx.fillRect(x + 2 + (i % 2) * 5, 192 - h + 5 + i * 7, 3, 3); ctx.fillStyle = '#16233a'; }
      });
      const pane = add(new THREE.Mesh(new THREE.PlaneGeometry(1.8, 2.0), new THREE.MeshBasicMaterial({ map: sky }))); pane.position.set(0, 1.5, EZ + 0.01);
      box([1.95, 0.08, 0.08], [0, 0.46, EZ + 0.04], frameMat); box([1.95, 0.08, 0.08], [0, 2.54, EZ + 0.04], frameMat);
      for (const dx of [-0.94, 0, 0.94]) box([0.07, 2.1, 0.08], [dx, 1.5, EZ + 0.04], frameMat);
      box([2.0, 0.42, 0.25], [0, 0.21, EZ + 0.14], dadoMat);
    } else {
      for (const side of [-1, 1]) box([0.58, 2.1, 0.05], [side * 0.3, 1.05, EZ + 0.03], steel);
      box([1.4, 2.25, 0.03], [0, 1.12, EZ + 0.012], dark);
      const indicator = plate(String(1 + Math.floor(random() * 8)), 0.34, 0.2, '#ffb347', '#141a1c', 1.6); indicator.position.set(0, 2.42, EZ + 0.03);
      box([0.1, 0.22, 0.03], [0.95, 1.15, EZ + 0.03], steel);
      const button = add(new THREE.Mesh(new THREE.CircleGeometry(0.03, 12), new THREE.MeshBasicMaterial({ color: '#ffb347' }))); button.position.set(0.95, 1.18, EZ + 0.05);
    }
    if (a.end !== 'doors') exitSign(1.1, H - 0.28, EZ + 0.06, 0.6);
    const endGlow = add(new THREE.PointLight(dawn ? '#ffd0c8' : a.end === 'window' ? '#a8c4ff' : '#9fffd0', dawn ? 20 : 8, 14, 1.5)); endGlow.position.set(0, 1.9, Z1 + 1.5);

    // ---- Haze: thin veils that push the far end back into blue-green.
    const hazeTint = new THREE.Color(dawn ? '#8fa9b4' : '#4f8f96');
    for (const z of [-9, -13.5, -18, -22]) {
      const veil = add(new THREE.Mesh(new THREE.PlaneGeometry(HW * 2, H), new THREE.MeshBasicMaterial({ color: hazeTint, transparent: true, opacity: 0.13, depthWrite: false })));
      veil.position.set(0, H / 2, z);
    }

    // ---- The station bay: bench, shelves, board, clock, monitor, lamp, chair.
    const BX = BAY_X + 0.02;
    box([0.6, 0.74, BAY_Z0 - BAY_Z1 - 0.1], [BX + 0.3, 0.37, 1.8 + BS], dadoMat, true);
    box([0.66, 0.04, BAY_Z0 - BAY_Z1 - 0.06], [BX + 0.33, 0.76, 1.8 + BS], std('#e4e8e2', { roughness: 0.4 }), true);
    const boardMap = paint(384, 224, (ctx) => {
      ctx.fillStyle = '#f6f8f4'; ctx.fillRect(0, 0, 384, 224);
      ctx.fillStyle = pal.accent; ctx.fillRect(0, 0, 384, 26);
      ctx.strokeStyle = '#9aa6aa'; ctx.lineWidth = 2;
      for (let r = 0; r < 8; r++) { ctx.beginPath(); ctx.moveTo(0, 26 + r * 25); ctx.lineTo(384, 26 + r * 25); ctx.stroke(); }
      for (const x of [54, 190, 270]) { ctx.beginPath(); ctx.moveTo(x, 26); ctx.lineTo(x, 224); ctx.stroke(); }
      for (let r = 0; r < 8; r++) {
        ctx.fillStyle = '#1b1d1f'; ctx.font = 'bold 17px monospace'; ctx.fillText(String(r + 1), 14, 44 + r * 25);
        if (random() > mix(0.35, 0.95, mood.density)) continue;
        ctx.strokeStyle = pick(['#1f3f9a', '#b8241f', '#1c7a3c', '#1b1d1f']); ctx.lineWidth = 2.5; ctx.beginPath(); let x = 62; ctx.moveTo(x, 40 + r * 25);
        const end = 100 + random() * 250; while (x < end) { x += 5 + random() * 4; ctx.lineTo(x, 40 + r * 25 + (random() - 0.5) * 9); } ctx.stroke();
        ctx.fillStyle = pick(['#c8362c', '#e0a92a', '#3fa35c', '#2f6fb0']); ctx.beginPath(); ctx.arc(44, 39 + r * 25, 5, 0, 6.3); ctx.fill();
      }
    });
    const wallBoard = add(new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.0), new THREE.MeshStandardMaterial({ map: boardMap, roughness: 0.5, emissive: '#ffffff', emissiveMap: boardMap, emissiveIntensity: 0.18 })));
    wallBoard.position.set(BX + 0.012, 1.65, 0.45 + BS); wallBoard.rotation.y = Math.PI / 2;
    box([0.03, 1.08, 1.78], [BX, 1.65, 0.45 + BS], steel);
    // Shelves of colour-tabbed folders.
    const folders: Inst[] = [];
    const tabs = ['#c8362c', '#2f6fb0', '#e0a92a', '#3fa35c', '#7a4bb0', '#e07a2a', '#e9ecec', '#e9ecec'];
    for (const y of [1.32, 1.72]) {
      box([0.3, 0.03, 1.9], [BX + 0.15, y, 3.3 + BS], std('#e4e8e2'));
      for (let z = 2.42; z < 4.2; z += 0.075) if (random() < mix(0.55, 0.97, mood.density)) folders.push({ at: [BX + 0.15, y + 0.17, z + BS], scale: [0.24, mix(0.26, 0.31, random()), 0.055], turn: (random() - 0.5) * 0.12, color: new THREE.Color(pick(tabs)).multiplyScalar(0.8) });
    }
    instances(cube(), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6 }), folders);
    // Clock.
    const clock = add(new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.04, 24), std('#f4f4ee'))); clock.rotation.z = Math.PI / 2; clock.position.set(BX + 0.02, 2.25, 1.9 + BS);
    const hour = dawn ? 5.6 : 2 + random() * 2.5;
    for (const [len, turn, wide] of [[0.09, hour / 12 * 6.283, 0.018], [0.13, random() * 6.283, 0.012]] as const) {
      const hand = box([0.006, len, wide], [BX + 0.045, 2.25 + Math.cos(turn) * len / 2, 1.9 + BS - Math.sin(turn) * len / 2], dark); hand.rotation.x = turn;
    }
    // Monitor, turned toward the corridor, and a desk lamp.
    const screenMap = paint(192, 120, (ctx) => {
      ctx.fillStyle = '#06120f'; ctx.fillRect(0, 0, 192, 120);
      for (let row = 0; row < 3; row++) {
        const y = 24 + row * 36, tint = ['#5cf08a', '#ffe14a', '#5cd0f0'][row];
        ctx.strokeStyle = tint; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(0, y);
        const beat = 24 + random() * 20;
        for (let x = 0; x < 140; x += 2) { const ph = (x % beat) / beat; ctx.lineTo(x, y + (ph > 0.42 && ph < 0.5 ? -14 : ph >= 0.5 && ph < 0.56 ? 8 : 0)); }
        ctx.stroke(); ctx.fillStyle = tint; ctx.font = 'bold 22px monospace'; ctx.fillText(String(52 + Math.floor(random() * 60)), 150, y + 8);
      }
    });
    const screenMat = new THREE.MeshStandardMaterial({ map: screenMap, emissive: '#ffffff', emissiveMap: screenMap, emissiveIntensity: 1.5, roughness: 0.3 });
    const monitor = add(new THREE.Group());
    box([0.56, 0.36, 0.04], [0, 0.3, 0], dark, true, monitor);
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.3), screenMat); screen.position.set(0, 0.3, 0.022); monitor.add(screen);
    box([0.06, 0.14, 0.04], [0, 0.07, -0.02], dark, false, monitor); box([0.24, 0.015, 0.16], [0, 0.008, -0.02], dark, false, monitor);
    monitor.position.set(BX + 0.36, 0.78, 3.0 + BS); monitor.rotation.y = Math.PI / 2 + 0.35;
    if (a.station !== 'dim') {
      const lampWarm = a.station === 'cold' ? '#dfeeff' : '#ffd08a';
      box([0.14, 0.02, 0.14], [BX + 0.35, 0.79, 1.3 + BS], dark);
      const arm = box([0.02, 0.42, 0.02], [BX + 0.4, 1.0, 1.3 + BS], steel); arm.rotation.z = -0.35;
      const shade = add(new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.13, 16, 1, true), std(pal.accent, { side: THREE.DoubleSide }))); shade.position.set(BX + 0.52, 1.2, 1.3 + BS);
      const bulb = add(new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), new THREE.MeshBasicMaterial({ color: lampWarm }))); bulb.position.set(BX + 0.52, 1.16, 1.3 + BS);
      const deskLamp = add(new THREE.PointLight(lampWarm, 5, 4, 1.7)); deskLamp.position.set(BX + 0.55, 1.1, 1.3 + BS);
    }
    // Downlights over the bay.
    const downs: Inst[] = [];
    for (const z of [0.4, 2.0, 3.6]) downs.push({ at: [-2.6, H - 0.012, z + BS], scale: [0.14, 0.02, 0.14], color: new THREE.Color('#587476').lerp(new THREE.Color(stationTint), stationPower) });
    if (a.station === 'cold') box([0.16, 0.05, 2.4], [-2.6, H - 0.03, 1.9 + BS], new THREE.MeshBasicMaterial({ color: '#eaf6ff' }));
    else instances(new THREE.CylinderGeometry(1, 1, 1, 16), new THREE.MeshBasicMaterial({ color: '#ffffff' }), downs);
    // Chair at the bench.
    const chair = add(new THREE.Group());
    const fabric = std(pick(['#2f4f7a', '#3a3f44', '#5a2f3a', '#2f5f55']), { roughness: 0.9 });
    for (let i = 0; i < 5; i++) { const t = i / 5 * 6.283; const leg = box([0.28, 0.03, 0.04], [Math.cos(t) * 0.14, 0.05, Math.sin(t) * 0.14], dark, true, chair); leg.rotation.y = -t; }
    box([0.05, 0.36, 0.05], [0, 0.26, 0], steel, true, chair);
    box([0.46, 0.08, 0.44], [0, 0.47, 0], fabric, true, chair);
    box([0.42, 0.4, 0.06], [0, 0.82, -0.22], fabric, true, chair);
    chair.position.set(BX + 1.05, 0, 2.6 + BS + random() * 0.6); chair.rotation.y = -Math.PI / 2 + (random() - 0.5) * 1.6;
    // Festive: a string of coloured bulbs along the bulkhead and paper stars.
    const bulbs: THREE.MeshBasicMaterial[] = [];
    if (a.station === 'festive') {
      const hues = ['#ff5a4a', '#ffd24a', '#5cf08a', '#5cb8ff', '#ff8ad0'];
      hues.forEach((hue, h) => {
        const material = new THREE.MeshBasicMaterial({ color: hue }); bulbs.push(material);
        const list: Inst[] = [];
        for (let i = h; i < 34; i += hues.length) { const t = i / 33; list.push({ at: [-HW + 0.1, H - 0.56 - Math.abs(Math.sin(t * Math.PI * 4)) * 0.14, mix(BAY_Z0 - 0.15, BAY_Z1 + 0.15, t)], scale: [0.035, 0.045, 0.035] }); }
        instances(new THREE.SphereGeometry(1, 8, 6), material, list);
      });
      for (let i = 0; i < 5; i++) { const star = add(new THREE.Mesh(new THREE.CircleGeometry(0.11, 5), new THREE.MeshStandardMaterial({ color: pick(['#f6f4ec', '#f0c82a', '#e2574c']), side: THREE.DoubleSide, roughness: 0.8 }))); star.position.set(BX + 0.03, 2.2 + random() * 0.3, 2.5 + BS + i * 0.4); star.rotation.set(0, Math.PI / 2, random() * 3); }
    }

    // ---- Notices and murals on the walls.
    const notices: Inst[] = [];
    for (let i = 0; i < mix(2, 12, mood.density); i++) {
      const side = random() < 0.5 ? -1 : 1, z = mix(-4, Z1 + 3, random());
      if (doors.some((door) => door.side === side && Math.abs(door.z - z) < 1.15)) continue;
      notices.push({ at: [side * (HW - 0.012), mix(1.35, 1.75, random()), z], scale: [0.012, mix(0.28, 0.42, random()), mix(0.21, 0.32, random())], color: pick(['#f4f1e6', '#f7e59a', '#cfe4f2', '#f2c6cf', '#d6efd0']) });
    }
    instances(cube(), new THREE.MeshStandardMaterial({ color: '#b9c6c6', roughness: 0.9 }), notices);
    if (a.era === 'children') {
      const dots: Inst[] = [];
      const bright = ['#e2574c', '#f0b62a', '#3fa35c', '#2f8fe0', '#a05fc8', '#f4f6f8'];
      for (let i = 0; i < 60; i++) {
        const side = random() < 0.5 ? -1 : 1, z = mix(Z0 - 4, Z1 + 1, random());
        if (side === -1 && z > BAY_Z1 - 0.3 && z < BAY_Z0 + 0.3) continue;
        if (doors.some((door) => door.side === side && Math.abs(door.z - z) < 0.85)) continue;
        const r = mix(0.1, 0.28, random());
        dots.push({ at: [side * (HW - 0.006), mix(1.3, 2.4, random()), z], scale: [0.01, r * 1.15, r], color: worn(new THREE.Color(pick(bright)).lerp(new THREE.Color('#9ab0b8'), (1 - mood.cheer) * 0.4)).multiplyScalar(1.2) });
      }
      instances(new THREE.SphereGeometry(1, 14, 10), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.8 }), dots);
    }
    // A hand-gel dispenser and a fire extinguisher by the first pier.
    box([0.1, 0.2, 0.09], [HW - 0.06, 1.25, 4.3], std('#eef2f0', { roughness: 0.4 }));
    const extinguisher = add(new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.5, 14), std('#c8281f', { roughness: 0.4 }))); extinguisher.position.set(HW - 0.11, 0.75, 0.4); extinguisher.castShadow = true;
    box([0.06, 0.1, 0.06], [HW - 0.11, 1.05, 0.4], dark);

    // ---- Something left standing in the corridor.
    const TX = HW - 0.55, TZ = -6.9;
    if (a.trace === 'cleaner') {
      const yellow = std('#f0c21e', { roughness: 0.5, side: THREE.DoubleSide });
      for (const lean of [-1, 1]) { const leaf = box([0.3, 0.62, 0.02], [TX - 0.5, 0.3, TZ + 2.2 + lean * 0.11], yellow, true); leaf.rotation.x = lean * 0.34; }
      const warn = plate('!', 0.2, 0.2, '#1b1d1f', '#f0c21e', 0.1); warn.position.set(TX - 0.5, 0.36, TZ + 2.2 + 0.125); warn.rotation.x = -0.34;
      const bucket = add(new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.15, 0.3, 16, 1, true), std(pick(['#2f6fb0', '#c8362c', '#e0a92a']), { side: THREE.DoubleSide, roughness: 0.5 }))); bucket.position.set(TX, 0.21, TZ); bucket.castShadow = true;
      box([0.42, 0.06, 0.34], [TX, 0.04, TZ], dark, true);
      const mop = box([0.025, 1.35, 0.025], [TX + 0.1, 0.8, TZ - 0.05], std('#c9a96a'), true); mop.rotation.z = -0.22; mop.rotation.x = 0.1;
      const wet = add(new THREE.Mesh(new THREE.CircleGeometry(0.9, 24), new THREE.MeshStandardMaterial({ color: '#cfe8ea', roughness: 0.03, metalness: 0.3, transparent: true, opacity: 0.28, depthWrite: false }))); wet.rotation.x = -Math.PI / 2; wet.position.set(TX - 0.9, 0.004, TZ + 1.0); wet.scale.y = 1.8;
    } else if (a.trace === 'linen') {
      const cage = add(new THREE.Group());
      for (const x of [-0.3, 0.3]) for (const z of [-0.4, 0.4]) box([0.025, 1.5, 0.025], [x, 0.85, z], steel, true, cage);
      for (const y of [0.12, 0.6, 1.1, 1.6]) { box([0.62, 0.02, 0.02], [0, y, -0.4], steel, false, cage); box([0.62, 0.02, 0.02], [0, y, 0.4], steel, false, cage); box([0.02, 0.02, 0.8], [-0.3, y, 0], steel, false, cage); box([0.02, 0.02, 0.8], [0.3, y, 0], steel, false, cage); }
      box([0.62, 0.03, 0.82], [0, 0.11, 0], dark, true, cage);
      for (let i = 0; i < mix(3, 7, mood.density); i++) {
        const bag = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 8), std(pick(['#f1f1ec', '#f1f1ec', '#8fb4d6', '#c95a5a']), { roughness: 0.95 }));
        bag.position.set((random() - 0.5) * 0.14, 0.34 + i * 0.26, (i % 2 ? 0.17 : -0.17) + (random() - 0.5) * 0.1); bag.scale.set(1.05, 0.75, 1.1); bag.castShadow = true; cage.add(bag);
      }
      for (const x of [-0.26, 0.26]) for (const z of [-0.36, 0.36]) { const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.03, 12), dark); wheel.rotation.z = Math.PI / 2; wheel.position.set(x, 0.05, z); cage.add(wheel); }
      cage.position.set(TX + 0.12, 0, TZ); cage.rotation.y = (random() - 0.5) * 0.3;
    } else if (a.trace === 'vending') {
      const vendMap = paint(160, 320, (ctx) => {
        ctx.fillStyle = '#12303a'; ctx.fillRect(0, 0, 160, 320);
        ctx.fillStyle = '#e8f6ff'; ctx.fillRect(10, 10, 108, 220);
        for (let r = 0; r < 6; r++) for (let c = 0; c < 5; c++) { ctx.fillStyle = pick(['#e2452f', '#2f8fe0', '#f0c82a', '#3fa35c', '#f08a2a', '#7a4bb0']); ctx.fillRect(16 + c * 20, 18 + r * 36, 14, 26); }
        ctx.fillStyle = '#0a1a20'; ctx.fillRect(10, 248, 108, 50);
        ctx.fillStyle = '#5cf08a'; ctx.fillRect(128, 60, 22, 14); ctx.fillStyle = '#c9d2d6'; ctx.fillRect(128, 90, 22, 60);
      });
      box([0.72, 1.85, 0.9], [HW - 0.38, 0.925, TZ], std('#24424c', { roughness: 0.5 }), true);
      const face = add(new THREE.Mesh(new THREE.PlaneGeometry(0.86, 1.78), new THREE.MeshStandardMaterial({ map: vendMap, emissive: '#ffffff', emissiveMap: vendMap, emissiveIntensity: 1.25, roughness: 0.3 })));
      face.position.set(HW - 0.745, 0.94, TZ); face.rotation.y = -Math.PI / 2;
    }

    // ---- Camera and placing the cast.
    const camera = new THREE.PerspectiveCamera(37, 1, 0.25, 90);
    const slots: { x: number; z: number; turn: number; reach: number; wall: number }[] = [
      { x: -1.45, z: 0.5, turn: 0.72, reach: 1.45, wall: 0 },
      { x: 1, z: -3.2, turn: -0.75, reach: 0.72, wall: 1 },
      { x: -1, z: -6.4, turn: 0.7, reach: 0.72, wall: -1 },
      { x: 1, z: -10.4, turn: -0.65, reach: 0.75, wall: 1 },
    ];
    const place = (items: readonly Placeable[]) => {
      let heroTop = 1.6;
      items.forEach((item, index) => {
        const slot = slots[index % slots.length];
        // True sizes, with small things lifted toward visibility and giants held under the ceiling.
        const natural = Math.max(item.height, item.radius * 1.5, 0.05);
        const shown = natural < 0.9 ? 0.9 * (natural / 0.9) ** 0.45 : natural > 2.25 ? 2.25 * (natural / 2.25) ** 0.2 : natural;
        const scale = Math.min(shown / natural, slot.reach / Math.max(item.radius, 0.05), (H - 0.35) / Math.max(item.height, 0.05));
        item.holder.scale.setScalar(scale);
        const r = item.radius * scale;
        const x = slot.wall ? slot.wall * (HW - 0.22 - Math.min(r, 0.75)) : slot.x - Math.max(0, r - 0.9) * 0.6;
        item.holder.position.set(x, 0, slot.z);
        item.holder.rotation.y = slot.turn + (random() - 0.5) * 0.3;
        item.holder.updateMatrixWorld(true);
        if (index === 0) heroTop = Math.max(1.2, item.height * scale);
      });
      camera.position.set(...CAM);
      camera.lookAt(-0.55, mix(0.95, 1.3, Math.min(1, heroTop / 2.4)), -5.5);
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld(true);
      key.target.position.set(-0.6, 0, -2.5);
      key.position.set(mix(1.5, 3.5, mood.daylight), 9, 7.5);
      const shadow = key.shadow.camera;
      shadow.left = -8; shadow.right = 8; shadow.top = 12; shadow.bottom = -12;
      shadow.near = 0.5; shadow.far = 40;
      shadow.updateProjectionMatrix();
    };
    place([]);

    const background = hazeTint.clone().lerp(new THREE.Color(pal.wall), 0.25);
    const speed = mix(0.6, 2.2, mood.energy);
    const animated = flicker.length > 0 || failingMat !== null || alarmLamp !== null || bulbs.length > 0;
    const failBase = failing ? lampColour(failing.level) : null;
    return {
      object: root, camera, background, capacity: slots.length, ground: floor, keyLight: key, place,
      update: animated ? (_dt, time) => {
        for (const item of flicker) {
          const wobble = item.kind === 'tv' ? 0.7 + 0.3 * Math.sin(time * 7.3 * speed) * Math.sin(time * 2.9 * speed + 1.3) + (Math.sin(time * 23 * speed) > 0.9 ? 0.25 : 0) : 0.92 + 0.08 * Math.sin(time * 40);
          item.material.color.copy(item.base).multiplyScalar(wobble);
        }
        if (alarmLamp) (alarmLamp as THREE.MeshBasicMaterial).color.set(Math.sin(time * speed * 4) > 0 ? '#ff3b2a' : '#5a1a16');
        if (failingMat && failBase) {
          const on = Math.sin(time * 9 * speed) * Math.sin(time * 3.7 * speed + 1) > 0.2 ? 1 : 0.15;
          failingMat.color.copy(failBase).multiplyScalar(on);
          if (failingLight) (failingLight as THREE.PointLight).intensity = 11 * failing!.level * on;
        }
        bulbs.forEach((material, index) => { material.color.offsetHSL(0, 0, 0); material.opacity = 1; material.color.setHSL((index / bulbs.length + Math.floor(time * speed) * 0.2) % 1, 0.9, 0.62); });
      } : undefined,
      dispose() { key.shadow.map?.dispose(); disposeTree(root); },
    };
  },
});
