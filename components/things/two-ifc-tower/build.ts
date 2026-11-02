import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Sculpture, choice, defineThing, mix, noul, paint, paintHex, paintIsMetal } from '@conjure/kit';

const canvasTexture = (w: number, h: number, draw: (c: CanvasRenderingContext2D) => void, repeat = true) => {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  if (repeat) texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  return texture;
};

/** A square plan with a square notch cut out of every corner: the stepped corners of the shaft. */
const notchedPlan = (w: number, n: number) => {
  const pts = [[-w + n, -w], [w - n, -w], [w - n, -w + n], [w, -w + n], [w, w - n], [w - n, w - n], [w - n, w], [-w + n, w], [-w + n, w - n], [-w, w - n], [-w, -w + n], [-w + n, -w + n]];
  return new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
};

export default defineThing({
  questions: {
    cladding: paint('What colour is the tower cladding?', ['silver', 'white', 'grey', 'cream', 'sky', 'gold', 'charcoal', 'pink', 'navy']),
    crown: choice('How is the crown of fins lit?', {
      dark: 'Unlit: the open fins stand pale against the sky.',
      wash: 'Floodlit from inside in a wash of colour, a glowing coronet.',
      tips: 'Only the tips of the fins lit, a ring of sparks at the summit.',
    }),
    wash: paint('If the crown is lit, what colour is its light?', ['white', 'gold', 'magenta', 'turquoise', 'red', 'lavender', 'lime', 'amber', 'sky']),
    face: choice('Is anything projected or lit on the tower face?', {
      none: 'Nothing: just the pinstriped glass and its offices.',
      countdown: 'A giant New Year countdown number blazing down one face.',
      newyear: 'The new year in huge lit digits with bursts of fireworks around it.',
      ribbons: 'Vertical ribbons of coloured light running up the corners.',
    }),
    fog: choice('What is the weather doing to the tower?', {
      clear: 'Clear air: the whole tower stands sharp.',
      lid: 'Low typhoon cloud sliced off the top: the crown has vanished into grey.',
      sash: 'A sash of mist wrapped round its middle, the top floating above it.',
    }),
    stage: choice('Is the tower finished?', {
      finished: 'Finished, as it has stood since 2003.',
      topping: 'Topping out: the crown not yet built, a steel cage at the top and a tower crane on it.',
      rising: 'Halfway up: a concrete core and bare floors climbing out of the glass, a crane on top.',
    }),
    gondola: noul('Is a window-cleaning gondola hanging on the front face?'),
    blackout: noul('Are the lights out in a power cut, the whole tower dark?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const lowSun = Math.abs(mood.daylight - 0.5) * 2;
    const night = a.blackout ? 0 : Math.min(1, Math.max(0, (lowSun - 0.35) / 0.65));
    const glow = a.blackout ? 0 : Math.max(night, 0.35);

    const tileW = 12, tileH = 16;
    const pin = canvasTexture(96, 128, (c) => {
      c.fillStyle = '#c9d2da'; c.fillRect(0, 0, 96, 128);
      for (let row = 0; row < 4; row++) for (let col = 0; col < 8; col++) {
        const tone = 190 + Math.floor(random() * 40);
        c.fillStyle = `rgb(${tone - 8},${tone},${tone + 10})`;
        c.fillRect(col * 12 + 3, row * 32 + 3, 8, 28);
      }
      c.fillStyle = '#f7f8f8';
      for (let col = 0; col < 8; col++) c.fillRect(col * 12, 0, 3, 128);
      c.fillStyle = 'rgba(90,96,104,0.4)';
      for (let row = 0; row < 4; row++) c.fillRect(0, row * 32, 96, 2);
      for (let i = 0; i < Math.round(mood.wear * 30); i++) { c.fillStyle = `rgba(80,70,60,${0.1 + random() * 0.2})`; c.fillRect(random() * 96, random() * 128, 2, 20 + random() * 50); }
    });
    const share = 0.2 + mood.density * 0.5;
    const lit = canvasTexture(96, 128, (c) => {
      c.fillStyle = '#000'; c.fillRect(0, 0, 96, 128);
      for (let row = 0; row < 4; row++) {
        const on = random() < share;
        for (let col = 0; col < 8; col++) if (on ? random() < 0.85 : random() < 0.1) {
          c.fillStyle = random() < 0.75 ? '#fff0c8' : '#d6ebff';
          c.fillRect(col * 12 + 4, row * 32 + 6, 6, 22);
        }
      }
    });
    pin.repeat.set(1 / tileW, 1 / tileH);
    lit.repeat.set(1 / tileW, 1 / tileH);
    const cladHex = paintHex(a.cladding);
    const metal = paintIsMetal(a.cladding);
    const body = s.material(cladHex, { map: pin, emissive: '#ffe6b8', emissiveMap: lit, emissiveIntensity: mix(0, 1.3, night), metalness: metal ? 0.75 : 0.35, roughness: 0.3 });
    const finHex = new THREE.Color(cladHex).lerp(new THREE.Color('#ffffff'), 0.25);
    const washHex = paintHex(a.wash);
    const fins = s.material(finHex, {
      metalness: 0.45, roughness: 0.35,
      emissive: a.crown === 'wash' ? washHex : '#000000',
      emissiveIntensity: a.crown === 'wash' ? mix(0.45, 1.6, glow) : 0,
    });
    const concrete = s.material('#a7a49b', { roughness: 0.9 });
    const dark = s.material('#2c3035', { metalness: 0.4 });
    const steel = s.material('#5d6167', { metalness: 0.5, roughness: 0.6 });

    // The shaft in five set-back stages: the corner notches deepen as it climbs.
    const stages = [[0, 205, 28, 4], [205, 285, 27, 5], [285, 335, 25.6, 7.2], [335, 368, 24, 9.4], [368, 384, 22.4, 11.6]] as const;
    const topBuilt = { finished: 384, topping: 368, rising: 212 }[a.stage];
    const glassTop = { finished: 384, topping: 340, rising: 176 }[a.stage];
    for (const [y0, y1, w, n] of stages) {
      const top = Math.min(y1, glassTop);
      if (top <= y0) continue;
      const g = new THREE.ExtrudeGeometry(notchedPlan(w, n), { depth: top - y0, bevelEnabled: false });
      g.rotateX(-Math.PI / 2);
      s.mesh(g, body, [0, y0, 0]);
      s.box([2 * w + 0.6, 1.2, 2 * (w - n) + 0.6], [0, top, 0], steel);
      s.box([2 * (w - n) + 0.6, 1.2, 2 * w + 0.6], [0, top, 0], steel);
    }
    // Bare frame above the glass: floor plates on columns, the core rising through.
    const top = topBuilt;
    if (a.stage !== 'finished') {
      const plates: THREE.BufferGeometry[] = [];
      const wAt = (y: number) => stages.find(([y0, y1]) => y >= y0 && y < y1)?.[2] ?? 22;
      for (let y = glassTop + 5; y <= top; y += 5) {
        const w = wAt(y) - 0.5;
        const p = new THREE.BoxGeometry(2 * w, 0.8, 2 * w); p.translate(0, y, 0); plates.push(p);
      }
      for (const x of [-1, -0.33, 0.33, 1]) for (const z of [-1, 1]) {
        const w = wAt(glassTop + 1) - 1;
        const col = new THREE.BoxGeometry(1.4, top - glassTop, 1.4); col.translate(x * w, (top + glassTop) / 2, z * w); plates.push(col);
        const col2 = new THREE.BoxGeometry(1.4, top - glassTop, 1.4); col2.translate(z * w, (top + glassTop) / 2, x * w); plates.push(col2);
      }
      s.mesh(mergeGeometries(plates), concrete);
      s.box([22, top - glassTop + 14, 22], [0, glassTop + (top - glassTop + 14) / 2, 0], concrete);
      const yellow = s.material('#e3ac20');
      const craneBase = top + 14;
      s.box([3, 38, 3], [6, craneBase + 19, -4], yellow);
      const jib = new THREE.Group();
      jib.position.set(6, craneBase + 38, -4);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(56, 2, 2), yellow); arm.position.x = 16; arm.castShadow = true; jib.add(arm);
      const weight = new THREE.Mesh(new THREE.BoxGeometry(6, 4, 4), concrete); weight.position.set(-10, -1, 0); jib.add(weight);
      const line = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 30, 6), dark); line.position.set(34, -15, 0); jib.add(line);
      jib.rotation.y = random() * Math.PI * 2;
      s.root.add(jib);
    }

    // The crown: an open ring of tall fins, highest at the corners, leaning out like claws.
    let crownTop = top;
    const tipLights: THREE.BufferGeometry[] = [];
    if (a.stage === 'finished') {
      const finGeoms: THREE.BufferGeometry[] = [];
      const w = 21.6;
      const per = 9;
      for (let side = 0; side < 4; side++) {
        const rot = new THREE.Matrix4().makeRotationY(side * Math.PI / 2);
        for (let i = 0; i <= per; i++) {
          const u = -1 + (2 * i) / per;
          const h = 22 + 30 * Math.pow(Math.abs(u), 1.4) + (i % 2 ? 0 : 6);
          const fin = new THREE.CylinderGeometry(0.35, 1.3, h, 4, 1);
          fin.scale(1, 1, 2.2);
          fin.translate(0, h / 2, 0);
          fin.applyMatrix4(new THREE.Matrix4().makeRotationX(0.09));
          fin.translate(u * (w - 1.5), top, w);
          fin.applyMatrix4(rot);
          finGeoms.push(fin);
          crownTop = Math.max(crownTop, top + h);
          if (a.crown === 'tips') {
            const tip = new THREE.SphereGeometry(1.1, 8, 6);
            tip.translate(u * (w - 1.5), top + h * Math.cos(0.09), w + h * Math.sin(0.09));
            tip.applyMatrix4(rot);
            tipLights.push(tip);
          }
        }
      }
      s.mesh(mergeGeometries(finGeoms.map((g) => g.toNonIndexed())), fins);
      s.box([2 * w - 4, 6, 2 * w - 4], [0, top + 3, 0], steel);
      if (tipLights.length) {
        const sparkMat = new THREE.MeshStandardMaterial({ color: washHex, emissive: washHex, emissiveIntensity: mix(1.2, 2.6, glow) });
        s.mesh(mergeGeometries(tipLights), sparkMat).castShadow = false;
      }
      if (a.crown === 'wash' && glow > 0) {
        const halo = new THREE.MeshBasicMaterial({ color: washHex, transparent: true, opacity: 0.22 * glow, depthWrite: false, side: THREE.DoubleSide });
        s.cylinder(30, 22, 34, [0, top + 18, 0], halo, 24).castShadow = false;
      }
    }

    // The face: a countdown, the new year or ribbons of light.
    const updates: ((time: number) => void)[] = [];
    if (a.face !== 'none' && !a.blackout) {
      const w = 28;
      if (a.face === 'ribbons') {
        const ribbonMat = new THREE.MeshStandardMaterial({ color: washHex, emissive: washHex, emissiveIntensity: 1.8 });
        const ribbons: THREE.BufferGeometry[] = [];
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
          const rTop = Math.min(204, glassTop), rH = rTop - 30;
          const r = new THREE.BoxGeometry(1.2, rH, 1.2); r.translate(sx * (w - 4), 30 + rH / 2, sz * (w + 0.4)); ribbons.push(r);
          const q = new THREE.BoxGeometry(1.2, rH, 1.2); q.translate(sx * (w + 0.4), 30 + rH / 2, sz * (w - 4)); ribbons.push(q);
        }
        s.mesh(mergeGeometries(ribbons), ribbonMat).castShadow = false;
        updates.push((time) => { ribbonMat.emissiveIntensity = 1.2 + Math.sin(time * mix(0.8, 4, mood.energy)) * 0.8; });
      } else {
        const text = a.face === 'countdown' ? String(1 + Math.floor(random() * 10)) : '2027';
        const map = canvasTexture(256, 512, (c) => {
          c.fillStyle = '#000'; c.fillRect(0, 0, 256, 512);
          if (a.face === 'newyear') {
            for (let b = 0; b < 5; b++) {
              const bx = random() * 256, by = random() * 512, hue = Math.floor(random() * 360);
              c.strokeStyle = `hsl(${hue},90%,65%)`; c.lineWidth = 3;
              for (let r = 0; r < 14; r++) { const an = (r / 14) * Math.PI * 2; c.beginPath(); c.moveTo(bx + Math.cos(an) * 8, by + Math.sin(an) * 8); c.lineTo(bx + Math.cos(an) * 34, by + Math.sin(an) * 34); c.stroke(); }
            }
            c.fillStyle = '#ffffff'; c.textAlign = 'center'; c.textBaseline = 'middle';
            c.font = 'bold 92px sans-serif';
            text.split('').forEach((ch, i) => c.fillText(ch, 128, 90 + i * 112));
          } else {
            c.fillStyle = '#ffffff'; c.textAlign = 'center'; c.textBaseline = 'middle';
            c.font = `bold ${text.length > 1 ? 200 : 380}px sans-serif`;
            c.fillText(text, 128, 270, 240);
          }
        }, false);
        const screen = new THREE.MeshStandardMaterial({ color: '#000000', emissive: '#ffffff', emissiveMap: map, emissiveIntensity: 1.6, roughness: 0.6 });
        const tint = a.face === 'countdown' ? washHex : '#ffffff';
        screen.emissive.set(tint);
        const sTop = Math.min(200, glassTop - 4), sH = Math.min(150, sTop - 40);
        const plane = s.mesh(new THREE.PlaneGeometry(2 * (w - 4) - 2, sH), screen, [0, sTop - sH / 2, w + 0.35]);
        plane.castShadow = false;
      }
    }

    // Gondola hanging on the front face.
    if (a.gondola && a.stage === 'finished') {
      const y = mix(90, 260, random()), x = (random() - 0.5) * 20;
      s.box([10, 2.4, 2], [x, y, 28 + 1.6], s.material('#e1ddd2', { metalness: 0.3 }));
      for (const dx of [-4, 4]) s.rod([x + dx, y + 1.2, 28 + 1.6], [x + dx, 205, 28 + 1.6], 0.12, dark);
    }

    // The podium: the low mall that runs to the waterfront, with its glass atrium.
    s.box([96, 26, 74], [0, 13, 6], s.material('#cfccc3', { roughness: 0.7 }));
    s.box([97, 2, 75], [0, 26, 6], s.material('#e2dfd7'));
    s.box([40, 18, 1], [0, 13, 43.4], s.material('#6f8494', { metalness: 0.6, roughness: 0.2, emissive: '#ffe1a8', emissiveIntensity: mix(0, 0.9, night) }));
    for (let i = 0; i < 7; i++) s.box([0.8, 18, 1.4], [-18 + i * 6, 13, 43.6], steel);

    // Weather: cloud cuts the summit, or a sash of mist round the middle.
    if (a.fog !== 'clear') {
      const cloud = new THREE.MeshStandardMaterial({ color: '#d9dcdf', transparent: true, opacity: a.fog === 'lid' ? 0.6 : 0.5, depthWrite: false, roughness: 1 });
      const band = a.fog === 'lid' ? [crownTop - mix(50, 80, random()), crownTop + 25] : [top * 0.42, top * 0.52];
      const puffs: THREE.BufferGeometry[] = [];
      const count = a.fog === 'lid' ? 70 : 44;
      for (let i = 0; i < count; i++) {
        const an = random() * Math.PI * 2, rr = 18 + random() * 42;
        const g = new THREE.SphereGeometry(1, 18, 10);
        const size = 9 + random() * 10;
        g.scale(size * 2.2, size * 0.45, size * 1.8);
        g.translate(Math.cos(an) * rr, mix(band[0], band[1], random()), Math.sin(an) * rr);
        puffs.push(g);
      }
      const cloudMesh = s.mesh(mergeGeometries(puffs), cloud);
      cloudMesh.castShadow = false;
      updates.push((time) => { cloudMesh.rotation.y = time * 0.01 * (0.5 + mood.energy); });
    }

    return s.finish({
      footprint: 36,
      update: (_dt, time) => { for (const fn of updates) fn(time); },
    });
  },
});
