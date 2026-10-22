import * as THREE from 'three';
import { type Placeable, Sculpture, choice, defineWorld, disposeTree, mix, visibleBounds } from '@conjure/kit';

const SKIES = {
  white: 'A flat white overcast sky: no sun, no shadows, everything evenly exposed and blank.',
  dawn: 'A pink and lavender dawn, low peach light raking across the lot, a few lamps still on.',
  noon: 'Bleached blue midday, hard light, heat coming off the asphalt.',
  dusk: 'Violet and orange dusk, the lot lamps buzzing on over nobody.',
} as const;
const SKY: Record<keyof typeof SKIES, { top: string; mid: string; low: string; hemi: number; key: string; power: number; sun: number; lamps: number; soft: number; asphalt: string }> = {
  white: { top: '#dfe2e3', mid: '#ecedea', low: '#f5f3ed', hemi: 2.0, key: '#fffaf0', power: 0.9, sun: 30, lamps: 0, soft: 9, asphalt: '#94938f' },
  dawn: { top: '#a9b3df', mid: '#f1bcd0', low: '#ffdab6', hemi: 1.45, key: '#ffc2a2', power: 1.8, sun: 8, lamps: 0.6, soft: 3, asphalt: '#958e94' },
  noon: { top: '#93bfe6', mid: '#cbe1ef', low: '#eef1e9', hemi: 1.5, key: '#fff6e0', power: 2.6, sun: 34, lamps: 0, soft: 2, asphalt: '#99978f' },
  dusk: { top: '#787cb4', mid: '#e09ab2', low: '#ffc388', hemi: 1.2, key: '#ffaa88', power: 1.35, sun: 6.5, lamps: 1, soft: 3, asphalt: '#84808c' },
};
const FINISHES = {
  ribbed: 'Ribbed precast concrete panels, pale grey-beige, the default big box.',
  brick: 'Brown brick with a darker soldier band, heavy and seventies.',
  stucco: 'Pinkish stucco with a teal stripe and little pink squares, late-eighties postmodern.',
  whitebox: 'White-painted block with a long orange and brown supergraphic stripe.',
} as const;
const FIN: Record<keyof typeof FINISHES, { wall: string; shade: string; portal: string; accent: string; second: string }> = {
  ribbed: { wall: '#d1cabb', shade: '#b9b2a2', portal: '#e2dccd', accent: '#2f8f95', second: '#c9a45a' },
  brick: { wall: '#a9705a', shade: '#7f4e3e', portal: '#e2d8c2', accent: '#7f4e3e', second: '#c9a45a' },
  stucco: { wall: '#ecd8cc', shade: '#dcc4b8', portal: '#f3e7dd', accent: '#3fa7a5', second: '#ef8fb5' },
  whitebox: { wall: '#ecebe5', shade: '#d9d8d0', portal: '#f4f3ee', accent: '#d9642b', second: '#7a4a2c' },
};
const MALLS = ['SUNRISE MALL', 'FASHION SQUARE', 'WESTGATE MALL', 'NORTHPARK', 'VALLEY FAIR', 'CROSSROADS'];
const NOTICE = { closing: 'STORE CLOSING', lease: 'FOR LEASE 555-0142', thanks: 'THANK YOU FOR 34 YEARS' } as const;

type Ctx = CanvasRenderingContext2D;
function paint(w: number, h: number, draw: (ctx: Ctx, w: number, h: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext('2d')!, w, h);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}
const hex = (c: THREE.Color) => `#${c.getHexString()}`;
const blend = (a: string, b: string, t: number) => hex(new THREE.Color(a).lerp(new THREE.Color(b), t));

// Camera: standing in the first empty aisle, looking across the fire lane at the entrance.
const CAM = new THREE.Vector3(15, 2.2, 14), LOOK = new THREE.Vector3(-3, 3.3, -8), FOV = 48;
const YAW = Math.atan2(CAM.x - LOOK.x, CAM.z - LOOK.z);
const along = (degrees: number, distance: number): [number, number] => {
  const angle = YAW + THREE.MathUtils.degToRad(degrees);
  return [CAM.x - Math.sin(angle) * distance, CAM.z - Math.cos(angle) * distance];
};

