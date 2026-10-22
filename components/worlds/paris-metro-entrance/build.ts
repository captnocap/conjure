import * as THREE from 'three';
import { choice, defineWorld, diorama, mix } from '@conjure/kit';

type G = CanvasRenderingContext2D;
const SHOPS = {
  cafe: 'A corner cafe with a red awning and steamed-up golden windows.',
  boulangerie: 'A bakery with a cream and gold front, lit early and late.',
  librairie: 'A dark green bookshop with a dim reading-lamp glow.',
  tabac: 'A bar-tabac with a red lozenge sign and harsh light.',
  shuttered: 'Iron shutters pulled down and a TO LET notice: nobody home.',
} as const;
const SHOP_TEXT: Record<keyof typeof SHOPS, string> = { cafe: 'CAFE DU METRO', boulangerie: 'BOULANGERIE', librairie: 'LIBRAIRIE', tabac: 'BAR  TABAC', shuttered: 'A LOUER' };
const SHOP_COLOUR: Record<keyof typeof SHOPS, string> = { cafe: '#a3262a', boulangerie: '#d9c89a', librairie: '#1f4a36', tabac: '#2a2f4a', shuttered: '#6f7478' };

export default defineWorld({
  questions: {
    era: choice('When is it?', {
      belle: 'Around 1900: gas lanterns, granite setts in the road, everything iron and stone.',
      today: 'Today: asphalt, a zebra crossing, brown bollards along the kerb, electric light.',
    }),
    entrance: choice('What surrounds the stair mouth?', {
      guimard: 'Green Art Nouveau ironwork: two bending stalks with red lamp buds and a METROPOLITAIN sign.',
      balustrade: 'A heavy stone balustrade with a tall iron mast carrying a lit red METRO sign and a white globe.',
      totem: 'Plain steel railings and a pole topped with a glowing yellow M in a circle.',
    }),
    stairs: choice('What comes up from the stairs?', {
      glow: 'Warm yellow light from the ticket hall, inviting.',
      cold: 'A cold greenish fluorescent light and tiled emptiness.',
      dark: 'Nothing: the station is shut and the stairwell is black, a grille across the bottom.',
    }),
    shop: choice('What occupies the ground floor of the building behind?', SHOPS),
    windows: choice('Which windows upstairs are lit?', {
      one: 'A single window, high up: someone waiting, or unable to sleep.',
      several: 'A scatter of them, families at dinner.',
      all: 'Every window blazing, a party or a hotel.',
      none: 'None. The whole facade is dark above the street.',
    }),
    weather: choice('What has the weather left on the pavement?', {
      wet: 'Rain just stopped: everything mirror-wet, big puddles holding the lamps.',
      raining: 'Still raining: fine streaks through the lamplight.',
      leaves: 'Wet plane leaves plastered over the paving.',
      snow: 'A thin first snow, slush at the kerb.',
    }),
    trees: choice('What state are the plane trees in?', {
      leaf: 'Full dark summer leaf.',
      gold: 'Autumn gold, thinning.',
      bare: 'Bare pollarded knuckles against the sky.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const WIDE = 16, DEEP = 13, FZ = -6.2;
    const dusk = Math.abs(mood.daylight - 0.5) * 2;
    const sky = new THREE.Color().setHSL(mix(0.64, 0.58, mood.warmth), mix(0.22, 0.36, dusk), mix(0.7, 0.5, dusk));
    const { art: s, world } = diorama(context, {
      background: `#${sky.getHexString()}`, floor: null, width: WIDE, depth: DEEP, maxHeight: 3.4, radius: 1.6, pitch: 30, yaw: 30,
      slots: [[-3.9, 2.7], [4.1, 2.3], [-5.2, -2.0], [5.2, -2.2], [0.3, 4.3, 0, 0.7]],
    });
    // Blue hour: cool the stock daylight and let the lamps do the warm work.
    for (const node of s.root.children) {
      const light = node as THREE.Light;
      if ((light as THREE.HemisphereLight).isHemisphereLight) { light.intensity = mix(1.15, 0.85, dusk); light.color.set('#c4d0ff'); (light as THREE.HemisphereLight).groundColor.set('#6a6a78'); }
      else if (light === world.keyLight) { light.intensity = mix(1.7, 1.05, dusk); light.color.setHSL(mix(0.62, 0.1, mood.warmth * 0.6), 0.3, 0.85); }
    }
    const lampTint = new THREE.Color().setHSL(mix(0.13, 0.07, mood.warmth), 0.9, 0.62);
    const lampHex = `#${lampTint.getHexString()}`;
    const lampPower = mix(1.1, 1.7, dusk);
    const belle = a.era === 'belle';
    const stairHex = { glow: '#ffc96a', cold: '#bfe8d2', dark: '#141618' }[a.stairs];
    const shopLit = a.shop !== 'shuttered';
    const shopGlow = { cafe: '#ffc46a', boulangerie: '#ffd98a', librairie: '#e8b060', tabac: '#f2ecd8', shuttered: '#000000' }[a.shop];

    // Street lamps and where their light falls, for the painted reflections.
    const lamps: [number, number, string][] = [[-7.1, 0.9, lampHex], [7.0, -3.2, lampHex], [-1.1, 0.7, a.entrance === 'totem' ? '#ffd21e' : '#ff9a4a'], [1.1, 0.7, a.entrance === 'totem' ? '#ffd21e' : '#ff9a4a']];

    // Ground: one slab with the stairwell cut out, painted with paving, kerb, road and wet light.
    const PX = 1024, PY = Math.round(1024 * DEEP / WIDE);
    const toX = (x: number) => (x + WIDE / 2) / WIDE * PX, toY = (z: number) => (z + DEEP / 2) / DEEP * PY, unit = PX / WIDE;
    const canvas = document.createElement('canvas');
    canvas.width = PX; canvas.height = PY;
    const g: G = canvas.getContext('2d')!;
    const snow = a.weather === 'snow';
    g.fillStyle = snow ? '#c9d0da' : belle ? '#6d7078' : '#62666e';
    g.fillRect(0, 0, PX, PY);
    const KERB = 5.1;
    // Paving slabs.
    g.strokeStyle = snow ? 'rgba(90,100,115,0.35)' : 'rgba(30,34,42,0.5)'; g.lineWidth = 1.5;
    for (let z = -DEEP / 2; z < KERB; z += belle ? 0.9 : 0.6) {
      g.beginPath(); g.moveTo(0, toY(z)); g.lineTo(PX, toY(z)); g.stroke();
      const shift = random() * 1.2;
      for (let x = -WIDE / 2 + shift; x < WIDE / 2; x += belle ? 1.4 : 0.6) { g.beginPath(); g.moveTo(toX(x), toY(z)); g.lineTo(toX(x), toY(z + (belle ? 0.9 : 0.6))); g.stroke(); }
    }
    // Road.
    g.fillStyle = snow ? '#a9b2be' : belle ? '#565a62' : '#3e424a'; g.fillRect(0, toY(KERB), PX, PY - toY(KERB));
    if (belle) {
      g.strokeStyle = 'rgba(20,22,28,0.6)'; g.lineWidth = 1.2;
      for (let row = 0; row < 8; row++) for (let x = -WIDE / 2; x < WIDE / 2; x += 0.22) g.strokeRect(toX(x + (row % 2) * 0.11), toY(KERB + 0.12 + row * 0.18), 0.2 * unit, 0.16 * unit);
    } else {
      g.fillStyle = snow ? '#e8ecf0' : '#d8d8d2';
      for (let x = -2.2; x < 2.4; x += 0.9) g.fillRect(toX(x), toY(KERB + 0.25), 0.5 * unit, 1.4 * unit);
    }
    g.fillStyle = snow ? '#e3e8ee' : '#9a9a96'; g.fillRect(0, toY(KERB - 0.1), PX, 0.26 * unit);
    // Puddles: patches of sky lying on the ground.
    const puddles = a.weather === 'wet' ? 16 : a.weather === 'raining' ? 11 : 5;
    for (let i = 0; i < puddles; i++) {
      const x = toX((random() - 0.5) * WIDE), y = toY(mix(-4, 6.2, random())), r = (0.4 + random() * 0.9) * unit;
      g.save(); g.translate(x, y); g.scale(1, 0.45 + random() * 0.3); g.rotate(random() * 3);
      g.beginPath();
      for (let k = 0; k <= 10; k++) { const t = k / 10 * Math.PI * 2, rr = r * (0.7 + random() * 0.5); g.lineTo(Math.cos(t) * rr, Math.sin(t) * rr); }
      g.closePath();
      g.fillStyle = `rgba(${Math.round(sky.r * 235)},${Math.round(sky.g * 240)},${Math.round(sky.b * 255)},0.5)`; g.fill();
      g.strokeStyle = 'rgba(20,24,32,0.45)'; g.lineWidth = 2; g.stroke();
      g.restore();
    }
    // Lamplight lying in long warm streaks toward the viewer.
    const pool = (x: number, z: number, colour: string, reach: number, strength: number) => {
      const c = new THREE.Color(colour), rgb = `${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)}`;
      g.save(); g.translate(toX(x), toY(z)); g.scale(1, 1.9);
      const fade = g.createRadialGradient(0, reach * unit * 0.2, 0, 0, reach * unit * 0.2, reach * unit);
      fade.addColorStop(0, `rgba(${rgb},${strength})`); fade.addColorStop(1, `rgba(${rgb},0)`);
      g.fillStyle = fade; g.fillRect(-reach * unit, -reach * unit, reach * unit * 2, reach * unit * 2.4);
      g.restore();
      g.fillStyle = `rgba(${rgb},${strength * 0.55})`;
      for (let k = 0; k < 5; k++) g.fillRect(toX(x) - 6 + (random() - 0.5) * 26, toY(z) + random() * 30, 3 + random() * 5, (1.2 + random() * 2.4) * unit);
    };
    const shine = (snow ? 0.4 : 0.62) * mix(0.75, 1.1, dusk);
    lamps.forEach(([x, z, colour], index) => pool(x, z, colour, index < 2 ? 2.3 : 1.3, index < 2 ? shine : shine * 0.55));
    if (shopLit) for (let x = -6.2; x <= 0.8; x += 2.3) pool(x, FZ + 0.5, shopGlow, 2.0, shine * 0.9);
    if (a.stairs !== 'dark') pool(0, 1.0, stairHex, 1.6, shine * 0.8);
    if (a.weather === 'leaves') {
      const tones = ['#b0832e', '#8b5a24', '#c9a13c', '#7a6a2c', '#a8662a'];
      for (let i = 0; i < 260 + mood.density * 260; i++) {
        g.save(); g.translate(random() * PX, random() * PY); g.rotate(random() * 6);
        g.fillStyle = tones[Math.floor(random() * tones.length)];
        g.beginPath(); for (let k = 0; k < 5; k++) { const t = k / 5 * Math.PI * 2; g.lineTo(Math.cos(t) * 7, Math.sin(t) * 5.5); } g.fill();
        g.restore();
      }
    }
    if (snow) {
      g.fillStyle = 'rgba(70,76,88,0.5)';
      for (let i = 0; i < 26; i++) { const x = toX(-3 + random() * 6 + (random() - 0.5) * 8), y = toY(-2 + random() * 7); g.beginPath(); g.ellipse(x, y, 5, 9, random(), 0, 7); g.fill(); }
      g.fillStyle = 'rgba(90,96,108,0.45)'; g.fillRect(0, toY(KERB + 0.15), PX, 0.35 * unit);
    }
    if (mood.wear > 0.4) { g.fillStyle = `rgba(30,28,26,${(mood.wear - 0.4) * 0.35})`; for (let i = 0; i < 40; i++) g.fillRect(random() * PX, random() * PY, 4 + random() * 40, 2 + random() * 8); }
    const paving = new THREE.CanvasTexture(canvas);
    paving.colorSpace = THREE.SRGBColorSpace;
    paving.repeat.set(1 / WIDE, 1 / DEEP);
    paving.offset.set(0.5, 0.5);
    const outline = new THREE.Shape();
    outline.moveTo(-WIDE / 2, -DEEP / 2); outline.lineTo(WIDE / 2, -DEEP / 2); outline.lineTo(WIDE / 2, DEEP / 2); outline.lineTo(-WIDE / 2, DEEP / 2); outline.closePath();
    const SX = 1.5, S0 = -3.4, S1 = 0.6;
    const hole = new THREE.Path();
    hole.moveTo(-SX, -S1); hole.lineTo(-SX, -S0); hole.lineTo(SX, -S0); hole.lineTo(SX, -S1); hole.closePath();
    outline.holes.push(hole);
    const slab = new THREE.ExtrudeGeometry(outline, { depth: 0.24, bevelEnabled: false });
    slab.rotateX(-Math.PI / 2);
    slab.translate(0, -0.24, 0);
    const edge = s.material(snow ? '#aab2bc' : '#4c5058', { roughness: 0.8 });
    const ground = s.mesh(slab, [new THREE.MeshStandardMaterial({ map: paving, roughness: snow ? 0.7 : a.weather === 'leaves' ? 0.42 : 0.24, metalness: snow ? 0 : 0.18 }), edge] as unknown as THREE.Material);
    ground.castShadow = false;
    world.ground = ground;

    // The stairwell: steps, tiled walls and whatever light comes up.
    const tile = s.material(a.stairs === 'dark' ? '#4a4f52' : '#b9b6aa', { roughness: 0.35, emissive: stairHex, emissiveIntensity: a.stairs === 'dark' ? 0 : 0.1 });
    const tread = s.material('#5f5c58', { roughness: 0.55 });
    const nosing = s.material(a.stairs === 'dark' ? '#8a8a84' : '#e8dfc0', { roughness: 0.4, emissive: stairHex, emissiveIntensity: a.stairs === 'dark' ? 0 : 0.35 });
    const steps = 11, run = 0.31, rise = 0.19;
    for (let i = 0; i < steps; i++) {
      s.box([SX * 2 - 0.16, 0.5, run], [0, -(i + 1) * rise - 0.25, S1 - (i + 0.5) * run], tread).castShadow = false;
      s.box([SX * 2 - 0.16, 0.012, 0.07], [0, -(i + 1) * rise + 0.006, S1 - (i + 1) * run + 0.035], nosing).castShadow = false;
    }
    const floorY = -(steps + 1) * rise;
    s.box([SX * 2 - 0.16, 0.2, S1 - steps * run - S0], [0, floorY - 0.1, (S1 - steps * run + S0) / 2], tread);
    for (const side of [-1, 1]) s.box([0.08, 2.6, S1 - S0], [side * (SX - 0.04), -1.3, (S0 + S1) / 2], tile).castShadow = false;
    s.box([SX * 2, 2.6, 0.08], [0, -1.3, S0 + 0.04], tile).castShadow = false;
    s.box([SX * 2, 2.6, 0.08], [0, -1.3 - 0.4, S1 - 0.04], tile).castShadow = false;
    const mouth = new THREE.MeshStandardMaterial({ color: a.stairs === 'dark' ? '#0c0d0f' : stairHex, emissive: stairHex, emissiveIntensity: a.stairs === 'dark' ? 0 : 1.5, roughness: 0.6 });
    s.box([SX * 2 - 0.8, 1.7, 0.03], [0, floorY + 0.85, S0 + 0.1], mouth).castShadow = false;
    s.rod([0, -0.1, S1 - 0.1], [0, floorY + 0.75, S1 - steps * run], 0.03, s.material('#8d9296', { metalness: 0.8, roughness: 0.3 }));
    if (a.stairs === 'dark') {
      const bar = s.material('#3a3f42', { metalness: 0.6 });
      for (let x = -SX + 0.5; x < SX - 0.4; x += 0.16) s.rod([x, floorY, S0 + 0.16], [x, floorY + 1.7, S0 + 0.16], 0.014, bar);
    } else {
      const up = new THREE.PointLight(stairHex, 9 * lampPower, 7, 1.6);
      up.position.set(0, -0.9, -1.9);
      s.root.add(up);
    }
    const blue = s.label('SORTIE', 1.1, 0.26, [0, floorY + 1.95, S0 + 0.1], '#f4f4f0', '#1f4fa0');
    blue.castShadow = false;

    // The surround.
    if (a.entrance === 'guimard') {
      const iron = s.material('#2f6a4c', { metalness: 0.35, roughness: 0.45 });
      const panel = (ax: number, az: number, bx: number, bz: number) => {
        const at = (u: number, v: number): [number, number, number] => [ax + (bx - ax) * (u + 0.5), 0.12 + v, az + (bz - az) * (u + 0.5)];
        s.tube([at(0, 0.12), at(0.3, 0.42), at(0.36, 0.86), at(0, 0.7), at(-0.36, 0.86), at(-0.3, 0.42)], 0.022, iron, true);
        s.rod(at(-0.5, 0.95), at(0.5, 0.95), 0.03, iron);
        s.rod(at(-0.5, 0.06), at(0.5, 0.06), 0.02, iron);
        s.rod(at(-0.5, 0), at(-0.5, 1.08), 0.03, iron);
      };
      for (const side of [-1, 1]) for (let i = 0; i < 4; i++) panel(side * SX, mix(S0, S1, i / 4), side * SX, mix(S0, S1, (i + 1) / 4));
      for (let i = 0; i < 3; i++) panel(mix(-SX, SX, i / 3), S0, mix(-SX, SX, (i + 1) / 3), S0);
      s.rod([SX, 0.12, S0], [SX, 1.2, S0], 0.03, iron);
      const bud = new THREE.MeshStandardMaterial({ color: '#ff6a2a', emissive: '#ff4a1a', emissiveIntensity: 1.8 * lampPower, roughness: 0.3 });
      for (const side of [-1, 1]) {
        s.lathe([[0.2, 0], [0.22, 0.12], [0.12, 0.4], [0.09, 0.9]], iron, [side * SX, 0, S1]);
        s.tube([[side * SX, 0.8, S1], [side * (SX + 0.1), 1.6, S1], [side * (SX - 0.02), 2.5, S1], [side * (SX + 0.16), 3.3, S1], [side * (SX + 0.05), 4.0, S1], [side * (SX - 0.4), 4.42, S1], [side * (SX - 0.72), 4.2, S1]], 0.075, iron);
        s.tube([[side * SX, 2.4, S1], [side * (SX - 0.12), 2.75, S1], [side * (SX - 0.1), 3.2, S1], [side * (SX - 0.3), 3.5, S1]], 0.05, iron);
        s.lathe([[0.03, 0.34], [0.1, 0.26], [0.17, 0.1], [0.13, 0], [0.15, -0.06]], iron, [side * (SX - 0.76), 3.86, S1]);
        s.ball([0.2, 0.3, 0.2], [side * (SX - 0.76), 3.69, S1], bud, 16).castShadow = false;
      }
      s.tube([[-1.31, 2.62, S1], [0, 2.55, S1], [1.31, 2.62, S1], [1.37, 2.98, S1], [1.29, 3.34, S1], [0, 3.45, S1], [-1.29, 3.34, S1], [-1.37, 2.98, S1]], 0.045, iron, true);
      const sign = s.label('METROPOLITAIN', 2.5, 0.62, [0, 2.98, S1], '#1f4f2c', '#ecd98f');
      (sign.material as THREE.MeshStandardMaterial).emissive.set('#5a4a20');
    } else {
      const stoneWork = a.entrance === 'balustrade';
      const body = stoneWork ? s.material('#bdb6a6', { roughness: 0.9 }) : s.material('#7d8488', { metalness: 0.7, roughness: 0.35 });
      const run3 = (ax: number, az: number, bx: number, bz: number) => {
        if (stoneWork) {
          s.box([Math.abs(bx - ax) + 0.26, 0.16, Math.abs(bz - az) + 0.26], [(ax + bx) / 2, 1.0, (az + bz) / 2], body);
          s.box([Math.abs(bx - ax) + 0.22, 0.2, Math.abs(bz - az) + 0.22], [(ax + bx) / 2, 0.1, (az + bz) / 2], body);
          const n = Math.round(Math.hypot(bx - ax, bz - az) / 0.3);
          for (let i = 0; i <= n; i++) s.lathe([[0.07, 0], [0.09, 0.15], [0.05, 0.4], [0.08, 0.62], [0.06, 0.74]], body, [mix(ax, bx, i / n), 0.2, mix(az, bz, i / n)]);
        } else {
          for (const y of [1.05, 0.6, 0.15]) s.rod([ax, y, az], [bx, y, bz], y > 1 ? 0.03 : 0.018, body);
          const n = Math.round(Math.hypot(bx - ax, bz - az) / 1.0);
          for (let i = 0; i <= n; i++) s.rod([mix(ax, bx, i / n), 0, mix(az, bz, i / n)], [mix(ax, bx, i / n), 1.05, mix(az, bz, i / n)], 0.03, body);
        }
      };
      run3(-SX - 0.05, S0, -SX - 0.05, S1); run3(SX + 0.05, S0, SX + 0.05, S1); run3(-SX, S0 - 0.05, SX, S0 - 0.05);
      const mast = s.material(stoneWork ? '#25302c' : '#8d9296', { metalness: 0.5, roughness: 0.45 });
      const mx = -SX - 0.05, mz = S1 + 0.1;
      s.lathe([[0.14, 0], [0.1, 0.3], [0.05, 0.9], [0.04, 4.3], [0.07, 4.4]], mast, [mx, 0, mz]);
      if (stoneWork) {
        const board = s.label('METRO', 1.25, 0.42, [mx, 3.6, mz + 0.03], '#fbf4e4', '#b3231f');
        (board.material as THREE.MeshStandardMaterial).emissive.set('#b3231f');
        (board.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.9 * lampPower;
        s.ring(0.3, 0.03, [mx - 0.63, 3.6, mz], mast, Math.PI).rotation.z = Math.PI / 2;
        s.ring(0.3, 0.03, [mx + 0.63, 3.6, mz], mast, Math.PI).rotation.z = -Math.PI / 2;
        s.ball([0.22, 0.22, 0.22], [mx, 4.62, mz], new THREE.MeshStandardMaterial({ color: '#fbf6e6', emissive: '#ffe8b0', emissiveIntensity: 1.7 * lampPower }), 16).castShadow = false;
      } else {
        const disc = s.cylinder(0.5, 0.5, 0.1, [mx, 4.2, mz], new THREE.MeshStandardMaterial({ color: '#ffd21e', emissive: '#ffc400', emissiveIntensity: 1.5 * lampPower, roughness: 0.4 }), 28);
        disc.rotation.x = Math.PI / 2; disc.castShadow = false;
        const m = s.label('M', 0.62, 0.62, [mx, 4.2, mz + 0.056], '#1f3f9a', '#ffd21e');
        (m.material as THREE.MeshStandardMaterial).emissive.set('#b89000');
        s.ring(0.5, 0.035, [mx, 4.2, mz], mast);
      }
      
    }

    // The Haussmann building.
    const stone = s.material(new THREE.Color('#cfc6b2').lerp(new THREE.Color('#8a8478'), mood.wear * 0.4), { roughness: 0.9 });
    const trimStone = s.material('#ddd5c2', { roughness: 0.85 });
    const dark = s.material('#20262c', { roughness: 0.5 });
    s.box([WIDE, 7.2, 0.5], [0, 3.6, FZ - 0.25], stone);
    for (let i = 0; i < 6; i++) s.box([WIDE, 0.03, 0.02], [0, 0.5 + i * 0.5, FZ + 0.005], s.material('#a39b8a')).castShadow = false;
    s.box([WIDE + 0.2, 0.2, 0.75], [0, 3.5, FZ + 0.25], trimStone);
    s.box([WIDE + 0.3, 0.32, 0.8], [0, 7.25, FZ + 0.1], trimStone);
    const slate = s.material('#4f5a68', { roughness: 0.55, metalness: 0.2 });
    const roof = s.box([WIDE, 1.9, 0.2], [0, 8.2, FZ - 0.25], slate);
    roof.rotation.x = -0.3;
    // Balcony ironwork.
    s.box([WIDE, 0.05, 0.05], [0, 4.5, FZ + 0.56], dark);
    s.scatter(new THREE.BoxGeometry(0.03, 0.9, 0.03), dark, Array.from({ length: 100 }, (_unused, i) => ({ at: [-WIDE / 2 + 0.08 + i * 0.16, 4.05, FZ + 0.56] as [number, number, number], size: 1 })));
    s.scatter(new THREE.TorusGeometry(0.11, 0.014, 5, 12), dark, Array.from({ length: 50 }, (_unused, i) => ({ at: [-WIDE / 2 + 0.16 + i * 0.32, 4.1, FZ + 0.56] as [number, number, number], size: 1 })));
    // Upper windows.
    const count = 5 + 3;
    const lit = new Set<number>();
    if (a.windows === 'one') lit.add(Math.floor(random() * count));
    else if (a.windows === 'several') { const n = 2 + Math.round(mood.density * 2); while (lit.size < n) lit.add(Math.floor(random() * count)); }
    else if (a.windows === 'all') for (let i = 0; i < count; i++) lit.add(i);
    const pane = (index: number, x: number, y: number, w: number, h: number, z: number) => {
      const on = lit.has(index);
      const tone = on ? new THREE.Color().setHSL(mix(0.14, 0.08, random()), 0.85, 0.66) : new THREE.Color('#27303c');
      const glass = new THREE.MeshStandardMaterial({ color: tone, emissive: on ? tone : new THREE.Color('#000000'), emissiveIntensity: on ? 1.5 * lampPower : 0, roughness: 0.25, metalness: on ? 0 : 0.4 });
      s.box([w, h, 0.05], [x, y, z], glass).castShadow = false;
      s.box([0.05, h, 0.07], [x, y, z], on ? dark : trimStone);
      for (const dy of [-h * 0.18, h * 0.22]) s.box([w, 0.04, 0.07], [x, y + dy, z], on ? dark : trimStone);
      if (on && random() < 0.5) s.box([w * 0.3, h * 0.55, 0.02], [x + (random() - 0.5) * w * 0.4, y - h * 0.22, z + 0.03], s.material('#2a2420')).castShadow = false;
    };
    for (let i = 0; i < 5; i++) {
      const x = -6.4 + i * 3.2;
      s.box([1.5, 2.8, 0.1], [x, 5.3, FZ + 0.03], trimStone);
      s.box([1.7, 0.16, 0.2], [x, 6.8, FZ + 0.08], trimStone);
      pane(i, x, 5.25, 1.15, 2.4, FZ + 0.08);
      if (mood.wear < 0.6 && i % 2 === 0) for (const side of [-1, 1]) s.box([0.5, 2.4, 0.05], [x + side * 0.85, 5.25, FZ + 0.1], s.material('#8f98a0', { roughness: 0.7 }));
    }
    for (let i = 0; i < 3; i++) {
      const x = -4.8 + i * 4.8;
      s.box([1.2, 1.25, 0.9], [x, 8.05, FZ + 0.05], slate);
      s.box([1.35, 0.12, 1.0], [x, 8.72, FZ + 0.05], trimStone);
      pane(5 + i, x, 8.0, 0.8, 0.9, FZ + 0.51);
    }
    for (const x of [-7.2, 0.9, 7.3]) { s.box([0.5, 1.1, 0.5], [x, 9.3, FZ - 0.7], s.material('#a8674a', { roughness: 0.9 })); for (const dx of [-0.12, 0.12]) s.cylinder(0.07, 0.08, 0.35, [x + dx, 10.0, FZ - 0.7], s.material('#b8744e'), 8); }

    // Ground floor: the shop and a carriage door.
    const shopColour = new THREE.Color(SHOP_COLOUR[a.shop]).lerp(new THREE.Color('#7a756c'), mood.wear * 0.3);
    const front = s.material(shopColour, { roughness: 0.5 });
    const SHX = -2.9, SHW = 8.6;
    s.box([SHW, 3.25, 0.14], [SHX, 1.63, FZ + 0.07], front);
    const fascia = s.label(SHOP_TEXT[a.shop], SHW - 0.6, 0.5, [SHX, 3.0, FZ + 0.15], a.shop === 'boulangerie' ? '#6a4a1a' : '#f1e6c4', `#${shopColour.getHexString()}`);
    if (shopLit) { (fascia.material as THREE.MeshStandardMaterial).emissive.set('#3a3020'); }
    const windowGlow = new THREE.MeshStandardMaterial({ color: shopLit ? shopGlow : '#8d9194', emissive: shopLit ? shopGlow : '#000000', emissiveIntensity: shopLit ? 1.15 * lampPower : 0, roughness: shopLit ? 0.3 : 0.6, metalness: shopLit ? 0 : 0.6 });
    for (let i = 0; i < 3; i++) {
      const x = SHX - 2.85 + i * 2.85, door = i === 1;
      s.box([door ? 1.3 : 2.4, door ? 2.5 : 1.85, 0.05], [x, door ? 1.3 : 1.65, FZ + 0.15], windowGlow).castShadow = false;
      if (!shopLit) for (let k = 0; k < (door ? 12 : 9); k++) s.box([door ? 1.3 : 2.4, 0.03, 0.02], [x, 0.2 + k * 0.2 + (door ? 0 : 0.55), FZ + 0.19], s.material('#5d6266')).castShadow = false;
      else if (!door) {
        s.box([0.04, 1.85, 0.07], [x, 1.65, FZ + 0.15], front);
        // Silhouettes of what is inside.
        for (let k = 0; k < 2 + Math.round(mood.density * 3); k++) {
          const px = x - 1 + random() * 2;
          if (a.shop === 'librairie') s.box([0.3 + random() * 0.3, 0.5 + random() * 0.5, 0.02], [px, 1.0 + random() * 0.3, FZ + 0.185], s.material(['#6b2f2a', '#2f3f5a', '#3d5a40'][k % 3])).castShadow = false;
          else if (a.shop === 'boulangerie') s.ball([0.2, 0.1, 0.02], [px, 0.95 + (k % 2) * 0.45, FZ + 0.185], s.material('#b87a34'), 10).castShadow = false;
          else { s.ball([0.14, 0.16, 0.02], [px, 1.55, FZ + 0.185], s.material('#2a2420'), 10).castShadow = false; s.box([0.4, 0.5, 0.02], [px, 1.12, FZ + 0.185], s.material('#2a2420')).castShadow = false; }
        }
      }
    }
    if (a.shop === 'cafe' || a.shop === 'boulangerie' || a.shop === 'librairie') {
      const cloth = s.material(a.shop === 'cafe' ? '#b3262a' : a.shop === 'boulangerie' ? '#e3d3a4' : '#24523c', { roughness: 0.9, side: THREE.DoubleSide });
      const awning = s.box([SHW, 0.05, 1.5], [SHX, 3.0, FZ + 0.85], cloth);
      awning.rotation.x = 0.33;
      s.box([SHW, 0.26, 0.03], [SHX, 2.66, FZ + 1.56], cloth);
    } else if (a.shop === 'tabac') {
      const carrot = new THREE.MeshStandardMaterial({ color: '#d8201e', emissive: '#e01a18', emissiveIntensity: 1.4 * lampPower });
      const diamond = s.box([0.5, 0.5, 0.12], [SHX + SHW / 2 - 0.4, 3.9, FZ + 0.75], carrot);
      diamond.rotation.z = Math.PI / 4; diamond.scale.x = 0.55; diamond.castShadow = false;
      s.rod([SHX + SHW / 2 - 0.4, 3.9, FZ], [SHX + SHW / 2 - 0.4, 3.9, FZ + 0.7], 0.02, dark);
    } else {
      const notice = s.label('A LOUER', 1.3, 0.5, [SHX - 2.85, 1.7, FZ + 0.21], '#1a1a1a', '#e8d24a');
      notice.rotation.z = (random() - 0.5) * 0.2;
    }
    const doorPaint = s.material(['#1f3a4a', '#1f4a36', '#5a1f24', '#2a2a30'][Math.floor(random() * 4)], { roughness: 0.4 });
    s.box([2.2, 2.6, 0.12], [5.0, 1.3, FZ + 0.06], doorPaint);
    const arch = s.cylinder(1.1, 1.1, 0.12, [5.0, 2.6, FZ + 0.06], doorPaint, 24);
    arch.rotation.x = Math.PI / 2;
    s.box([0.04, 3.4, 0.14], [5.0, 1.7, FZ + 0.07], dark);
    for (const side of [-1, 1]) { s.box([0.7, 0.9, 0.03], [5.0 + side * 0.52, 0.75, FZ + 0.13], dark); s.ball([0.05, 0.05, 0.05], [5.0 + side * 0.14, 1.3, FZ + 0.16], s.material('#c2a04a', { metalness: 0.8, roughness: 0.3 }), 8); }
    s.ring(1.2, 0.09, [5.0, 2.6, FZ + 0.05], trimStone, Math.PI);
    s.label(String(3 + Math.floor(random() * 90)), 0.34, 0.24, [6.6, 2.6, FZ + 0.012], '#f6f6f2', '#1f3f9a');

    // Street lamps.
    const lantern = new THREE.MeshStandardMaterial({ color: '#fff3d0', emissive: lampHex, emissiveIntensity: 2.0 * lampPower, roughness: 0.3 });
    const post = s.material('#1d2a26', { metalness: 0.4, roughness: 0.5 });
    for (const [x, z] of [[lamps[0][0], lamps[0][1]], [lamps[1][0], lamps[1][1]]]) {
      s.lathe([[0.17, 0], [0.19, 0.2], [0.09, 0.5], [0.07, 1.0], [0.1, 1.08], [0.055, 1.2], [0.045, 3.6], [0.1, 3.7], [0.05, 3.78]], post, [x, 0, z]);
      if (belle) {
        s.mesh(new THREE.CylinderGeometry(0.24, 0.13, 0.5, 4), lantern, [x, 4.05, z]).castShadow = false;
        s.mesh(new THREE.CylinderGeometry(0.04, 0.3, 0.22, 4), post, [x, 4.41, z]);
        s.cylinder(0.02, 0.04, 0.16, [x, 4.6, z], post, 6);
        s.rod([x - 0.32, 3.5, z], [x + 0.32, 3.5, z], 0.018, post);
      } else {
        s.ball([0.24, 0.27, 0.24], [x, 4.02, z], lantern, 16).castShadow = false;
        s.lathe([[0.2, 0], [0.24, 0.04], [0.08, 0.14], [0, 0.2]], post, [x, 4.22, z]);
      }
      const glow = new THREE.PointLight(lampHex, 26 * lampPower, 11, 1.7);
      glow.position.set(x, 3.9, z + 0.3);
      s.root.add(glow);
    }

    // Plane trees in iron grates.
    const bark = document.createElement('canvas');
    bark.width = 128; bark.height = 256;
    const bg = bark.getContext('2d')!;
    bg.fillStyle = '#9a9682'; bg.fillRect(0, 0, 128, 256);
    for (let i = 0; i < 60; i++) { bg.fillStyle = ['#c9c4a8', '#6f7258', '#b0a88a', '#84886a', '#d8d2b8'][i % 5]; bg.beginPath(); bg.ellipse(random() * 128, random() * 256, 6 + random() * 14, 10 + random() * 22, random() * 3, 0, 7); bg.fill(); }
    const barkTexture = new THREE.CanvasTexture(bark);
    barkTexture.colorSpace = THREE.SRGBColorSpace;
    const trunk = new THREE.MeshStandardMaterial({ map: barkTexture, roughness: 0.9 });
    const leafTones = a.trees === 'gold' ? ['#c9a13c', '#b0832e', '#d8b84a', '#8b6a24'] : ['#3f6a44', '#4f7a4a', '#2f5a3c', '#5a8450'];
    const leafy = s.material('#ffffff', { roughness: 0.9, flatShading: true });
    const blobs: { at: [number, number, number]; size: number; color: string }[] = [];
    for (const [tx, tz] of [[-6.9, -4.2], [7.0, -0.6]] as const) {
      s.cylinder(0.75, 0.75, 0.03, [tx, 0.012, tz], s.material('#33383a', { metalness: 0.5 }), 20).castShadow = false;
      const lean = (random() - 0.5) * 0.3;
      s.mesh(new THREE.CylinderGeometry(0.17, 0.26, 3.4, 12), trunk, [tx + lean * 0.5, 1.7, tz]).rotation.z = -lean * 0.3;
      const crown: [number, number, number] = [tx + lean, 3.4, tz];
      const limbs = a.trees === 'bare' ? 7 : 5;
      for (let i = 0; i < limbs; i++) {
        const t = i / limbs * Math.PI * 2 + random(), reach = 1.0 + random() * 0.9, up = 1.4 + random() * 1.5;
        const tip: [number, number, number] = [crown[0] + Math.sin(t) * reach, crown[1] + up, crown[2] + Math.cos(t) * reach];
        s.rod(crown, tip, 0.1, trunk, 0.045);
        if (a.trees === 'bare') {
          s.ball([0.13, 0.13, 0.13], tip, trunk, 8);
          for (let k = 0; k < 3; k++) s.rod(tip, [tip[0] + (random() - 0.5) * 0.9, tip[1] + 0.4 + random() * 0.6, tip[2] + (random() - 0.5) * 0.9], 0.02, trunk, 0.008);
        } else {
          const n = a.trees === 'gold' ? 2 : 3;
          for (let k = 0; k < n; k++) blobs.push({ at: [tip[0] + (random() - 0.5) * 1.1, tip[1] + (random() - 0.3) * 0.9, tip[2] + (random() - 0.5) * 1.1], size: 0.6 + random() * 0.45, color: leafTones[Math.floor(random() * leafTones.length)] });
        }
      }
      if (a.trees !== 'bare') blobs.push({ at: [crown[0], crown[1] + 2.6, crown[2]], size: 1.2, color: leafTones[0] });
    }
    if (blobs.length) s.scatter(new THREE.IcosahedronGeometry(1, 1), leafy, blobs);

    // Era details along the kerb.
    if (!belle) {
      const brown = s.material('#4a3526', { roughness: 0.5 });
      for (let x = -7.2; x <= 7.3; x += 1.8) if (Math.abs(x) > 2.6) { s.cylinder(0.04, 0.05, 0.95, [x, 0.475, KERB - 0.35], brown, 10); s.ball([0.06, 0.06, 0.06], [x, 0.99, KERB - 0.35], brown, 10); }
    } else {
      const wood = s.material('#3f5a44', { roughness: 0.6 });
      const bx = 7.0, bz = -5.2;
      for (let i = 0; i < 4; i++) s.box([1.7, 0.04, 0.09], [bx - 0.2, 0.46, bz - 0.15 + i * 0.11], wood);
      for (let i = 0; i < 3; i++) s.box([1.7, 0.09, 0.03], [bx - 0.2, 0.62 + i * 0.13, bz - 0.24], wood);
      for (const dx of [-0.9, 0.5]) { s.box([0.06, 0.46, 0.4], [bx + dx, 0.23, bz], dark); s.box([0.06, 0.5, 0.05], [bx + dx, 0.7, bz - 0.24], dark); }
    }

    // Rain.
    let rain: THREE.InstancedMesh | null = null;
    const drops: number[] = [];
    if (a.weather === 'raining' || snow) {
      const n = snow ? 160 : 260;
      rain = new THREE.InstancedMesh(snow ? new THREE.SphereGeometry(0.035, 5, 4) : new THREE.BoxGeometry(0.012, 0.42, 0.012), new THREE.MeshBasicMaterial({ color: snow ? '#ffffff' : '#dfe8f4', transparent: true, opacity: snow ? 0.85 : 0.4, depthWrite: false }), n);
      for (let i = 0; i < n; i++) drops.push((random() - 0.5) * WIDE, random() * 9, (random() - 0.5) * DEEP);
      rain.frustumCulled = false;
      s.root.add(rain);
    }
    const matrix = new THREE.Matrix4();
    const fall = snow ? mix(0.5, 1.4, mood.energy) : mix(7, 14, mood.energy);
    const drift = snow ? 0.4 : 0.9;
    const stepRain = (dt: number) => {
      if (!rain) return;
      for (let i = 0; i < drops.length; i += 3) {
        drops[i + 1] -= dt * fall;
        drops[i] += dt * drift * (snow ? Math.sin(drops[i + 1] * 3 + i) : 0.6);
        if (drops[i + 1] < 0) { drops[i + 1] += 9; drops[i] = ((drops[i] + WIDE / 2 + 3.7) % WIDE) - WIDE / 2; }
        matrix.makeRotationZ(snow ? 0 : 0.06).setPosition(drops[i], drops[i + 1], drops[i + 2]);
        rain.setMatrixAt(i / 3, matrix);
      }
      rain.instanceMatrix.needsUpdate = true;
    };
    stepRain(0);

    const flicker = mix(0.01, 0.12, mood.energy) * (belle ? 1.6 : 0.5);
    world.update = (dt, time) => {
      stepRain(Math.min(dt, 0.1));
      lantern.emissiveIntensity = 2.0 * lampPower * (1 + Math.sin(time * 9.1) * Math.sin(time * 2.7) * flicker);
    };
    return world;
  },
});
