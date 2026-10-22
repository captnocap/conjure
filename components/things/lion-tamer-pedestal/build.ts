import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

type Draw = (c: CanvasRenderingContext2D, w: number, h: number) => void;
function paint(w: number, h: number, draw: Draw) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext('2d')!, w, h);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
function star(c: CanvasRenderingContext2D, x: number, y: number, r: number, turn = 0) {
  c.beginPath();
  for (let i = 0; i < 10; i++) {
    const angle = turn + (i * Math.PI) / 5 - Math.PI / 2;
    const reach = i % 2 ? r * 0.42 : r;
    c.lineTo(x + Math.cos(angle) * reach, y + Math.sin(angle) * reach);
  }
  c.closePath();
  c.fill();
}

const COLOURS = {
  'red-gold': 'Circus red with gold: the poster classic.',
  'blue-white': 'Royal blue with white: crisp, nautical, a touring show in good order.',
  'green-cream': 'Bottle green and cream: an old European family circus.',
  'black-gold': 'Black and gold: a severe, dangerous night act.',
  'orange-teal': 'Orange and teal: loud, cheerful, a children\'s matinee.',
} as const;
const PALETTE: Record<keyof typeof COLOURS, { base: string; mark: string; trim: string }> = {
  'red-gold': { base: '#c5222b', mark: '#f2c230', trim: '#f2c230' },
  'blue-white': { base: '#21469f', mark: '#f3efe4', trim: '#f3efe4' },
  'green-cream': { base: '#1f6a4a', mark: '#f0e3bd', trim: '#d9b04a' },
  'black-gold': { base: '#1d1c20', mark: '#d6aa3c', trim: '#d6aa3c' },
  'orange-teal': { base: '#ee7a24', mark: '#1c8f8c', trim: '#fbf2d8' },
};