export default defineWorld({
  questions: {
    sky: choice('What sky hangs over the lot?', SKIES),
    finish: choice('What is the long facade made of?', FINISHES),
    entrance: choice('What is the entrance like?', {
      pyramid: 'A square portal with a glass pyramid skylight rising behind it.',
      barrel: 'A glass barrel vault ending in a fan-shaped lunette over the doors.',
      arch: 'A giant postmodern arch cut through a gabled wall, with a keystone.',
      canopy: 'A low flat concrete canopy on thin columns over the doors, modest and seventies.',
    }),
    scar: choice('What is left of the name on the wall?', {
      ghost: 'Only a labelscar: the pale clean ghost of removed letters and their bolt holes.',
      partial: 'A few letters still hang; the rest are ghosts, one is slipping.',
      intact: 'The whole name is still up in dark bronze letters, unlit.',
      lit: 'The name still glows, as though it might open at ten.',
      painted: 'Painted over with a rectangle of not-quite-matching paint.',
    }),
    notice: choice('What is posted across the doors?', {
      none: 'Nothing. The doors are simply locked.',
      closing: 'A yellow STORE CLOSING banner, sagging.',
      lease: 'A white FOR LEASE banner with a phone number.',
      thanks: 'A THANK YOU FOR 34 YEARS banner.',
      trespass: 'Plywood over the glass and NO TRESPASSING signs.',
    }),
    lot: choice('What has the parking lot become?', {
      faded: 'Clean and empty: just faded stall lines and tar-snake repairs.',
      cracked: 'Split by long cracks with weeds standing in every seam.',
      puddles: 'Wet after rain: shallow puddles holding the sky.',
      donuts: 'Scrawled with black tyre circles where kids have been doing donuts.',
      meadow: 'Going back to meadow: grass in sheets, saplings in the seams.',
    }),
    strays: choice('What has been left out in the lot?', {
      nothing: 'Nothing at all.',
      carts: 'A few stray shopping carts, one on its side.',
      car: 'One car parked at the kerb for months, tyres flat, a notice on the glass.',
      barriers: 'Concrete barriers and orange barrels closing off a lane.',
      gulls: 'A flock of gulls standing about, all facing the same way.',
    }),
    lamps: choice('What are the lot lamps like?', {
      shoebox: 'Tall poles with paired square shoebox heads.',
      cobra: 'Highway-style cobra heads on curved arms.',
      globe: 'Clusters of white globes, original to the 1970s.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const s = new Sculpture(context);
    const root = s.root;
    const sky = SKY[a.sky], fin = FIN[a.finish];
    const wear = mood.wear;
    const warm = (mood.warmth - 0.5) * 0.3;
    const tint = (c: string) => (warm > 0 ? blend(c, '#ffd2a0', warm) : blend(c, '#d4e2f5', -warm));
    const top = tint(sky.top), mid = tint(sky.mid), low = tint(sky.low);
    const background = new THREE.Color(low);
    const std = (color: THREE.ColorRepresentation, options: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.9, ...options });

    // ---- Light.
    root.add(new THREE.HemisphereLight(blend(top, '#ffffff', 0.55), blend(sky.asphalt, '#77736b', 0.5), sky.hemi));
    const key = new THREE.DirectionalLight(new THREE.Color(tint(sky.key)), sky.power);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.normalBias = 0.06;
    key.shadow.bias = -0.0004;
    key.shadow.radius = sky.soft;
    root.add(key, key.target);

    // ---- Sky: a gradient arc with a far treeline, pylons and a water tower in haze.
    const far = blend(low, '#56607a', a.sky === 'white' ? 0.28 : 0.42);
    const skyMap = paint(2048, 512, (ctx, w, h) => {
      const horizon = h * 0.854;
      const g = ctx.createLinearGradient(0, 0, 0, horizon);
      g.addColorStop(0, top); g.addColorStop(0.62, mid); g.addColorStop(1, low);
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      if (a.sky === 'dawn' || a.sky === 'dusk') {
        const sx = w * mix(0.3, 0.7, mood.daylight);
        const r = ctx.createRadialGradient(sx, horizon, 4, sx, horizon, 420);
        r.addColorStop(0, 'rgba(255,236,190,0.95)'); r.addColorStop(1, 'rgba(255,220,170,0)');
        ctx.fillStyle = r; ctx.fillRect(0, 0, w, horizon);
        for (let i = 0; i < 16; i++) {
          ctx.fillStyle = a.sky === 'dawn' ? 'rgba(255,255,255,0.3)' : 'rgba(110,90,150,0.28)';
          ctx.beginPath(); ctx.ellipse(random() * w, horizon * (0.35 + random() * 0.6), 90 + random() * 260, 3 + random() * 7, 0, 0, 7); ctx.fill();
        }
      } else if (a.sky === 'white') {
        for (let i = 0; i < 40; i++) {
          ctx.fillStyle = random() < 0.5 ? 'rgba(205,208,210,0.22)' : 'rgba(255,255,255,0.3)';
          ctx.beginPath(); ctx.ellipse(random() * w, random() * horizon, 150 + random() * 300, 18 + random() * 40, 0, 0, 7); ctx.fill();
        }
      } else {
        for (let i = 0; i < 9; i++) {
          ctx.fillStyle = 'rgba(255,255,255,0.55)';
          ctx.beginPath(); ctx.ellipse(random() * w, horizon * (0.3 + random() * 0.6), 60 + random() * 160, 5 + random() * 9, 0, 0, 7); ctx.fill();
        }
      }
      // Far line: trees, a water tower, pylons, a strip-mall roofline.
      ctx.fillStyle = blend(far, low, 0.45);
      ctx.beginPath(); ctx.moveTo(0, horizon);
      for (let x = 0; x <= w; x += 8) ctx.lineTo(x, horizon - 9 - Math.sin(x * 0.011 + 2) * 5 - Math.sin(x * 0.047) * 2.5 - random() * 3);
      ctx.lineTo(w, horizon); ctx.fill();
      ctx.fillStyle = far;
      ctx.beginPath(); ctx.moveTo(0, horizon);
      for (let x = 0; x <= w; x += 5) ctx.lineTo(x, horizon - 4 - Math.abs(Math.sin(x * 0.07 + 1)) * 5 - random() * 4);
      ctx.lineTo(w, horizon); ctx.fill();
      for (let i = 0; i < 9; i++) {
        const x = random() * w;
        if (i % 3 === 0) { ctx.fillRect(x - 1.5, horizon - 46, 3, 46); ctx.beginPath(); ctx.ellipse(x, horizon - 50, 13, 8, 0, 0, 7); ctx.fill(); }
        else if (i % 3 === 1) { ctx.fillRect(x - 1, horizon - 36, 2, 36); ctx.fillRect(x - 9, horizon - 34, 18, 1.5); ctx.fillRect(x - 6, horizon - 27, 12, 1.5); }
        else ctx.fillRect(x, horizon - 14, 60 + random() * 80, 14);
      }
      ctx.fillStyle = blend(sky.asphalt, low, 0.5);
      ctx.fillRect(0, horizon, w, h - horizon);
    });
    const skyArc = new THREE.Mesh(
      new THREE.CylinderGeometry(330, 330, 220, 40, 1, true, YAW + Math.PI - 1.25, 2.5),
      new THREE.MeshBasicMaterial({ map: skyMap, side: THREE.BackSide, fog: false, depthWrite: false, toneMapped: false }),
    );
    skyArc.position.set(CAM.x, 80, CAM.z);
    skyArc.renderOrder = -10;
    root.add(skyArc);

    const EX = 1.5;
    // ---- The lot. Everything flat is painted onto one sheet; what stands up is built.
    const asphalt = tint(sky.asphalt);
    const GX = -49, GZ = -34, GS = 64, N = 2048, PX = N / GS;
    const gx = (x: number) => (x - GX) * PX, gz = (z: number) => (z - GZ) * PX;
    const cracks: [number, number][] = [];
    const lotCracks = Math.round(mix(3, 20, wear) * ({ faded: 0.4, cracked: 1.9, puddles: 1, donuts: 0.9, meadow: 1.5 })[a.lot]) + (a.lot === 'cracked' ? 6 : 0);
    const puddles: { x: number; z: number; r: number; stretch: number; turn: number }[] = [];
    if (a.lot === 'puddles') {
      const n = 9 + Math.round(random() * 4 + mood.density * 4);
      for (let i = 0; i < n; i++) {
        const [x, z] = i < 3 ? along(mix(-20, 20, random()), mix(7, 12, random())) : along(mix(-22, 22, random()), mix(13, 34, random()));
        if (z < -6.5) continue;
        puddles.push({ x, z, r: i < 3 ? mix(0.5, 1.0, random()) : mix(0.7, 1.9, random()), stretch: mix(1.2, 2.2, random()), turn: random() * 3 });
      }
    }
    const lineAlpha = mix(0.85, 0.3, wear) * (a.lot === 'meadow' ? 0.7 : 1);
    const groundMap = paint(N, N, (ctx) => {
      ctx.fillStyle = asphalt; ctx.fillRect(0, 0, N, N);
      // Resurfaced patches and worn lanes.
      for (let i = 0; i < 26; i++) {
        ctx.fillStyle = random() < 0.5 ? `rgba(40,40,45,${0.05 + random() * 0.1})` : `rgba(235,232,222,${0.04 + random() * 0.08})`;
        const w = 60 + random() * 420, h = 40 + random() * 260;
        ctx.fillRect(160 + random() * (N - 320 - w), 160 + random() * (N - 320 - h), w, h);
      }
      for (let i = 0; i < 5000; i++) {
        ctx.fillStyle = random() < 0.5 ? 'rgba(30,30,34,0.16)' : 'rgba(245,242,232,0.16)';
        ctx.fillRect(random() * N, random() * N, 1 + random() * 2.5, 1 + random() * 2.5);
      }
      // Oil shadows at the stall heads.
      for (let x = -46; x < 15; x += 2.7) for (const z of [4.2, 8.8]) if (random() < 0.55) {
        ctx.fillStyle = `rgba(24,22,26,${0.08 + random() * 0.2})`;
        ctx.beginPath(); ctx.ellipse(gx(x + 1.35 + (random() - 0.5) * 0.5), gz(z + (random() - 0.5)), (0.25 + random() * 0.4) * PX, (0.3 + random() * 0.6) * PX, 0, 0, 7); ctx.fill();
      }
      // Stall lines: a bank either side of a spine, and the next bank behind the camera.
      const stroke = (x0: number, z0: number, x1: number, z1: number, width: number, colour: string) => {
        ctx.strokeStyle = colour; ctx.lineWidth = width * PX; ctx.beginPath(); ctx.moveTo(gx(x0), gz(z0)); ctx.lineTo(gx(x1), gz(z1)); ctx.stroke();
      };
      const white = `rgba(240,238,228,${lineAlpha})`, yellow = `rgba(232,190,60,${lineAlpha})`;
      for (const spine of [6.5, 23.5]) {
        stroke(-48, spine, 15, spine, 0.12, white);
        for (let x = -46.2; x < 15; x += 2.7) stroke(x, spine - 5.5, x, spine + 5.5, 0.12, white);
      }
      // Fire lane edge, zebra crossing to the doors, and a stencil.
      stroke(-48, -6.2, 15, -6.2, 0.16, yellow);
      for (let x = EX - 4.6; x < EX + 4.6; x += 1.3) { ctx.fillStyle = white; ctx.fillRect(gx(x), gz(-5.6), 0.62 * PX, 6.2 * PX); }
      ctx.save();
      ctx.translate(gx(-17), gz(-3.4));
      ctx.fillStyle = yellow; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = `bold ${1.5 * PX}px Arial, Helvetica, sans-serif`;
      ctx.fillText('FIRE LANE', 0, 0);
      ctx.restore();
      ctx.save();
      ctx.translate(gx(6.5), gz(14.6)); ctx.rotate(Math.PI / 2);
      ctx.fillStyle = white; ctx.beginPath(); ctx.moveTo(-2.4 * PX, 0); ctx.lineTo(-0.9 * PX, -0.7 * PX); ctx.lineTo(-0.9 * PX, -0.2 * PX); ctx.lineTo(1.6 * PX, -0.2 * PX); ctx.lineTo(1.6 * PX, 0.2 * PX); ctx.lineTo(-0.9 * PX, 0.2 * PX); ctx.lineTo(-0.9 * PX, 0.7 * PX); ctx.fill();
      ctx.restore();
      // Time eats the paint.
      for (let i = 0; i < 500 * wear + 60; i++) {
        ctx.fillStyle = asphalt; ctx.globalAlpha = 0.5 + random() * 0.4;
        ctx.beginPath(); ctx.ellipse(random() * N, random() * N, 6 + random() * 26, 4 + random() * 14, random() * 3, 0, 7); ctx.fill();
      }
      ctx.globalAlpha = 1;
      // Tar snakes.
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (let i = 0; i < 14; i++) {
        let x = mix(-40, 12, random()), z = mix(-6, 22, random()), heading = random() * 6.3;
        ctx.strokeStyle = 'rgba(28,27,32,0.62)'; ctx.lineWidth = 0.09 * PX; ctx.beginPath(); ctx.moveTo(gx(x), gz(z));
        for (let k = 0; k < 14; k++) { heading += (random() - 0.5) * 0.9; x += Math.sin(heading) * 0.9; z += Math.cos(heading) * 0.9; ctx.lineTo(gx(x), gz(z)); }
        ctx.stroke();
      }
      // Cracks, remembered for the weeds.
      for (let i = 0; i < lotCracks; i++) {
        let [x, z] = i % 3 === 0 ? along(mix(-22, 22, random()), mix(6, 14, random())) : [mix(-36, 13, random()), mix(-6, 12, random())];
        let heading = random() * 6.3;
        const steps = 10 + Math.floor(random() * 22);
        ctx.beginPath(); ctx.moveTo(gx(x), gz(z));
        for (let k = 0; k < steps; k++) {
          heading += (random() - 0.5) * 1.1;
          x += Math.sin(heading) * 0.7; z += Math.cos(heading) * 0.7;
          if (z < -6.6) break;
          ctx.lineTo(gx(x), gz(z));
          cracks.push([x, z]);
        }
        ctx.strokeStyle = 'rgba(225,222,210,0.35)'; ctx.lineWidth = 0.16 * PX; ctx.stroke();
        ctx.strokeStyle = 'rgba(22,22,26,0.85)'; ctx.lineWidth = (0.035 + random() * 0.04) * PX; ctx.stroke();
      }
      if (a.lot === 'meadow') {
        for (const [x, z] of cracks) if (random() < 0.7) {
          ctx.fillStyle = `rgba(${random() < 0.5 ? '120,140,78' : '150,150,84'},${0.25 + random() * 0.3})`;
          ctx.beginPath(); ctx.ellipse(gx(x), gz(z), (0.4 + random() * 1.3) * PX, (0.3 + random() * 0.9) * PX, random() * 3, 0, 7); ctx.fill();
        }
      }
      if (a.lot === 'donuts') {
        const rings = 4 + Math.round(random() * 3 + mood.energy * 3);
        for (let i = 0; i < rings; i++) {
          const [x, z] = i < 2 ? along(mix(-14, 14, random()), mix(9, 13, random())) : [mix(-30, 10, random()), mix(-3, 11, random())];
          const r = mix(2.2, 4.6, random()), from = random() * 6.3, sweep = mix(3.5, 9, random());
          for (const off of [0, 1.45]) {
            ctx.strokeStyle = `rgba(16,15,18,${0.32 + random() * 0.3})`; ctx.lineWidth = 0.22 * PX;
            ctx.beginPath(); ctx.ellipse(gx(x + off * 0.2), gz(z), (r + off) * PX, (r + off) * 0.94 * PX, 0, from, from + sweep); ctx.stroke();
          }
        }
      }
      for (const p of puddles) {
        ctx.fillStyle = 'rgba(30,30,38,0.34)';
        ctx.beginPath(); ctx.ellipse(gx(p.x), gz(p.z), (p.r * p.stretch + 0.45) * PX, (p.r + 0.4) * PX, -p.turn, 0, 7); ctx.fill();
      }
      // Blend the sheet into the plain ground beyond it.
      const edge = 150;
      for (const [x0, y0, x1, y1, w, h] of [[0, 0, edge, 0, edge, N], [N, 0, N - edge, 0, edge, N], [0, 0, 0, edge, N, edge], [0, N, 0, N - edge, N, edge]] as const) {
        const g = ctx.createLinearGradient(x0, y0, x1, y1);
        g.addColorStop(0, asphalt); g.addColorStop(1, `${asphalt}00`);
        ctx.fillStyle = g; ctx.fillRect(Math.min(x0, x1), Math.min(y0, y1), w, h);
      }
    });
    const beyond = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), std(asphalt, { roughness: 1 }));
    beyond.rotation.x = -Math.PI / 2; beyond.position.set(-20, -0.03, -20); beyond.receiveShadow = true;
    root.add(beyond);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(GS, GS), std('#ffffff', { map: groundMap, roughness: 0.96 }));
    ground.rotation.x = -Math.PI / 2; ground.position.set(GX + GS / 2, 0, GZ + GS / 2); ground.receiveShadow = true;
    root.add(ground);
    if (puddles.length) {
      const water = std(blend(blend(top, mid, 0.5), asphalt, 0.42), { roughness: 0.05, metalness: 0.1, emissive: blend(top, mid, 0.5), emissiveIntensity: 0.18 });
      for (const p of puddles) {
        const geo = new THREE.CircleGeometry(1, 40);
        const pos = geo.attributes.position;
        const p1 = random() * 6.3, p2 = random() * 6.3, p3 = random() * 6.3;
        for (let i = 1; i < pos.count; i++) { const th = Math.atan2(pos.getY(i), pos.getX(i)); const k = 1 + 0.16 * Math.sin(2 * th + p1) + 0.1 * Math.sin(3 * th + p2) + 0.05 * Math.sin(5 * th + p3); pos.setXY(i, pos.getX(i) * k, pos.getY(i) * k); }
        const m = new THREE.Mesh(geo, water);
        m.rotation.set(-Math.PI / 2, 0, p.turn); m.scale.set(p.r * p.stretch, p.r, 1); m.position.set(p.x, 0.012, p.z); m.receiveShadow = true;
        root.add(m);
      }
    }

    // Weeds in the seams, wheel stops, kerb.
    const tuft = new THREE.ConeGeometry(0.09, 1, 5); tuft.translate(0, 0.5, 0);
    const greens = ['#8fa65a', '#a3ad62', '#c6b872', '#7d9a52'];
    const weedy = { faded: 0.12, cracked: 1, puddles: 0.4, donuts: 0.3, meadow: 1.6 }[a.lot] * mix(0.35, 1, wear);
    const weeds: { at: [number, number, number]; size: number; color: string }[] = [];
    for (const [x, z] of cracks) {
      const n = Math.floor(weedy * 2 * random() + weedy * 0.4);
      for (let i = 0; i < n; i++) weeds.push({ at: [x + (random() - 0.5) * 0.4, 0, z + (random() - 0.5) * 0.4], size: mix(0.12, a.lot === 'meadow' ? 0.75 : 0.5, random() * random()), color: greens[Math.floor(random() * 4)] });
    }
    for (let x = -46; x < 14; x += 0.5) if (random() < weedy * 0.5) weeds.push({ at: [x + random() * 0.4, 0, -6.92 + random() * 0.12], size: mix(0.12, 0.5, random()), color: greens[Math.floor(random() * 4)] });
    if (a.lot === 'meadow') for (let i = 0; i < 260; i++) {
      const [x, z] = along(mix(-25, 25, random()), mix(6, 40, random() ** 0.7));
      if (z > -6.6) weeds.push({ at: [x, 0, z], size: mix(0.15, 0.7, random() * random()), color: greens[Math.floor(random() * 4)] });
    }
    if (weeds.length) s.scatter(tuft, std('#ffffff', { roughness: 1 }), weeds.slice(0, 1400)).castShadow = false;
    const stops: { at: [number, number, number]; size: number; color?: string }[] = [];
    for (let x = -33.9 + 1.35; x < 15; x += 2.7) for (const z of [5.9, 7.1]) {
      if (random() < 0.3 + wear * 0.3) continue;
      stops.push({ at: [x + (random() - 0.5) * 0.2, 0.07, z + (random() - 0.5) * 0.15], size: 1, color: random() < 0.2 ? '#c9ab4c' : '#b3b0a5' });
    }
    s.scatter(new THREE.BoxGeometry(1.8, 0.14, 0.2), std('#ffffff'), stops);

    // ---- The mall: a long box, its face painted in one piece.
    const FX0 = -26, FX1 = 34, FL = FX1 - FX0, H = 9, FZ = -14;
    const name = MALLS[Math.floor(random() * MALLS.length)];
    const litName = a.scar === 'lit';
    const FW = 2048, FH = Math.round(FW * H / FL), FP = FW / FL;
    const fx = (x: number) => (x - FX0) * FP, fy = (y: number) => (H - y) * FP;
    const drawName = (ctx: Ctx, cx: number, cy: number, size: number, glowPass: boolean) => {
      ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
      ctx.font = `bold ${size}px Arial, Helvetica, sans-serif`;
      const total = ctx.measureText(name).width + size * 0.12 * (name.length - 1);
      let x = cx - total / 2;
      for (let i = 0; i < name.length; i++) {
        const ch = name[i], w = ctx.measureText(ch).width;
        const hangs = a.scar === 'intact' || litName || (a.scar === 'partial' && ((i * 7 + name.length) % 5 < 2));
        if (ch !== ' ') {
          if (glowPass) {
            if (litName && !(wear > 0.5 && i % 4 === 1)) { ctx.fillStyle = '#ffffff'; ctx.fillText(ch, x, cy); }
          } else {
            // The scar: wall kept clean under the letter, a dirty halo round it, bolt holes.
            ctx.fillStyle = 'rgba(70,60,48,0.16)'; ctx.fillText(ch, x + 2, cy + 3);
            ctx.fillStyle = blend(fin.wall, '#ffffff', a.finish === 'brick' ? 0.24 : 0.5); ctx.fillText(ch, x, cy);
            ctx.fillStyle = 'rgba(60,45,30,0.6)';
            for (const [bx, by] of [[0.25, -0.3], [0.75, -0.3], [0.25, 0.3], [0.75, 0.3]]) ctx.fillRect(x + w * bx - 1, cy + size * by - 1, 2.5, 2.5);
            if (hangs) {
              ctx.save();
              if (a.scar === 'partial' && i % 3 === 0) { ctx.translate(x + w * 0.1, cy - size * 0.3); ctx.rotate(0.22); ctx.translate(-x - w * 0.1, -cy + size * 0.3 + size * 0.1); }
              ctx.fillStyle = 'rgba(30,25,20,0.35)'; ctx.fillText(ch, x + 2.5, cy + 3.5);
              ctx.fillStyle = litName ? fin.accent : '#4a3a2c'; ctx.fillText(ch, x, cy);
              ctx.restore();
            }
          }
        }
        x += w + size * 0.12;
      }
      if (!glowPass && a.scar === 'painted') {
        ctx.fillStyle = blend(fin.wall, '#b9b6ad', 0.5); ctx.globalAlpha = 0.88;
        ctx.fillRect(cx - total / 2 - size * 0.4, cy - size * 0.75, total + size * 0.8, size * 1.5);
        ctx.globalAlpha = 1;
      }
    };
    const NAME_X = -15.5, NAME_Y = 6.2, NAME_H = 1.7;
    const faceMap = paint(FW, FH, (ctx, w, h) => {
      ctx.fillStyle = fin.wall; ctx.fillRect(0, 0, w, h);
      if (a.finish === 'ribbed') {
        for (let x = 0; x < w; x += 10) { ctx.fillStyle = fin.shade; ctx.fillRect(x, 0, 4, h); ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(x + 4, 0, 1.5, h); }
        for (let x = 0; x < w; x += 6 * FP) { ctx.fillStyle = 'rgba(60,55,48,0.5)'; ctx.fillRect(x, 0, 3, h); }
        ctx.fillStyle = blend(fin.wall, '#ffffff', 0.25); ctx.fillRect(0, fy(8.9), w, 1.2 * FP);
        ctx.fillStyle = fin.wall; ctx.fillRect(0, fy(NAME_Y + 1.5), 22 * FP, 3 * FP);
      } else if (a.finish === 'brick') {
        for (let y = 0; y < h; y += 4) {
          ctx.fillStyle = 'rgba(60,35,28,0.28)'; ctx.fillRect(0, y, w, 1);
          for (let x = (y / 4) % 2 ? 0 : 5; x < w; x += 10) { ctx.fillStyle = random() < 0.25 ? 'rgba(70,40,30,0.3)' : 'rgba(210,150,120,0.14)'; ctx.fillRect(x, y + 1, 9, 3); }
        }
        ctx.fillStyle = fin.shade; ctx.fillRect(0, fy(8.2), w, 0.9 * FP); ctx.fillRect(0, fy(1.0), w, 1.0 * FP);
      } else if (a.finish === 'stucco') {
        for (let i = 0; i < 2600; i++) { ctx.fillStyle = random() < 0.5 ? 'rgba(255,255,255,0.12)' : 'rgba(150,120,110,0.1)'; ctx.fillRect(random() * w, random() * h, 3 + random() * 8, 2 + random() * 4); }
        ctx.fillStyle = fin.accent; ctx.fillRect(0, fy(3.6), w, 0.35 * FP); ctx.fillRect(0, fy(8.4), w, 0.18 * FP);
        ctx.fillStyle = fin.second;
        for (let x = 1.5; x < FL; x += 3) ctx.fillRect(x * FP, fy(4.5), 0.45 * FP, 0.45 * FP);
        for (let x = 0; x < w; x += 7.5 * FP) { ctx.fillStyle = 'rgba(120,95,85,0.4)'; ctx.fillRect(x, 0, 2, h); }
      } else {
        for (let y = 0; y < h; y += 7) { ctx.fillStyle = 'rgba(120,120,112,0.2)'; ctx.fillRect(0, y, w, 1); for (let x = (y / 7) % 2 ? 0 : 7; x < w; x += 14) ctx.fillRect(x, y, 1, 7); }
        // Supergraphic: three bands that run the length and step down to the doors.
        const bands = [fin.accent, '#e8a62c', fin.second];
        bands.forEach((c, i) => {
          ctx.fillStyle = c; ctx.beginPath();
          const y0 = 4.6 - i * 0.55, y1 = 2.2 - i * 0.55, t = 0.5;
          ctx.moveTo(0, fy(y0)); ctx.lineTo(fx(-10.6), fy(y0)); ctx.lineTo(fx(-8.2), fy(y1)); ctx.lineTo(w, fy(y1));
          ctx.lineTo(w, fy(y1 - t)); ctx.lineTo(fx(-8), fy(y1 - t)); ctx.lineTo(fx(-10.4), fy(y0 - t)); ctx.lineTo(0, fy(y0 - t)); ctx.fill();
        });
      }
      // Service doors, wall packs, a downspout.
      for (const x of [-23.6, -7.4, 21]) {
        ctx.fillStyle = '#7d8286'; ctx.fillRect(fx(x), fy(2.2), 1.0 * FP, 2.2 * FP);
        ctx.strokeStyle = '#4c4f52'; ctx.lineWidth = 2; ctx.strokeRect(fx(x), fy(2.2), 1.0 * FP, 2.2 * FP);
        ctx.fillStyle = '#3c3e40'; ctx.fillRect(fx(x) + 3, fy(2.9), 0.3 * FP, 0.16 * FP);
        ctx.fillStyle = 'rgba(80,60,40,0.25)'; ctx.fillRect(fx(x) + 6, fy(2.9), 5, 0.7 * FP);
      }
      for (const x of [-20.5, 15]) { ctx.fillStyle = '#6f7275'; ctx.fillRect(fx(x), 0, 5, h); }
      drawName(ctx, fx(NAME_X), fy(NAME_Y), NAME_H * FP, false);
      // Weather: streaks under the coping, splash-back at the base, rust under the bolts.
      const streaks = Math.round(mix(20, 240, wear));
      for (let i = 0; i < streaks; i++) {
        const x = random() * w, len = h * mix(0.1, 0.75, random() * random());
        const g = ctx.createLinearGradient(0, 0, 0, len);
        const dark = random() < 0.8;
        g.addColorStop(0, dark ? `rgba(70,62,50,${mix(0.12, 0.42, wear)})` : 'rgba(255,255,250,0.35)'); g.addColorStop(1, 'rgba(70,62,50,0)');
        ctx.fillStyle = g; ctx.fillRect(x, 0, 3 + random() * 14, len);
      }
      const base = ctx.createLinearGradient(0, h - 1.1 * FP, 0, h);
      base.addColorStop(0, 'rgba(80,72,58,0)'); base.addColorStop(1, `rgba(80,72,58,${mix(0.15, 0.5, wear)})`);
      ctx.fillStyle = base; ctx.fillRect(0, h - 1.1 * FP, w, 1.1 * FP);
      if (wear > 0.55) {
        // Tags along the bottom, as high as an arm reaches.
        const inks = ['#e8437a', '#3a7bd5', '#1c1c1c', '#f2f2f2', '#39b36b'];
        ctx.lineCap = 'round';
        for (let i = 0; i < Math.round((wear - 0.45) * 22); i++) {
          let x = random() * w, y = fy(0.5 + random() * 1.5);
          ctx.strokeStyle = inks[Math.floor(random() * inks.length)]; ctx.lineWidth = 3 + random() * 3; ctx.beginPath(); ctx.moveTo(x, y);
          for (let k = 0; k < 9; k++) { x += 8 + random() * 22; y += (random() - 0.5) * 46; y = Math.min(h - 6, Math.max(fy(2.3), y)); ctx.lineTo(x, y); }
          ctx.stroke();
        }
      }
    });
    const faceMat = std('#ffffff', { map: faceMap, roughness: 0.92 });
    if (litName) {
      faceMat.emissiveMap = paint(FW, FH, (ctx, w, h) => { ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, w, h); drawName(ctx, fx(NAME_X), fy(NAME_Y), NAME_H * FP, true); });
      faceMat.emissive = new THREE.Color(blend(fin.accent, '#fff1d0', 0.45));
      faceMat.emissiveIntensity = mix(0.9, 1.7, sky.lamps);
    }
    const wallMat = std(fin.wall), portalMat = std(fin.portal), accent = std(fin.accent, { roughness: 0.6 }), second = std(fin.second, { roughness: 0.6 });
    const concrete = std(blend('#cfcbbf', asphalt, 0.15)), darkMetal = std('#3a3d42', { roughness: 0.6, metalness: 0.4 });
    s.box([FL, H, 30], [(FX0 + FX1) / 2, H / 2, FZ - 15], wallMat);
    s.mesh(new THREE.PlaneGeometry(FL, H), faceMat, [(FX0 + FX1) / 2, H / 2, FZ + 0.02]);
    s.box([FL + 0.4, 0.35, 0.5], [(FX0 + FX1) / 2, H + 0.02, FZ + 0.05], std(blend(fin.shade, '#8a857a', 0.4)));
    // Rooftop plant.
    for (let i = 0; i < 6; i++) {
      const x = mix(FX0 + 3, 6, random()), w = mix(1.6, 3.4, random());
      s.box([w, mix(0.9, 1.8, random()), 2], [x, H + 0.7, FZ - mix(3, 9, random())], std('#a7aaa6', { metalness: 0.3, roughness: 0.6 }));
    }
    // Pavement along the wall, widened at the doors, with a yellow kerb face.
    s.box([FL + 30, 0.16, 7], [(FX0 + FX1) / 2 - 15, 0.08, FZ + 3.5], concrete);
    s.box([15, 0.16, 2.5], [EX, 0.08, -5.75], concrete);
    s.box([FL + 30, 0.17, 0.12], [(FX0 + FX1) / 2 - 15, 0.085, -6.95], std(blend('#d9b23a', '#b8b3a4', wear * 0.6)));
    const PAVE = (x: number, z: number) => (z < -7 || (z < -4.5 && Math.abs(x - EX) < 7.5) ? 0.16 : 0);

    // ---- The entrance.
    const low4 = a.entrance === 'canopy', arch = a.entrance === 'arch';
    const EW = 13, EH = arch ? 11.6 : low4 ? 9.7 : 10.6, EZ = -10;
    const holeW = arch ? 8 : 9, holeH = arch ? 8.6 : low4 ? 4.4 : 6.2;
    const wall = new THREE.Shape();
    wall.moveTo(-EW / 2, 0); wall.lineTo(EW / 2, 0); wall.lineTo(EW / 2, EH);
    if (arch) { wall.lineTo(EW / 2, EH - 2.2); wall.lineTo(0, EH + 1.2); wall.lineTo(-EW / 2, EH - 2.2); } else wall.lineTo(-EW / 2, EH);
    wall.lineTo(-EW / 2, 0);
    const hole = new THREE.Path();
    hole.moveTo(-holeW / 2, 0);
    if (arch) { hole.lineTo(-holeW / 2, holeH - holeW / 2); hole.absarc(0, holeH - holeW / 2, holeW / 2, Math.PI, 0, true); hole.lineTo(holeW / 2, 0); }
    else { hole.lineTo(-holeW / 2, holeH); hole.lineTo(holeW / 2, holeH); hole.lineTo(holeW / 2, 0); }
    hole.lineTo(-holeW / 2, 0);
    wall.holes.push(hole);
    s.mesh(new THREE.ExtrudeGeometry(wall, { depth: 0.9, bevelEnabled: false, curveSegments: 24 }), portalMat, [EX, 0, EZ - 0.9]);
    s.box([EW, EH - (arch ? 2.2 : 0), 3.1], [EX, (EH - (arch ? 2.2 : 0)) / 2, EZ - 2.45], portalMat);
    // Glass wall: brass mullions, a row of doors, whatever has been done to them, a dim glow far inside.
    const boarded = a.notice === 'trespass';
    const glow = mix(0.2, 0.75, mood.cheer) * (a.sky === 'dusk' || a.sky === 'dawn' ? 1.3 : 1);
    const brass = a.finish === 'whitebox' ? '#5b4a3a' : a.finish === 'stucco' ? '#e9e6dc' : '#b8934a';
    const GW = 1024, GH = Math.round(GW * holeH / holeW), GP = GW / holeW;
    const bays = 6, rows = Math.max(2, Math.round(holeH / 2.1));
    const glassMap = paint(GW, GH, (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#31474c'); g.addColorStop(1, '#1c2a2f');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      // Skylight shaft deep in the concourse.
      const r = ctx.createRadialGradient(w * 0.5, h * 0.42, 10, w * 0.5, h * 0.5, w * 0.42);
      r.addColorStop(0, `rgba(215,236,226,${glow})`); r.addColorStop(0.5, `rgba(150,190,180,${glow * 0.4})`); r.addColorStop(1, 'rgba(120,160,160,0)');
      ctx.fillStyle = r; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = `rgba(210,230,220,${glow * 0.5})`;
      ctx.beginPath(); ctx.moveTo(w * 0.44, h * 0.2); ctx.lineTo(w * 0.56, h * 0.2); ctx.lineTo(w * 0.68, h); ctx.lineTo(w * 0.32, h); ctx.fill();
      // Sky in the upper panes.
      const sk = ctx.createLinearGradient(0, 0, w, h * 0.5);
      sk.addColorStop(0, `${blend(top, '#ffffff', 0.2)}99`); sk.addColorStop(0.6, `${mid}22`); sk.addColorStop(1, `${mid}00`);
      ctx.fillStyle = sk; ctx.fillRect(0, 0, w, h * 0.55);
      const bw = w / bays, rh = h / rows;
      for (let c = 0; c < bays; c++) for (let rr = 0; rr < rows; rr++) {
        const door = rr === rows - 1;
        const board = boarded ? door || random() < 0.4 : random() < (wear - 0.45) * (door ? 0.9 : 0.5);
        if (board) {
          ctx.fillStyle = blend('#c9a56e', '#a08f78', wear * 0.6 + random() * 0.2); ctx.fillRect(c * bw + 3, rr * rh + 3, bw - 6, rh - 6);
          ctx.strokeStyle = 'rgba(110,80,45,0.4)'; ctx.lineWidth = 2;
          for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.moveTo(c * bw + 4, rr * rh + rh * (0.15 + k * 0.18 + random() * 0.05)); ctx.bezierCurveTo(c * bw + bw * 0.3, rr * rh + rh * (0.1 + k * 0.18), c * bw + bw * 0.7, rr * rh + rh * (0.24 + k * 0.18), c * bw + bw - 4, rr * rh + rh * (0.16 + k * 0.18)); ctx.stroke(); }
        } else if (door) {
          ctx.fillStyle = brass; ctx.fillRect(c * bw + bw * 0.14, rr * rh + rh * 0.55, bw * 0.72, 5);
          ctx.fillRect(c * bw + bw * 0.5 - 2, rr * rh, 4, rh);
          if (random() < 0.35) { ctx.fillStyle = '#f1eee2'; ctx.fillRect(c * bw + bw * 0.2, rr * rh + rh * 0.25, bw * 0.2, rh * 0.16); }
        }
      }
      ctx.fillStyle = brass;
      for (let c = 0; c <= bays; c++) ctx.fillRect(Math.min(w - 9, Math.max(0, c * bw - 4.5)), 0, 9, h);
      for (let rr = 0; rr <= rows; rr++) ctx.fillRect(0, Math.min(h - 9, Math.max(0, rr * rh - 4.5)), w, rr === rows - 1 ? 14 : 9);
      // Chain and padlock on the middle doors.
      ctx.strokeStyle = '#d4d6d8'; ctx.lineWidth = 5; ctx.setLineDash([9, 5]);
      ctx.beginPath(); ctx.moveTo(w * 0.5 - bw * 0.42, h - rh * 0.5); ctx.quadraticCurveTo(w * 0.5, h - rh * 0.3, w * 0.5 + bw * 0.42, h - rh * 0.5); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#d9b23a'; ctx.fillRect(w * 0.5 - 8, h - rh * 0.4, 16, 18);
      if (boarded) for (const c of [1, 4]) {
        ctx.fillStyle = '#c8281e'; ctx.fillRect(c * bw + bw * 0.14, h - rh * 0.78, bw * 0.72, rh * 0.3);
        ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `bold ${rh * 0.1}px Arial, sans-serif`;
        ctx.fillText('NO', c * bw + bw / 2, h - rh * 0.69, bw * 0.6); ctx.fillText('TRESPASSING', c * bw + bw / 2, h - rh * 0.57, bw * 0.64);
      }
      ctx.fillStyle = `rgba(190,180,160,${wear * 0.22})`; ctx.fillRect(0, 0, w, h);
    });
    void GP;
    s.mesh(new THREE.PlaneGeometry(holeW, holeH), new THREE.MeshStandardMaterial({ map: glassMap, roughness: 0.25, metalness: 0.2, emissive: '#ffffff', emissiveMap: glassMap, emissiveIntensity: mix(0.25, 0.6, mood.cheer) }), [EX, holeH / 2, EZ - 0.55]);
    // Name band over the doors.
    const band = (width: number, height: number, at: [number, number, number]) => {
      const map = paint(1024, Math.round(1024 * height / width), (ctx, w, h) => {
        ctx.fillStyle = low4 ? fin.accent : fin.portal; ctx.fillRect(0, 0, w, h);
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `bold ${h * 0.62}px Georgia, 'Times New Roman', serif`;
        const solid = a.scar === 'intact' || litName;
        ctx.fillStyle = solid ? (low4 ? '#f6f1e4' : fin.accent) : blend(low4 ? fin.accent : fin.portal, '#ffffff', 0.4);
        ctx.fillText(name, w / 2, h * 0.54, w * 0.9);
        ctx.fillStyle = `rgba(75,65,50,${wear * 0.3})`;
        for (let k = 0; k < 22; k++) ctx.fillRect(random() * w, 0, 4 + random() * 12, h * (0.3 + random() * 0.7));
      });
      s.mesh(new THREE.PlaneGeometry(width, height), std('#ffffff', { map, roughness: 0.8 }), at);
    };
    if (a.entrance === 'pyramid') {
      band(8, 1.0, [EX, holeH + 1.5, EZ + 0.02]);
      s.box([EW + 0.3, 0.3, 4.3], [EX, EH + 0.15, EZ - 2], second);
      const glass = std(blend('#a9cfd0', mid, 0.25), { roughness: 0.12, metalness: 0.35, emissive: '#bfe6e0', emissiveIntensity: glow * 0.35 });
      const cone = s.mesh(new THREE.ConeGeometry(5.6, 5, 4, 3), glass, [EX, EH + 2.5, EZ - 6]);
      cone.rotation.y = Math.PI / 4;
      const rib = std(brass, { metalness: 0.5, roughness: 0.4 });
      const half = 5.6 * Math.SQRT1_2;
      for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) s.rod([EX + sx * half, EH, EZ - 6 + sz * half], [EX, EH + 5.05, EZ - 6], 0.09, rib);
      for (const k of [1, 2 / 3, 1 / 3]) for (const [x0, z0, x1, z1] of [[-1, 1, 1, 1], [1, 1, 1, -1], [1, -1, -1, -1], [-1, -1, -1, 1]])
        s.rod([EX + x0 * half * k, EH + 5 * (1 - k), EZ - 6 + z0 * half * k], [EX + x1 * half * k, EH + 5 * (1 - k), EZ - 6 + z1 * half * k], 0.06, rib);
    } else if (a.entrance === 'barrel') {
      band(8, 1.0, [EX, holeH + 1.3, EZ + 0.02]);
      const R = 4.6;
      const glass = std(blend('#a9cfd0', mid, 0.25), { roughness: 0.12, metalness: 0.35, emissive: '#bfe6e0', emissiveIntensity: glow * 0.35, side: THREE.DoubleSide });
      const vault = s.mesh(new THREE.CylinderGeometry(R, R, 12, 28, 1, true, -Math.PI / 2, Math.PI), glass, [EX, EH - 1.4, EZ - 6]);
      vault.rotation.x = Math.PI / 2;
      const rib = std(brass, { metalness: 0.5, roughness: 0.4 });
      for (let i = 0; i <= 6; i++) { const ring = s.ring(R, 0.08, [EX, EH - 1.4, EZ - i * 2 + 0.02], rib, Math.PI); void ring; }
      for (const t of [0.5, 1.05, Math.PI / 2, Math.PI - 1.05, Math.PI - 0.5]) s.rod([EX + Math.cos(t) * R, EH - 1.4 + Math.sin(t) * R, EZ], [EX + Math.cos(t) * R, EH - 1.4 + Math.sin(t) * R, EZ - 12], 0.05, rib);
      // Fan lunette on the front.
      const fan = paint(512, 256, (ctx, w, h) => {
        ctx.fillStyle = '#2a3d42'; ctx.fillRect(0, 0, w, h);
        const r = ctx.createRadialGradient(w / 2, h, 10, w / 2, h, h);
        r.addColorStop(0, `rgba(215,236,226,${glow})`); r.addColorStop(1, 'rgba(160,200,200,0.15)');
        ctx.fillStyle = r; ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = brass; ctx.lineWidth = 7;
        for (let k = 1; k < 8; k++) { ctx.beginPath(); ctx.moveTo(w / 2, h); ctx.lineTo(w / 2 + Math.cos(Math.PI * k / 8) * w, h - Math.sin(Math.PI * k / 8) * w); ctx.stroke(); }
        for (const rr of [0.3, 0.62]) { ctx.beginPath(); ctx.arc(w / 2, h, h * rr, Math.PI, 0); ctx.stroke(); }
      });
      s.mesh(new THREE.CircleGeometry(R - 0.08, 28, 0, Math.PI), new THREE.MeshStandardMaterial({ map: fan, roughness: 0.3, emissive: '#ffffff', emissiveMap: fan, emissiveIntensity: 0.4 }), [EX, EH - 1.4, EZ + 0.04]);
      s.box([EW + 0.3, 0.3, 4.3], [EX, EH - 1.4 - 0.15, EZ - 2], second);
    } else if (arch) {
      // Keystone, impost blocks and a gable roundel.
      s.box([1.1, 1.5, 0.3], [EX, holeH + 0.55, EZ + 0.1], second);
      for (const x of [-1, 1]) s.box([1.3, 0.5, 0.3], [EX + x * (holeW / 2 + 0.5), holeH - holeW / 2, EZ + 0.1], accent);
      for (const x of [-1, 1]) for (let i = 0; i < 3; i++) s.box([0.55, 0.55, 0.12], [EX + x * 5.2, 1.6 + i * 1.5, EZ + 0.04], second);
      const roundel = s.cylinder(0.8, 0.8, 0.2, [EX, EH - 0.6, EZ + 0.05], accent, 24); roundel.rotation.x = Math.PI / 2;
      const prism = new THREE.Shape(); prism.moveTo(-EW / 2, 0); prism.lineTo(EW / 2, 0); prism.lineTo(0, 3.4); prism.lineTo(-EW / 2, 0);
      s.mesh(new THREE.ExtrudeGeometry(prism, { depth: 3.1, bevelEnabled: false }), portalMat, [EX, EH - 2.2, EZ - 4]);
    } else {
      // Flat canopy slab on thin columns, name on the fascia.
      s.box([EW + 3, 0.55, 6.4], [EX, holeH + 0.5, EZ + 2.6], portalMat);
      s.box([EW + 3.06, 0.9, 0.12], [EX, holeH + 0.55, EZ + 5.82], accent);
      band(10, 0.8, [EX, holeH + 0.55, EZ + 5.9]);
      for (const x of [-7, -2.4, 2.4, 7]) s.cylinder(0.14, 0.14, holeH + 0.25, [EX + x, (holeH + 0.25) / 2 + 0.16, EZ + 5.2], darkMetal, 12);
      for (const x of [-4.4, 0, 4.4]) s.box([2.6, 0.08, 0.5], [EX + x, holeH + 0.2, EZ + 2.6], std('#f3f0e0', { emissive: '#fff6d0', emissiveIntensity: sky.lamps * mix(0.3, 1.4, mood.cheer) }));
    }
    // Banner across the doors.
    if (a.notice === 'closing' || a.notice === 'lease' || a.notice === 'thanks') {
      const bw = 7.6, bh = 1.2;
      const cloth = paint(1024, 152, (ctx, w, h) => {
        const y = a.notice === 'closing';
        ctx.fillStyle = y ? '#f2d21c' : '#f5f1e4'; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = y ? '#c8171d' : a.notice === 'lease' ? '#c8171d' : '#27407a';
        ctx.fillRect(0, 0, w, h * 0.1); ctx.fillRect(0, h * 0.9, w, h * 0.1);
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `bold ${h * 0.56}px Impact, Arial, sans-serif`;
        ctx.fillText(NOTICE[a.notice as keyof typeof NOTICE], w / 2, h / 2, w * 0.92);
        ctx.fillStyle = `rgba(110,100,80,${wear * 0.3})`; ctx.fillRect(0, 0, w, h);
      });
      const geo = new THREE.PlaneGeometry(bw, bh, 20, 4);
      const pos = geo.attributes.position;
      const sag = mix(0.08, 0.5, wear), drop = random() < wear * 0.7;
      for (let i = 0; i < pos.count; i++) {
        const u = pos.getX(i) / (bw / 2), v = pos.getY(i) / (bh / 2);
        pos.setZ(i, Math.sin(u * 6 + v) * 0.06 + (1 - u * u) * 0.12);
        pos.setY(i, pos.getY(i) - (1 - u * u) * sag - (drop && u > 0.35 ? (u - 0.35) * 2.4 * (v + 1.2) * 0.5 : 0));
      }
      geo.computeVertexNormals();
      const by = low4 ? holeH - 1.0 : holeH - 0.2;
      s.mesh(geo, std('#ffffff', { map: cloth, roughness: 0.85, side: THREE.DoubleSide }), [EX, by, low4 ? EZ - 0.3 : EZ + 0.12]);
    }
    // Bollards, a bin and a bench on the pavement.
    const bollard = std(blend('#d9b23a', '#a59f8e', wear * 0.5), { roughness: 0.7 });
    for (let i = 0; i < 5; i++) {
      const post = s.cylinder(0.11, 0.11, 0.95, [EX - 4 + i * 2, 0.16 + 0.475, -4.8], bollard, 10);
      if (random() < wear * 0.25) post.rotation.z = (random() - 0.5) * 0.5;
    }
    s.cylinder(0.32, 0.27, 0.9, [EX - 8, 0.61, -9], std('#6d7468'), 12);
    s.box([2.2, 0.08, 0.5], [EX - 14.5, 0.62, -12.6], std('#8a6a4a'));
    for (const x of [-0.9, 0.9]) s.box([0.1, 0.46, 0.45], [EX - 14.5 + x, 0.39, -12.6], concrete);

    // ---- Lot lamps along the kerb, and two far out in the side lot.
    const lampOn = sky.lamps;
    const headMats: THREE.MeshStandardMaterial[] = [];
    const lampTint = a.lamps === 'globe' ? '#fff2d2' : a.sky === 'dusk' ? '#ffc070' : '#ffe2b0';
    const poolMat = new THREE.MeshBasicMaterial({ color: lampTint, transparent: true, opacity: 0.2 * lampOn, depthWrite: false, blending: THREE.AdditiveBlending });
    const poleMat = std(blend('#70757a', '#8a6a52', wear * 0.4), { metalness: 0.4, roughness: 0.6 });
    let flickerMat: THREE.MeshStandardMaterial | null = null;
    const lamp = (x: number, z: number, y0: number, index: number) => {
      const g = new THREE.Group();
      g.position.set(x, y0, z);
      root.add(g);
      const put = (m: THREE.Mesh) => { g.add(m); return m; };
      const PH = 8.6;
      put(s.cylinder(0.3, 0.34, 0.9, [0, 0.45, 0], concrete, 12));
      put(s.cylinder(0.08, 0.12, PH, [0, 0.9 + PH / 2, 0], poleMat, 8));
      const dead = random() < mix(0.1, 0.75, wear) * (1 - mood.cheer * 0.5);
      const working = lampOn > 0 && !dead;
      const head = std(working ? '#fff4d8' : '#c9c9c2', { roughness: 0.4, emissive: lampTint, emissiveIntensity: working ? 2.4 * lampOn : 0 });
      headMats.push(head);
      if (working && index === 1 && wear > 0.3) flickerMat = head;
      const topY = 0.9 + PH;
      if (a.lamps === 'shoebox') {
        put(s.box([2.6, 0.1, 0.1], [0, topY - 0.1, 0], poleMat));
        for (const sx of [-1, 1]) {
          if (sx === 1 && dead && random() < wear) continue;
          put(s.box([0.95, 0.2, 0.55], [sx * 1.3, topY - 0.12, 0], darkMetal));
          put(s.box([0.8, 0.04, 0.42], [sx * 1.3, topY - 0.235, 0], head));
        }
      } else if (a.lamps === 'cobra') {
        put(s.tube([[0, topY - 0.2, 0], [0, topY + 0.25, 0.5], [0, topY + 0.3, 1.5], [0, topY + 0.2, 2.2]], 0.05, poleMat));
        const shell = put(s.ball([0.24, 0.13, 0.48], [0, topY + 0.18, 2.4], darkMetal, 12)); void shell;
        put(s.ball([0.17, 0.07, 0.32], [0, topY + 0.1, 2.45], head, 10));
      } else {
        const n = 4;
        for (let i = 0; i < n; i++) {
          const t = (i / n) * Math.PI * 2 + 0.4;
          put(s.rod([0, topY - 0.5, 0], [Math.sin(t) * 0.6, topY - 0.25, Math.cos(t) * 0.6], 0.03, poleMat));
          if (dead && i === 0 && random() < wear) continue;
          put(s.ball([0.28, 0.28, 0.28], [Math.sin(t) * 0.6, topY + 0.02, Math.cos(t) * 0.6], head, 12));
        }
        put(s.ball([0.32, 0.32, 0.32], [0, topY + 0.2, 0], head, 12));
      }
      g.rotation.y = a.lamps === 'cobra' ? 0 : (random() - 0.5) * 0.2;
      if (random() < (wear - 0.5) * 0.5) g.rotation.z = (random() - 0.5) * 0.12;
      if (working) {
        const pool = new THREE.Mesh(new THREE.CircleGeometry(5.5, 28), poolMat);
        pool.rotation.x = -Math.PI / 2;
        pool.position.set(x, y0 + 0.03, z + (a.lamps === 'cobra' ? 2.2 : 0));
        root.add(pool);
      }
    };
    lamp(8.4, -7.6, 0.16, 0); lamp(-7.5, -7.6, 0.16, 1); lamp(-21, -7.6, 0.16, 2);
    lamp(-38, -19, 0, 3); lamp(-57, -29, 0, 4);
    // The pylon sign out by the road, small with distance.
    {
      const px = -50, pz = -22;
      for (const x of [-1.9, 1.9]) s.box([0.35, 12, 0.35], [px + x, 6, pz], accent);
      const on = lampOn > 0 && wear < 0.7;
      for (let i = 0; i < 4; i++) {
        const gone = random() < mix(0.2, 0.8, wear);
        s.box([3.4, 1.3, 0.3], [px, 4.2 + i * 1.5, pz], gone ? darkMetal : std('#f1eee4', { emissive: '#fff4d8', emissiveIntensity: on && random() < 0.5 ? 0.9 : 0 }));
      }
      s.box([4.6, 2, 0.4], [px, 11.2, pz], accent);
      s.box([4.0, 0.5, 0.42], [px, 11.2, pz], second);
    }

    // ---- What was left behind.
    const density = mood.density;
    if (a.strays === 'carts') {
      const mesh = paint(64, 64, (ctx, w, h) => {
        ctx.clearRect(0, 0, w, h);
        ctx.strokeStyle = '#c9cdd0'; ctx.lineWidth = 3;
        for (let i = 0; i <= 8; i++) { ctx.beginPath(); ctx.moveTo(i * 8, 0); ctx.lineTo(i * 8, h); ctx.stroke(); }
        for (let i = 0; i <= 4; i++) { ctx.beginPath(); ctx.moveTo(0, i * 16); ctx.lineTo(w, i * 16); ctx.stroke(); }
      });
      const wire = new THREE.MeshStandardMaterial({ map: mesh, alphaTest: 0.4, side: THREE.DoubleSide, metalness: 0.5, roughness: 0.5 });
      const steel = std('#aeb3b6', { metalness: 0.6, roughness: 0.45 });
      const grip = std(['#c8281e', '#27407a', '#2f8f95', '#e8892e'][Math.floor(random() * 4)], { roughness: 0.6 });
      const cart = (x: number, z: number, turn: number, tipped: boolean) => {
        const g = new THREE.Group();
        const put = (m: THREE.Mesh) => { g.add(m); return m; };
        put(s.box([0.56, 0.42, 0.9], [0, 0.82, 0], wire));
        put(s.box([0.52, 0.03, 0.8], [0, 0.3, 0.02], steel));
        for (const sx of [-1, 1]) {
          put(s.rod([sx * 0.26, 0.12, 0.4], [sx * 0.27, 1.02, -0.5], 0.018, steel));
          put(s.rod([sx * 0.26, 0.12, -0.4], [sx * 0.26, 0.3, -0.4], 0.018, steel));
          for (const sz of [-0.4, 0.4]) put(s.cylinder(0.06, 0.06, 0.04, [sx * 0.26, 0.06, sz], darkMetal, 10)).rotation.z = Math.PI / 2;
        }
        put(s.rod([-0.3, 1.04, -0.52], [0.3, 1.04, -0.52], 0.022, grip));
        g.position.set(x, PAVE(x, z), z);
        g.rotation.y = turn;
        if (tipped) { g.rotation.z = Math.PI / 2 - 0.08; g.position.y += 0.3; }
        root.add(g);
      };
      const n = 3 + Math.round(density * 4);
      const spots: [number, number][] = [along(-19, 9.5), along(18, 10.5), along(21, 33), along(-21, 26), along(-5, 9), along(8, 34), along(15, 12.5)];
      for (let i = 0; i < Math.min(n, spots.length); i++) cart(spots[i][0] + (random() - 0.5), spots[i][1] + (random() - 0.5), random() * 6.3, i === 1 || (i > 2 && random() < wear * 0.5));
    } else if (a.strays === 'car') {
      const g = new THREE.Group();
      const put = (m: THREE.Mesh) => { g.add(m); return m; };
      const paintJob = std(blend(['#8a2f2f', '#c9c2a8', '#3f5d7a', '#6f7f6a', '#d8d6cf'][Math.floor(random() * 5)], '#b9b3a4', 0.2 + wear * 0.4), { roughness: mix(0.4, 0.9, wear), metalness: 0.2 });
      const dark = std('#23272c', { roughness: 0.3, metalness: 0.3 });
      put(s.box([1.75, 0.52, 4.5], [0, 0.5, 0], paintJob));
      const cabin = new THREE.Shape(); cabin.moveTo(-1.3, 0); cabin.lineTo(1.0, 0); cabin.lineTo(0.45, 0.55); cabin.lineTo(-0.85, 0.55); cabin.lineTo(-1.3, 0);
      const cabGeo = new THREE.ExtrudeGeometry(cabin, { depth: 1.6, bevelEnabled: false }); cabGeo.rotateY(-Math.PI / 2); cabGeo.translate(0.8, 0, 0);
      put(s.mesh(cabGeo, dark, [0, 0.76, -0.1]));
      put(s.box([1.66, 0.06, 1.34], [0, 1.33, -0.3], paintJob));
      for (const sx of [-1, 1]) for (const sz of [-1.4, 1.4]) { const w = put(s.cylinder(0.3, 0.3, 0.22, [sx * 0.8, 0.24, sz], std('#1d1d20'), 14)); w.rotation.z = Math.PI / 2; w.scale.set(0.8, 1, 1.08); }
      put(s.box([1.78, 0.14, 0.12], [0, 0.34, 2.27], darkMetal)); put(s.box([1.78, 0.14, 0.12], [0, 0.34, -2.27], darkMetal));
      put(s.box([0.3, 0.2, 0.02], [0.45, 1.0, 0.72], std('#f08a1e', { emissive: '#f08a1e', emissiveIntensity: 0.25 }))).rotation.x = -0.75;
      g.position.set(-17, -0.06, -5.2);
      g.rotation.y = Math.PI / 2 + (random() - 0.5) * 0.12;
      g.rotation.z = (random() - 0.5) * 0.03;
      root.add(g);
    } else if (a.strays === 'barriers') {
      const profile = new THREE.Shape();
      profile.moveTo(-0.3, 0); profile.lineTo(0.3, 0); profile.lineTo(0.3, 0.12); profile.lineTo(0.12, 0.34); profile.lineTo(0.08, 0.82); profile.lineTo(-0.08, 0.82); profile.lineTo(-0.12, 0.34); profile.lineTo(-0.3, 0.12); profile.lineTo(-0.3, 0);
      const geo = new THREE.ExtrudeGeometry(profile, { depth: 3, bevelEnabled: false }); geo.translate(0, 0, -1.5);
      const jersey = std(blend('#cfcbbf', asphalt, 0.1));
      const n = 3 + Math.round(density * 2);
      for (let i = 0; i < n; i++) {
        const [x, z] = along(-19.5 + i * 0.5, 8.5 + i * 3.3);
        const b = s.mesh(geo, jersey, [x, 0, z]);
        b.rotation.y = YAW - 0.12 + (random() - 0.5) * mix(0.1, 0.5, wear);
        s.box([0.5, 0.25, 0.02], [x - 0.2, 0.55, z], std('#e8892e'));
      }
      const barrel = std('#ee6a1f', { roughness: 0.6 }), stripe = std('#f1eee4');
      for (const [deg, d] of [[19.5, 13], [21, 17], [15, 12.4], [-19, 14]] as const) {
        const [x, z] = along(deg, d);
        const tip = random() < wear * 0.5;
        const g = new THREE.Group();
        const drum = s.cylinder(0.24, 0.3, 1.0, [0, 0.5, 0], barrel, 14); g.add(drum);
        for (const y of [0.4, 0.7]) g.add(s.cylinder(0.275 - (y - 0.4) * 0.06, 0.285 - (y - 0.4) * 0.06, 0.12, [0, y, 0], stripe, 14));
        g.add(s.cylinder(0.36, 0.36, 0.06, [0, 0.03, 0], std('#1d1d20'), 14));
        g.position.set(x, 0, z);
        if (tip) { g.rotation.z = Math.PI / 2 - 0.1; g.position.y = 0.3; g.rotation.y = random() * 3; }
        root.add(g);
      }
    } else if (a.strays === 'gulls') {
      const body = new THREE.SphereGeometry(1, 10, 7); body.scale(0.1, 0.095, 0.2);
      const head = new THREE.SphereGeometry(0.055, 8, 6);
      const tail = new THREE.SphereGeometry(1, 6, 5); tail.scale(0.06, 0.03, 0.1);
      const n = 9 + Math.round(density * 16);
      const bodies: { at: [number, number, number]; size: number }[] = [], heads: typeof bodies = [], tails: typeof bodies = [];
      for (let i = 0; i < n; i++) {
        const roof = i % 6 === 5;
        const [x, z] = roof ? [mix(-24, -10, random()), FZ + 0.1] : i % 3 === 0 ? along(mix(-21, 21, random()), mix(7, 12, random())) : along(mix(-22, 22, random()), mix(12, 34, random()));
        if (!roof && z < -6.4) continue;
        const y = roof ? H + 0.2 : 0;
        const k = 0.9 + random() * 0.3;
        bodies.push({ at: [x, y + 0.2 * k, z], size: k });
        heads.push({ at: [x + 0.13 * k, y + 0.31 * k, z + 0.07 * k], size: k });
        tails.push({ at: [x - 0.19 * k, y + 0.22 * k, z - 0.1 * k], size: k });
      }
      const turned = (geo: THREE.BufferGeometry) => { geo.rotateY(1.05); return geo; };
      s.scatter(turned(body), std('#f4f3ee', { roughness: 0.7 }), bodies);
      s.scatter(head, std('#f8f7f2', { roughness: 0.7 }), heads);
      s.scatter(turned(tail), std('#4a4d52'), tails);
    }
    if (a.lot === 'meadow') {
      // Saplings where the seams have opened widest, out of the way of the doors.
      const bark = std('#6f5a45'), leaf = std(blend('#7fa05a', '#b5a86a', wear * 0.4), { roughness: 1 });
      for (const [deg, d] of [[21, 36], [-21, 30], [-19, 10.5], [22.5, 24], [16, 40]] as const) {
        const [x, z] = along(deg + (random() - 0.5), d + random());
        const h = mix(1.6, 3.6, random()), y0 = PAVE(x, z);
        s.rod([x, y0, z], [x + (random() - 0.5) * 0.3, y0 + h, z + (random() - 0.5) * 0.3], 0.05, bark, 0.02);
        for (let k = 0; k < 4; k++) s.ball([0.5 + random() * 0.4, 0.4 + random() * 0.3, 0.5 + random() * 0.4], [x + (random() - 0.5) * 0.8, y0 + h * mix(0.6, 1.02, random()), z + (random() - 0.5) * 0.8], leaf, 8);
      }
    }

    // ---- Camera and where the cast stands: alone on the fire lane before the doors.
    const camera = new THREE.PerspectiveCamera(FOV, 1, 0.5, 900);
    const slots: { deg: number; d: number; tall: number; wide: number }[] = [
      { deg: -1.5, d: 17.5, tall: 4.3, wide: 2.5 },
      { deg: 13.5, d: 26, tall: 3.9, wide: 2.3 },
      { deg: -15, d: 20.5, tall: 3.3, wide: 1.9 },
      { deg: 20.5, d: 34, tall: 3.6, wide: 1.9 },
    ];
    const place = (items: readonly Placeable[]) => {
      let heroTop = 3;
      items.forEach((item, index) => {
        const slot = slots[index % slots.length];
        const [x, z] = along(slot.deg, slot.d);
        const scale = Math.min(slot.tall / Math.max(item.height, 0.05), slot.wide / Math.max(item.radius, 0.05));
        item.holder.scale.setScalar(scale);
        item.holder.position.set(x, PAVE(x, z), z);
        item.holder.rotation.y = Math.atan2(CAM.x - x, CAM.z - z) + (index % 2 ? 0.45 : -0.4) + (random() - 0.5) * 0.3;
        item.holder.updateMatrixWorld(true);
        if (index === 0) heroTop = visibleBounds(item.holder).max.y;
      });
      camera.position.copy(CAM);
      camera.lookAt(LOOK.x, LOOK.y + Math.max(0, heroTop - 4.3) * 0.2, LOOK.z);
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld(true);
      // The sun stays out over the lot so the long wall is lit; the day swings it left to right.
      key.target.position.set(-6, 0, -4);
      key.position.set(-6 + mix(-34, 30, mood.daylight), sky.sun, a.sky === 'white' || a.sky === 'noon' ? 14 : 26);
      const shadow = key.shadow.camera;
      shadow.left = -46; shadow.right = 46; shadow.top = 46; shadow.bottom = -46;
      shadow.near = 1; shadow.far = 160;
      shadow.updateProjectionMatrix();
    };
    place([]);

    const flicker = flickerMat as THREE.MeshStandardMaterial | null;
    const baseGlow = flicker ? flicker.emissiveIntensity : 0;
    void headMats;
    return {
      object: root, camera, background, capacity: slots.length, ground, keyLight: key, place,
      update: flicker
        ? (_dt, time) => {
            const speed = mix(5, 26, mood.energy);
            flicker.emissiveIntensity = Math.sin(time * speed) * Math.sin(time * speed * 0.37 + 1) > -0.1 ? baseGlow : baseGlow * 0.08;
          }
        : undefined,
      dispose() { key.shadow.map?.dispose(); disposeTree(root); },
    };
  },
});
