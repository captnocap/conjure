import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

type P = [number, number, number];

function paint(w: number, h: number, draw: (c: CanvasRenderingContext2D, w: number, h: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext('2d')!, w, h);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/** A strip of paper hanging along a curve: the width runs along x, the strip bends in y and z. */
function ribbon(points: P[], width: number, segments = 48) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  const positions: number[] = [], uvs: number[] = [], indices: number[] = [];
  for (let i = 0; i <= segments; i++) {
    const p = curve.getPointAt(i / segments);
    positions.push(p.x - width / 2, p.y, p.z, p.x + width / 2, p.y, p.z);
    uvs.push(0, i / segments, 1, i / segments);
    if (i < segments) indices.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

const LED: Record<'red' | 'amber' | 'green' | 'ice', string> = { red: '#ff2a1e', amber: '#ffa21c', green: '#43ff5a', ice: '#bfe6ff' };

export default defineThing({
  questions: {
    reads: choice('What does the NOW SERVING display read?', {
      billions: 'A nine-digit number, far beyond any ticket ever printed.',
      infinity: 'The infinity symbol, calmly lit.',
      never: 'The word NEVER.',
      zero: 'A single zero. Nobody has been served yet.',
      oneoff: 'A small number exactly one less than the ticket hanging from the dispenser below. So close.',
      error: 'ERR, with the rest of the digits dead.',
    }),
    colour: choice('What colour are the LEDs?', {
      red: 'Classic hot red seven-segment LEDs.',
      amber: 'Amber, an old deli counter.',
      green: 'Sickly green, a hospital corridor.',
      ice: 'Cold blue-white, modern and pitiless.',
    }),
    flicker: noul('Is one digit flickering, about to die?'),
    notice: choice('What sign hangs under the display?', {
      wait: 'PLEASE WAIT TO BE CALLED.',
      exceptions: 'NO EXCEPTIONS.',
      estimate: 'ESTIMATED WAIT: ETERNITY.',
      hope: 'ABANDON HOPE, TAKE A NUMBER.',
      none: 'No sign at all.',
    }),
    tail: choice('What is coming out of the ticket dispenser?', {
      one: 'One neat ticket hanging from the mouth, waiting to be torn.',
      curl: 'A long tail of tickets curling down and pooling on the floor.',
      empty: 'Nothing: the roll is out and a handwritten note is taped over the slot.',
    }),
    mount: choice('What is it mounted on?', {
      panel: 'A section of beige municipal wall tile.',
      post: 'A tall steel post with a round weighted foot.',
      pillar: 'A square concrete pillar, stained at the base.',
    }),
    floor: choice('What lies on the floor beneath it?', {
      clean: 'Nothing. Swept.',
      few: 'A few torn tickets.',
      drift: 'A drift of hundreds of abandoned numbers.',
      ash: 'A heap of ash where the tickets were burned, a few embers still going.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const steel = s.material('#b8bec2', { metalness: 0.8, roughness: 0.32 });
    const dark = s.material('#1b1d20', { roughness: 0.5 });
    const red = s.material('#c4232a', { roughness: 0.35 });
    const led = LED[a.colour];
    const glow = mix(0.9, 1.6, mood.cheer * 0.4 + 0.6);

    // ---- Mount ----
    const displayY = 1.95, dispenserY = 1.22;
    let frontZ = 0.05; // where things attach
    if (a.mount === 'panel') {
      const grout = mix(0.0, 0.5, mood.wear);
      const tiles = paint(256, 440, (c, w, h) => {
        c.fillStyle = '#d9cfb4'; c.fillRect(0, 0, w, h);
        for (let y = 0; y < h; y += 44) for (let x = 0; x < w; x += 44) {
          c.fillStyle = `hsl(42, ${28 + random() * 10}%, ${78 + random() * 6 - grout * 10}%)`;
          c.fillRect(x + 2, y + 2, 40, 40);
        }
        for (let k = 0; k < grout * 18; k++) { c.fillStyle = 'rgba(70,50,30,0.25)'; c.fillRect(random() * w, h * 0.6 + random() * h * 0.4, 6 + random() * 30, 3 + random() * 14); }
      });
      const plain = s.material('#cfc5aa');
      const face = new THREE.MeshStandardMaterial({ map: tiles, roughness: 0.6 });
      const slab = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.4, 0.1), [plain, plain, plain, plain, face, plain]);
      slab.position.set(0, 1.2, 0);
      slab.castShadow = slab.receiveShadow = true;
      s.root.add(slab);
      s.box([1.44, 0.14, 0.13], [0, 0.07, 0], dark);
    } else if (a.mount === 'post') {
      s.lathe([[0, 0], [0.24, 0], [0.25, 0.025], [0.2, 0.05], [0.05, 0.08], [0.035, 0.14], [0, 0.14]], dark);
      s.cylinder(0.03, 0.03, 2.3, [0, 1.16, 0], steel, 16);
      s.cylinder(0.045, 0.045, 0.04, [0, 2.3, 0], dark, 16);
      frontZ = 0.03;
    } else {
      const concrete = s.material('#a7a49b', { roughness: 0.95 });
      s.box([0.5, 2.5, 0.5], [0, 1.25, -0.2], concrete);
      s.box([0.52, 0.5, 0.52], [0, 0.25, -0.2], s.material(new THREE.Color('#8b877c').lerp(new THREE.Color('#5a5047'), mood.wear), { roughness: 1 }));
      frontZ = 0.05;
    }

    // ---- Display ----
    const text = { billions: String(100_000_000 + Math.floor(random() * 899_999_999)), infinity: '∞', never: 'NEVER', zero: '0', oneoff: '', error: 'ERR88' }[a.reads];
    const dimFrom = a.reads === 'error' ? 3 : Infinity;
    const served = 11 + Math.floor(random() * 80);
    const shown = a.reads === 'oneoff' ? String(served) : text;
    const ticketNumber = a.reads === 'oneoff' ? served + 1 : 100 + Math.floor(random() * 880);
    const boxW = 1.2, boxH = 0.42;
    const bracket = (y: number, h: number) => {
      for (const x of [-0.3, 0.3]) s.box([0.04, 0.04, 0.12], [x, y, frontZ + 0.06], steel);
      void h;
    };
    bracket(displayY, boxH);
    s.box([boxW, boxH, 0.1], [0, displayY, frontZ + 0.17], dark);
    s.box([boxW + 0.03, 0.02, 0.11], [0, displayY + boxH / 2, frontZ + 0.17], steel);
    // Which digit flickers, if any.
    const flickerAt = a.flicker && shown.length > 1 ? Math.floor(random() * Math.min(shown.length, dimFrom)) : a.flicker ? 0 : -1;
    const drawDisplay = (c: CanvasRenderingContext2D, w: number, h: number, only: number | null) => {
      c.clearRect(0, 0, w, h);
      if (only === null) { c.fillStyle = '#0a0506'; c.fillRect(0, 0, w, h); }
      c.textBaseline = 'middle';
      c.textAlign = 'center';
      c.fillStyle = led;
      c.shadowColor = led; c.shadowBlur = 14;
      if (only === null) {
        c.font = 'bold 40px sans-serif';
        c.fillText('NOW SERVING', w / 2, 44);
      }
      const big = shown.length > 6 ? 150 : shown.length > 3 ? 220 : 270;
      c.font = `bold ${big}px monospace`;
      const advance = c.measureText('0').width;
      const start = w / 2 - (advance * (shown.length - 1)) / 2;
      for (let i = 0; i < shown.length; i++) {
        if (only === null && i === flickerAt) continue;
        if (only !== null && i !== only) continue;
        c.globalAlpha = i >= dimFrom ? 0.14 : 1;
        if (shown[i] === '∞') {
          // Monospace fonts draw the symbol tiny: two fat stroked loops instead.
          c.lineWidth = 34; c.strokeStyle = led;
          for (const dx of [-80, 80]) { c.beginPath(); c.ellipse(w / 2 + dx, h * 0.63, 78, 62, 0, 0, Math.PI * 2); c.stroke(); }
        } else c.fillText(shown[i], start + i * advance, h * 0.63);
      }
      c.globalAlpha = 1;
      c.shadowBlur = 0;
      // Dot-matrix grid over the whole face.
      if (only === null) {
        c.fillStyle = 'rgba(0,0,0,0.5)';
        for (let x = 0; x < w; x += 7) c.fillRect(x, 0, 2, h);
        for (let y = 0; y < h; y += 7) c.fillRect(0, y, w, 2);
      }
    };
    const faceMap = paint(1024, 358, (c, w, h) => drawDisplay(c, w, h, null));
    const faceMat = new THREE.MeshStandardMaterial({ map: faceMap, emissive: '#ffffff', emissiveMap: faceMap, emissiveIntensity: glow, roughness: 0.4 });
    const face = s.mesh(new THREE.PlaneGeometry(boxW - 0.06, boxH - 0.04), faceMat, [0, displayY, frontZ + 0.221]);
    face.castShadow = false;
    let flickerMat: THREE.MeshStandardMaterial | null = null;
    if (flickerAt >= 0) {
      const digitMap = paint(1024, 358, (c, w, h) => drawDisplay(c, w, h, flickerAt));
      flickerMat = new THREE.MeshStandardMaterial({ map: digitMap, emissive: '#ffffff', emissiveMap: digitMap, emissiveIntensity: glow, transparent: true, depthWrite: false, roughness: 0.4 });
      const digit = s.mesh(new THREE.PlaneGeometry(boxW - 0.06, boxH - 0.04), flickerMat, [0, displayY, frontZ + 0.222]);
      digit.castShadow = false;
    }

    // ---- Sign under the display ----
    if (a.notice !== 'none') {
      const words = { wait: 'PLEASE WAIT TO BE CALLED', exceptions: 'NO EXCEPTIONS', estimate: 'ESTIMATED WAIT: ETERNITY', hope: 'ABANDON HOPE, TAKE A NUMBER', none: '' }[a.notice];
      const y = displayY - boxH / 2 - 0.16;
      for (const x of [-0.3, 0.3]) s.rod([x, displayY - boxH / 2, frontZ + 0.17], [x, y + 0.05, frontZ + 0.17], 0.004, steel);
      s.box([0.82, 0.12, 0.012], [0, y, frontZ + 0.17], s.material('#f1ead6'));
      s.label(words, 0.78, 0.1, [0, y, frontZ + 0.177], a.notice === 'hope' ? '#8c1a1a' : '#23252b', '#f1ead6');
    }

    // ---- Dispenser ----
    const dz = frontZ + 0.09;
    s.box([0.26, 0.17, 0.16], [0, dispenserY, dz], red);
    s.box([0.27, 0.02, 0.17], [0, dispenserY + 0.085, dz], s.material('#8d1419'));
    s.box([0.2, 0.05, 0.05], [0, dispenserY - 0.06, dz + 0.095], red); // the lip
    s.box([0.15, 0.012, 0.02], [0, dispenserY - 0.08, dz + 0.11], dark); // the slot
    s.label('TAKE ONE', 0.18, 0.05, [0, dispenserY + 0.02, dz + 0.081], '#fbeedd', '#c4232a');
    for (const x of [-0.09, 0.09]) s.cylinder(0.008, 0.008, 0.006, [x, dispenserY + 0.055, dz + 0.081], steel, 8).rotation.x = Math.PI / 2;

    const ticketMat = (n: number, count: number) => new THREE.MeshStandardMaterial({
      side: THREE.DoubleSide, roughness: 0.9,
      map: (() => {
        const t = paint(128, 128 * count, (c, w, h) => {
          const paper = new THREE.Color('#f5c6d4').lerp(new THREE.Color('#d6c59c'), mood.wear * 0.6);
          c.fillStyle = `#${paper.getHexString()}`; c.fillRect(0, 0, w, h);
          c.fillStyle = '#2b2530'; c.textAlign = 'center'; c.textBaseline = 'middle';
          for (let i = 0; i < count; i++) {
            const y0 = h - (i + 1) * 128;
            c.font = 'bold 64px monospace'; c.fillText(String(n + i), w / 2, y0 + 66);
            c.font = 'bold 13px sans-serif'; c.fillText('YOUR NUMBER', w / 2, y0 + 22);
            c.setLineDash([5, 5]); c.strokeStyle = '#2b2530'; c.lineWidth = 2;
            c.beginPath(); c.moveTo(0, y0 + 2); c.lineTo(w, y0 + 2); c.stroke();
          }
        });
        return t;
      })(),
    });
    const mouth: P = [0, dispenserY - 0.085, dz + 0.11];
    if (a.tail === 'one') {
      const geometry = ribbon([mouth, [0, mouth[1] - 0.04, mouth[2] + 0.015], [0, mouth[1] - 0.1, mouth[2] + 0.035]], 0.07, 12);
      s.mesh(geometry, ticketMat(ticketNumber, 1));
    } else if (a.tail === 'curl') {
      // Falls, then coils on the floor in front.
      const pts: P[] = [mouth, [0, mouth[1] - 0.2, mouth[2] + 0.04], [0.02, 0.6, mouth[2] + 0.1]];
      const coilZ = mouth[2] + 0.32;
      for (let i = 0; i < 18; i++) {
        const t = i / 17, ang = t * Math.PI * 3.4;
        pts.push([Math.sin(ang * 0.5) * 0.04, mix(0.3, 0.02, t), coilZ + Math.cos(ang) * 0.16 * (1 - t * 0.3) + 0.05]);
      }
      const count = 10;
      const strip = s.mesh(ribbon(pts, 0.07, 120), ticketMat(ticketNumber, count));
      (strip.material as THREE.MeshStandardMaterial).map!.wrapT = THREE.RepeatWrapping;
      (strip.material as THREE.MeshStandardMaterial).map!.repeat.set(1, 1);
    } else {
      const note = s.label('OUT OF TICKETS', 0.19, 0.07, [0.02, dispenserY - 0.07, dz + 0.122], '#a01818', '#f4efd9');
      note.rotation.z = (random() - 0.5) * 0.2;
      for (const x of [-0.07, 0.07]) s.box([0.03, 0.016, 0.002], [0.02 + x, dispenserY - 0.035, dz + 0.124], s.material('#d8cfa2', { transparent: true, opacity: 0.8 }));
    }

    // ---- Floor ----
    const floorZ = frontZ + 0.3;
    if (a.floor === 'few' || a.floor === 'drift') {
      const n = a.floor === 'few' ? 3 + Math.floor(random() * 4) : 90 + Math.floor(random() * 60);
      const spread = a.floor === 'few' ? 0.3 : 0.55;
      const pink = new THREE.MeshStandardMaterial({ color: '#f0bccb', roughness: 0.9, side: THREE.DoubleSide });
      const mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.06, 0.08), pink, n);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
      for (let i = 0; i < n; i++) {
        const r = Math.sqrt(random()) * spread, t = random() * Math.PI * 2;
        e.set(-Math.PI / 2 + (random() - 0.5) * 0.5, random() * Math.PI, 0);
        m.compose(new THREE.Vector3(Math.sin(t) * r * 1.4, 0.003 + (a.floor === 'drift' ? random() * 0.06 * (1 - r / spread) : 0), floorZ + Math.cos(t) * r), q.setFromEuler(e), new THREE.Vector3(1, 1, 1));
        mesh.setMatrixAt(i, m);
      }
      mesh.instanceMatrix.needsUpdate = true;
      mesh.castShadow = mesh.receiveShadow = true;
      s.root.add(mesh);
    } else if (a.floor === 'ash') {
      s.lathe([[0, 0], [0.34, 0], [0.26, 0.05], [0.14, 0.1], [0.04, 0.13], [0, 0.135]], s.material('#4a4744', { roughness: 1 }), [0.02, 0, floorZ]);
      const ember = new THREE.MeshStandardMaterial({ color: '#ff8a2a', emissive: '#ff5a10', emissiveIntensity: 2.2 });
      s.scatter(new THREE.SphereGeometry(1, 6, 5), ember, Array.from({ length: 9 }, () => { const t = random() * Math.PI * 2, r = random() * 0.22; return { at: [0.02 + Math.sin(t) * r, 0.02 + (0.22 - r) * 0.5, floorZ + Math.cos(t) * r] as P, size: 0.008 + random() * 0.01 }; }));
      const haze = new THREE.MeshStandardMaterial({ color: '#777', transparent: true, opacity: 0.18, depthWrite: false });
      for (let i = 0; i < 3; i++) s.ball([0.05 + i * 0.03, 0.08, 0.05 + i * 0.03], [0.02 + (random() - 0.5) * 0.1, 0.2 + i * 0.12, floorZ], haze, 8).castShadow = false;
    }

    const speed = mix(0.4, 1.6, mood.energy);
    return s.finish({
      footprint: 0.55,
      update: (_dt, time) => {
        if (flickerMat) {
          const t = time * speed;
          const on = Math.sin(t * 17.3) * Math.sin(t * 5.1) + Math.sin(t * 1.3) > -0.2;
          flickerMat.emissiveIntensity = on ? glow * (0.7 + 0.3 * Math.abs(Math.sin(t * 23))) : 0.05;
          flickerMat.opacity = on ? 1 : 0.35;
        }
      },
    });
  },
});
