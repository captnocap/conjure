import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';
import { MEDIA, MEDIA_COLOUR, TAU, agarPad, painted } from './plate';

const NAMES = ['MEERA', 'TOMASZ', 'DR. OKAFOR', 'YUKI', 'LENA', 'SAM B.', 'PRIYA'];
const INITIALS = ['JP', 'A.L.', 'MK', 'RDS', 'T.O.', 'EVW', 'HN'];
type Path = (u: number) => { x: number; z: number };

/** A band standing on its edge along a path on the ground plane, text reading left to right from +z. */
function ribbon(path: Path, y: number, height: number, segments = 48) {
  const position: number[] = [], uv: number[] = [], index: number[] = [];
  for (let i = 0; i <= segments; i++) {
    const u = i / segments, p = path(u);
    position.push(p.x, y, p.z, p.x, y + height, p.z);
    uv.push(u, 0, u, 1);
    if (i < segments) index.push(i * 2, i * 2 + 2, i * 2 + 1, i * 2 + 1, i * 2 + 2, i * 2 + 3);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return geometry;
}

export default defineThing({
  questions: {
    mount: choice('What is the label stuck to?', {
      wall: 'The curved side wall of a culture dish, standing like a billboard on a hoarding.',
      wedge: 'A broken wedge of clear dish lid, propped up against a rubber bung.',
      flag: 'Folded around a wooden stick as a little flag, planted in a plug of gel.',
      strip: 'Nothing yet: a torn length standing in a loose curl in front of its roll.',
    }),
    tape: choice('What is the label made of?', {
      autoclave: 'Beige autoclave tape with faint diagonal indicator stripes.',
      white: 'Plain white labelling tape.',
      colour: 'Bright coloured lab tape, somebody\'s personal colour.',
      masking: 'Yellowed masking tape, torn by hand.',
      none: 'No tape: written straight onto the plastic in marker.',
    }),
    message: choice('What does the handwriting say?', {
      initials: 'Initials, a date and a plate number: routine.',
      strain: 'A strain name and the growth medium.',
      warn: 'DO NOT THROW AWAY, underlined.',
      mine: 'A first name and "hands off": ownership.',
      doubt: '"contam??" and "re-streak": worry.',
      thesis: '"THESIS" and "final FINAL": the last experiment.',
      relic: 'A year long past and "keep": the owner graduated a decade ago.',
    }),
    hand: choice('What is the handwriting like?', {
      capitals: 'Neat, upright block capitals.',
      scrawl: 'A hurried, slanting scrawl that climbs off the line.',
      round: 'Small, round, careful lower-case letters.',
    }),
    ink: choice('What colour is the marker?', {
      black: 'Black permanent marker.',
      red: 'Red, for warnings.',
      blue: 'Blue.',
      green: 'Green, running dry.',
    }),
    state: choice('What has happened to the label?', {
      fresh: 'Nothing: written a minute ago, stuck down flat.',
      peeling: 'One end has lost its grip and is curling away.',
      smeared: 'Condensation or ethanol has made the ink run downwards.',
      relabelled: 'It is stuck over an older label whose writing has been scribbled out.',
      autoclaved: 'It has been through the autoclave: the indicator stripes have gone black, whatever was here is dead.',
    }),
    pen: noul('Is the marker pen still lying beside it with its cap off?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pick = <T>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const date = `${1 + Math.floor(random() * 28)}/${1 + Math.floor(random() * 12)}`;
    const lines: [string, string] = {
      initials: [`${pick(INITIALS)}  ${date}`, `plate ${1 + Math.floor(random() * 5)} of ${6 + Math.floor(random() * 7)}`],
      strain: [pick(['E. coli K-12', 'S. aureus', 'B. subtilis 168', 'P. fluorescens', 'unknown #7']), pick(['LB + amp', 'TSA 37C', 'blood agar', 'M9 min.'])],
      warn: ['DO NOT', 'THROW AWAY!'],
      mine: [`${pick(NAMES)}'S`, 'hands off'],
      doubt: ['contam ??', 're-streak'],
      thesis: ['THESIS', 'final FINAL'],
      relic: [`${1994 + Math.floor(random() * 12)}`, `keep - ${pick(INITIALS)}`],
    }[a.message] as [string, string];
    const ink = { black: '#17181c', red: '#c2141f', blue: '#1b3aa6', green: '#1f7a43' }[a.ink];
    const inkAlpha = (a.ink === 'green' ? 0.75 : 0.95) * mix(1, 0.6, mood.wear);
    const bare = a.tape === 'none' && (a.mount === 'wall' || a.mount === 'wedge');
    const cooked = a.state === 'autoclaved';
    const tapeKind = a.tape === 'none' && !bare ? 'white' : a.tape;
    const colourTape = pick(mood.cheer > 0.5 ? ['#ffd83a', '#ff8fb2', '#5fd0e0', '#9be35a'] : ['#e0b83a', '#7f9fd0', '#8fc39a', '#d9a0a8']);
    const paper = new THREE.Color({ autoclave: '#e9dcb0', white: '#f6f4ea', colour: colourTape, masking: '#e3c98a', none: '#ffffff' }[tapeKind]).lerp(new THREE.Color('#b9a77a'), mood.wear * 0.3);

    const write = (ctx: CanvasRenderingContext2D, w: number, h: number, text: [string, string], colour: string, alpha: number) => {
      const family = a.hand === 'round' ? 'cursive, sans-serif' : 'sans-serif';
      ctx.fillStyle = ctx.strokeStyle = colour;
      ctx.globalAlpha = alpha;
      ctx.lineJoin = ctx.lineCap = 'round';
      ctx.textBaseline = 'middle';
      text.forEach((raw, row) => {
        const line = a.hand === 'capitals' ? raw.toUpperCase() : a.hand === 'round' ? raw.toLowerCase() : raw;
        let size = h * (row === 0 ? 0.42 : 0.3);
        ctx.font = `${a.hand === 'scrawl' ? 'italic ' : ''}bold ${size}px ${family}`;
        const spacing = a.hand === 'capitals' ? 1.1 : 1.02;
        const natural = ctx.measureText(line).width * spacing;
        if (natural > w * 0.86) { size *= (w * 0.86) / natural; ctx.font = `${a.hand === 'scrawl' ? 'italic ' : ''}bold ${size}px ${family}`; }
        const total = ctx.measureText(line).width * spacing;
        let x = (w - total) / 2 + (random() - 0.5) * w * 0.04;
        const climb = a.hand === 'scrawl' ? -h * 0.1 : 0;
        const y0 = h * (row === 0 ? 0.33 : 0.72);
        ctx.lineWidth = size * 0.035;
        const start = x;
        for (const letter of line) {
          const width = ctx.measureText(letter).width * spacing;
          const along = (x - start) / Math.max(total, 1);
          ctx.save();
          ctx.translate(x + width / 2, y0 + climb * along + (random() - 0.5) * size * (a.hand === 'scrawl' ? 0.14 : 0.05));
          ctx.rotate((random() - 0.5) * (a.hand === 'scrawl' ? 0.2 : 0.07));
          ctx.textAlign = 'center';
          ctx.fillText(letter, 0, 0);
          ctx.strokeText(letter, 0, 0);
          ctx.restore();
          x += width;
        }
        if (a.message === 'warn' && row === 1) {
          ctx.lineWidth = size * 0.09;
          ctx.beginPath(); ctx.moveTo(start, y0 + size * 0.55); ctx.lineTo(start + total, y0 + size * 0.5 + (random() - 0.5) * 8); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(start + total * 0.05, y0 + size * 0.68); ctx.lineTo(start + total * 0.95, y0 + size * 0.66); ctx.stroke();
        }
      });
      ctx.globalAlpha = 1;
    };

    const tapeTexture = (text: [string, string], scribbled = false, tint = paper, clear = false) => painted(1024, 256, (ctx, w, h) => {
      const layer = document.createElement('canvas');
      layer.width = w; layer.height = h;
      const g = layer.getContext('2d')!;
      write(g, w, h, text, scribbled ? '#3a3b40' : ink, scribbled ? 0.7 : inkAlpha);
      if (!clear) {
        ctx.fillStyle = `#${tint.getHexString()}`;
        ctx.fillRect(0, 0, w, h);
        if (tapeKind === 'autoclave' && !scribbled) {
          ctx.strokeStyle = cooked ? '#2a211b' : 'rgba(255,252,236,0.75)';
          ctx.lineWidth = 16;
          for (let x = -h; x < w + h; x += 62) { ctx.beginPath(); ctx.moveTo(x, h + 10); ctx.lineTo(x + h * 0.7, -10); ctx.stroke(); }
        }
        if (tapeKind === 'masking') { ctx.fillStyle = 'rgba(140,100,40,0.12)'; for (let i = 0; i < 60; i++) ctx.fillRect(0, random() * h, w, 1 + random() * 2); }
        for (let i = 0; i < mood.wear * 90; i++) { ctx.fillStyle = `rgba(70,50,30,${0.08 + random() * 0.15})`; ctx.beginPath(); ctx.arc(random() * w, random() * h, 2 + random() * 9, 0, TAU); ctx.fill(); }
        if (cooked && tapeKind === 'autoclave') { ctx.fillStyle = 'rgba(255,252,236,0.6)'; ctx.fillRect(w * 0.06, h * 0.1, w * 0.88, h * 0.8); }
      }
      if (a.state === 'smeared' && !scribbled) for (let i = 1; i <= 14; i++) { ctx.globalAlpha = 0.16 * (1 - i / 15); ctx.drawImage(layer, (random() - 0.5) * 3, i * 5.5); }
      ctx.globalAlpha = 1;
      ctx.drawImage(layer, 0, 0);
      if (scribbled) {
        ctx.strokeStyle = ink;
        ctx.lineWidth = 12;
        ctx.lineCap = 'round';
        ctx.beginPath();
        for (let i = 0; i <= 22; i++) ctx.lineTo(w * (0.08 + 0.84 * (i / 22)), h * (i % 2 ? 0.2 : 0.8) + (random() - 0.5) * 30);
        ctx.stroke();
      }
    });

    const LENGTH = 54, HEIGHT = 13.5;
    const peel = (u: number) => (a.state === 'peeling' && u > 0.78 ? ((u - 0.78) / 0.22) ** 1.8 * 9 : 0);
    const band = (path: Path, y: number, parent: THREE.Object3D = s.root) => {
      const main = new THREE.Mesh(ribbon(path, y, HEIGHT), new THREE.MeshStandardMaterial({ map: tapeTexture(lines, false, paper, bare), roughness: 0.8, side: THREE.DoubleSide, transparent: bare, alphaTest: bare ? 0.25 : 0 }));
      main.castShadow = !bare;
      main.receiveShadow = true;
      parent.add(main);
      if (a.state === 'relabelled') {
        const older = paper.clone().offsetHSL(0.08 + random() * 0.3, -0.1, -0.08);
        const behind: Path = (u) => {
          const v = 0.1 + u * 0.9, p = path(v), q = path(v + 0.01), length = Math.hypot(q.x - p.x, q.z - p.z) || 1;
          return { x: p.x + ((q.z - p.z) / length) * 0.35, z: p.z - ((q.x - p.x) / length) * 0.35 };
        };
        const under = new THREE.Mesh(ribbon(behind, y + (a.mount === 'strip' ? 4.6 : -4.6), HEIGHT), new THREE.MeshStandardMaterial({ map: tapeTexture([pick(INITIALS) + '  ' + date, 'old batch'], true, older), roughness: 0.85, side: THREE.DoubleSide }));
        under.castShadow = true;
        parent.add(under);
      }
      return main;
    };
    const glass = new THREE.MeshPhysicalMaterial({ color: '#d9eef2', transparent: true, opacity: 0.22, roughness: 0.05, depthWrite: false, side: THREE.DoubleSide });
    const bright = s.material('#eef8fa', { roughness: 0.15, emissive: '#cfeaf0', emissiveIntensity: 0.3 });
    const medium = pick(Object.keys(MEDIA) as (keyof typeof MEDIA)[]);

    if (a.mount === 'wall') {
      const R = 46, span = 0.86, wallH = 19;
      const arc = (radius: number, y: number, half = span): [number, number, number][] => Array.from({ length: 17 }, (_unused, i) => { const t = (i / 16 - 0.5) * 2 * half; return [Math.sin(t) * radius, y, Math.cos(t) * radius - R]; });
      const wall = s.mesh(new THREE.CylinderGeometry(R, R, wallH, 48, 1, true, -span, span * 2), glass, [0, wallH / 2, -R]);
      wall.castShadow = false;
      s.tube(arc(R, wallH), 0.5, bright);
      s.tube(arc(R + 0.6, wallH * 0.52), 0.35, bright);
      s.tube(arc(R, 0.4), 0.5, s.material('#b9cfd4', { roughness: 0.3 }));
      const gel = new THREE.Color(MEDIA_COLOUR[medium]);
      const slab = new THREE.Shape();
      slab.absarc(0, 0, R - 1, -Math.PI / 2 - span * 0.97, -Math.PI / 2 + span * 0.97, false);
      slab.absarc(0, 0, R - 15, -Math.PI / 2 + span * 0.8, -Math.PI / 2 - span * 0.8, true);
      const agar = s.mesh(new THREE.ExtrudeGeometry(slab, { depth: 4.5, bevelEnabled: false, curveSegments: 24 }), new THREE.MeshPhysicalMaterial({ color: gel, roughness: 0.25, clearcoat: 0.5, emissive: gel, emissiveIntensity: 0.3 }), [0, 0.3, -R]);
      agar.rotation.x = -Math.PI / 2;
      const turn = (random() - 0.5) * 0.2, half = LENGTH / (2 * R);
      band((u) => { const t = turn + (u - 0.5) * 2 * half, r = R + 0.35 + peel(u); return { x: Math.sin(t) * r, z: Math.cos(t) * r - R }; }, 2.6);
    } else if (a.mount === 'wedge') {
      const group = new THREE.Group();
      const R = 62, half = 0.5;
      const sector = new THREE.Shape();
      sector.moveTo(0, 0);
      sector.absarc(0, 0, R, -Math.PI / 2 - half, -Math.PI / 2 + half, false);
      sector.closePath();
      const plate = new THREE.Mesh(new THREE.ExtrudeGeometry(sector, { depth: 1.2, bevelEnabled: false, curveSegments: 20 }), new THREE.MeshPhysicalMaterial({ color: '#cfe6ea', transparent: true, opacity: 0.42, roughness: 0.08 }));
      plate.castShadow = plate.receiveShadow = true;
      plate.position.set(0, R, -0.6);
      group.add(plate);
      const lip = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(Array.from({ length: 13 }, (_unused, i) => { const t = -Math.PI / 2 + (i / 12 - 0.5) * 2 * half; return new THREE.Vector3(Math.cos(t) * R, R + Math.sin(t) * R, 1.2); })), 24, 1, 6), bright);
      group.add(lip);
      for (const side of [-1, 1]) { const edge = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, R, 5), bright); edge.position.set(side * Math.sin(half) * R * 0.5, R - Math.cos(half) * R * 0.5, 0); edge.rotation.z = side * half; group.add(edge); }
      const tilt = (random() - 0.5) * 0.16;
      const label = band((u) => ({ x: (u - 0.5) * LENGTH * 0.9, z: 0.8 + peel(u) }), 7.5, group);
      label.rotation.z = tilt;
      group.rotation.x = -0.42;
      s.root.add(group);
      const rubber = s.material('#2a2a2d', { roughness: 0.9 });
      s.cylinder(8, 10, 15, [3, 7.5, -17], rubber, 24);
      s.cylinder(2.2, 2.2, 0.4, [3, 15.1, -17], s.material('#111113'), 12);
    } else if (a.mount === 'flag') {
      const top = agarPad(s, 15, medium);
      const wood = s.material('#d9bb85', { roughness: 0.9 });
      s.rod([-LENGTH * 0.32, top - 1, 0], [-LENGTH * 0.32 + (random() - 0.5) * 2, 44, (random() - 0.5) * 2], 0.75, wood, 0.5);
      band((u) => ({ x: -LENGTH * 0.32 - 1 + u * LENGTH * 0.78, z: 0.8 + Math.sin(u * 4.2) * 2.2 * u + peel(u) }), 29);
    } else {
      const phase = random() * TAU;
      band((u) => ({ x: (u - 0.5) * LENGTH * 0.92, z: 9 + Math.sin(u * 5 + phase) * 4.5 * (0.4 + u * 0.6) + peel(u) }), 0);
      const roll = s.mesh(new THREE.CylinderGeometry(17, 17, HEIGHT, 40, 1, true), new THREE.MeshStandardMaterial({ color: paper, roughness: 0.8, side: THREE.DoubleSide }), [-5, HEIGHT / 2, -12]);
      roll.rotation.y = random() * TAU;
      const faceMaterial = s.material(paper.clone().offsetHSL(0, 0, -0.07), { roughness: 0.85, side: THREE.DoubleSide });
      for (const y of [0.05, HEIGHT]) { const face = s.mesh(new THREE.RingGeometry(12.5, 17, 40), faceMaterial, [-5, y, -12]); face.rotation.x = -Math.PI / 2; }
      s.mesh(new THREE.CylinderGeometry(12.5, 12.5, HEIGHT, 32, 1, true), s.material('#a98958', { roughness: 0.95, side: THREE.DoubleSide }), [-5, HEIGHT / 2, -12]);
    }

    if (a.pen) {
      const barrel = s.material('#1b1c20', { roughness: 0.45 });
      const z = a.mount === 'strip' ? 22 : a.mount === 'flag' ? 20 : 16, turn = 0.15 + random() * 0.5;
      const pen = new THREE.Group();
      const add = (mesh: THREE.Mesh) => { pen.add(mesh); return mesh; };
      add(s.cylinder(3.4, 3.4, 30, [0, 0, 0], barrel, 18)).rotation.z = Math.PI / 2;
      add(s.cylinder(3.45, 3.45, 9, [-4, 0, 0], s.material('#f1efe6', { roughness: 0.7 }), 18)).rotation.z = Math.PI / 2;
      add(s.cylinder(3.5, 3.5, 3, [-15.5, 0, 0], s.material(ink, { roughness: 0.5 }), 18)).rotation.z = Math.PI / 2;
      add(s.cylinder(1.6, 3.2, 5, [17.5, 0, 0], barrel, 14)).rotation.z = -Math.PI / 2;
      add(s.cylinder(0.5, 1.3, 3.2, [21.4, 0, 0], s.material(ink, { roughness: 0.6 }), 10)).rotation.z = -Math.PI / 2;
      pen.position.set(-4, 3.5, z);
      pen.rotation.y = turn;
      s.root.add(pen);
      const cap = s.cylinder(3.7, 3.7, 12, [22 + random() * 5, 3.7, z + 7 + random() * 3], s.material(ink, { roughness: 0.5 }), 18);
      cap.rotation.z = Math.PI / 2;
      cap.rotation.y = random() * TAU;
    }

    s.root.scale.setScalar(0.01);
    return s.finish();
  },
});
