import * as THREE from 'three';
import { type Placeable, Sculpture, choice, defineWorld, disposeTree, mix, score, visibleBounds } from '@conjure/kit';

type P = [number, number, number];
type Draw = (g: CanvasRenderingContext2D, w: number, h: number) => void;

const TIMES = {
  morning: 'Grey morning: cold white daylight in the frosted glass, the hall flat and exposed.',
  afternoon: 'Late afternoon: the glass burns amber and a bar of gold light lies down the path.',
  evening: 'Evening: the glass has gone blue and one bare bulb is on under a fringed shade.',
  streetlight: 'Night: only the orange of a street lamp through the glass, the piles in dusk.',
} as const;
const LIGHT: Record<keyof typeof TIMES, { glass: string; glow: number; hemi: number; sky: string; under: string; key: string; power: number; bulb: boolean; beam: number; wall: number }> = {
  morning: { glass: '#eaf3ff', glow: 1.0, hemi: 1.55, sky: '#f1f4ff', under: '#8d877b', key: '#f2f5ff', power: 1.7, bulb: false, beam: 0.3, wall: 1 },
  afternoon: { glass: '#ffd48a', glow: 1.3, hemi: 1.35, sky: '#fff0d4', under: '#8b7a64', key: '#ffd7a4', power: 2.0, bulb: false, beam: 0.5, wall: 0.97 },
  evening: { glass: '#8ea2da', glow: 0.6, hemi: 1.1, sky: '#ffe4bf', under: '#716b66', key: '#ffcd92', power: 1.9, bulb: true, beam: 0.1, wall: 0.9 },
  streetlight: { glass: '#ffa044', glow: 1.05, hemi: 0.9, sky: '#bcc3e2', under: '#5f5c68', key: '#c6cdf0', power: 0.95, bulb: false, beam: 0.4, wall: 0.78 },
};