export default defineThing({
  questions: {
    count: choice('How many pedestals are set out?', {
      two: 'Two tubs, a low and a high: a small act, one animal.',
      three: 'Three tubs of rising height: the usual set.',
      five: 'Five tubs in a wide arc: a full cage act of big cats.',
    }),
    motif: choice('What is painted on the pedestals?', {
      stars: 'A band of bold stars round each tub.',
      harlequin: 'Harlequin diamonds all the way round.',
      gilt: 'Flaking gilt over old gesso, grand once.',
      stripes: 'Vertical candy stripes, like a drum.',
      sunburst: 'Pointed sunburst rays rising from the base.',
    }),
    colours: choice('What colours are they painted in?', COLOURS),
    on: choice('What is on the pedestals?', {
      nothing: 'Nothing: bare tops waiting for the animals.',
      ball: 'A big striped ball balanced on the tallest tub.',
      'top-hat': 'A black top hat left on one of the tubs.',
      claws: 'Deep claw marks raked through the paint, nothing else.',
      cat: 'An ordinary ginger house cat sitting where a lion should be.',
    }),
    hoop: choice('What is the hoop on its stand like?', {
      plain: 'A plain painted wooden hoop.',
      aflame: 'A hoop of fire: flames licking all the way round the ring.',
      paper: 'A paper-covered hoop with a ragged hole burst through the middle.',
      ribbons: 'A hoop wound with ribbons, streamers hanging from it.',
    }),
    chair: choice('Where is the tamer\'s chair?', {
      upright: 'Standing upright, ready to be picked up.',
      fallen: 'Knocked over on its side, as if dropped in a hurry.',
      none: 'There is no chair.',
    }),
    whip: choice('Where is the whip?', {
      coiled: 'Neatly coiled on the ground.',
      trailing: 'Thrown down in a loose trail across the sawdust.',
      none: 'No whip in sight.',
    }),
    cage: noul('Do sections of the steel ring cage stand behind the pedestals?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const p = PALETTE[a.colours];
    const gilt = a.motif === 'gilt';
    const base = gilt ? '#c9a23a' : p.base;
    const clawed = a.on === 'claws';
    const chipCount = Math.floor(mood.wear * 90) + (gilt ? 70 : 0);

    const claws = (c: CanvasRenderingContext2D, w: number, h: number, sets: number) => {
      for (let k = 0; k < sets; k++) {
        const x = random() * w * 0.8 + w * 0.05, y = random() * h * 0.4 + h * 0.1, lean = (random() - 0.5) * 0.8, len = h * (0.4 + random() * 0.35);
        for (let i = 0; i < 4; i++) {
          c.strokeStyle = '#3a2a1c';
          c.lineWidth = 7;
          c.lineCap = 'round';
          c.beginPath();
          c.moveTo(x + i * 16, y + Math.abs(i - 1.5) * 8);
          c.quadraticCurveTo(x + i * 16 + lean * len * 0.3, y + len * 0.5, x + i * 16 + lean * len, y + len);
          c.stroke();
          c.strokeStyle = '#d9c09a';
          c.lineWidth = 2.5;
          c.stroke();
        }
      }
    };
    const chips = (c: CanvasRenderingContext2D, w: number, h: number) => {
      for (let i = 0; i < chipCount; i++) {
        c.fillStyle = random() < 0.5 ? '#e8dfcc' : '#7b6247';
        c.beginPath();
        c.ellipse(random() * w, random() * h, 3 + random() * 12, 2 + random() * 6, random() * 3, 0, 7);
        c.fill();
      }
    };
    const sideMap = () =>
      paint(512, 192, (c, w, h) => {
        c.fillStyle = base;
        c.fillRect(0, 0, w, h);
        c.fillStyle = gilt ? '#8d6b1e' : p.mark;
        if (a.motif === 'stars') for (let i = 0; i < 8; i++) star(c, (i + 0.5) * (w / 8), h / 2, 34);
        else if (a.motif === 'harlequin')
          for (let i = 0; i <= 10; i++) {
            c.beginPath();
            c.moveTo((i * w) / 10, 0);
            c.lineTo((i * w) / 10 + w / 20, h / 2);
            c.lineTo((i * w) / 10, h);
            c.lineTo((i * w) / 10 - w / 20, h / 2);
            c.fill();
          }
        else if (a.motif === 'stripes') for (let i = 0; i < 10; i++) c.fillRect((i * w) / 10, 0, w / 20, h);
        else if (a.motif === 'sunburst')
          for (let i = 0; i < 12; i++) {
            c.beginPath();
            c.moveTo((i * w) / 12, h);
            c.lineTo((i * w) / 12 + w / 24, h * 0.12);
            c.lineTo((i * w) / 12 + w / 12, h);
            c.fill();
          }
        else {
          // Flaking gilt: scrolls and a medallion in darker gold.
          c.lineWidth = 6;
          c.strokeStyle = '#8d6b1e';
          for (let i = 0; i < 6; i++) {
            c.beginPath();
            c.arc((i + 0.5) * (w / 6), h / 2, 38, 0.4, 5.4);
            c.stroke();
            star(c, (i + 0.5) * (w / 6), h / 2, 16);
          }
        }
        chips(c, w, h);
        if (clawed) claws(c, w, h, 5);
      });
    const topMap = () =>
      paint(256, 256, (c, w, h) => {
        c.fillStyle = gilt ? '#c9a23a' : p.mark;
        c.fillRect(0, 0, w, h);
        c.fillStyle = base;
        c.beginPath();
        c.arc(w / 2, h / 2, 104, 0, 7);
        c.fill();
        c.fillStyle = gilt ? '#8d6b1e' : p.mark;
        star(c, w / 2, h / 2, 84, random() * 6);
        chips(c, w, h);
        if (clawed) claws(c, w, h, 3);
      });

    const trim = s.material(p.trim, { metalness: gilt ? 0.6 : 0.2, roughness: 0.5 });
    const rough = 0.55 + mood.wear * 0.35;
    const n = { two: 2, three: 3, five: 5 }[a.count];
    const arcR = n === 5 ? 1.8 : 1.45;
    const tops: { x: number; z: number; h: number; r: number }[] = [];
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0.5 : i / (n - 1);
      const spread = n === 5 ? 1.25 : n === 3 ? 0.95 : 0.6;
      const angle = (t - 0.5) * 2 * spread;
      const x = Math.sin(angle) * arcR, z = -Math.cos(angle) * arcR + arcR - 0.45;
      const h = mix(0.42, n === 2 ? 0.95 : 1.3, t) + (random() - 0.5) * 0.04;
      const r = 0.4, R = 0.51;
      const side = new THREE.Mesh(new THREE.CylinderGeometry(r, R, h - 0.1, 36, 1, true), new THREE.MeshStandardMaterial({ map: sideMap(), roughness: rough }));
      side.position.set(x, h / 2 - 0.02, z);
      side.rotation.y = random() * 6;
      side.castShadow = side.receiveShadow = true;
      s.root.add(side);
      s.cylinder(R + 0.01, R + 0.03, 0.07, [x, 0.035, z], trim, 36);
      const top = s.mesh(new THREE.CylinderGeometry(r + 0.03, r + 0.02, 0.07, 36), [trim, new THREE.MeshStandardMaterial({ map: topMap(), roughness: rough }), trim] as unknown as THREE.Material, [x, h - 0.035, z]);
      top.rotation.y = random() * 6;
      tops.push({ x, z, h, r });
    }
    const tallest = tops[n - 1], middle = tops[Math.floor((n - 1) / 2)];

    if (a.on === 'ball') {
      const ballMap = paint(256, 128, (c, w, h) => {
        const hues = [p.base, p.mark, '#f3efe4', p.base, p.mark, '#f3efe4'];
        hues.forEach((hue, i) => { c.fillStyle = hue; c.fillRect((i * w) / 6, 0, w / 6 + 1, h); });
        c.fillStyle = p.trim;
        c.fillRect(0, 0, w, 14);
        c.fillRect(0, h - 14, w, 14);
      });
      const ball = s.mesh(new THREE.SphereGeometry(0.3, 28, 16), new THREE.MeshStandardMaterial({ map: ballMap, roughness: 0.5 }), [tallest.x + (random() - 0.5) * 0.1, tallest.h + 0.3, tallest.z]);
      ball.rotation.set(random() * 0.8, random() * 6, random() * 0.8);
    } else if (a.on === 'top-hat') {
      const felt = s.material('#17161a', { roughness: 0.75 });
      const hat = new Sculpture(context);
      hat.cylinder(0.125, 0.11, 0.24, [0, 0.13, 0], felt, 24);
      hat.cylinder(0.2, 0.2, 0.018, [0, 0.01, 0], felt, 24);
      hat.cylinder(0.113, 0.113, 0.05, [0, 0.045, 0], s.material('#9c1f2e'), 24);
      const tipped = random() < 0.5;
      hat.root.position.set(middle.x + 0.05, middle.h + (tipped ? 0.125 : 0), middle.z + 0.04);
      if (tipped) hat.root.rotation.set(Math.PI / 2, 0, random() * 6, 'ZYX');
      s.root.add(hat.root);
    } else if (a.on === 'cat') {
      const fur = s.material('#d98a3a', { roughness: 0.95 }), pale = s.material('#f3e3c8', { roughness: 0.95 });
      const cat = new Sculpture(context);
      cat.ball([0.11, 0.15, 0.13], [0, 0.14, 0], fur, 14);
      cat.ball([0.07, 0.1, 0.05], [0, 0.13, 0.1], pale, 10);
      cat.ball([0.08, 0.075, 0.075], [0, 0.33, 0.04], fur, 14);
      for (const x of [-0.05, 0.05]) {
        cat.mesh(new THREE.ConeGeometry(0.03, 0.06, 4), fur, [x, 0.41, 0.03]);
        cat.ball([0.012, 0.016, 0.01], [x * 0.6, 0.345, 0.11], s.material('#1c2a12'), 6);
        cat.cylinder(0.022, 0.026, 0.1, [x * 0.9, 0.05, 0.12], pale, 8);
      }
      cat.tube([[0.08, 0.04, -0.08], [0.2, 0.03, -0.02], [0.24, 0.04, 0.12], [0.16, 0.05, 0.2]], 0.02, fur);
      cat.root.position.set(tallest.x, tallest.h, tallest.z);
      cat.root.rotation.y = (random() - 0.5) * 1.2;
      s.root.add(cat.root);
    }

    // Hoop on its stand, set between the tubs and the front of the act.
    const hoopX = n === 2 ? 0 : 0.62, hoopZ = 0.62, hoopY = 1.55, hoopR = 0.48;
    const iron = s.material('#2b2b30', { metalness: 0.6, roughness: 0.5 });
    const hoop = new Sculpture(context);
    hoop.cylinder(0.03, 0.035, hoopY - hoopR, [0, (hoopY - hoopR) / 2, 0], iron, 10);
    for (let i = 0; i < 3; i++) {
      const angle = (i * Math.PI * 2) / 3 + 0.5;
      hoop.rod([0, 0.3, 0], [Math.cos(angle) * 0.4, 0.02, Math.sin(angle) * 0.4], 0.022, iron);
    }
    const burning = a.hoop === 'aflame';
    hoop.ring(hoopR, burning ? 0.028 : 0.035, [0, hoopY, 0], burning ? s.material('#1a1410', { roughness: 0.9 }) : s.material(p.mark));
    const flames: THREE.Mesh[] = [];
    if (burning) {
      const fire = new THREE.MeshStandardMaterial({ color: '#ff8a1e', emissive: '#ff5a0a', emissiveIntensity: 1.6, roughness: 0.6 });
      const core = new THREE.MeshStandardMaterial({ color: '#ffe27a', emissive: '#ffc02e', emissiveIntensity: 2.2, roughness: 0.6 });
      const tongues = 22;
      for (let i = 0; i < tongues; i++) {
        const angle = (i / tongues) * Math.PI * 2;
        const size = 0.09 + random() * 0.05;
        const flame = hoop.mesh(new THREE.ConeGeometry(size, size * (3 + random() * 1.6), 7), i % 3 === 0 ? core : fire, [Math.cos(angle) * hoopR, hoopY + Math.sin(angle) * hoopR + size * 1.1, (random() - 0.5) * 0.05]);
        flame.rotation.z = -Math.cos(angle) * 0.35;
        flames.push(flame);
      }
    } else if (a.hoop === 'paper') {
      const paperMap = paint(256, 256, (c, w, h) => {
        c.fillStyle = '#f4ecd6';
        c.fillRect(0, 0, w, h);
        c.fillStyle = p.base;
        star(c, w / 2, h / 2, 120);
        c.globalCompositeOperation = 'destination-out';
        c.beginPath();
        for (let i = 0; i < 18; i++) {
          const angle = (i / 18) * Math.PI * 2, reach = i % 2 ? 40 + random() * 20 : 78 + random() * 26;
          c.lineTo(w / 2 + Math.cos(angle) * reach, h / 2 + Math.sin(angle) * reach);
        }
        c.fill();
      });
      hoop.mesh(new THREE.CircleGeometry(hoopR, 32), new THREE.MeshStandardMaterial({ map: paperMap, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.9 }), [0, hoopY, 0]);
    } else if (a.hoop === 'ribbons') {
      const hues = [p.base, p.mark, '#f3efe4', '#d8457a'];
      for (let i = 0; i < 9; i++) {
        const angle = Math.PI + (i / 8) * Math.PI;
        const x = Math.cos(angle) * hoopR, y = hoopY + Math.sin(angle) * hoopR, drop = 0.35 + random() * 0.45;
        hoop.tube([[x, y, 0], [x + (random() - 0.5) * 0.1, y - drop / 2, 0.05], [x + (random() - 0.5) * 0.16, y - drop, (random() - 0.5) * 0.1]], 0.018, s.material(hues[i % hues.length]));
      }
    }
    hoop.root.position.set(hoopX, 0, hoopZ);
    hoop.root.rotation.y = -0.35 + (random() - 0.5) * 0.3;
    s.root.add(hoop.root);

    if (a.chair !== 'none') {
      const wood = s.material('#7a4a26'), seat = s.material(p.base);
      const chair = new Sculpture(context);
      chair.cylinder(0.21, 0.2, 0.04, [0, 0.46, 0], seat, 20);
      for (const [x, z] of [[-0.15, 0.15], [0.15, 0.15]] as const) chair.rod([x * 1.15, 0, z * 1.15], [x, 0.45, z], 0.02, wood);
      for (const x of [-0.16, 0.16]) chair.rod([x * 1.1, 0, -0.19], [x, 0.95, -0.17], 0.02, wood);
      chair.tube([[-0.16, 0.95, -0.17], [-0.1, 1.02, -0.18], [0.1, 1.02, -0.18], [0.16, 0.95, -0.17]], 0.02, wood);
      chair.tube([[-0.14, 0.62, -0.17], [0, 0.86, -0.18], [0.14, 0.62, -0.17]], 0.014, wood);
      chair.ring(0.17, 0.012, [0, 0.24, 0], wood).rotation.x = Math.PI / 2;
      const cx = n === 2 ? -0.9 : -0.62;
      if (a.chair === 'fallen') {
        chair.root.rotation.set(0, random() * 6, Math.PI / 2 - 0.08, 'YXZ');
        chair.root.position.set(cx, 0.21, 0.75);
      } else {
        chair.root.position.set(cx, 0, 0.72);
        chair.root.rotation.y = 0.5 + (random() - 0.5) * 0.6;
      }
      s.root.add(chair.root);
    }

    if (a.whip !== 'none') {
      const leather = s.material('#2a1a12', { roughness: 0.8 });
      const points: [number, number, number][] = [];
      const wx = 0.05, wz = 1.2;
      if (a.whip === 'coiled') {
        for (let i = 0; i <= 44; i++) {
          const angle = i * 0.42, reach = 0.11 + i * 0.0045;
          points.push([wx + Math.cos(angle) * reach, 0.025 + (i % 15) * 0.0015, wz + Math.sin(angle) * reach]);
        }
      } else {
        for (let i = 0; i <= 14; i++) points.push([wx - 0.9 + i * 0.13, 0.025, wz + Math.sin(i * 0.9 + random() * 0.3) * 0.16 - 0.1]);
      }
      s.tube(points, 0.016, leather);
      const [hx, , hz] = points[0];
      const [nx, , nz] = points[1];
      const away = new THREE.Vector3(hx - nx, 0, hz - nz).normalize().multiplyScalar(0.34);
      s.rod([hx, 0.03, hz], [hx + away.x, 0.035, hz + away.z], 0.02, s.material(p.base), 0.028);
      s.ball([0.035, 0.035, 0.035], [hx + away.x, 0.035, hz + away.z], trim, 8);
    }

    if (a.cage) {
      const bars = n === 5 ? 26 : 18, reach = n === 5 ? 1.5 : 1.15, radius = arcR + 0.75, height = 2.6;
      const pts: { at: [number, number, number]; size: number }[] = [];
      for (let i = 0; i < bars; i++) {
        const angle = (i / (bars - 1) - 0.5) * 2 * reach;
        pts.push({ at: [Math.sin(angle) * radius, height / 2, -Math.cos(angle) * radius + arcR - 0.45], size: 1 });
      }
      s.scatter(new THREE.CylinderGeometry(0.016, 0.016, height, 6), iron, pts);
      for (const y of [0.05, height * 0.55, height]) {
        const rail = s.ring(radius, 0.022, [0, y, arcR - 0.45], iron, reach * 2);
        rail.rotation.set(-Math.PI / 2, 0, Math.PI / 2 - reach);
      }
    }

    const speed = mix(2, 9, mood.energy);
    return s.finish({
      update: (_dt, time) => {
        flames.forEach((flame, i) => {
          const pulse = 0.8 + 0.3 * Math.sin(time * speed + i * 1.7) + 0.12 * Math.sin(time * speed * 2.3 + i);
          flame.scale.set(1, pulse, 1);
        });
      },
    });
  },
});
