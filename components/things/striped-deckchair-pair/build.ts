import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

type P3 = [number, number, number];
const STRIPES = {
  red: 'Red and white.',
  blue: 'Navy blue and white.',
  green: 'Bottle green and cream.',
  sunset: 'Orange and yellow.',
  rainbow: 'Many colours, a different one every stripe.',
  mono: 'Bold black and white.',
} as const;
const PALETTE: Record<keyof typeof STRIPES, string[]> = {
  red: ['#d2302a', '#f6f1e2'],
  blue: ['#24427a', '#f6f1e2'],
  green: ['#2f6f4a', '#f1e8c8'],
  sunset: ['#ef7f1a', '#f6cf3a'],
  rainbow: ['#d2302a', '#f6cf3a', '#2f9a52', '#2c6fd0', '#ef7f1a', '#8a4fb0'],
  mono: ['#1f2226', '#f6f1e2'],
};

export default defineThing({
  questions: {
    stripes: choice('What colour are the canvas stripes?', STRIPES),
    match: noul('Do the two chairs match each other?'),
    state: choice('What state are the chairs in?', {
      both: 'Both set up side by side, waiting.',
      occupied: 'Both set up, one holding a folded newspaper and a hat to keep the place.',
      collapsed: 'One set up, the other collapsed flat on the ground.',
      blown: 'One set up, the other blown over on its side by the wind.',
      stacked: 'Both folded flat and leaned up together, the day is done.',
    }),
    canvas: choice('How does the canvas hang?', {
      taut: 'Taut and new, barely dipping.',
      sagging: 'Sagging deep, stretched by years of sitters.',
      split: 'One sling has split and hangs loose from the top bar.',
    }),
    windbreak: choice('What kind of windbreak stands behind them?', {
      panels: 'Canvas panels each a different bright colour, on wooden poles.',
      plain: 'A plain faded blue windbreak.',
      leaning: 'A striped windbreak leaning hard, half pulled out of the ground.',
      none: 'None, they take the wind as it comes.',
    }),
    between: choice('What sits between them beside the thermos?', {
      cups: 'Two enamel mugs.',
      sandwiches: 'A foil parcel of sandwiches and a plastic tub.',
      radio: 'A small transistor radio with its aerial up.',
      bucket: 'A bucket and spade.',
      shoes: 'Two pairs of shoes with the socks tucked inside.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pale = new THREE.Color('#d9d4c4');
    const faded = (hex: string) => '#' + new THREE.Color(hex).lerp(pale, mood.wear * 0.36).getHexString();
    const wood = new THREE.MeshStandardMaterial({ color: new THREE.Color('#c08a4a').lerp(new THREE.Color('#9a958a'), mood.wear * 0.7), roughness: 0.8 });
    const stripeTexture = (colours: string[]) => {
      const canvas = document.createElement('canvas');
      canvas.width = 128; canvas.height = 8;
      const c = canvas.getContext('2d')!;
      const bands = colours.length > 2 ? 12 : 8;
      for (let i = 0; i < bands; i++) { c.fillStyle = faded(colours[i % colours.length]); c.fillRect(i * 128 / bands, 0, 128 / bands + 1, 8); }
      const map = new THREE.CanvasTexture(canvas);
      map.colorSpace = THREE.SRGBColorSpace;
      return map;
    };
    const add = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, at: P3 = [0, 0, 0]) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...at);
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    const bar = (parent: THREE.Object3D, from: P3, to: P3, r = 0.02, material: THREE.Material = wood) => {
      const p = new THREE.Vector3(...from), q = new THREE.Vector3(...to), d = q.clone().sub(p);
      const mesh = add(parent, new THREE.BoxGeometry(r * 2, d.length(), r * 1.5), material, p.add(q).multiplyScalar(0.5).toArray() as P3);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
      return mesh;
    };
    const sling = (parent: THREE.Object3D, map: THREE.Texture, curve: (t: number) => [number, number], width = 0.5) => {
      const geometry = new THREE.PlaneGeometry(width, 1, 1, 16);
      const pos = geometry.attributes.position, uv = geometry.attributes.uv;
      for (let i = 0; i < pos.count; i++) {
        const [z, y] = curve(1 - uv.getY(i));
        pos.setXYZ(i, (uv.getX(i) - 0.5) * width, y, z);
      }
      geometry.computeVertexNormals();
      return add(parent, geometry, new THREE.MeshStandardMaterial({ map, roughness: 0.95, side: THREE.DoubleSide }));
    };
    const bezier = (p0: [number, number], p1: [number, number], p2: [number, number]) => (t: number): [number, number] =>
      [(1 - t) * (1 - t) * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0], (1 - t) * (1 - t) * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1]];

    const A0: [number, number] = [-0.52, 0.02], A1: [number, number] = [0.5, 0.42], B0: [number, number] = [0.42, 0.02], B1: [number, number] = [-0.5, 1.02];
    const upright = (map: THREE.Texture, hang: 'taut' | 'sagging' | 'split') => {
      const g = new THREE.Group();
      for (const side of [-1, 1]) {
        bar(g, [side * 0.3, A0[1], A0[0]], [side * 0.3, A1[1], A1[0]]);
        bar(g, [side * 0.26, B0[1], B0[0]], [side * 0.26, B1[1], B1[0]]);
        bar(g, [side * 0.33, 0.04, -0.47], [side * 0.33, 0.74, -0.25], 0.016);
      }
      for (const [z, y, w] of [[A0[0], A0[1], 0.3], [A1[0], A1[1], 0.3], [B0[0], B0[1], 0.26], [B1[0], B1[1], 0.26]] as const) bar(g, [-w, y, z], [w, y, z], 0.022);
      bar(g, [-0.33, 0.74, -0.25], [0.33, 0.74, -0.25], 0.014);
      const dip = hang === 'taut' ? 0.2 : 0.46 + random() * 0.08;
      const curve = hang === 'split'
        ? bezier([B1[0], B1[1]], [B1[0] + 0.1, 0.4], [B1[0] + 0.28 + random() * 0.2, 0.04])
        : bezier([B1[0], B1[1]], [-0.12, 0.72 - dip * 1.25], [A1[0], A1[1]]);
      sling(g, map, curve);
      if (hang === 'split') sling(g, map, bezier([A1[0], A1[1]], [A1[0] - 0.03, 0.2], [A1[0] - 0.14 - random() * 0.1, 0.03]), 0.5);
      return { group: g, curve };
    };
    const folded = (map: THREE.Texture) => {
      const g = new THREE.Group();
      for (const side of [-1, 1]) {
        bar(g, [side * 0.3, 0.025, -0.6], [side * 0.3, 0.025, 0.55]);
        bar(g, [side * 0.26, 0.06, -0.68], [side * 0.26, 0.06, 0.62]);
      }
      for (const [z, y, w] of [[-0.6, 0.025, 0.3], [0.55, 0.025, 0.3], [-0.68, 0.06, 0.26], [0.62, 0.06, 0.26]] as const) bar(g, [-w, y, z], [w, y, z], 0.022);
      sling(g, map, (t) => [mix(-0.66, 0.53, t), 0.085 + Math.sin(t * 9) * 0.008]);
      return g;
    };

    const keys = Object.keys(PALETTE) as (keyof typeof STRIPES)[];
    const others = keys.filter((k) => k !== a.stripes);
    const mapA = stripeTexture(PALETTE[a.stripes]);
    const mapB = a.match ? mapA : stripeTexture(PALETTE[others[Math.floor(random() * others.length)]]);
    const gap = 0.58, turn = 0.38 + random() * 0.12;
    const hangB: 'taut' | 'sagging' | 'split' = a.canvas === 'split' ? (mood.wear > 0.5 ? 'sagging' : 'taut') : a.canvas;

    // Chair one, on the left.
    let seat: { group: THREE.Group; curve: (t: number) => [number, number] } | null = null;
    if (a.state === 'stacked') {
      for (const [i, map] of [mapA, mapB].entries()) {
        const flat = folded(map);
        if (a.windbreak === 'none' || a.windbreak === 'leaning') {
          flat.position.set(-0.15 + i * 0.12, i * 0.1, -0.1 + i * 0.07);
          flat.rotation.y = 1.45 + i * 0.22 + (random() - 0.5) * 0.1;
        } else {
          flat.rotation.set(1.2 - i * 0.07, 0, 0, 'YXZ');
          flat.rotation.y = (i ? -0.12 : 0.1) + (random() - 0.5) * 0.08;
          flat.position.set(-0.36 + i * 0.72, 0.58, -0.3 + i * 0.03);
        }
        s.root.add(flat);
      }
    } else {
      seat = upright(mapA, a.canvas);
      seat.group.position.set(-gap, 0, 0);
      seat.group.rotation.y = turn;
      s.root.add(seat.group);
      if (a.state === 'collapsed') {
        const flat = folded(mapB);
        flat.position.set(gap + 0.1, 0, 0.05);
        flat.rotation.y = -turn - 0.5 + random() * 0.6;
        s.root.add(flat);
      } else {
        const other = upright(mapB, hangB);
        if (a.state === 'blown') {
          other.group.rotation.set(0, -turn - 0.9 + random() * 0.6, Math.PI / 2 - 0.08, 'YXZ');
          other.group.position.set(gap + 0.45, 0.33, 0.25);
        } else {
          other.group.position.set(gap, 0, 0);
          other.group.rotation.y = -turn;
        }
        s.root.add(other.group);
      }
    }

    // A newspaper and a hat keep the place.
    if (a.state === 'occupied' && seat && a.canvas !== 'split') {
      const [z1, y1] = seat.curve(0.66), [z0, y0] = seat.curve(0.6), [z2, y2] = seat.curve(0.72);
      const slope = Math.atan2(y2 - y0, z2 - z0);
      const paper = new THREE.Group();
      add(paper, new THREE.BoxGeometry(0.3, 0.03, 0.22), new THREE.MeshStandardMaterial({ color: '#ece6d4', roughness: 1 }));
      const print = s.label('DAILY NEWS', 0.28, 0.2, [0, 0, 0], '#2a2a2a', '#ece6d4');
      paper.add(print);
      print.position.set(0, 0.017, 0);
      print.rotation.x = -Math.PI / 2;
      paper.position.set(0, y1 + 0.03, z1);
      paper.rotation.x = -slope;
      paper.rotation.z = (random() - 0.5) * 0.3;
      seat.group.add(paper);
      const [zh, yh] = seat.curve(0.34), [zh2, yh2] = seat.curve(0.4);
      const hat = new THREE.Group();
      const straw = new THREE.MeshStandardMaterial({ color: mood.cheer > 0.5 ? '#e6cf8f' : '#8a8478', roughness: 1, side: THREE.DoubleSide });
      add(hat, new THREE.CylinderGeometry(0.19, 0.19, 0.012, 20), straw);
      add(hat, new THREE.CylinderGeometry(0.09, 0.1, 0.09, 16), straw, [0, 0.045, 0]);
      add(hat, new THREE.CylinderGeometry(0.102, 0.102, 0.03, 16), new THREE.MeshStandardMaterial({ color: '#24427a', roughness: 0.9 }), [0, 0.02, 0]);
      hat.position.set(0.03, yh + 0.04, zh);
      hat.rotation.x = -Math.atan2(yh2 - yh, zh2 - zh);
      seat.group.add(hat);
    }

    // Windbreak.
    const breaker = new THREE.Group();
    if (a.windbreak !== 'none') {
      const colours = a.windbreak === 'plain' ? ['#5f8fb8'] : a.windbreak === 'leaning' ? PALETTE[a.stripes] : ['#d2302a', '#f6cf3a', '#2c6fd0', '#2f9a52'];
      const posts: P3[] = [[-1.24, 0, 0.16], [-0.62, 0, -0.08], [0, 0, 0.04], [0.62, 0, -0.1], [1.24, 0, 0.15]];
      posts.forEach(([x, , z], i) => {
        bar(breaker, [x, -0.1, z], [x, 1.22, z], 0.02);
        add(breaker, new THREE.ConeGeometry(0.03, 0.08, 6), wood, [x, 1.26, z]);
        if (i === posts.length - 1) return;
        const [nx, , nz] = posts[i + 1];
        const panel = new THREE.PlaneGeometry(1, 1, 6, 1);
        const pos = panel.attributes.position;
        for (let v = 0; v < pos.count; v++) {
          const u = pos.getX(v) + 0.5, belly = Math.sin(u * Math.PI) * mix(0.03, 0.16, mood.energy);
          pos.setXYZ(v, mix(x, nx, u), 0.6 + pos.getY(v) * 0.98, mix(z, nz, u) - belly);
        }
        panel.computeVertexNormals();
        const fabric = a.windbreak === 'leaning'
          ? new THREE.MeshStandardMaterial({ map: mapA, roughness: 1, side: THREE.DoubleSide })
          : new THREE.MeshStandardMaterial({ color: faded(colours[i % colours.length]), roughness: 1, side: THREE.DoubleSide });
        add(breaker, panel, fabric);
      });
      breaker.position.set(0, 0, -0.72);
      breaker.rotation.x = a.windbreak === 'leaning' ? -0.55 - random() * 0.2 : -0.04;
      breaker.rotation.z = a.windbreak === 'leaning' ? (random() - 0.5) * 0.2 : 0;
      s.root.add(breaker);
    }

    // Rug, thermos and company.
    const tartan = document.createElement('canvas');
    tartan.width = tartan.height = 64;
    const tc = tartan.getContext('2d')!;
    tc.fillStyle = faded(mood.warmth > 0.5 ? '#a8322a' : '#2f5f6a'); tc.fillRect(0, 0, 64, 64);
    tc.globalAlpha = 0.45;
    for (let i = 0; i < 4; i++) { tc.fillStyle = i % 2 ? '#1f2a3a' : '#f1e8c8'; tc.fillRect(i * 16 + 4, 0, 5, 64); tc.fillRect(0, i * 16 + 4, 64, 5); }
    const rugMap = new THREE.CanvasTexture(tartan);
    rugMap.colorSpace = THREE.SRGBColorSpace;
    const rug = s.box([0.6, 0.015, 0.8], [0, 0.008, 0.45], new THREE.MeshStandardMaterial({ map: rugMap, roughness: 1 }));
    rug.rotation.y = (random() - 0.5) * 0.3;
    const steel = s.material('#c9cfd1', { metalness: 0.8, roughness: 0.25 });
    const flaskHex = mood.cheer > 0.5 ? '#d2302a' : '#2f5f4a';
    s.cylinder(0.05, 0.05, 0.26, [-0.08, 0.145, 0.35], s.material(flaskHex, { roughness: 0.4 }), 14);
    s.cylinder(0.042, 0.05, 0.07, [-0.08, 0.31, 0.35], steel, 14);
    s.cylinder(0.052, 0.052, 0.02, [-0.08, 0.025, 0.35], steel, 14);
    if (a.between === 'cups') {
      for (const [x, z] of [[0.1, 0.5], [0.16, 0.28]] as const) {
        s.cylinder(0.045, 0.04, 0.08, [x, 0.056, z], s.material('#f1ede0', { roughness: 0.4 }), 12);
        s.ring(0.03, 0.008, [x + 0.05, 0.056, z], s.material('#24427a')).rotation.y = 0;
        s.cylinder(0.04, 0.04, 0.004, [x, 0.09, z], s.material('#6a4428', { roughness: 0.3 }), 12);
      }
    } else if (a.between === 'sandwiches') {
      const foil = s.box([0.17, 0.07, 0.13], [0.12, 0.05, 0.52], new THREE.MeshStandardMaterial({ color: '#d5d9db', metalness: 0.85, roughness: 0.4, flatShading: true }));
      foil.rotation.y = 0.5;
      s.box([0.2, 0.08, 0.14], [0.12, 0.055, 0.28], s.material('#f1ede0', { roughness: 0.5 }));
      s.box([0.21, 0.02, 0.15], [0.12, 0.105, 0.28], s.material('#3a8fd0', { roughness: 0.5 }));
    } else if (a.between === 'radio') {
      s.box([0.24, 0.16, 0.07], [0.12, 0.095, 0.4], s.material('#3a3028', { roughness: 0.6 })).rotation.y = -0.3;
      s.box([0.22, 0.07, 0.075], [0.12, 0.13, 0.402], steel).rotation.y = -0.3;
      s.rod([0.2, 0.17, 0.37], [0.34, 0.5, 0.33], 0.005, steel);
    } else if (a.between === 'bucket') {
      const plastic = s.material(mood.cheer > 0.5 ? '#f6cf3a' : '#d2302a', { roughness: 0.5, side: THREE.DoubleSide });
      s.lathe([[0.001, 0.008], [0.08, 0.008], [0.115, 0.2], [0.125, 0.2]], plastic, [0.14, 0.015, 0.5]);
      s.rod([0.1, 0.02, 0.22], [0.3, 0.05, 0.3], 0.012, s.material('#2c6fd0'));
      s.box([0.1, 0.012, 0.13], [0.34, 0.05, 0.315], s.material('#2c6fd0')).rotation.y = 1.2;
    } else {
      for (const [x, z, hex, big] of [[0.08, 0.55, '#6a4428', 1.1], [0.2, 0.56, '#6a4428', 1.1], [0.1, 0.25, '#f1ede0', 0.9], [0.21, 0.27, '#f1ede0', 0.9]] as const) {
        const shoe = s.ball([0.05 * big, 0.04, 0.12 * big], [x, 0.05, z], s.material(hex, { roughness: 0.7 }), 10);
        shoe.rotation.y = (random() - 0.5) * 0.4;
        s.ball([0.035, 0.03, 0.04], [x, 0.085, z - 0.04], s.material(big > 1 ? '#8a8f96' : '#e8669a', { roughness: 1 }), 8);
      }
    }
    for (let i = 0; i < Math.round(mood.density * 3); i++) {
      const hue = ['#e23b2e', '#f4c20d', '#2f7fd6'][i % 3];
      s.ball([0.09, 0.09, 0.09], [(random() - 0.5) * 1.5, 0.09, 0.75 + random() * 0.25], s.material(hue, { roughness: 0.5 }), 12);
    }

    const base = breaker.rotation.x, gust = mix(0.4, 3.2, mood.energy), reach = mix(0.005, 0.07, mood.energy);
    return s.finish({ update: (_dt, time) => { breaker.rotation.x = base + Math.sin(time * gust) * reach; } });
  },
});
