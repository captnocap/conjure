import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

function paint(w: number, h: number, draw: (c: CanvasRenderingContext2D, w: number, h: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext('2d')!, w, h);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** One moulded bucket seat as a swept side profile: lip, pan, the curve up, the back. */
function shellGeometry(width: number, thick: number) {
  const line: [number, number][] = [[0.25, 0.4], [0.2, 0.425], [0.05, 0.41], [-0.12, 0.415], [-0.2, 0.45], [-0.24, 0.54], [-0.27, 0.7], [-0.3, 0.85], [-0.315, 0.88]];
  const points = new THREE.CatmullRomCurve3(line.map(([z, y]) => new THREE.Vector3(z, y, 0))).getPoints(30);
  const up: THREE.Vector2[] = [], down: THREE.Vector2[] = [];
  points.forEach((p, i) => {
    const a = points[Math.max(0, i - 1)], b = points[Math.min(points.length - 1, i + 1)];
    const n = new THREE.Vector2(-(b.y - a.y), b.x - a.x).normalize().multiplyScalar(thick / 2);
    up.push(new THREE.Vector2(p.x + n.x, p.y + n.y));
    down.unshift(new THREE.Vector2(p.x - n.x, p.y - n.y));
  });
  const geometry = new THREE.ExtrudeGeometry(new THREE.Shape([...up, ...down]), { depth: width, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.02, bevelSegments: 3 });
  geometry.rotateY(-Math.PI / 2);
  geometry.translate(width / 2, 0, 0);
  return geometry;
}

const COLOURS = {
  orange: 'Burnt orange, a 1970s bus terminal.',
  aqua: 'Pale hospital aqua.',
  black: 'Black, anonymous and airport-like.',
  blue: 'Institutional royal blue.',
  cream: 'Yellowed cream.',
  mixed: 'Every seat a different colour, replaced one at a time over decades.',
} as const;
const TINTS = { orange: '#d8672a', aqua: '#7fc4bd', black: '#2b2e33', blue: '#2c56a3', cream: '#e6dcbb' } as const;

export default defineThing({
  questions: {
    style: choice('What are the seats made of?', {
      shell: 'One-piece moulded fibreglass bucket shells, glossy and hard.',
      vinyl: 'Padded vinyl cushions on a chrome frame with loop armrests, a doctor\'s waiting room.',
      wood: 'A slatted varnished wooden bench with iron dividers, an old station or courthouse.',
      steel: 'Curved brushed-steel airport seats with armrests between each place.',
    }),
    count: choice('How many seats are in the row?', {
      three: 'Three seats.',
      four: 'Four seats.',
      five: 'Five seats, a long institutional run.',
    }),
    colour: choice('What colour are the seats (or, on a wooden bench, its painted ironwork)?', COLOURS),
    left: choice('What has been left on one of the seats?', {
      nothing: 'Nothing; the row is empty.',
      coat: 'A coat draped over the back and pooled on the seat, holding a place for someone.',
      cane: 'A wooden walking cane hooked on the seat edge, its owner called away.',
      toy: 'A small teddy bear sitting upright, forgotten by a child.',
      bag: 'A handbag standing on the seat, its owner just out of frame.',
      newspaper: 'A folded newspaper, already read by three people.',
    }),
    damage: choice('What state is the worst seat in?', {
      fine: 'All the seats are sound.',
      cracked: 'One seat is split and patched across with silver duct tape.',
      missing: 'One seat is gone entirely, leaving bare bolts on the beam.',
    }),
    table: choice('What is on the side table at the end of the row?', {
      magazines: 'A slumped stack of old magazines.',
      tissues: 'A box of tissues and a leaflet stand, for bad news.',
      plant: 'A dusty artificial plant in a pot.',
      bare: 'An empty laminate table.',
      none: 'There is no table, only seats.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const seats = { three: 3, four: 4, five: 5 }[a.count];
    const pitch = a.style === 'vinyl' ? 0.6 : 0.56;
    const tableSide = random() < 0.5 ? -1 : 1;
    const places = seats + (a.table === 'none' ? 0 : 1);
    const total = places * pitch;
    const placeX = (index: number) => (index - (places - 1) / 2) * pitch;
    const seatIndex = (seat: number) => (a.table !== 'none' && tableSide < 0 ? seat + 1 : seat);
    const tableX = placeX(tableSide < 0 ? 0 : places - 1);

    const chrome = s.material('#d5dadc', { metalness: 0.9, roughness: 0.25 });
    const frame = a.style === 'vinyl' || a.style === 'steel' ? chrome : s.material(a.style === 'wood' ? (a.colour === 'mixed' ? '#2c3a33' : TINTS[a.colour]) : '#2a2d31', { roughness: 0.5, metalness: 0.3 });
    const dark = s.material('#1f2225', { roughness: 0.7 });
    const keys = Object.keys(TINTS) as (keyof typeof TINTS)[];
    const fade = (hex: string) => new THREE.Color(hex).lerp(new THREE.Color('#bdb7a8'), mood.wear * 0.3).offsetHSL(0, mix(-0.12, 0.08, mood.cheer), 0);
    const seatColour = (seat: number) => fade(a.colour === 'mixed' ? TINTS[keys[(seat * 2 + Math.floor(random() * 5)) % keys.length]] : TINTS[a.colour]);

    // The beam and its two legs.
    s.box([total - 0.1, 0.06, 0.09], [0, 0.32, -0.03], frame);
    for (const side of [-1, 1]) {
      const x = side * (total / 2 - 0.28);
      s.box([0.06, 0.3, 0.07], [x, 0.16, -0.03], frame);
      s.box([0.07, 0.035, 0.6], [x, 0.0175, 0], frame);
      for (const z of [-0.27, 0.27]) s.cylinder(0.028, 0.032, 0.012, [x, 0.006, z], dark, 10);
    }

    const worst = Math.floor(random() * seats);
    let leftSeat = Math.floor(random() * seats);
    if (a.damage === 'missing' && leftSeat === worst) leftSeat = (leftSeat + 1) % seats;
    const top = a.style === 'vinyl' ? 0.49 : 0.435;

    const steelMap = a.style === 'steel' ? paint(64, 64, (c) => {
      c.fillStyle = '#c9ced1';
      c.fillRect(0, 0, 64, 64);
      c.fillStyle = '#4c5257';
      for (const [x, y] of [[16, 16], [48, 16], [32, 48], [0, 48], [64, 48]]) { c.beginPath(); c.arc(x, y, 9, 0, 7); c.fill(); }
    }) : null;
    if (steelMap) { steelMap.wrapS = steelMap.wrapT = THREE.RepeatWrapping; steelMap.repeat.set(22, 22); }
    const shell = a.style === 'shell' || a.style === 'steel' ? shellGeometry(a.style === 'steel' ? 0.47 : 0.48, a.style === 'steel' ? 0.018 : 0.03) : null;
    const cushion = a.style === 'vinyl' ? new RoundedBoxGeometry(0.52, 0.11, 0.48, 4, 0.04) : null;
    const backPad = a.style === 'vinyl' ? new RoundedBoxGeometry(0.52, 0.42, 0.09, 4, 0.04) : null;
    const wood = s.material(mix(0.3, 0.7, random()) > 0.5 ? '#9a6436' : '#7c4a26', { roughness: 0.5 });
    const tape = s.material('#b9bdc0', { metalness: 0.5, roughness: 0.45 });

    for (let seat = 0; seat < seats; seat++) {
      const x = placeX(seatIndex(seat));
      const gone = a.damage === 'missing' && seat === worst;
      const split = a.damage === 'cracked' && seat === worst;
      if (gone) {
        for (const dx of [-0.12, 0.12]) {
          s.box([0.07, 0.05, 0.12], [x + dx, 0.37, -0.03], frame);
          s.cylinder(0.012, 0.012, 0.03, [x + dx, 0.41, -0.03], chrome, 8);
        }
        continue;
      }
      const tint = seatColour(seat);
      s.box([0.2, 0.07, 0.3], [x, 0.37, 0.02], frame);
      if (shell) {
        const material = a.style === 'steel'
          ? new THREE.MeshStandardMaterial({ map: steelMap, metalness: 0.7, roughness: 0.38 })
          : s.material(tint, { roughness: 0.28 });
        const body = s.mesh(shell, material, [x, 0, 0]);
        if (split) body.rotation.z = (random() - 0.5) * 0.09;
        if (a.style === 'steel') {
          s.box([0.4, 0.012, 0.3], [x, 0.438, 0.05], s.material(tint, { roughness: 0.8 })).rotation.x = 0.03;
        }
      } else if (cushion && backPad) {
        const vinyl = s.material(tint, { roughness: 0.42 });
        s.mesh(cushion, vinyl, [x, 0.435, 0.02]);
        s.mesh(backPad, vinyl, [x, 0.74, -0.25]).rotation.x = -0.14;
        for (const dx of [-0.18, 0.18]) s.rod([x + dx, 0.34, -0.06], [x + dx, 0.7, -0.3], 0.013, chrome);
        for (const dx of [-0.13, 0.13]) s.ball([0.014, 0.014, 0.014], [x + dx, 0.49, 0.02], dark, 8);
      } else {
        for (let i = 0; i < 6; i++) {
          if (split && i === 2) continue;
          const slat = s.box([pitch - 0.01, 0.024, 0.07], [x, 0.425, -0.2 + i * 0.085], wood);
          if (split && i === 3) { slat.rotation.z = 0.2; slat.position.y -= 0.05; }
        }
        for (let i = 0; i < 4; i++) {
          const slat = s.box([pitch - 0.01, 0.075, 0.022], [x, 0.53 + i * 0.1, -0.27 - i * 0.022], wood);
          slat.rotation.x = -0.2;
        }
      }
      if (split && a.style !== 'wood') {
        for (const turn of [-0.5, 0.45, 0.05]) {
          const strip = s.box([0.34, 0.004, 0.055], [x + (random() - 0.5) * 0.06, top + 0.004, 0.04 + turn * 0.12], tape);
          strip.rotation.y = turn + (random() - 0.5) * 0.3;
        }
        if (a.style === 'vinyl') s.ball([0.07, 0.02, 0.05], [x + 0.08, top, 0.16], s.material('#e3c66a', { roughness: 1 }), 10);
        const backStrip = s.box([0.3, 0.05, 0.004], [x, 0.7, a.style === 'vinyl' ? -0.215 : -0.25], tape);
        backStrip.rotation.set(-0.2, 0, 0.5);
      }
    }

    // Arms and dividers.
    const armed = a.style !== 'shell';
    if (armed) {
      const first = seatIndex(0), last = seatIndex(seats - 1);
      for (let edge = first; edge <= last + 1; edge++) {
        const x = placeX(edge) - pitch / 2;
        if (a.style === 'wood' && edge !== first && edge !== last + 1 && (edge - first) % 2 === 1 && seats > 3) continue;
        s.tube([[x, 0.33, -0.05], [x, 0.5, -0.2], [x, 0.66, -0.2], [x, 0.665, 0.16], [x, 0.6, 0.22], [x, 0.36, 0.14], [x, 0.33, 0.0]], a.style === 'wood' ? 0.02 : 0.014, frame);
        if (a.style === 'steel') s.box([0.05, 0.02, 0.3], [x, 0.68, -0.02], dark);
        if (a.style === 'wood') s.box([0.06, 0.03, 0.4], [x, 0.685, -0.02], wood);
      }
    }
    if (a.style === 'wood') for (const side of [-1, 1]) {
      const x = placeX(seatIndex(side < 0 ? 0 : seats - 1)) + side * (pitch / 2);
      s.rod([x, 0.34, -0.2], [x, 0.9, -0.36], 0.022, frame);
    }

    // What was left behind.
    const lx = placeX(seatIndex(leftSeat));
    if (a.left === 'coat') {
      const cloth = s.material(['#b08d5e', '#27324d', '#8c2f2a', '#5a5f58'][Math.floor(random() * 4)], { roughness: 0.95 });
      const drape = s.mesh(new RoundedBoxGeometry(0.46, 0.5, 0.12, 3, 0.05), cloth, [lx, 0.72, -0.27]);
      drape.rotation.x = -0.16;
      drape.rotation.z = (random() - 0.5) * 0.12;
      s.mesh(new RoundedBoxGeometry(0.42, 0.09, 0.34, 3, 0.04), cloth, [lx, top + 0.035, 0.0]).rotation.y = (random() - 0.5) * 0.3;
      const sleeve = s.rod([lx + 0.2, 0.86, -0.3], [lx + 0.29, top - 0.12, 0.05], 0.05, cloth, 0.04);
      sleeve.castShadow = true;
      s.rod([lx - 0.18, top + 0.05, 0.1], [lx - 0.14, top - 0.2, 0.27], 0.045, cloth, 0.04);
    } else if (a.left === 'cane') {
      const stick = s.material('#6a3f1f', { roughness: 0.45 });
      const foot: [number, number, number] = [lx + 0.12, 0, 0.5];
      const hook: [number, number, number] = [lx + 0.05, 0.84, 0.2];
      s.rod(foot, hook, 0.013, stick);
      const crook = s.ring(0.05, 0.013, [hook[0], hook[1] + 0.005, hook[2] - 0.05], stick, Math.PI);
      crook.rotation.set(-0.35, Math.PI / 2, 0);
      s.cylinder(0.016, 0.014, 0.03, [foot[0], 0.015, foot[2]], dark, 8);
    } else if (a.left === 'toy') {
      const fur = s.material(['#b98248', '#d9c29a', '#8a5a3a'][Math.floor(random() * 3)], { roughness: 1 });
      const bear = new Sculpture(context);
      bear.ball([0.075, 0.085, 0.07], [0, 0.085, 0], fur, 14);
      bear.ball([0.06, 0.058, 0.058], [0, 0.2, 0.005], fur, 14);
      bear.ball([0.028, 0.022, 0.024], [0, 0.188, 0.055], s.material('#ead8b4', { roughness: 1 }), 10);
      for (const dx of [-1, 1]) {
        bear.ball([0.024, 0.024, 0.012], [dx * 0.045, 0.252, 0], fur, 10);
        bear.ball([0.008, 0.008, 0.006], [dx * 0.024, 0.215, 0.053], dark, 8);
        bear.ball([0.028, 0.028, 0.055], [dx * 0.05, 0.035, 0.07], fur, 10);
        bear.ball([0.024, 0.05, 0.026], [dx * 0.085, 0.105, 0.02], fur, 10).rotation.z = dx * 0.5;
      }
      bear.ball([0.009, 0.007, 0.006], [0, 0.198, 0.078], dark, 8);
      bear.root.position.set(lx, top, -0.02);
      bear.root.rotation.set(-0.08, (random() - 0.5) * 0.7, (random() - 0.5) * 0.25);
      bear.root.scale.setScalar(1.25);
      s.root.add(bear.root);
    } else if (a.left === 'bag') {
      const leather = s.material(['#6d2f2a', '#23262b', '#a9763f'][Math.floor(random() * 3)], { roughness: 0.5 });
      s.mesh(new RoundedBoxGeometry(0.3, 0.2, 0.13, 3, 0.04), leather, [lx, top + 0.1, 0]).rotation.y = (random() - 0.5) * 0.5;
      s.ring(0.085, 0.009, [lx, top + 0.2, 0], leather, Math.PI);
      s.box([0.05, 0.03, 0.14], [lx, top + 0.19, 0], chrome);
    } else if (a.left === 'newspaper') {
      const sheet = new THREE.MeshStandardMaterial({ roughness: 0.95, map: paint(256, 320, (c, w, h) => {
        c.fillStyle = '#e4dfcf';
        c.fillRect(0, 0, w, h);
        c.fillStyle = '#25252a';
        c.font = 'bold 34px serif';
        c.textAlign = 'center';
        c.fillText('THE DAILY', w / 2, 40);
        c.fillRect(14, 52, w - 28, 4);
        c.fillStyle = '#77756f';
        c.fillRect(14, 70, 110, 90);
        for (let y = 70; y < h - 10; y += 9) { c.fillRect(134, y, 108, 3); if (y > 170) c.fillRect(14, y, 110, 3); }
      }) });
      const paper = s.mesh(new THREE.BoxGeometry(0.26, 0.02, 0.33), [s.material('#d9d4c4'), s.material('#d9d4c4'), sheet, s.material('#d9d4c4'), s.material('#d9d4c4'), s.material('#d9d4c4')] as unknown as THREE.Material, [lx, top + 0.012, 0.03]);
      paper.rotation.y = (random() - 0.5) * 0.9;
    }

    // The side table.
    if (a.table !== 'none') {
      const laminate = s.material(a.style === 'wood' ? '#7c4a26' : '#d9d2bf', { roughness: 0.55 });
      s.box([0.5, 0.035, 0.5], [tableX, 0.44, 0], laminate);
      s.box([0.51, 0.02, 0.51], [tableX, 0.425, 0], dark);
      s.box([0.12, 0.08, 0.2], [tableX, 0.375, -0.02], frame);
      const ty = 0.458;
      if (a.table === 'magazines') {
        const covers = ['#b8342c', '#2f6f9f', '#d9a83a', '#3f8a58', '#e7e2d4', '#7a3f84', '#d96a2f'];
        const stack = 3 + Math.round(mix(1, 7, mood.density) * mix(0.6, 1, random()));
        let slip = 0;
        for (let i = 0; i < stack; i++) {
          const colour = covers[Math.floor(random() * covers.length)];
          slip += (random() - 0.4) * 0.03 * (1 + mood.energy);
          const isTop = i === stack - 1;
          const cover = isTop ? new THREE.MeshStandardMaterial({ roughness: 0.4, map: paint(128, 168, (c, w, h) => {
            c.fillStyle = colour;
            c.fillRect(0, 0, w, h);
            c.fillStyle = '#fff';
            c.font = 'bold 30px sans-serif';
            c.fillText(['LIFE', 'HOME', 'GOLF', 'TIME', 'YOU'][Math.floor(random() * 5)], 10, 34);
            c.fillStyle = 'rgba(0,0,0,0.35)';
            c.beginPath(); c.arc(w / 2, h * 0.6, 38, 0, 7); c.fill();
            c.fillStyle = '#fff';
            c.fillRect(10, h - 22, 70, 5);
          }) }) : s.material(colour, { roughness: 0.45 });
          const page = s.material('#efeadb');
          const mag = s.mesh(new THREE.BoxGeometry(0.21, 0.009, 0.28), [page, page, cover, page, page, page] as unknown as THREE.Material, [tableX + slip, ty + 0.005 + i * 0.0092, slip * 0.6]);
          mag.rotation.y = (random() - 0.5) * 0.7;
        }
        if (mood.density > 0.55 || mood.wear > 0.7) {
          const fallen = s.box([0.21, 0.009, 0.28], [tableX + tableSide * 0.1, 0.006, 0.42], s.material(covers[Math.floor(random() * covers.length)], { roughness: 0.45 }));
          fallen.rotation.y = random() * 3;
        }
      } else if (a.table === 'tissues') {
        const box = s.material(mood.cheer > 0.5 ? '#8fc3d8' : '#b7b0c9', { roughness: 0.7 });
        s.box([0.24, 0.085, 0.12], [tableX - 0.06, ty + 0.043, 0.08], box).rotation.y = 0.3;
        const tuft = s.lathe([[0.001, 0], [0.03, 0.01], [0.045, 0.05], [0.02, 0.085], [0.001, 0.09]], s.material('#ffffff', { roughness: 1, side: THREE.DoubleSide }), [tableX - 0.06, ty + 0.085, 0.08]);
        tuft.scale.set(1.3, 1, 0.6);
        s.box([0.14, 0.2, 0.02], [tableX + 0.12, ty + 0.1, -0.12], s.material('#e9eef0', { transparent: true, opacity: 0.55 })).rotation.x = -0.2;
        s.label('YOUR HEALTH', 0.12, 0.16, [tableX + 0.12, ty + 0.1, -0.105], '#ffffff', '#3d7fa6').rotation.x = -0.2;
      } else if (a.table === 'plant') {
        s.cylinder(0.085, 0.06, 0.13, [tableX, ty + 0.065, 0], s.material('#b5623f', { roughness: 0.9 }), 16);
        const leaf = s.material(new THREE.Color('#3d7a3c').lerp(new THREE.Color('#8a8f6a'), mood.wear * 0.7), { roughness: 0.6, side: THREE.DoubleSide });
        const fronds = 7 + Math.floor(random() * 5);
        for (let i = 0; i < fronds; i++) {
          const angle = (i / fronds) * Math.PI * 2 + random() * 0.5;
          const reach = 0.13 + random() * 0.1, rise = 0.18 + random() * 0.2 - mood.wear * 0.08;
          const frond = s.ball([0.035, reach * 0.9, 0.008], [tableX + Math.cos(angle) * reach * 0.5, ty + 0.13 + rise * 0.5, Math.sin(angle) * reach * 0.5], leaf, 8);
          frond.rotation.set(0, -angle, -Math.atan2(reach, rise));
        }
      }
    }

    return s.finish();
  },
});
