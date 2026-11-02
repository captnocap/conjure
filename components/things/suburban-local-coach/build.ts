import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

type Band = readonly [number, number, string];
const LIVERY = {
  maroon: 'Old maroon with a cream window band and a yellow line, decades of repainting.',
  purple: 'White with a purple window band and a magenta stripe, the modern rake.',
  ochre: 'Mustard yellow over chocolate brown, the old western-line colours.',
  steel: 'Bare ribbed stainless steel with a single blue band.',
  green: 'Dark green with a pale grey band, a tired suburban shuttle.',
} as const;
const BANDS: Record<keyof typeof LIVERY, Band[]> = {
  maroon: [[0, 2.5, '#7a2420'], [0.9, 1.78, '#e8d9aa'], [0.84, 0.9, '#e2b22e']],
  purple: [[0, 2.5, '#ecebe6'], [0.9, 1.78, '#5b2d82'], [0.72, 0.8, '#c2327f']],
  ochre: [[0, 2.5, '#e4b53c'], [0, 0.9, '#5d3b25'], [0.9, 0.96, '#f3e6c0']],
  steel: [[0, 2.5, '#c2c8cb'], [1.82, 2.04, '#1f5aa8']],
  green: [[0, 2.5, '#27513d'], [0.9, 1.78, '#c9cdc4'], [1.78, 1.84, '#e2b22e']],
};
const BAG_BRIGHT = ['#d8402f', '#2f7fc8', '#e9a820', '#3c9a5c', '#c2479a', '#30343a', '#ef7a2a', '#7a4a2c'];
const BAG_DULL = ['#5b3a34', '#3c4c60', '#7a6a40', '#44564a', '#30343a', '#6e6258', '#4a4038', '#2a2c30'];

