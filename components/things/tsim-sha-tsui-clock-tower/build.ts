import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Sculpture, choice, defineThing, mix, noul, paint, paintHex } from '@conjure/kit';

const canvasTexture = (w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) => {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  return texture;
};

const TIMES = {
  noon: [12, 0], tenTen: [10, 10], quarterTo: [11, 45], twentyPast: [8, 20], halfPast: [6, 30], stopped: [4, 52],
} as const;

export default defineThing({
  questions: {
    time: choice('What time do the clock hands show?', {
      noon: 'Twelve o\'clock, both hands straight up.',
      tenTen: 'Ten past ten, the hands spread like a smile.',
      quarterTo: 'A quarter to twelve: the last train is about to leave.',
      twentyPast: 'Twenty past eight in the morning, the commuter hour.',
      halfPast: 'Half past six, the hands hanging straight down: evening.',
      stopped: 'Stopped at an odd minute long ago, the hands never moving again.',
    }),
    dialLit: noul('Are the clock faces lit from behind?'),
    era: choice('When is it?', {
      today: 'Today: the tower stands alone on a paved waterfront plaza, the station long gone.',
      station: '1915: the new Kowloon terminus beside it, an arcaded brick station building and the platform sheds behind.',
      occupation: '1941: the battle for Hong Kong, the brick pocked by bullets and shell splinters, sandbags heaped at the door.',
      demolition: '1978: the station half demolished beside it, heaps of brick rubble and a broken arcade.',
    }),
    bunting: choice('What is strung from the tower?', {
      none: 'Nothing, just the bare tower.',
      flags: 'Lines of small festival flags running down from the cupola.',
      lanterns: 'Red New Year lanterns strung on lines from the top.',
      moon: 'Mid-Autumn lanterns in many colours, rabbits and stars among them.',
    }),
    pigeons: noul('Are pigeons lined up along the cornices?'),
    rain: noul('Is it raining, the brick darkened and the plaza shining wet?'),
    brick: paint('What colour is the brick?', ['red', 'rust', 'crimson', 'coral', 'tan', 'cream', 'brown']),
    dial: paint('What colour are the clock dials?', ['white', 'cream', 'black', 'gold', 'navy']),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const lowSun = Math.abs(mood.daylight - 0.5) * 2;
    const night = Math.min(1, Math.max(0, (lowSun - 0.35) / 0.65));
    const wet = a.rain;
    const scarred = a.era === 'occupation';

    // Brick: courses of stretchers, mortar lines, soot and scars from the brick's history.
    const brickMap = canvasTexture(256, 256, (c) => {
      c.fillStyle = '#ffffff'; c.fillRect(0, 0, 256, 256);
      for (let row = 0; row < 26; row++) {
        const off = row % 2 ? 0 : 12;
        for (let col = -1; col < 11; col++) {
          const g = 190 + Math.floor(random() * 50);
          c.fillStyle = `rgb(${g},${g - 6},${g - 10})`;
          c.fillRect(col * 24 + off + 1, row * 10 + 1, 22, 8);
        }
      }
      for (let i = 0; i < Math.round(mood.wear * 40); i++) { c.fillStyle = `rgba(40,30,30,${0.08 + random() * 0.15})`; c.fillRect(random() * 256, random() * 256, 3 + random() * 6, 20 + random() * 60); }
      if (scarred) for (let i = 0; i < 70; i++) { c.fillStyle = `rgba(30,22,20,${0.5 + random() * 0.4})`; c.beginPath(); c.arc(random() * 256, random() * 256, 1 + random() * 3.5, 0, 7); c.fill(); }
    });
    const brickColour = new THREE.Color(paintHex(a.brick)).multiplyScalar(wet ? 0.68 : 1);
    const brickMat = (w: number, h: number) => {
      const map = brickMap.clone(); map.needsUpdate = true; map.repeat.set(w / 2.4, h / 2.6);
      return s.material(brickColour, { map, roughness: wet ? 0.3 : 0.85 });
    };
    const granite = s.material(new THREE.Color('#d6cfc1').multiplyScalar(wet ? 0.8 : 1), { roughness: wet ? 0.3 : 0.8 });
    const dark = s.material('#2b2522', { roughness: 0.8 });
    const glassWarm = s.material('#3b3a3a', { emissive: '#ffcf86', emissiveIntensity: mix(0, 1.1, night), roughness: 0.3 });

    const W = 7.4;
    // Granite plinth with an arched door on the front.
    s.box([W + 1.6, 3, W + 1.6], [0, 1.5, 0], granite);
    s.box([2, 2.4, 0.2], [0, 1.2, W / 2 + 0.75], dark);
    s.cylinder(1, 1, 0.2, [0, 2.4, W / 2 + 0.75], dark, 16).rotation.x = Math.PI / 2;
    // The banded shaft.
    const shaftTop = 31;
    s.box([W, shaftTop - 3, W], [0, 3 + (shaftTop - 3) / 2, 0], brickMat(W, shaftTop - 3));
    const trims: THREE.BufferGeometry[] = [];
    const add = (g: THREE.BufferGeometry, x: number, y: number, z: number) => { g.translate(x, y, z); trims.push(g.toNonIndexed()); };
    for (const y of [8, 14, 20, 26, shaftTop]) add(new THREE.BoxGeometry(W + 0.4, 0.55, W + 0.4), 0, y, 0);
    // Quoins: granite blocks alternating long and short up every corner.
    for (let y = 3.4; y < shaftTop - 0.3; y += 0.9) {
      const long = Math.round((y - 3.4) / 0.9) % 2 === 0;
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        add(new THREE.BoxGeometry(long ? 1.3 : 0.7, 0.42, 0.16), sx * (W / 2 - (long ? 0.65 : 0.35)), y, sz * (W / 2 + 0.06));
        add(new THREE.BoxGeometry(0.16, 0.42, long ? 0.7 : 1.3), sx * (W / 2 + 0.06), y, sz * (W / 2 - (long ? 0.35 : 0.65)));
      }
    }
    // Narrow arched windows up each face.
    const windows: THREE.BufferGeometry[] = [];
    for (let side = 0; side < 4; side++) {
      const rot = new THREE.Matrix4().makeRotationY((side * Math.PI) / 2);
      for (const y of [11, 17, 23]) {
        const g = new THREE.BoxGeometry(0.8, 2.6, 0.12); g.translate(0, y, W / 2 + 0.02); g.applyMatrix4(rot); windows.push(g.toNonIndexed());
        const arch = new THREE.CylinderGeometry(0.4, 0.4, 0.12, 12, 1, false, -Math.PI / 2, Math.PI); arch.rotateX(Math.PI / 2); arch.translate(0, y + 1.3, W / 2 + 0.02); arch.applyMatrix4(rot); windows.push(arch.toNonIndexed());
        const sill = new THREE.BoxGeometry(1.2, 0.2, 0.3); sill.translate(0, y - 1.4, W / 2 + 0.1); sill.applyMatrix4(rot); trims.push(sill.toNonIndexed());
      }
    }
    s.mesh(mergeGeometries(windows), glassWarm);

    // The clock stage: a wider granite-framed block with a dial on every face.
    const clockY = 33.6;
    s.box([W + 0.6, 5, W + 0.6], [0, shaftTop + 2.5, 0], brickMat(W + 0.6, 5));
    add(new THREE.BoxGeometry(W + 1.4, 0.7, W + 1.4), 0, shaftTop + 5.2, 0);
    for (let k = 0; k < 6; k++) for (const sx of [-1, 1]) add(new THREE.BoxGeometry(0.3, 0.5, 0.5), sx * (-2.8 + k * 1.12) * 0 + (-2.8 + k * 1.12), shaftTop + 4.75, sx * (W / 2 + 0.5));
    const [hour, minute] = TIMES[a.time];
    const dialHex = paintHex(a.dial);
    const ink = new THREE.Color(dialHex).getHSL({ h: 0, s: 0, l: 0 }).l > 0.5 ? '#1d1d1f' : '#f1e8cf';
    const dialMap = canvasTexture(256, 256, (c) => {
      c.fillStyle = dialHex; c.beginPath(); c.arc(128, 128, 126, 0, 7); c.fill();
      c.strokeStyle = ink; c.fillStyle = ink; c.lineWidth = 6; c.beginPath(); c.arc(128, 128, 118, 0, 7); c.stroke();
      c.lineWidth = 2; c.beginPath(); c.arc(128, 128, 88, 0, 7); c.stroke();
      c.font = 'bold 22px serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      const romans = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
      romans.forEach((r, i) => { const an = (i / 12) * Math.PI * 2; c.fillText(r, 128 + Math.sin(an) * 102, 128 - Math.cos(an) * 102); });
      const hand = (angle: number, length: number, width: number) => {
        c.lineWidth = width; c.lineCap = 'round'; c.beginPath(); c.moveTo(128 - Math.sin(angle) * 14, 128 + Math.cos(angle) * 14); c.lineTo(128 + Math.sin(angle) * length, 128 - Math.cos(angle) * length); c.stroke();
      };
      hand(((hour % 12) + minute / 60) / 12 * Math.PI * 2, 58, 9);
      hand((minute / 60) * Math.PI * 2, 84, 5);
      c.beginPath(); c.arc(128, 128, 8, 0, 7); c.fill();
    });
    const lit = a.dialLit;
    const dialMat = new THREE.MeshStandardMaterial({
      color: '#ffffff', map: dialMap, roughness: 0.5, transparent: true, alphaTest: 0.5,
      emissive: lit ? '#fff1d0' : '#000000', emissiveMap: dialMap, emissiveIntensity: lit ? mix(0.35, 1.2, night) : 0,
    });
    for (let side = 0; side < 4; side++) {
      const an = (side * Math.PI) / 2;
      const dial = s.mesh(new THREE.CircleGeometry(1.7, 40), dialMat, [Math.sin(an) * (W / 2 + 0.32), clockY, Math.cos(an) * (W / 2 + 0.32)]);
      dial.rotation.y = an;
      dial.castShadow = false;
      const rim = s.ring(1.75, 0.14, [Math.sin(an) * (W / 2 + 0.34), clockY, Math.cos(an) * (W / 2 + 0.34)], granite);
      rim.rotation.y = an;
    }
    // Octagonal lantern stage, a small dome and the lightning rod.
    const lanternBase = shaftTop + 5.6;
    s.cylinder(3.1, 3.4, 0.6, [0, lanternBase, 0], granite, 8).rotation.y = Math.PI / 8;
    s.cylinder(2.7, 2.7, 3.4, [0, lanternBase + 2, 0], brickMat(8.5, 3.4), 8).rotation.y = Math.PI / 8;
    for (let i = 0; i < 8; i++) {
      const an = (i / 8) * Math.PI * 2;
      const g = new THREE.BoxGeometry(0.75, 1.9, 0.2); g.rotateY(an); g.translate(Math.sin(an) * 2.55, lanternBase + 2, Math.cos(an) * 2.55);
      s.mesh(g, glassWarm);
      add(new THREE.BoxGeometry(0.32, 3.4, 0.32), Math.sin(an + Math.PI / 8) * 2.72, lanternBase + 2, Math.cos(an + Math.PI / 8) * 2.72);
    }
    s.cylinder(3.0, 3.0, 0.5, [0, lanternBase + 3.9, 0], granite, 8).rotation.y = Math.PI / 8;
    s.lathe([[0, 0], [2.4, 0], [2.3, 0.6], [1.9, 1.4], [1.2, 2.0], [0.5, 2.35], [0.3, 2.6], [0, 2.7]], granite, [0, lanternBase + 4.15, 0]);
    s.ball([0.35, 0.35, 0.35], [0, lanternBase + 7, 0], s.material('#b8943c', { metalness: 0.7, roughness: 0.35 }), 12);
    s.rod([0, lanternBase + 6.8, 0], [0, lanternBase + 10.4, 0], 0.07, dark, 0.03);
    const top = lanternBase + 10.4;
    s.mesh(mergeGeometries(trims), granite);

    // The ground and what stands beside the tower in its era.
    const updates: ((time: number) => void)[] = [];
    const paveMap = canvasTexture(256, 256, (c) => {
      c.fillStyle = '#e8e2d6'; c.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { const g = 200 + Math.floor(random() * 40); c.fillStyle = `rgb(${g},${g - 4},${g - 12})`; c.fillRect(i * 32 + 1, j * 32 + 1, 30, 30); }
    });
    paveMap.repeat.set(6, 6);
    const paving = s.material(wet ? '#9c9a96' : '#d3cdc0', { map: paveMap, roughness: wet ? 0.12 : 0.9, metalness: wet ? 0.2 : 0 });
    const pad = a.era === 'today' ? 24 : 18;
    s.box([pad, 0.3, pad], [0, 0.15, 0], paving);
    if (a.era === 'today') {
      for (const [x, z] of [[-9, 8], [9, 8], [-9, -8], [9, -8]]) {
        s.cylinder(1.6, 1.7, 0.7, [x, 0.65, z], granite, 20);
        s.ball([1.4, 0.8, 1.4], [x, 1.3, z], s.material('#4f7a3c'), 12);
      }
      for (const x of [-6, 6]) {
        s.rod([x, 0.3, 10.5], [x, 4.6, 10.5], 0.08, dark);
        s.ball([0.3, 0.38, 0.3], [x, 4.9, 10.5], new THREE.MeshStandardMaterial({ color: '#fff3d6', emissive: '#ffd890', emissiveIntensity: mix(0.1, 1.5, night) }), 10);
      }
    } else if (a.era === 'station' || a.era === 'demolition') {
      // The arcaded station wing to the west and the long platform sheds behind it.
      const ruined = a.era === 'demolition';
      const wingLen = ruined ? 12 : 22, wingH = 11;
      const wx = -W / 2 - 0.6 - wingLen / 2;
      s.box([wingLen, wingH, 10], [wx, wingH / 2 + 0.3, -1.5], brickMat(wingLen, wingH));
      for (let i = 0; i < Math.floor(wingLen / 3.2); i++) {
        const x = wx - wingLen / 2 + 1.8 + i * 3.2;
        s.box([2.2, 4, 0.2], [x, 2.3, 3.55], dark);
        s.cylinder(1.1, 1.1, 0.2, [x, 4.3, 3.55], dark, 14).rotation.x = Math.PI / 2;
        s.box([1.4, 2.4, 0.2], [x, 7.8, 3.55], glassWarm);
      }
      s.box([wingLen + 0.4, 0.6, 10.4], [wx, wingH + 0.3, -1.5], granite);
      if (!ruined) {
        const roof = new THREE.CylinderGeometry(1, 1, 1, 3, 1); roof.rotateZ(Math.PI / 2); roof.rotateX(-Math.PI / 2);
        const r = s.mesh(roof, s.material('#5e5a54'), [wx, wingH + 2.2, -1.5]); r.scale.set(wingLen, 3.2, 5.6);
        for (let k = 0; k < 3; k++) {
          const prism = new THREE.CylinderGeometry(1, 1, 1, 3, 1); prism.rotateZ(Math.PI / 2); prism.rotateX(-Math.PI / 2);
          const shed = s.mesh(prism, s.material('#6d6a63', { metalness: 0.3 }), [wx - 4, 5.2, -10 - k * 6]);
          shed.scale.set(30, 1.6, 3.4);
          for (let p = 0; p < 7; p++) s.rod([wx - 18 + p * 4.6, 0.3, -10 - k * 6 + 2.5], [wx - 18 + p * 4.6, 4.3, -10 - k * 6 + 2.5], 0.12, dark);
        }
      } else {
        const rubble = s.material(new THREE.Color(paintHex(a.brick)).lerp(new THREE.Color('#8a837a'), 0.45), { roughness: 1, flatShading: true });
        for (let i = 0; i < 6; i++) {
          const heap = s.mesh(new THREE.ConeGeometry(2 + random() * 2.5, 1.5 + random() * 2, 9), rubble, [wx - wingLen / 2 - 3 - random() * 10, 1, -4 + random() * 9]);
          heap.rotation.y = random() * 3;
        }
        s.box([0.8, 6, 6], [wx - wingLen / 2, 3.3, -1.5], brickMat(1, 6));
      }
    } else if (scarred) {
      const sand = s.material('#a8936a', { roughness: 1 });
      const bags: { at: [number, number, number]; size: number }[] = [];
      for (let row = 0; row < 3; row++) for (let i = 0; i < 7; i++) bags.push({ at: [-3 + i * 1 + (row % 2) * 0.5, 0.55 + row * 0.42, W / 2 + 2.3], size: 1 });
      const bag = new THREE.SphereGeometry(1, 10, 6); bag.scale(0.52, 0.22, 0.34);
      s.scatter(bag, sand, bags);
      s.box([2.4, 0.15, 2.4], [0, shaftTop + 5.7, W / 2 - 0.6], dark).rotation.x = 0.2;
    }

    // Pigeons along the cornices.
    if (a.pigeons) {
      const body = new THREE.SphereGeometry(1, 8, 6); body.scale(0.13, 0.12, 0.2);
      const head = new THREE.SphereGeometry(0.07, 6, 5); head.translate(0, 0.12, 0.14);
      const bird = mergeGeometries([body.toNonIndexed(), head.toNonIndexed()]);
      const flock: { at: [number, number, number]; size: number; color: string }[] = [];
      for (const y of [shaftTop + 0.33, shaftTop + 5.6, 3.05]) for (let i = 0; i < 9; i++) {
        const side = Math.floor(random() * 4), u = (random() - 0.5) * (W - 0.6);
        const d = W / 2 + (y > 3.2 ? 0.25 : 0.5);
        const at: [number, number, number] = side === 0 ? [u, y + 0.12, d] : side === 1 ? [d, y + 0.12, u] : side === 2 ? [u, y + 0.12, -d] : [-d, y + 0.12, u];
        flock.push({ at, size: 1.4, color: random() < 0.75 ? '#8b8f98' : random() < 0.5 ? '#e6e2da' : '#5a4a42' });
      }
      s.scatter(bird, s.material('#ffffff', { roughness: 0.9 }), flock);
    }

    // Bunting on lines from the cupola down to the plaza corners.
    if (a.bunting !== 'none') {
      const lineMat = s.material('#3a3632');
      const palette = a.bunting === 'flags' ? ['#d8322c', '#f2c21c', '#2b6fb8', '#2e8b57', '#f4f1e8'] : a.bunting === 'lanterns' ? ['#d01f1f', '#c41818', '#e02828'] : ['#f2a218', '#d8322c', '#f4e3a0', '#e05a9a', '#53b0d6'];
      const pennant = new THREE.BufferGeometry();
      pennant.setAttribute('position', new THREE.Float32BufferAttribute([-0.3, 0, 0, 0.3, 0, 0, 0, -0.6, 0], 3));
      pennant.computeVertexNormals();
      const lantern = new THREE.SphereGeometry(0.32, 10, 8); lantern.scale(1, 1.15, 1); lantern.translate(0, -0.35, 0);
      const marks: { at: [number, number, number]; size: number; color: string }[] = [];
      const corner = pad / 2 - 0.6;
      for (const [cx, cz] of [[corner, corner], [-corner, corner], [corner, -corner], [-corner, -corner]]) {
        const from = new THREE.Vector3(Math.sign(cx) * 2.2, lanternBase + 3.6, Math.sign(cz) * 2.2);
        const to = new THREE.Vector3(cx, 4.5, cz);
        const pts: THREE.Vector3[] = [];
        for (let i = 0; i <= 16; i++) { const u = i / 16; const p = from.clone().lerp(to, u); p.y -= Math.sin(u * Math.PI) * 3.5; pts.push(p); }
        s.mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 32, 0.04, 4), lineMat).castShadow = false;
        s.rod([cx, 0.3, cz], [cx, 4.6, cz], 0.1, lineMat);
        const n = a.bunting === 'flags' ? 22 : 9;
        for (let i = 1; i < n; i++) {
          const u = i / n; const p = from.clone().lerp(to, u); p.y -= Math.sin(u * Math.PI) * 3.5;
          marks.push({ at: [p.x, p.y, p.z], size: a.bunting === 'flags' ? 1 : 1 + random() * 0.4, color: palette[Math.floor(random() * palette.length)] });
        }
      }
      const isFlag = a.bunting === 'flags';
      const markMat = new THREE.MeshStandardMaterial({
        color: '#ffffff', side: THREE.DoubleSide, roughness: 0.7,
        emissive: isFlag ? '#000000' : '#ff7a3a', emissiveIntensity: isFlag ? 0 : mix(0.15, 1.2, night),
      });
      const strung = s.scatter(isFlag ? pennant : lantern, markMat, marks);
      strung.castShadow = false;
      updates.push((time) => { strung.rotation.y = Math.sin(time * mix(0.4, 2.5, mood.energy)) * 0.004; });
    }

    // Rain: streaks hanging in the air over the plaza.
    if (wet) {
      const streak = new THREE.BoxGeometry(0.02, 1.4, 0.02);
      const drops: { at: [number, number, number]; size: number }[] = [];
      for (let i = 0; i < 260; i++) drops.push({ at: [(random() - 0.5) * pad, 1 + random() * top, (random() - 0.5) * pad], size: 1 });
      const rain = s.scatter(streak, new THREE.MeshStandardMaterial({ color: '#c9d6e0', transparent: true, opacity: 0.45, depthWrite: false }), drops);
      rain.castShadow = false;
      updates.push((time) => { rain.position.y = -((time * mix(6, 14, mood.energy)) % 4); });
    }

    return s.finish({ footprint: W / 2 + 1, update: (_dt, time) => { for (const fn of updates) fn(time); } });
  },
});