export default defineWorld({
  questions: {
    hoard: choice('What is the hoard mostly made of?', {
      paper: 'Paper: tied newspapers, magazines and boxes of post, yellow and brown.',
      bags: 'Bags: black bin bags and carrier bags of clothes, soft slumped walls.',
      boxes: 'Boxes: parcels and packaging, most never opened, cardboard cliffs.',
      everything: 'Everything: furniture, lamps, a television, suitcases, a whole life stacked sideways.',
    }),
    depth: score('How high has it risen?', ['Ankle deep along the skirting', 'Waist high', 'Shoulder high', 'To the ceiling: the path is a tunnel']),
    time: choice('What light is in the hall?', TIMES),
    door: choice('What is the front door like?', {
      victorian: 'A Victorian four-panel door with two tall frosted panes and a fanlight above.',
      stained: 'A door with a leaded stained-glass sunburst, colour falling into the hall.',
      sixties: 'A flush 1960s door with three small square panes stepping down it.',
      upvc: 'A white plastic door with a half-moon of patterned glass at the top.',
    }),
    walls: choice('What is on the walls above the piles?', {
      anaglypta: 'Cream embossed paper over a gloss-brown dado.',
      floral: 'Faded wallpaper roses.',
      woodchip: 'Magnolia woodchip, yellowed toward the ceiling.',
      stripes: 'Regency stripes in green and cream.',
    }),
    floor: choice('What floor shows along the path?', {
      tiles: 'Victorian geometric tiles in terracotta, black and cream.',
      carpet: 'A swirling patterned carpet worn to its backing down the middle.',
      lino: 'Cracked checkerboard lino.',
      boards: 'Bare dark floorboards.',
    }),
    post: choice('What has come through the letterbox?', {
      nothing: 'Nothing; the mat is clear.',
      drift: 'A drift of unopened post and free papers banked against the door.',
      notice: 'One red final-notice envelope lying alone on the mat.',
      sealed: 'Nothing can: the letterbox is taped shut from the inside.',
    }),
    presence: choice('What shows that someone still lives here?', {
      nothing: 'Nothing. It might have been empty for years.',
      slippers: 'A pair of slippers set side by side on the path.',
      doorlight: 'A line of light around a closed inner door.',
      tea: 'A mug and a small radio balanced on the nearest pile.',
      cat: 'A cat sitting in the path, a silhouette against the door.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const art = new Sculpture(context);
    const root = art.root;
    const r = (lo: number, hi: number) => lo + (hi - lo) * random();
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const light = LIGHT[a.time];
    const paint = (w: number, h: number, draw: Draw) => {
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      draw(canvas.getContext('2d')!, w, h);
      return canvas;
    };
    const textured = (canvas: HTMLCanvasElement, rx = 1, ry = 1) => {
      const map = new THREE.CanvasTexture(canvas);
      map.colorSpace = THREE.SRGBColorSpace;
      map.wrapS = map.wrapT = THREE.RepeatWrapping;
      map.repeat.set(rx, ry);
      return map;
    };
    const flat = (map: THREE.Texture, options: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ map, roughness: 0.95, ...options });
    const still = <T extends THREE.Mesh>(mesh: T) => { mesh.castShadow = false; return mesh; };

    // ---- The hall: 2.5 m wide, running from the camera at +z to the front door at -z.
    const HALF = 1.25, FAR = -3.2, NEAR = 5.4, CEIL = 2.6, DOORX = 0.36, WELL = 2.05, FOOT = -2.6, LANDING = 0.4;
    const smooth = (t: number) => { const k = Math.min(1, Math.max(0, t)); return k * k * (3 - 2 * k); };
    /** The goat path wanders: right by the camera, left round the hero, back to the door. */
    const pathX = (z: number) => (z >= 0.6 ? mix(-0.4, 0.45, smooth((z - 0.6) / 4)) : mix(-0.4, DOORX, smooth((0.6 - z) / 3.4)));
    const pathHalf = (z: number) => 0.36 + 0.2 * Math.exp(-(((z - 0.6) / 0.75) ** 2));

    const paper = paint(256, 512, (g, w, h) => {
      const stain = () => { for (let i = 0; i < mood.wear * 9; i++) { g.fillStyle = `rgba(120,90,50,${0.05 + random() * 0.08})`; g.beginPath(); g.ellipse(random() * w, random() * h * 0.5, 20 + random() * 60, 30 + random() * 90, 0, 0, 7); g.fill(); } };
      if (a.walls === 'anaglypta') {
        g.fillStyle = '#e9e0c6'; g.fillRect(0, 0, w, h);
        for (let y = 0; y < h * 0.62; y += 22) for (let x = (y / 22) % 2 ? 0 : 16; x < w; x += 32) { g.strokeStyle = 'rgba(150,135,100,0.45)'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, 9, 0, 7); g.stroke(); g.strokeStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.arc(x - 1, y - 1, 9, 3.4, 5.4); g.stroke(); }
        g.fillStyle = '#6b4630'; g.fillRect(0, h * 0.64, w, h * 0.36);
        g.fillStyle = '#4f3222'; g.fillRect(0, h * 0.62, w, 12);
        g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(0, h * 0.66, w, 6);
      } else if (a.walls === 'floral') {
        g.fillStyle = '#e6dcc9'; g.fillRect(0, 0, w, h);
        for (let y = 20; y < h; y += 64) for (let x = (y / 64) % 2 < 1 ? 30 : 94; x < w; x += 128) {
          g.fillStyle = '#8fa583'; g.fillRect(x - 3, y, 5, 34); g.beginPath(); g.ellipse(x + 12, y + 20, 12, 5, 0.6, 0, 7); g.fill(); g.beginPath(); g.ellipse(x - 12, y + 26, 12, 5, -0.6, 0, 7); g.fill();
          g.fillStyle = '#c98792'; for (let p = 0; p < 6; p++) { g.beginPath(); g.arc(x + Math.cos(p) * 9, y + Math.sin(p) * 9, 8, 0, 7); g.fill(); }
          g.fillStyle = '#a85f6e'; g.beginPath(); g.arc(x, y, 6, 0, 7); g.fill();
        }
      } else if (a.walls === 'woodchip') {
        const fade = g.createLinearGradient(0, 0, 0, h);
        fade.addColorStop(0, '#d9c79a'); fade.addColorStop(0.5, '#e6dcc0'); fade.addColorStop(1, '#e9e2cc');
        g.fillStyle = fade; g.fillRect(0, 0, w, h);
        for (let i = 0; i < 900; i++) { g.fillStyle = random() < 0.5 ? 'rgba(255,255,255,0.4)' : 'rgba(130,115,85,0.3)'; g.fillRect(random() * w, random() * h, 2 + random() * 4, 2 + random() * 3); }
      } else {
        g.fillStyle = '#e8e1c8'; g.fillRect(0, 0, w, h);
        for (let x = 0; x < w; x += 64) { g.fillStyle = '#6f8f76'; g.fillRect(x, 0, 26, h); g.fillStyle = '#c9b46a'; g.fillRect(x + 30, 0, 3, h); g.fillRect(x - 7, 0, 3, h); }
      }
      stain();
    });
    const wallTone = new THREE.Color(1, 1, 1).multiplyScalar(light.wall);
    const wall = (length: number) => flat(textured(paper, length / 1.3, 1), { color: wallTone });
    const plane = (w: number, h: number, material: THREE.Material, at: P, turn: number) => {
      const mesh = art.mesh(new THREE.PlaneGeometry(w, h), material, at);
      mesh.rotation.y = turn;
      return still(mesh);
    };
    plane(NEAR - FAR, CEIL, wall(NEAR - FAR), [-HALF, CEIL / 2, (NEAR + FAR) / 2], Math.PI / 2);
    plane(NEAR - LANDING, CEIL, wall(NEAR - LANDING), [HALF, CEIL / 2, (NEAR + LANDING) / 2], -Math.PI / 2);
    plane(LANDING - FAR, CEIL, wall(LANDING - FAR), [WELL, CEIL / 2, (LANDING + FAR) / 2], -Math.PI / 2);
    plane(WELL + HALF, CEIL, wall(WELL + HALF), [(WELL - HALF) / 2, CEIL / 2, FAR], 0);
    const ceiling = still(art.mesh(new THREE.PlaneGeometry(WELL + HALF, NEAR - FAR), new THREE.MeshStandardMaterial({ color: new THREE.Color('#ece6d6').multiplyScalar(light.wall), roughness: 1 }), [(WELL - HALF) / 2, CEIL, (NEAR + FAR) / 2]));
    ceiling.rotation.x = Math.PI / 2;
    const gloss = art.material(a.walls === 'stripes' ? '#e9e4d2' : '#d9cfb6', { roughness: 0.5 });
    still(art.box([0.03, 0.16, NEAR - FAR], [-HALF + 0.015, 0.08, (NEAR + FAR) / 2], gloss));
    still(art.box([0.03, 0.05, NEAR - FAR], [-HALF + 0.015, CEIL * 0.375, (NEAR + FAR) / 2], gloss));
    still(art.box([0.03, 0.16, NEAR - LANDING], [HALF - 0.015, 0.08, (NEAR + LANDING) / 2], gloss));

    // Floor.
    const floorCanvas = paint(256, 256, (g, w, h) => {
      if (a.floor === 'tiles') {
        g.fillStyle = '#d9c9a4'; g.fillRect(0, 0, w, h);
        for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
          const cx = x * 64 + 32, cy = y * 64 + 32;
          g.fillStyle = (x + y) % 2 ? '#a9523a' : '#2f2b2a';
          g.beginPath(); g.moveTo(cx, cy - 30); g.lineTo(cx + 30, cy); g.lineTo(cx, cy + 30); g.lineTo(cx - 30, cy); g.fill();
          g.fillStyle = '#d9c9a4'; g.fillRect(cx - 7, cy - 7, 14, 14);
        }
      } else if (a.floor === 'carpet') {
        g.fillStyle = '#7d3b34'; g.fillRect(0, 0, w, h);
        for (let i = 0; i < 26; i++) { g.strokeStyle = ['#c9963f', '#2f4a3a', '#d9c7a0'][i % 3]; g.lineWidth = 6; g.beginPath(); g.arc((i * 97) % w, (i * 61) % h, 18 + (i % 4) * 9, i, i + 4.2); g.stroke(); }
      } else if (a.floor === 'lino') {
        for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { g.fillStyle = (x + y) % 2 ? '#c9c2ac' : '#6f7f78'; g.fillRect(x * 64, y * 64, 64, 64); }
        g.strokeStyle = 'rgba(40,35,30,0.5)'; g.lineWidth = 2;
        for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(random() * w, random() * h); g.lineTo(random() * w, random() * h); g.stroke(); }
      } else {
        for (let x = 0; x < 4; x++) { g.fillStyle = ['#6b4a33', '#5f412d', '#735238', '#644630'][x]; g.fillRect(x * 64, 0, 62, h); g.fillStyle = '#2a1d14'; g.fillRect(x * 64 + 62, 0, 2, h); g.fillRect(x * 64, (x * 90 + 40) % h, 62, 2); }
      }
      for (let i = 0; i < 20 + mood.wear * 60; i++) { g.fillStyle = `rgba(95,88,78,${0.08 + random() * 0.1})`; g.beginPath(); g.ellipse(random() * w, random() * h, 6 + random() * 26, 4 + random() * 14, random() * 3, 0, 7); g.fill(); }
    });
    const ground = still(art.mesh(new THREE.PlaneGeometry(WELL + HALF, NEAR - FAR), flat(textured(floorCanvas, (WELL + HALF) / 0.9, (NEAR - FAR) / 0.9)), [(WELL - HALF) / 2, 0, (NEAR + FAR) / 2]));
    ground.rotation.x = -Math.PI / 2;

    // ---- Stairs behind a boarded spandrel on the right, rising from the door toward the camera.
    const timber = art.material('#5a3c28', { roughness: 0.5 });
    const boarding = art.material(a.walls === 'anaglypta' ? '#6b4630' : '#d2c8ae', { roughness: 0.6, side: THREE.DoubleSide });
    const spandrel = new THREE.BufferGeometry();
    spandrel.setAttribute('position', new THREE.Float32BufferAttribute([HALF, 0, LANDING, HALF, CEIL, LANDING, HALF, 0.22, FOOT, HALF, 0, LANDING, HALF, 0.22, FOOT, HALF, 0, FOOT], 3));
    spandrel.computeVertexNormals();
    still(art.mesh(spandrel, boarding));
    const steps = 13, rise = CEIL / steps, going = (LANDING - FOOT) / steps;
    const runner = art.material(a.floor === 'carpet' ? '#7d3b34' : '#8a6a4a', { roughness: 1 });
    for (let i = 0; i < steps; i++) still(art.box([WELL - HALF, rise * (i + 1), going], [(WELL + HALF) / 2, (rise * (i + 1)) / 2, FOOT + going * (i + 0.5)], runner));
    const railFrom: P = [HALF + 0.03, 1.12, FOOT - 0.08], railTo: P = [HALF + 0.03, CEIL - 0.02, FOOT - 0.08 + ((CEIL - 0.02 - 1.12) / rise) * going];
    art.rod(railFrom, railTo, 0.03, timber);
    art.box([0.1, 1.2, 0.1], [HALF + 0.03, 0.6, FOOT - 0.12], timber);
    art.ball([0.07, 0.07, 0.07], [HALF + 0.03, 1.25, FOOT - 0.12], timber, 12);
    const balusters: { at: P; size: number }[] = [];
    for (let z = FOOT; z < railTo[2]; z += 0.14) balusters.push({ at: [HALF + 0.03, ((z - FOOT) / going) * rise + 0.6, z], size: 1 });
    art.scatter(new THREE.BoxGeometry(0.03, 0.95, 0.03), timber, balusters);

    // ---- The front door, glowing.
    const paintColour = a.door === 'upvc' ? '#f1f1ec' : pick(mood.cheer > 0.5 ? ['#2f5d4a', '#a8323a', '#2d4f7a'] : ['#2b3a33', '#4a2a2a', '#30343a']);
    const doorPaint = art.material(paintColour, { roughness: a.door === 'upvc' ? 0.3 : 0.45 });
    const frame = art.material('#e6e0cf', { roughness: 0.5 });
    const glassCanvas = paint(128, 256, (g, w, h) => {
      g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
      if (a.door === 'stained') {
        const tints = ['#e3b23c', '#c8443a', '#3f7fa8', '#5f9a5a', '#f3ead2'];
        for (let i = 0; i < 12; i++) { g.fillStyle = tints[i % 5]; g.beginPath(); g.moveTo(w / 2, h * 0.72); g.arc(w / 2, h * 0.72, 200, Math.PI + (i * Math.PI) / 12, Math.PI + ((i + 1) * Math.PI) / 12); g.fill(); }
        g.fillStyle = '#e3b23c'; g.beginPath(); g.arc(w / 2, h * 0.72, 30, 0, 7); g.fill();
        g.fillStyle = '#3f7fa8'; g.fillRect(0, h * 0.72, w, h * 0.28);
        g.strokeStyle = '#2a2a2a'; g.lineWidth = 4;
        for (let i = 0; i <= 12; i++) { g.beginPath(); g.moveTo(w / 2, h * 0.72); g.lineTo(w / 2 + Math.cos(Math.PI + (i * Math.PI) / 12) * 220, h * 0.72 + Math.sin(Math.PI + (i * Math.PI) / 12) * 220); g.stroke(); }
        g.beginPath(); g.arc(w / 2, h * 0.72, 30, 0, 7); g.stroke(); g.strokeRect(2, 2, w - 4, h - 4);
      } else {
        for (let i = 0; i < 700; i++) { g.fillStyle = `rgba(150,165,180,${random() * 0.25})`; g.beginPath(); g.arc(random() * w, random() * h, 2 + random() * 5, 0, 7); g.fill(); }
        // The blur of the street: a hedge, a gate, sky.
        g.fillStyle = 'rgba(70,90,70,0.22)'; g.fillRect(0, h * 0.62, w, h * 0.4);
        g.fillStyle = 'rgba(60,60,70,0.2)'; g.fillRect(w * 0.55, h * 0.3, w * 0.2, h * 0.5);
      }
    });
    const glassMap = textured(glassCanvas);
    const glow = new THREE.Color(light.glass);
    const glass = new THREE.MeshStandardMaterial({ map: glassMap, color: glow, emissive: glow, emissiveMap: glassMap, emissiveIntensity: light.glow, roughness: 0.4 });
    const DW = 0.9, DH = 2.04, DZ = FAR + 0.05;
    still(art.box([DW, DH, 0.05], [DOORX, DH / 2, DZ], doorPaint));
    for (const side of [-1, 1]) still(art.box([0.09, DH + 0.5, 0.09], [DOORX + side * (DW / 2 + 0.045), (DH + 0.5) / 2, DZ], frame));
    still(art.box([DW + 0.18, 0.09, 0.09], [DOORX, DH + 0.045, DZ], frame));
    still(art.box([DW + 0.18, 0.09, 0.09], [DOORX, DH + 0.5, DZ], frame));
    const pane = (w: number, h: number, x: number, y: number) => still(art.box([w, h, 0.02], [DOORX + x, y, DZ + 0.03], glass));
    if (a.door === 'victorian') {
      for (const side of [-1, 1]) { pane(0.28, 0.9, side * 0.2, 1.42); still(art.box([0.3, 0.6, 0.015], [DOORX + side * 0.2, 0.48, DZ + 0.03], art.material(new THREE.Color(paintColour).multiplyScalar(0.8)))); }
      pane(DW, 0.34, 0, DH + 0.27);
    } else if (a.door === 'stained') {
      pane(0.62, 1.05, 0, 1.36);
      pane(DW, 0.34, 0, DH + 0.27);
    } else if (a.door === 'sixties') {
      for (let i = 0; i < 3; i++) pane(0.2, 0.2, -0.22 + i * 0.22, 1.72 - i * 0.3);
      pane(DW, 0.34, 0, DH + 0.27);
    } else {
      const fan = still(art.mesh(new THREE.CircleGeometry(0.33, 20, 0, Math.PI), glass, [DOORX, 1.5, DZ + 0.035]));
      fan.scale.y = 0.85;
      still(art.box([DW - 0.16, 0.012, 0.02], [DOORX, 1.49, DZ + 0.04], frame));
      still(art.box([DW, 0.36, 0.03], [DOORX, DH + 0.27, DZ], art.material('#e9e4d2')));
    }
    const brass = art.material(a.door === 'upvc' ? '#c9cdd0' : '#c9a24a', { metalness: 0.8, roughness: 0.3 });
    art.box([0.26, 0.06, 0.02], [DOORX, 1.0, DZ + 0.035], brass);
    art.ball([0.035, 0.035, 0.035], [DOORX + 0.34, 1.02, DZ + 0.06], brass, 10);
    if (a.post === 'sealed') for (const tilt of [-0.25, 0.3, 0.05]) art.box([0.4, 0.05, 0.004], [DOORX, 1.0, DZ + 0.05], art.material('#8c6f3f', { roughness: 0.4 })).rotation.z = tilt;
    art.box([0.8, 0.02, 0.5], [DOORX, 0.01, FAR + 0.45], art.material('#6b5a44', { roughness: 1 }));
    // Light that the glass throws down the path: seen, not measured.
    const beamCanvas = paint(32, 128, (g, w, h) => { const fade = g.createLinearGradient(0, 0, 0, h); fade.addColorStop(0, 'rgba(255,255,255,0.95)'); fade.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = fade; g.fillRect(0, 0, w, h); });
    const beam = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 3.8), new THREE.MeshBasicMaterial({ map: textured(beamCanvas), color: glow, transparent: true, opacity: light.beam, depthWrite: false }));
    beam.rotation.set(-Math.PI / 2, 0, mix(0.22, -0.22, mood.daylight));
    beam.position.set(DOORX - 0.06, 0.012, FAR + 1.95);
    root.add(beam);

    // An inner door on the left, mostly buried.
    const inner = art.material('#ded7c2', { roughness: 0.5 });
    still(art.box([0.04, 2.0, 0.8], [-HALF + 0.02, 1.0, -1.8], inner));
    for (const y of [0.55, 1.45]) still(art.box([0.045, 0.7, 0.56], [-HALF + 0.022, y, -1.8], art.material('#d2cab4', { roughness: 0.5 })));
    if (a.presence === 'doorlight') {
      const seam = new THREE.MeshStandardMaterial({ color: '#ffe2a6', emissive: '#ffcf7a', emissiveIntensity: 1.6 });
      still(art.box([0.05, 0.025, 0.84], [-HALF + 0.03, 2.02, -1.8], seam));
      for (const z of [-2.21, -1.39]) still(art.box([0.05, 2.0, 0.02], [-HALF + 0.03, 1.0, z], seam));
    }
    // Pictures nobody has straightened.
    for (const [z, y] of [[2.6, 1.85], [0.9, 2.0], [-0.6, 1.9]]) {
      const tilt = r(-0.12, 0.12) * (0.4 + mood.wear);
      const outer = still(art.box([0.03, 0.42, 0.34], [-HALF + 0.025, y, z], art.material(pick(['#8a6a3a', '#3a2c22', '#b89a5c']))));
      const picture = still(art.box([0.032, 0.3, 0.22], [-HALF + 0.03, y, z], art.material(pick(['#c9d2c4', '#d9c9b0', '#aebccb']))));
      outer.rotation.x = picture.rotation.x = tilt;
    }

    // Pendant lamp.
    const bulbOn = light.bulb;
    art.rod([-0.05, CEIL, -0.5], [-0.05, 2.22, -0.5], 0.006, art.material('#3a342c'));
    const shade = art.lathe([[0.05, 0.16], [0.09, 0.12], [0.19, 0], [0.2, -0.02]], new THREE.MeshStandardMaterial({ color: '#d9b98a', emissive: '#ffb45a', emissiveIntensity: bulbOn ? 0.55 : 0, roughness: 0.9, side: THREE.DoubleSide }), [-0.05, 2.08, -0.5]);
    shade.castShadow = false;
    const bulb = new THREE.MeshStandardMaterial({ color: '#fff4d6', emissive: '#ffd58a', emissiveIntensity: bulbOn ? 2.2 : 0, roughness: 0.3 });
    art.ball([0.035, 0.045, 0.035], [-0.05, 2.07, -0.5], bulb, 10).castShadow = false;

    // ---- The hoard. Columns of boxes, bundles and bags against both walls, lower toward the path.
    const perches: { x: number; z: number; top: number }[] = [];
    const maxH = mix(0.38, 2.45, a.depth) * mix(0.9, 1.08, mood.density);
    for (const [x, z, share, lo, hi] of [[0.86, -1.2, 0.5, 0.34, 1.1], [0.84, 1.7, 0.4, 0.3, 0.95], [-0.84, -1.5, 0.46, 0.34, 1.05], [-0.84, 2.6, 0.3, 0.26, 0.7]]) perches.push({ x, z, top: Math.min(hi, Math.max(lo, maxH * share)) });
    const mixOf = { paper: [0.24, 0.84], bags: [0.26, 0.4], boxes: [0.72, 0.86], everything: [0.45, 0.68] }[a.hoard];
    const lively = (dull: string, bright: string) => new THREE.Color(dull).lerp(new THREE.Color(bright), mood.cheer);
    const cartons = ['#b98b58', '#c39a66', '#a97c4b', '#b4875a', '#c9a878', '#9f7448'].map((tint) => new THREE.Color(tint));
    const crates = [lively('#6f7f8f', '#2d6fb7'), lively('#8f6f66', '#c8443a'), lively('#b9ad84', '#e8c63a'), new THREE.Color('#e9e4d6'), lively('#7c8a78', '#3c9a52')];
    const sacks = [new THREE.Color('#474952'), new THREE.Color('#50535d'), new THREE.Color('#3f4149'), new THREE.Color('#585a63')];
    const carriers = [new THREE.Color('#ece9df'), lively('#b9a48f', '#e8762c'), lively('#8f9aa8', '#2d6fb7'), new THREE.Color('#d9d6cc'), lively('#a9a58a', '#f2d23a')];
    const pages = (age: number) => new THREE.Color('#e6e1d2').lerp(new THREE.Color('#b08f52'), age);
    const boxes: { m: THREE.Matrix4; c: THREE.Color }[] = [], bundles: typeof boxes = [], bags: typeof boxes = [];
    const tops: { x: number; z: number; y: number; side: number; row: number }[] = [];
    const q = new THREE.Quaternion(), e = new THREE.Euler();
    const put = (list: typeof boxes, at: P, size: P, turn: number, tint: THREE.Color, tilt = 0) => {
      q.setFromEuler(e.set(tilt, turn, tilt * 0.6));
      list.push({ m: new THREE.Matrix4().compose(new THREE.Vector3(...at), q, new THREE.Vector3(...size)), c: tint });
    };
    const rows = a.depth < 0.12 ? 1 : a.depth < 0.3 ? 2 : 3;
    for (let z = NEAR - 0.9; z > FAR + 0.5; z -= 0.4) {
      for (const side of [-1, 1]) {
        for (let row = 0; row < rows; row++) {
          const x = side * (HALF - 0.21 - row * 0.4) + r(-0.03, 0.03);
          const edge = pathX(z) + side * pathHalf(z);
          if (side > 0 ? x - 0.19 < edge : x + 0.19 > edge) continue;
          if (perches.some((perch) => Math.abs(perch.x - x) < 0.5 && Math.abs(perch.z - z) < 0.42)) continue;
          if (z < FAR + 1.0 && Math.abs(x - DOORX) < 0.75) continue;
          if (z > 3.0 && row > 0) continue;
          let target = maxH * [1, 0.7, 0.4][row] * r(0.72, 1.06) * (z > 3.0 ? 0.55 : 1);
          if (side > 0 && z < LANDING) target = Math.max(target * 0.9, Math.min(target, 0.3));
          target = Math.min(target, CEIL - 0.12);
          let y = 0, turn = r(-0.1, 0.1);
          while (y < target) {
            const kind = random();
            const jx = x + r(-0.035, 0.035), jz = z + r(-0.04, 0.04);
            turn += r(-0.18, 0.18);
            if (kind < mixOf[0]) {
              const h = r(0.17, 0.36), w = r(0.3, 0.42), d = r(0.3, 0.4);
              put(boxes, [jx, y + h / 2, jz], [w, h, d], turn, random() < 0.2 ? pick(crates) : pick(cartons));
              y += h;
            } else if (kind < mixOf[1]) {
              const h = r(0.1, 0.2);
              put(bundles, [jx, y + h / 2, jz], [0.31, h, 0.39], turn + (random() < 0.5 ? Math.PI / 2 : 0), pages(mix(0.9, 0.1, y / Math.max(maxH, 0.5)) * mix(0.5, 1, mood.wear)));
              y += h;
            } else {
              const big = random() < (a.hoard === 'bags' ? 0.6 : 0.75);
              const size = big ? r(0.2, 0.27) : r(0.13, 0.18);
              put(bags, [jx + r(-0.07, 0.07), y + size * 0.62, jz + r(-0.08, 0.08)], [size * 1.05, size * r(0.7, 0.85), size], r(0, 6), big ? pick(sacks) : pick(carriers), r(-0.2, 0.2));
              y += size * 1.1;
            }
          }
          tops.push({ x, z, y, side, row });
        }
      }
    }
    // Things kept on the stairs too.
    for (let i = 0; i < steps - 3; i++) for (const sx of [0.22, 0.58]) if (random() < 0.35 + a.depth * 0.6) {
      const h = r(0.15, 0.4) * mix(0.7, 1.5, a.depth);
      put(random() < 0.6 ? boxes : bundles, [HALF + sx + r(-0.05, 0.05), rise * (i + 1) + h / 2, FOOT + going * (i + 0.5)], [r(0.25, 0.34), h, going * 0.9], r(-0.2, 0.2), pick(cartons));
    }

    const boxSkin = paint(128, 128, (g, w, h) => {
      g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(0,0,0,0.1)'; for (let x = 0; x < w; x += 6) g.fillRect(x, 0, 2, h);
      g.fillStyle = 'rgba(255,240,200,0.7)'; g.fillRect(52, 0, 24, 40);
      g.fillStyle = 'rgba(255,255,255,0.95)'; g.fillRect(14, 62, 50, 36);
      g.fillStyle = 'rgba(30,30,30,0.7)'; for (let x = 18; x < 60; x += 5) g.fillRect(x, 82, 2 + (x % 3), 12);
      g.fillRect(18, 68, 34, 3); g.fillRect(18, 74, 22, 3);
      g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 3; g.strokeRect(1, 1, w - 2, h - 2);
    });
    const edgeSkin = paint(64, 64, (g, w, h) => {
      g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y += 3) { g.fillStyle = `rgba(60,45,25,${0.15 + random() * 0.3})`; g.fillRect(0, y, w, 1); }
      g.fillStyle = 'rgba(120,85,40,0.9)'; g.fillRect(30, 0, 3, h); g.fillRect(0, 30, w, 0);
    });
    const instanced = (geometry: THREE.BufferGeometry, material: THREE.Material, list: typeof boxes) => {
      if (!list.length) return;
      const mesh = new THREE.InstancedMesh(geometry, material, list.length);
      list.forEach((item, index) => { mesh.setMatrixAt(index, item.m); mesh.setColorAt(index, item.c); });
      mesh.castShadow = mesh.receiveShadow = true;
      root.add(mesh);
    };
    instanced(new THREE.BoxGeometry(1, 1, 1), flat(textured(boxSkin), { roughness: 0.9 }), boxes);
    instanced(new THREE.BoxGeometry(1, 1, 1), flat(textured(edgeSkin), { roughness: 0.95 }), bundles);
    const lump = new THREE.SphereGeometry(1, 14, 10);
    const lp = lump.attributes.position;
    for (let i = 0; i < lp.count; i++) { const k = 1 + Math.sin(lp.getX(i) * 5.1 + lp.getY(i) * 3.3) * 0.07 + Math.sin(lp.getZ(i) * 7.3) * 0.05 + (lp.getY(i) > 0.8 ? 0.25 : 0); lp.setXYZ(i, lp.getX(i) * (lp.getY(i) > 0.8 ? 0.35 : k), lp.getY(i) * k, lp.getZ(i) * (lp.getY(i) > 0.8 ? 0.35 : k)); }
    lump.computeVertexNormals();
    instanced(lump, new THREE.MeshStandardMaterial({ roughness: 0.42 }), bags);

    // Perches: furniture that still has a flat top, for the cast to stand on.
    const drawers = paint(128, 128, (g, w, h) => {
      g.fillStyle = '#7a5638'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 3; i++) { g.strokeStyle = '#4a3220'; g.lineWidth = 3; g.strokeRect(8, 8 + i * 40, w - 16, 34); g.fillStyle = '#c9a24a'; g.beginPath(); g.arc(34, 25 + i * 40, 4, 0, 7); g.arc(94, 25 + i * 40, 4, 0, 7); g.fill(); }
    });
    perches.forEach((perch, index) => {
      const side = Math.sign(perch.x);
      const chest = index % 2 === 0;
      const body = chest ? flat(textured(drawers), { roughness: 0.6 }) : art.material(pick(['#5a4a3a', '#7a3f35', '#3f4f5a']), { roughness: 0.6 });
      const piece = art.box([0.74, perch.top, 0.74], [perch.x, perch.top / 2, perch.z], body);
      piece.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
      if (!chest) { art.box([0.76, 0.03, 0.76], [perch.x, perch.top * 0.62, perch.z], brass); art.box([0.2, 0.05, 0.03], [perch.x - side * 0.38, perch.top * 0.8, perch.z], brass); }
      art.box([0.8, 0.03, 0.8], [perch.x, perch.top - 0.015, perch.z], art.material(chest ? '#5f4029' : '#4a3d30', { roughness: 0.5 }));
    });

    // Landmarks on the heap: the shapes that make it a life and not a tip.
    const landmarks = Math.min(tops.length, Math.round(2 + mood.density * 2 + (a.hoard === 'everything' ? 5 : 0)));
    const wallTops = tops.filter((top) => top.row === 0 && top.z < 2.2 && top.y < CEIL - 0.7);
    const kinds = ['lamp', 'rug', 'chair', 'tv', 'case', 'board', 'frames', 'lamp', 'case'];
    for (let i = 0; i < landmarks && wallTops.length; i++) {
      const spot = wallTops.splice(Math.floor(random() * wallTops.length), 1)[0];
      const kind = kinds[(i + Math.floor(random() * 3)) % kinds.length];
      const group = new THREE.Group();
      const add = (mesh: THREE.Mesh) => { mesh.removeFromParent(); group.add(mesh); return mesh; };
      if (kind === 'lamp') {
        add(art.rod([0, 0, 0], [0, 0.75, 0], 0.014, brass));
        add(art.lathe([[0.1, 0.24], [0.2, 0]], new THREE.MeshStandardMaterial({ color: lively('#b9a88a', '#e3b56a'), roughness: 0.9, side: THREE.DoubleSide }), [0, 0.68, 0]));
        group.rotation.z = spot.side * r(0.1, 0.35);
      } else if (kind === 'rug') {
        const roll = add(art.cylinder(0.11, 0.11, 1.5, [0, 0.55, 0], art.material(lively('#7a5a4f', '#9a3f3a'), { roughness: 1 }), 12));
        roll.rotation.z = spot.side * 0.35;
        add(art.cylinder(0.112, 0.112, 0.04, [-spot.side * 0.19, 1.05, 0], art.material('#d9c9a0'), 12)).rotation.z = spot.side * 0.35;
      } else if (kind === 'chair') {
        const wood = art.material('#6b4a33', { roughness: 0.6 });
        add(art.box([0.4, 0.04, 0.4], [0, 0.04, 0], wood));
        for (const lx of [-0.17, 0.17]) for (const lz of [-0.17, 0.17]) add(art.rod([lx, 0.05, lz], [lx * 1.15, 0.5, lz * 1.15], 0.018, wood));
        group.rotation.set(r(-0.2, 0.2), r(0, 3), r(-0.2, 0.2));
      } else if (kind === 'tv') {
        add(art.box([0.5, 0.4, 0.4], [0, 0.2, 0], art.material('#4a4038', { roughness: 0.5 })));
        add(art.box([0.38, 0.29, 0.02], [-0.03, 0.21, 0.2], art.material('#7f8a86', { roughness: 0.15 })));
        group.rotation.y = -spot.side * 0.9;
      } else if (kind === 'case') {
        const hide = art.material(lively('#6f5a4a', '#8a4a35'), { roughness: 0.6 });
        add(art.box([0.62, 0.2, 0.42], [0, 0.1, 0], hide));
        add(art.box([0.5, 0.17, 0.36], [0.03, 0.29, 0], art.material(lively('#4f5a55', '#3f6a7a'), { roughness: 0.6 }))).rotation.y = 0.2;
        add(art.box([0.14, 0.03, 0.02], [0, 0.12, 0.215], brass));
        group.rotation.y = -spot.side * Math.PI / 2 + r(-0.3, 0.3);
      } else if (kind === 'board') {
        const board = add(art.box([0.34, 1.3, 0.03], [0, 0.6, 0], art.material(lively('#9aa59a', '#7fb7c9'), { roughness: 0.9 })));
        board.rotation.z = spot.side * 0.12;
        add(art.rod([0, 0.1, 0.03], [0.2, 1.0, 0.05], 0.01, art.material('#c9cdd0', { metalness: 0.7 })));
        group.rotation.y = -spot.side * Math.PI / 2;
      } else {
        for (let k = 0; k < 3; k++) {
          const canvas = add(art.box([0.5 - k * 0.08, 0.62 - k * 0.1, 0.03], [0, 0.3 - k * 0.04, k * 0.05], art.material(pick(['#8a6a3a', '#3a2c22', '#b89a5c']))));
          canvas.rotation.x = -0.18;
        }
        group.rotation.y = -spot.side * Math.PI / 2;
      }
      group.position.set(spot.x, spot.y - 0.02, spot.z);
      root.add(group);
    }

    // The mat, and what the letterbox has let in.
    if (a.post === 'drift') {
      const letters: { at: P; size: number; color: THREE.Color }[] = [];
      const stationery = ['#f2efe6', '#e9e4d2', '#c9a76d', '#f6f4ee', '#d9e2e8', '#c8443a'];
      for (let i = 0; i < 70; i++) letters.push({ at: [DOORX + r(-0.42, 0.42), 0.02 + Math.pow(random(), 2) * 0.16, FAR + 0.12 + Math.pow(random(), 1.6) * 0.75], size: r(0.8, 1.3), color: new THREE.Color(stationery[i % stationery.length === 5 && i % 4 ? 0 : i % stationery.length]) });
      const envelope = new THREE.BoxGeometry(0.22, 0.012, 0.11);
      const heap = art.scatter(envelope, new THREE.MeshStandardMaterial({ roughness: 0.9 }), letters);
      const m = new THREE.Matrix4();
      letters.forEach((letter, index) => { q.setFromEuler(e.set(r(-0.3, 0.3), r(0, 6), r(-0.3, 0.3))); m.compose(new THREE.Vector3(...letter.at), q, new THREE.Vector3(letter.size, 1, letter.size)); heap.setMatrixAt(index, m); });
      heap.instanceMatrix.needsUpdate = true;
    } else if (a.post === 'notice') {
      art.box([0.23, 0.006, 0.115], [DOORX + 0.08, 0.026, FAR + 0.52], art.material('#d3242c', { roughness: 0.6, emissive: '#d3242c', emissiveIntensity: 0.25 })).rotation.y = 0.4;
      art.box([0.09, 0.002, 0.045], [DOORX + 0.06, 0.03, FAR + 0.53], art.material('#f6f4ee')).rotation.y = 0.4;
    }

    // Signs of the person.
    if (a.presence === 'slippers') {
      const felt = art.material(lively('#7a6a5a', '#a8443a'), { roughness: 1 });
      for (const side of [-1, 1]) {
        const x = pathX(2.3) + side * 0.07;
        art.ball([0.05, 0.03, 0.13], [x, 0.03, 2.3], felt, 10);
        art.ball([0.045, 0.035, 0.06], [x, 0.045, 2.25], art.material('#e9e2d0', { roughness: 1 }), 10);
      }
    } else if (a.presence === 'tea') {
      const perch = perches[3];
      const china = art.material(lively('#d9d2c2', '#e2573d'), { roughness: 0.35 });
      art.cylinder(0.04, 0.035, 0.09, [perch.x + 0.22, perch.top + 0.045, perch.z + 0.22], china, 14);
      art.ring(0.025, 0.007, [perch.x + 0.265, perch.top + 0.045, perch.z + 0.22], china);
      art.box([0.2, 0.12, 0.06], [perch.x - 0.18, perch.top + 0.06, perch.z + 0.25], art.material('#3a3c40', { roughness: 0.5 }));
      art.rod([perch.x - 0.1, perch.top + 0.12, perch.z + 0.25], [perch.x + 0.0, perch.top + 0.36, perch.z + 0.25], 0.003, brass);
      art.box([0.08, 0.08, 0.005], [perch.x - 0.22, perch.top + 0.06, perch.z + 0.283], art.material('#b9bdc0', { metalness: 0.6 }));
    } else if (a.presence === 'cat') {
      const fur = art.material(pick(['#2b2a2c', '#d08a3c', '#8a8a8e']), { roughness: 1 });
      const cx = pathX(-1.5), cz = -1.5;
      art.ball([0.1, 0.14, 0.12], [cx, 0.13, cz], fur, 14);
      art.ball([0.07, 0.065, 0.065], [cx, 0.3, cz + 0.03], fur, 14);
      for (const side of [-1, 1]) art.mesh(new THREE.ConeGeometry(0.025, 0.055, 4), fur, [cx + side * 0.04, 0.37, cz + 0.03]);
      art.tube([[cx + 0.06, 0.03, cz - 0.06], [cx + 0.17, 0.025, cz - 0.02], [cx + 0.2, 0.03, cz + 0.1], [cx + 0.14, 0.03, cz + 0.17]], 0.016, fur);
    }

    // Dust in the door's light.
    const motes = new THREE.Group();
    const speck = new THREE.Mesh(new THREE.SphereGeometry(0.006, 5, 4), new THREE.MeshBasicMaterial({ color: glow, transparent: true, opacity: 0.55, depthWrite: false }));
    for (let i = 0; i < 28 + mood.wear * 30; i++) { const mote = speck.clone(); mote.position.set(DOORX + r(-0.5, 0.5), r(0.3, 2.2), r(FAR + 0.3, 0.6)); motes.add(mote); }
    root.add(motes);

    // ---- Light, camera, placement.
    const warmth = new THREE.Color(light.key).lerp(new THREE.Color().setHSL(mix(0.6, 0.08, mood.warmth), 0.5, 0.8), 0.25);
    root.add(new THREE.HemisphereLight(light.sky, light.under, light.hemi));
    const key = new THREE.DirectionalLight(warmth, light.power);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.normalBias = 0.03;
    key.shadow.bias = -0.0003;
    key.position.set(mix(-2.2, 2.6, mood.daylight), 7, 6.5);
    key.target.position.set(0, 0.6, -0.6);
    const shadow = key.shadow.camera;
    shadow.left = -5; shadow.right = 5; shadow.top = 6; shadow.bottom = -6; shadow.near = 0.5; shadow.far = 26;
    shadow.updateProjectionMatrix();
    root.add(key, key.target);
    const through = new THREE.PointLight(glow, light.glow * 7, 7.5, 1.5);
    through.position.set(DOORX, 1.5, FAR + 0.7);
    root.add(through);
    const pool = new THREE.PointLight('#ffc98a', bulbOn ? 5 : 0, 6, 1.6);
    pool.position.set(-0.05, 1.95, -0.5);
    root.add(pool);

    const camera = new THREE.PerspectiveCamera(44, 1, 0.1, 60);
    const eye = new THREE.Vector3(0.46, 1.52, 4.75);
    const slots: { x: number; z: number; y: number; tall: number; wide: number }[] = [
      { x: pathX(0.6), z: 0.6, y: 0, tall: 1.6, wide: 0.46 },
      ...perches.map((perch) => ({ x: perch.x, z: perch.z, y: perch.top, tall: Math.min(1.05, CEIL - perch.top - 0.25), wide: 0.36 })),
    ];
    const background = new THREE.Color('#e6dcc4').multiplyScalar(light.wall);

    const place = (items: readonly Placeable[]) => {
      let heroTop = 1.4;
      items.forEach((item, index) => {
        const slot = slots[index % slots.length];
        // True size where it fits; big things shrink to the path, small things are met halfway.
        const natural = Math.max(item.height, 0.05);
        const least = slot.tall * 0.5;
        const shown = natural < least ? least * (natural / least) ** 0.4 : Math.min(natural, slot.tall);
        const scale = Math.min(shown / natural, slot.wide / Math.max(item.radius, 0.05));
        item.holder.scale.setScalar(scale);
        item.holder.position.set(slot.x, slot.y, slot.z);
        item.holder.rotation.y = Math.atan2(eye.x - slot.x, eye.z - slot.z) + (random() - 0.5) * 0.4;
        item.holder.updateMatrixWorld(true);
        if (index === 0) heroTop = visibleBounds(item.holder).max.y;
      });
      camera.position.copy(eye);
      camera.lookAt(0.02, mix(1.0, 1.18, Math.min(1, heroTop / 1.6)), FAR);
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld(true);
    };
    place([]);

    const flicker = bulbOn ? mix(0, 0.5, mood.energy) : 0;
    return {
      object: root, camera, background, capacity: slots.length, ground, keyLight: key, place,
      update(_dt, time) {
        motes.position.y = Math.sin(time * mix(0.1, 0.5, mood.energy)) * 0.08;
        motes.position.x = Math.sin(time * 0.13) * 0.05;
        if (flicker) {
          const dip = Math.sin(time * 13) * Math.sin(time * 5.3 + 1) > 0.72 ? 1 - flicker : 1;
          bulb.emissiveIntensity = 2.2 * dip;
          pool.intensity = 5 * dip;
        }
      },
      dispose() { key.shadow.map?.dispose(); disposeTree(root); },
    };
  },
});