export default defineThing({
  questions: {
    livery: choice('What livery is the coach painted in?', LIVERY),
    marking: choice('What class or compartment is it marked as?', {
      general: 'General second class: a plain II by the doors and nothing else.',
      ladies: 'Ladies compartment: green and yellow diagonal stripes above the windows.',
      first: 'First class: red and yellow diagonal stripes above the windows.',
      split: 'Half first class with red and yellow stripes, half general.',
      luggage: 'Luggage and vendors compartment: grey panels and stencilled LUGGAGE.',
    }),
    crowd: score('How full is it?', ['Empty, straps hanging still over bare floor', 'A few bags on the racks', 'Standing room only, bags on every hook', 'Crammed past the doors, bags hung outside the window bars']),
    rain: choice('What weather shows at the doors?', {
      dry: 'Dry, dusty light.',
      drizzle: 'Wet streaks down the paint and drips off the door frames.',
      downpour: 'Monsoon rain sheeting across the open doorways, the footboards awash.',
    }),
    shutters: score('How many window shutters are pulled down?', ['None, every window open to the bars', 'A few', 'Most', 'All shut tight against the rain']),
    end: choice('Which coach of the train is it?', {
      middle: 'A middle coach with flat ends and buffers.',
      cab: 'The driving coach: a cab end with windscreens, headlights and a destination display.',
    }),
    pantograph: noul('Is it a motor coach with a pantograph raised on the roof?'),
    left: choice('What has been left in a doorway?', {
      nothing: 'Nothing.',
      umbrella: 'A black umbrella hooked on the grab pole, dripping.',
      garland: 'A marigold garland tied round the grab pole.',
      sandal: 'One lost sandal on the footboard.',
    }),
    roofVents: choice('What ventilators run along the roof?', { boxes: 'Five low rectangular ventilator boxes.', cowls: 'Five mushroom-shaped ventilator cowls.', louvres: 'Long louvred ventilation boxes.', rings: 'Low round vent caps.' }),
    windowGuards: choice('What extra metalwork protects the outer windows?', { plain: 'Only the painted original bars.', horizontal: 'Three raised horizontal guard bars.', grid: 'A square raised steel grille.', frames: 'Heavy rectangular guard frames.' }),
    footboard: choice('What tread is on the doorway footboards?', { plain: 'Plain dark metal.', bars: 'Closely spaced transverse tread bars.', mesh: 'A rectangular open grid.', edge: 'A bright yellow edge strip.' }),
    bogieBrace: choice('How is each bogie frame reinforced?', { plain: 'The original straight beams.', cross: 'Diagonal side braces.', springs: 'Paired visible coil springs.', plates: 'Large bolted bearing plates.' }),
    ballast: choice('How is the track bed finished?', { plain: 'A plain compacted bed.', stone: 'Angular pale ballast beside the sleepers.', dark: 'A dark stone bed with a wide shoulder.', sand: 'A light sandy shoulder at the track edge.' }),
    sleepers: choice('What sleepers carry the rails?', { concrete: 'Pale rectangular concrete sleepers.', timber: 'Dark broad wooden sleepers.', twin: 'Paired concrete blocks joined by a narrow tie.', steel: 'Shallow rust-brown pressed steel sleepers.' }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const rnd = (lo: number, hi: number) => mix(lo, hi, random());
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];

    const Lc = 12.5, Wc = 3.0, base = 1.25, bodyH = 2.5, top = base + bodyH;
    const doors = [-4, 0, 4], doorW = 1.5, doorH = 1.95;
    const wet = a.rain !== 'dry';
    const lightsOn = mood.daylight < 0.22 || mood.daylight > 0.78;
    const bands = BANDS[a.livery];
    const body = new THREE.Group();
    s.root.add(body);
    const B = <T extends THREE.Object3D>(node: T) => { body.add(node); return node; };

    const steel = s.material('#c9cdcd', { metalness: 0.8, roughness: 0.3 });
    const under = s.material('#2c2b2a', { roughness: 0.85 });
    const interior = s.material(lightsOn ? '#d8c79a' : '#35332e', { roughness: 0.8, ...(lightsOn ? { emissive: '#ffd98a', emissiveIntensity: 0.4 } : {}) });
    const roofMaterial = s.material(new THREE.Color('#9a9d98').lerp(new THREE.Color('#5c5a54'), mood.wear * 0.6), { roughness: wet ? 0.35 : 0.8, metalness: 0.2 });
    const yellow = s.material('#e9c21f', { roughness: 0.5 });
    const textures: THREE.Texture[] = [];

    // ---- painted side ------------------------------------------------------
    const ppm = 2048 / Lc, CH = Math.round(bodyH * ppm);
    const X = (x: number) => (x + Lc / 2) * ppm, Y = (y: number) => (bodyH - y) * ppm;
    const windows: { x: number; w: number }[] = [{ x: -5.5, w: 0.85 }, { x: 5.5, w: 0.85 }, { x: -2.65, w: 0.9 }, { x: -1.35, w: 0.9 }, { x: 1.35, w: 0.9 }, { x: 2.65, w: 0.9 }];
    const paintBands = (ctx: CanvasRenderingContext2D, width: number, scale: number, height: number) => {
      for (const [y0, y1, colour] of bands) { ctx.fillStyle = colour; ctx.fillRect(0, height - y1 * scale, width, (y1 - y0) * scale); }
      if (a.livery === 'steel') { ctx.fillStyle = 'rgba(60,70,76,0.35)'; for (let y = 0.08; y < 0.9; y += 0.09) ctx.fillRect(0, height - y * scale, width, 2); }
    };
    const weather = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
      const grime = ctx.createLinearGradient(0, height, 0, height * 0.55);
      grime.addColorStop(0, `rgba(70,52,36,${0.2 + mood.wear * 0.6})`); grime.addColorStop(1, 'rgba(70,52,36,0)');
      ctx.fillStyle = grime; ctx.fillRect(0, 0, width, height);
      for (let i = 0; i < 10 + mood.wear * 90; i++) {
        ctx.fillStyle = random() < 0.6 ? `rgba(96,54,28,${rnd(0.15, 0.5)})` : `rgba(30,28,26,${rnd(0.1, 0.35)})`;
        ctx.fillRect(random() * width, random() * height * 0.8, rnd(2, 7), rnd(20, 150) * (0.4 + mood.wear));
      }
      if (wet) {
        for (let i = 0; i < (a.rain === 'downpour' ? 260 : 110); i++) { ctx.fillStyle = `rgba(235,245,250,${rnd(0.1, 0.32)})`; ctx.fillRect(random() * width, random() * height, 1.5, rnd(20, 120)); }
        ctx.fillStyle = 'rgba(20,30,40,0.12)'; ctx.fillRect(0, 0, width, height);
      }
    };
    const sideCanvas = document.createElement('canvas');
    sideCanvas.width = 2048; sideCanvas.height = CH;
    {
      const ctx = sideCanvas.getContext('2d')!;
      paintBands(ctx, 2048, ppm, CH);
      // Class stripes above the windows.
      const striped = a.marking === 'ladies' || a.marking === 'first' || a.marking === 'split';
      if (striped) {
        const [c0, c1] = a.marking === 'ladies' ? ['#2f8a4a', '#f2cf2e'] : ['#c8281f', '#f2cf2e'];
        const from = a.marking === 'split' ? 0 : -Lc / 2;
        ctx.save();
        ctx.beginPath(); ctx.rect(X(from), Y(2.46), X(Lc / 2) - X(from), Y(1.86) - Y(2.46)); ctx.clip();
        for (let i = -4; i < 90; i++) {
          ctx.fillStyle = i % 2 ? c0 : c1;
          const x = X(from) + i * 0.26 * ppm;
          ctx.beginPath(); ctx.moveTo(x, Y(1.86)); ctx.lineTo(x + 0.26 * ppm, Y(1.86)); ctx.lineTo(x + 0.26 * ppm + 0.6 * ppm, Y(2.46)); ctx.lineTo(x + 0.6 * ppm, Y(2.46)); ctx.fill();
        }
        ctx.restore();
      }
      if (a.marking === 'luggage') {
        ctx.fillStyle = '#6f7476';
        for (const bay of [-2, 2]) ctx.fillRect(X(bay - 1.3), Y(0.86), 2.6 * ppm, 0.82 * ppm);
      }
      // Windows with bars and shutters.
      for (const win of windows) {
        const x0 = X(win.x - win.w / 2), y0 = Y(1.7), w = win.w * ppm, h = 0.72 * ppm;
        ctx.fillStyle = '#23211f'; ctx.fillRect(x0 - 5, y0 - 5, w + 10, h + 10);
        ctx.fillStyle = lightsOn ? '#d7c487' : '#1a2221'; ctx.fillRect(x0, y0, w, h);
        const down = random() < a.shutters ? (a.shutters > 0.95 ? 1 : rnd(0.45, 1)) : 0;
        if (down > 0) {
          ctx.fillStyle = '#8b918c'; ctx.fillRect(x0, y0, w, h * down);
          ctx.fillStyle = '#5d625e'; for (let y = 4; y < h * down; y += 9) ctx.fillRect(x0, y0 + y, w, 3);
        }
        ctx.fillStyle = '#c3c7c2'; for (let i = 1; i <= 4; i++) ctx.fillRect(x0, y0 + (i / 5) * h - 2, w, 4);
      }
      // Lettering beside the doors.
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const label = (x: number, y: number, text: string, size: number, colour: string, plate?: string) => {
        ctx.font = `bold ${size}px sans-serif`;
        if (plate) { const w = ctx.measureText(text).width + 22; ctx.fillStyle = plate; ctx.fillRect(X(x) - w / 2, Y(y) - size * 0.65, w, size * 1.3); }
        ctx.fillStyle = colour; ctx.fillText(text, X(x), Y(y));
      };
      const mark = (x: number, kind: string) => {
        if (kind === 'ladies') label(x, 2.16, 'LADIES', 44, '#ffffff', '#2f8a4a');
        else if (kind === 'first') label(x, 2.16, 'I', 60, '#c8281f', '#f6efd6');
        else if (kind === 'luggage') label(x, 1.25, 'LUGGAGE', 46, '#f4f1e6');
        else label(x, 2.16, 'II', 54, '#1f1d1b', '#f6efd6');
      };
      for (const x of [-2, 2]) mark(x, a.marking === 'split' ? (x > 0 ? 'first' : 'general') : a.marking);
      const number = `${pick(['WR', 'CR'])} ${1000 + Math.floor(random() * 8999)} ${pick(['A', 'B', 'C', 'D'])}`;
      label(-5.5, 0.5, number, 30, a.livery === 'purple' || a.livery === 'steel' ? '#1f1d1b' : '#f4ecd0');
      label(5.5, 0.5, number, 30, a.livery === 'purple' || a.livery === 'steel' ? '#1f1d1b' : '#f4ecd0');
      weather(ctx, 2048, CH);
    }
    const sideTexture = new THREE.CanvasTexture(sideCanvas);
    sideTexture.colorSpace = THREE.SRGBColorSpace; sideTexture.anisotropy = 4;
    textures.push(sideTexture);
    const sideMaterial = new THREE.MeshStandardMaterial({ map: sideTexture, roughness: wet ? 0.3 : 0.6, metalness: a.livery === 'steel' ? 0.45 : 0.1 });

    const panel = (x0: number, x1: number, y0: number, y1: number) => {
      for (const side of [1, -1]) {
        const box = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, 0.08), interior);
        box.position.set((x0 + x1) / 2, base + (y0 + y1) / 2, side * (Wc / 2 - 0.04));
        box.castShadow = box.receiveShadow = true;
        const geometry = new THREE.PlaneGeometry(x1 - x0, y1 - y0);
        const uv = geometry.attributes.uv;
        // The far side is the same painting seen from behind, so lettering still reads.
        const [ua, ub] = side > 0 ? [x0, x1] : [-x1, -x0];
        for (let i = 0; i < uv.count; i++) uv.setXY(i, ((ua + (ub - ua) * uv.getX(i)) + Lc / 2) / Lc, (y0 + (y1 - y0) * uv.getY(i)) / bodyH);
        const skin = new THREE.Mesh(geometry, sideMaterial);
        skin.position.set((x0 + x1) / 2, base + (y0 + y1) / 2, side * (Wc / 2 + 0.002));
        if (side < 0) skin.rotation.y = Math.PI;
        skin.receiveShadow = true;
        body.add(box, skin);
      }
    };
    const edges = [-Lc / 2, ...doors.flatMap((x) => [x - doorW / 2, x + doorW / 2]), Lc / 2];
    for (let i = 0; i < edges.length; i += 2) panel(edges[i], edges[i + 1], 0, bodyH);
    for (const x of doors) panel(x - doorW / 2, x + doorW / 2, doorH, bodyH);

    // ---- ends --------------------------------------------------------------
    const endFace = (cab: boolean) => {
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 512;
      const ctx = canvas.getContext('2d')!;
      const sc = 512 / Wc, hh = bodyH * sc;
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 512, 512);
      ctx.save(); ctx.translate(0, 512 - hh);
      paintBands(ctx, 512, sc, hh);
      const Ex = (x: number) => (x + Wc / 2) * sc, Ey = (y: number) => hh - y * sc;
      if (cab) {
        ctx.fillStyle = '#e9c21f'; ctx.fillRect(0, Ey(0.95), 512, 0.95 * sc);
        ctx.save(); ctx.beginPath(); ctx.rect(0, Ey(0.34), 512, 0.34 * sc); ctx.clip();
        ctx.fillStyle = '#1b1a19'; for (let i = -2; i < 14; i++) { ctx.beginPath(); ctx.moveTo(i * 44, Ey(0)); ctx.lineTo(i * 44 + 22, Ey(0)); ctx.lineTo(i * 44 + 60, Ey(0.34)); ctx.lineTo(i * 44 + 38, Ey(0.34)); ctx.fill(); }
        ctx.restore();
        for (const x of [-0.82, 0.82]) {
          ctx.fillStyle = '#22211f'; ctx.fillRect(Ex(x - 0.52), Ey(1.95), 1.04 * sc, 0.86 * sc);
          ctx.fillStyle = lightsOn ? '#54605c' : '#18201f'; ctx.fillRect(Ex(x - 0.47), Ey(1.9), 0.94 * sc, 0.76 * sc);
          ctx.strokeStyle = '#8d9390'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(Ex(x - 0.1), Ey(1.2)); ctx.lineTo(Ex(x + 0.3), Ey(1.7)); ctx.stroke();
          ctx.fillStyle = '#fff7d0'; ctx.beginPath(); ctx.arc(Ex(x * 1.2), Ey(0.62), 0.13 * sc, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#c8281f'; ctx.beginPath(); ctx.arc(Ex(x * 0.72), Ey(0.62), 0.08 * sc, 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = '#0c0c0b'; ctx.fillRect(Ex(-0.75), Ey(2.42), 1.5 * sc, 0.36 * sc);
        ctx.fillStyle = '#ffb21e'; ctx.font = 'bold 50px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(`${pick(['VR', 'BO', 'CCG', 'TNA', 'KYN', 'PNVL'])} ${pick(['F', 'S'])}`, 256, Ey(2.23));
        ctx.fillStyle = '#0c0c0b'; for (let y = Ey(2.42); y < Ey(2.06); y += 6) ctx.fillRect(Ex(-0.75), y, 1.5 * sc, 2);
      } else {
        ctx.fillStyle = '#23211f'; ctx.fillRect(Ex(-0.45), Ey(1.95), 0.9 * sc, 1.95 * sc);
        ctx.fillStyle = '#3d3a36'; ctx.fillRect(Ex(-0.38), Ey(1.88), 0.76 * sc, 1.8 * sc);
        ctx.fillStyle = '#e9c21f'; for (const x of [-1.3, 1.3]) ctx.fillRect(Ex(x) - 4, Ey(1.8), 8, 1.3 * sc);
      }
      weather(ctx, 512, hh);
      ctx.restore();
      const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; textures.push(texture);
      const material = new THREE.MeshStandardMaterial({ map: texture, roughness: wet ? 0.3 : 0.6 });
      if (cab) { material.emissive = new THREE.Color('#ffffff'); material.emissiveMap = texture; material.emissiveIntensity = 0.22; }
      return material;
    };
    for (const side of [1, -1]) {
      const cab = a.end === 'cab' && side > 0;
      B(s.box([0.08, bodyH, Wc], [side * (Lc / 2 - 0.04), base + bodyH / 2, 0], interior));
      const face = B(s.mesh(new THREE.PlaneGeometry(Wc, Wc), endFace(cab), [side * (Lc / 2 + 0.003), base + Wc / 2, 0]));
      face.rotation.y = side * Math.PI / 2;
      // Buffers and a coupler.
      for (const z of [-0.85, 0.85]) {
        B(s.cylinder(0.07, 0.07, 0.34, [side * (Lc / 2 + 0.17), base - 0.12, z], under, 10)).rotation.z = Math.PI / 2;
        B(s.cylinder(0.2, 0.2, 0.05, [side * (Lc / 2 + 0.36), base - 0.12, z], under, 16)).rotation.z = Math.PI / 2;
      }
      B(s.box([0.4, 0.16, 0.2], [side * (Lc / 2 + 0.2), base - 0.22, 0], under));
      if (cab) B(s.box([0.1, 0.14, Wc * 0.9], [side * (Lc / 2 + 0.06), base - 0.02, 0], yellow));
    }

    // ---- roof, floor, underframe ------------------------------------------
    const arc = new THREE.Shape();
    arc.moveTo(-Wc / 2 - 0.04, 0); arc.quadraticCurveTo(-Wc / 2, 0.36, 0, 0.42); arc.quadraticCurveTo(Wc / 2, 0.36, Wc / 2 + 0.04, 0); arc.closePath();
    const roofGeometry = new THREE.ExtrudeGeometry(arc, { depth: Lc + 0.1, bevelEnabled: false, curveSegments: 10 });
    roofGeometry.rotateY(Math.PI / 2); roofGeometry.translate(-Lc / 2 - 0.05, 0, 0);
    B(s.mesh(roofGeometry, roofMaterial, [0, top, 0]));
    for(let i=0;i<5;i++){const x=-Lc/2+1.2+i*(Lc-2.4)/4;
      if(a.roofVents==='boxes')B(s.box([.5,.12,.34],[x,top+.44,0],roofMaterial));
      else if(a.roofVents==='cowls'){B(s.cylinder(.085,.085,.16,[x,top+.45,0],roofMaterial,12));B(s.cylinder(.22,.18,.07,[x,top+.565,0],roofMaterial,16));}
      else if(a.roofVents==='rings')B(s.cylinder(.18,.2,.075,[x,top+.4175,0],roofMaterial,16));
      else{B(s.box([.7,.16,.36],[x,top+.46,0],roofMaterial));for(let j=0;j<7;j++)B(s.box([.035,.012,.3],[x-.27+j*.09,top+.545,0],under));}
    }
    for (const z of [-1, 1]) B(s.box([Lc, 0.04, 0.05], [0, top + 0.02, z * (Wc / 2 + 0.04)], roofMaterial)); // rain gutter
    B(s.box([Lc, 0.1, Wc - 0.02], [0, base + 0.02, 0], s.material(lightsOn ? '#8a7648' : '#242321', { roughness: wet ? 0.35 : 0.9, ...(lightsOn ? { emissive: '#ffcf70', emissiveIntensity: 0.3 } : {}) })));
    B(s.box([Lc - 0.1, 0.05, Wc - 0.1], [0, top - 0.03, 0], interior));
    B(s.box([Lc - 0.3, 0.26, Wc - 0.3], [0, base - 0.16, 0], under));
    for (const [x, w] of [[-1.6, 1.5], [0.3, 1.1], [1.7, 0.9]] as const) B(s.box([w, 0.5, 0.8], [x, base - 0.5, pick([-0.8, 0.8])], under));
    B(s.cylinder(0.24, 0.24, 1.6, [-0.2, base - 0.52, -0.75], under, 12)).rotation.z = Math.PI / 2;

    // ---- doorways: footboards, handles, the centre pole, partitions --------
    const straps: THREE.Object3D[] = [];
    const strapMaterial = s.material('#d8d2c0', { roughness: 0.6 });
    const strapGeo = new THREE.TorusGeometry(0.055, 0.012, 5, 3);
    const bagColours = mood.cheer > 0.5 ? BAG_BRIGHT : BAG_DULL;
    const bag = (at: [number, number, number], size = 1) => {
      const kind = random();
      const material = s.material(pick(bagColours), { roughness: 0.9 });
      const mesh = kind < 0.5 ? s.ball([0.17 * size, 0.2 * size, 0.11 * size], at, material, 10) : s.box([0.3 * size, 0.24 * size, 0.12 * size], at, material);
      mesh.rotation.z = rnd(-0.2, 0.2);
      return B(mesh);
    };
    const railY = base + 2.2;
    for (const x of doors) {
      for (const side of [1, -1]) {
        const z = side * (Wc / 2);
        B(s.box([doorW + 0.2, 0.05, 0.26], [x, base - 0.06, z + side * 0.1], under));
        for (const dx of [-1, 1]) B(s.rod([x + dx * (doorW / 2 + 0.08), base + 0.75, z + side * 0.05], [x + dx * (doorW / 2 + 0.08), base + 1.75, z + side * 0.05], 0.022, yellow));
        B(s.rod([x, base + 0.05, z - side * 0.12], [x, base + doorH, z - side * 0.12], 0.028, steel));
        B(s.box([doorW, 0.06, 0.1], [x, base + doorH + 0.03, z + side * 0.03], yellow));
      }
      // Partitions flanking the vestibule and a bench behind each.
      for (const dx of [-1, 1]) for (const side of [1, -1]) {
        B(s.box([0.05, 1.25, 0.95], [x + dx * (doorW / 2 + 0.03), base + 0.7, side * (Wc / 2 - 0.55)], interior));
      }
      // Two overhead rails across the vestibule, hung with straps.
      for (const z of [-0.45, 0.45]) {
        B(s.rod([x - doorW / 2 - 0.5, railY + 0.15, z], [x + doorW / 2 + 0.5, railY + 0.15, z], 0.016, steel));
        for (let i = 0; i < 3; i++) {
          const hanger = new THREE.Group();
          hanger.position.set(x - 0.6 + i * 0.6 + rnd(-0.04, 0.04), railY + 0.15, z);
          const strap = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.2, 0.008), under); strap.position.y = -0.1;
          const loop = new THREE.Mesh(strapGeo, strapMaterial); loop.position.y = -0.25; loop.rotation.z = Math.PI / 2;
          hanger.add(strap, loop);
          hanger.userData.phase = random() * 6.28;
          body.add(hanger); straps.push(hanger);
        }
      }
      // The implied crowd: bags hung in the doorway at shoulder height.
      const hung = Math.round(a.crowd * 7 + (a.crowd > 0.15 ? rnd(-1, 1) : 0));
      for (let i = 0; i < hung; i++) {
        const bx = x + rnd(-0.52, 0.52), bz = pick([1, -1]) * rnd(Wc / 2 - 0.7, Wc / 2 - 0.12), by = base + rnd(0.95, 1.55);
        bag([bx, by, bz], rnd(0.9, 1.25));
        if (i % 2 === 0) B(s.rod([bx, by + 0.18, bz], [bx, railY + 0.15, bz * 0.6], 0.008, under));
      }
      if (a.crowd > 0.7) for (const side of [1, -1]) {
        // Past the doors: sacks on the footboard edge and a bag swinging outside the handle.
        const sack = B(s.ball([0.2, 0.26, 0.16], [x + rnd(-0.3, 0.3), base + 0.24, side * (Wc / 2 - 0.02)], s.material('#b59a6a', { roughness: 1 }), 10));
        sack.rotation.z = rnd(-0.3, 0.3);
        bag([x + pick([-1, 1]) * (doorW / 2 + 0.1), base + 1.05, side * (Wc / 2 + 0.16)], 1.1);
      }
    }
    // Bags hooked outside the window bars when it is crammed.
    for (const win of windows) for (const side of [1, -1]) {
      if (random() < Math.max(0, a.crowd - 0.45) * 1.6) {
        const bx = win.x + rnd(-0.25, 0.25);
        bag([bx, base + 1.0, side * (Wc / 2 + 0.11)], rnd(0.9, 1.2));
        B(s.rod([bx, base + 1.18, side * (Wc / 2 + 0.11)], [bx, base + 1.4, side * (Wc / 2 + 0.01)], 0.008, under));
      }
    }
    // Interior gloom (or lamplight) so the open doorways read as openings, not as the ground beyond.
    const gloom = new THREE.MeshStandardMaterial(lightsOn
      ? { color: '#e8c477', emissive: '#ffcf70', emissiveIntensity: 0.7, transparent: true, opacity: 0.6, depthWrite: false, side: THREE.DoubleSide }
      : { color: '#15171a', transparent: true, opacity: 0.72, depthWrite: false, side: THREE.DoubleSide, roughness: 1 });
    const shade = new THREE.Mesh(new THREE.PlaneGeometry(Lc - 0.3, bodyH - 0.2), gloom);
    shade.position.set(0, base + bodyH / 2, 0);
    body.add(shade);
    // Interior tube lights.
    if (lightsOn) for (const x of [-5, -2, 2, 5]) B(s.box([1.2, 0.04, 0.08], [x, top - 0.08, 0], s.material('#fff6d2', { emissive: '#fff2c0', emissiveIntensity: 1.3 })));

    // Something left in the middle doorway.
    const lz = Wc / 2 - 0.12;
    if (a.left === 'umbrella') {
      B(s.rod([0.05, base + 1.5, lz + 0.06], [0.1, base + 0.75, lz + 0.1], 0.03, s.material('#17171a', { roughness: 0.7 }), 0.012));
      B(s.ring(0.045, 0.01, [0.05, base + 1.54, lz + 0.06], s.material('#6b4a2c'), Math.PI));
    } else if (a.left === 'garland') {
      const beads: { at: [number, number, number]; size: number; color: string }[] = [];
      for (let i = 0; i < 26; i++) { const t = (i / 26) * Math.PI * 2; beads.push({ at: [Math.cos(t) * 0.07, base + 1.25 - (i > 13 ? (i - 13) * 0.018 : 0) + Math.sin(t) * 0.02, lz + Math.sin(t) * 0.07], size: 1, color: i % 3 ? '#f59a1b' : '#f7c21d' }); }
      for (let i = 0; i < 14; i++) beads.push({ at: [0.05, base + 1.2 - i * 0.04, lz + 0.07], size: 1, color: i % 3 ? '#f59a1b' : '#f7c21d' });
      B(s.scatter(new THREE.SphereGeometry(0.028, 7, 5), s.material('#ffffff'), beads));
    } else if (a.left === 'sandal') {
      const sandal = B(s.box([0.1, 0.02, 0.26], [0.3, base - 0.025, Wc / 2 + 0.12], s.material('#3a66b0', { roughness: 0.8 })));
      sandal.rotation.y = 0.7;
      B(s.ring(0.04, 0.008, [0.32, base - 0.01, Wc / 2 + 0.16], s.material('#f1eee4'), Math.PI)).rotation.y = 0.7;
    }

    // ---- pantograph --------------------------------------------------------
    if (a.pantograph) {
      const px = -2.6, py = top + 0.5;
      for (const z of [-0.5, 0.5]) for (const dx of [-0.5, 0.5]) B(s.cylinder(0.05, 0.07, 0.16, [px + dx, py, z], s.material('#8a4a2c'), 8));
      B(s.box([1.2, 0.05, 1.1], [px, py + 0.1, 0], under));
      for (const z of [-0.4, 0.4]) {
        B(s.rod([px - 0.5, py + 0.12, z], [px + 0.35, py + 0.7, z * 0.6], 0.025, under));
        B(s.rod([px + 0.35, py + 0.7, z * 0.6], [px - 0.2, py + 1.25, z * 0.5], 0.02, under));
      }
      B(s.rod([px + 0.35, py + 0.7, -0.3], [px + 0.35, py + 0.7, 0.3], 0.02, under));
      for (const dx of [-0.12, 0.12]) B(s.box([0.05, 0.035, 1.5], [px - 0.2 + dx, py + 1.27, 0], steel));
      B(s.box([0.9, 0.3, 0.6], [px + 1.6, top + 0.5, 0], under));
    }

    // ---- bogies, wheels and a length of track ------------------------------
    const railTop = 0.3, wheelR = 0.45, gauge = 0.84;
    for (const bx of [-4.1, 4.1]) {
      s.box([2.6, 0.22, 2.0], [bx, railTop + wheelR + 0.08, 0], under);
      for (const dx of [-0.85, 0.85]) {
        s.cylinder(0.07, 0.07, 2.1, [bx + dx, railTop + wheelR, 0], steel, 8).rotation.x = Math.PI / 2;
        for (const z of [-gauge, gauge]) {
          s.cylinder(wheelR, wheelR, 0.13, [bx + dx, railTop + wheelR, z], under, 20).rotation.x = Math.PI / 2;
          s.cylinder(wheelR * 0.55, wheelR * 0.55, 0.15, [bx + dx, railTop + wheelR, z + Math.sign(z) * 0.01], steel, 14).rotation.x = Math.PI / 2;
        }
      }
      for (const z of [-1.02, 1.02]) { s.box([1.9, 0.14, 0.08], [bx, railTop + wheelR, z], under); s.cylinder(0.11, 0.11, 0.3, [bx, railTop + wheelR + 0.22, z], steel, 8); }
    }
    const trackL = Lc + 1.4;
    s.box([trackL, 0.06, 3.3], [0, 0.03, 0], s.material(wet ? '#4a4742' : '#6a655c', { roughness: wet ? 0.5 : 1 }));
    const sleepers: { at: [number, number, number]; size: number }[] = [];
    for (let i = 0; i < 24; i++) sleepers.push({ at: [-trackL / 2 + 0.3 + i * (trackL - 0.6) / 23, 0.11, 0], size: 1 });
    if(a.sleepers==='twin'){
      const blocks=sleepers.flatMap(p=>[-gauge,gauge].map(z=>({at:[p.at[0],.11,z]as[number,number,number],size:1})));s.scatter(new THREE.BoxGeometry(.3,.12,.6),s.material('#a9a69b'),blocks);s.scatter(new THREE.BoxGeometry(.1,.05,2.2),steel,sleepers);
    }else s.scatter(new THREE.BoxGeometry(a.sleepers==='timber'?.32:.26,a.sleepers==='steel'?.08:.12,2.6),s.material(a.sleepers==='timber'?'#655440':a.sleepers==='steel'?'#8c6248':'#8b877c',{roughness:.85}),sleepers.map(p=>({...p,at:[p.at[0],a.sleepers==='steel'?.13:p.at[1],p.at[2]]as[number,number,number]})));
    const railMaterial = s.material('#6a5648', { metalness: 0.6, roughness: 0.45 });
    for (const z of [-gauge, gauge]) { s.box([trackL, 0.13, 0.07], [0, 0.235, z], railMaterial); s.box([trackL, 0.02, 0.075], [0, railTop - 0.005, z], steel); }

    if(a.windowGuards!=='plain')for(const side of[-1,1])for(const win of windows){
      const z=side*(Wc/2+.025),y=base+1.34;
      if(a.windowGuards==='frames'){for(const dx of[-1,1])B(s.box([.035,.78,.035],[win.x+dx*win.w/2,y,z],steel));for(const dy of[-.39,.39])B(s.box([win.w,.035,.035],[win.x,y+dy,z],steel));}
      else{for(const dy of[-.25,0,.25])B(s.rod([win.x-win.w/2,y+dy,z],[win.x+win.w/2,y+dy,z],.012,steel));if(a.windowGuards==='grid')for(const dx of[-.27,0,.27])B(s.rod([win.x+dx,y-.36,z],[win.x+dx,y+.36,z],.01,steel));}
    }
    if(a.footboard!=='plain')for(const x of doors)for(const side of[-1,1]){
      const z=side*(Wc/2+.1),y=base-.031;
      if(a.footboard==='edge')B(s.box([doorW+.2,.008,.045],[x,y,z+side*.12],yellow));
      else{for(let i=0;i<17;i++)B(s.box([.018,.006,.23],[x-doorW/2+i*doorW/16,y,z],steel));if(a.footboard==='mesh')for(const dz of[-.08,0,.08])B(s.box([doorW+.16,.006,.012],[x,y+.005,z+dz],steel));}
    }
    if(a.bogieBrace!=='plain')for(const x of[-4.1,4.1])for(const z of[-1.08,1.08]){
      if(a.bogieBrace==='cross')for(const sign of[-1,1])s.rod([x-.85,railTop+wheelR+sign*.16,z],[x+.85,railTop+wheelR-sign*.16,z],.025,steel);
      else if(a.bogieBrace==='springs')for(const dx of[-.48,.48])for(let i=0;i<6;i++)s.ring(.09,.012,[x+dx,railTop+wheelR+.04+i*.036,z],steel).rotation.x=Math.PI/2;
      else for(const dx of[-.85,.85]){s.box([.26,.24,.045],[x+dx,railTop+wheelR,z],steel);for(const dz of[-.07,.07])for(const dy of[-.07,.07])s.ball([.025,.025,.018],[x+dx+dz,railTop+wheelR+dy,z+Math.sign(z)*.03],under,8);}
    }
    if(a.ballast!=='plain'){
      if(a.ballast==='stone'){
        const stones:{at:[number,number,number];size:number;color:string}[]=[];for(let i=0;i<240;i++){const side=i%2?1:-1;stones.push({at:[-trackL/2+.1+random()*(trackL-.2),.075,side*(1.31+random()*.25)],size:.045+random()*.025,color:i%3?'#a2a49b':'#c3bfae'});}s.scatter(new THREE.IcosahedronGeometry(1,0),s.material('#ffffff'),stones);
      }else for(const side of[-1,1])s.box([trackL,.035,.38],[0,.0175,side*1.62],s.material(a.ballast==='sand'?'#bead86':'#393d39'));
    }

    // ---- rain across the doorways -----------------------------------------
    const drops: THREE.InstancedMesh[] = [];
    let fall = 0;
    const dropSeeds: { x: number; z: number; y: number; h: number }[] = [];
    if (wet) {
      const count = a.rain === 'downpour' ? 150 : 36;
      for (let i = 0; i < count; i++) {
        const door = pick(doors);
        dropSeeds.push({ x: door + rnd(-doorW / 2, doorW / 2), z: pick([1, -1]) * (Wc / 2 + rnd(0.04, 0.3)), y: random(), h: rnd(0.12, 0.4) });
      }
      const rainMaterial = new THREE.MeshStandardMaterial({ color: '#eef6fa', transparent: true, opacity: a.rain === 'downpour' ? 0.5 : 0.4, depthWrite: false, roughness: 0.2 });
      const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.012, 1, 0.012), rainMaterial, count);
      body.add(mesh); drops.push(mesh);
      // Sheets of water off the gutter over each door in a downpour, and puddles on the footboards.
      if (a.rain === 'downpour') for (const x of doors) for (const side of [1, -1]) {
        const sheet = new THREE.Mesh(new THREE.PlaneGeometry(doorW, top - base + 0.1), new THREE.MeshStandardMaterial({ color: '#dfeef5', transparent: true, opacity: 0.14, depthWrite: false, side: THREE.DoubleSide }));
        sheet.position.set(x, base + (top - base) / 2, side * (Wc / 2 + 0.09));
        body.add(sheet);
      }
    }
    const matrix = new THREE.Matrix4();
    const placeRain = () => {
      for (const mesh of drops) {
        dropSeeds.forEach((d, i) => {
          const u = (d.y + fall) % 1;
          matrix.makeScale(1, d.h, 1).setPosition(d.x, top - u * (top - base + 0.2), d.z);
          mesh.setMatrixAt(i, matrix);
        });
        mesh.instanceMatrix.needsUpdate = true;
      }
    };
    placeRain();

    // Consolidate rigid untextured pieces within each moving frame. The body
    // still sways and every hanging strap keeps its independent animation.
    const removedGeometry=new Set<THREE.BufferGeometry>();
    const compact=(parent:THREE.Object3D)=>{
      parent.updateMatrixWorld(true);const before=new THREE.Box3().setFromObject(parent,true);
      const groups=new Map<THREE.Material,Map<string,THREE.Mesh[]>>();
      for(const child of parent.children){const mesh=child as THREE.Mesh;if(!mesh.isMesh||(mesh as THREE.InstancedMesh).isInstancedMesh||Array.isArray(mesh.material))continue;const material=mesh.material as THREE.MeshStandardMaterial;if(material.map||material.transparent)continue;
        const flags=String(mesh.castShadow)+String(mesh.receiveShadow),bucket=groups.get(material)??new Map<string,THREE.Mesh[]>(),list=bucket.get(flags)??[];list.push(mesh);bucket.set(flags,list);groups.set(material,bucket);
      }
      for(const[material,bucket]of groups)for(const list of bucket.values())if(list.length>1){
        const parts=list.map(mesh=>{mesh.updateMatrix();const clone=mesh.geometry.clone(),geometry=clone.index?clone.toNonIndexed():clone;if(geometry!==clone)clone.dispose();for(const name of Object.keys(geometry.attributes))if(name!=='position'&&name!=='normal')geometry.deleteAttribute(name);geometry.applyMatrix4(mesh.matrix);return geometry;});
        const geometry=mergeGeometries(parts);if(!geometry)throw new Error('Coach static merge failed');const merged=new THREE.Mesh(geometry,material);merged.castShadow=list[0].castShadow;merged.receiveShadow=list[0].receiveShadow;
        for(const mesh of list){removedGeometry.add(mesh.geometry);parent.remove(mesh);}parent.add(merged);for(const part of parts)part.dispose();
      }
      parent.updateMatrixWorld(true);const after=new THREE.Box3().setFromObject(parent,true);if(before.min.distanceTo(after.min)>1e-5||before.max.distanceTo(after.max)>1e-5)throw new Error('Coach compaction changed bounds');
    };
    compact(body);compact(s.root);
    const retainedGeometry=new Set<THREE.BufferGeometry>();s.root.traverse(node=>{if((node as THREE.Mesh).isMesh)retainedGeometry.add((node as THREE.Mesh).geometry);});for(const geometry of removedGeometry)if(!retainedGeometry.has(geometry))geometry.dispose();

    const sway = mix(0, 0.012, mood.energy), swing = mix(0.03, 0.4, mood.energy);
    const move = (time: number) => {
      body.rotation.x = Math.sin(time * 1.7) * sway;
      for (const hanger of straps) hanger.rotation.z = Math.sin(time * 3.1 + hanger.userData.phase) * swing * 0.4 + Math.sin(time * 1.7) * swing;
    };
    move(rnd(0, 10));
    const thing = s.finish({ update: (dt, time) => { fall += dt * mix(1.2, 3, mood.energy); if (wet) placeRain(); move(time); } });
    return { ...thing, dispose: () => { thing.dispose(); for (const t of textures) t.dispose(); sideMaterial.dispose(); } };
  },
});
