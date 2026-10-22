import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

type P3 = [number, number, number];

const SERIES = {
  indicator: 'A universal-indicator rainbow from acid red through green to alkaline violet.',
  titration: 'Colourless deepening tube by tube to a strong magenta pink.',
  copper: 'A dilution series from barely blue to deep copper-sulphate blue.',
  blood: 'Straw yellow through rust to dark dried-blood red: clinical or forensic samples.',
  pond: 'Murky pond and soil samples, from cloudy khaki to peat brown.',
  flame: 'Unrelated vivid colours, each tube its own bright experiment.',
} as const;
const STOPS: Record<keyof typeof SERIES, string[]> = {
  indicator: ['#d42a2a', '#f08a1e', '#f2d22a', '#5cba3c', '#2a8fd6', '#4a3fb8', '#7a2a9e'],
  titration: ['#dfecee', '#f7d6e4', '#f39ac0', '#e8408a', '#c2185b'],
  copper: ['#d6ebf2', '#9fd3ee', '#4aa6e2', '#1f6fc4', '#123f8f'],
  blood: ['#e9cf9a', '#d98a5c', '#c0392b', '#8e1b1b', '#4a0f12'],
  pond: ['#d9dcae', '#b3bf6a', '#7d9440', '#5d6b33', '#4a3f26'],
  flame: ['#e83a3a', '#27b8a0', '#f2c81e', '#8a3fd0', '#f07a1e', '#2a8fd6', '#e84a9a', '#6fd12c'],
};
const ramp = (stops: string[], t: number) => {
  const x = Math.min(0.9999, Math.max(0, t)) * (stops.length - 1), i = Math.floor(x);
  return new THREE.Color(stops[i]).lerp(new THREE.Color(stops[i + 1]), x - i);
};

export default defineThing({
  questions: {
    count: choice('How many tubes does the rack hold?', {
      four: 'Four: a small, careful comparison.',
      six: 'Six in a single row, the classroom standard.',
      eight: 'Eight in a long single row.',
      twelve: 'Twelve in two rows, a proper series.',
    }),
    series: choice('What colours run along the row?', SERIES),
    order: score('How orderly is the series?', ['Chaos: shuffled, slopped, tubes leaning, drips everywhere', 'Hurried and uneven', 'Mostly in order', 'Perfectly graded with every level matched']),
    flaw: choice('What is wrong with the row?', {
      complete: 'Nothing: every place is filled.',
      missing: 'One tube is missing, leaving an empty hole.',
      empty: 'One tube stands clean and empty, not yet filled.',
      cracked: 'One tube is cracked and has leaked into a puddle under the rack.',
      fallen: 'One tube has been dropped and lies on the bench in front, its contents run out.',
      shattered: 'One tube has shattered: a gap in the row and shards on the bench.',
    }),
    rack: choice('What is the rack made of?', {
      beech: 'Pale varnished beech, a school rack.',
      stained: 'Dark stained old wood, a century of spills.',
      white: 'White moulded plastic, clinical.',
      blue: 'Bright blue plastic from a modern kit.',
    }),
    tops: choice('How are the tubes closed?', {
      open: 'All open.',
      corked: 'Every tube corked.',
      some: 'A few corked, most open.',
    }),
    labelled: noul('Does each tube carry a small paper sticker?'),
    beside: choice('What tool lies with the rack?', {
      nothing: 'Nothing.',
      dropper: 'A pipette dropper.',
      brush: 'A wire test-tube brush.',
      holder: 'A wooden test-tube holder, the clothes-peg kind.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const n = { four: 4, six: 6, eight: 8, twelve: 12 }[a.count];
    const rows = n === 12 ? 2 : 1, perRow = n / rows;
    const pitch = 0.034, L = perRow * pitch + 0.03, depth = rows === 2 ? 0.1 : 0.062;
    const mess = 1 - a.order;
    const wood = s.material({ beech: '#d2ab73', stained: '#5c3a22', white: '#eeeee8', blue: '#2f6fc0' }[a.rack], { roughness: a.rack === 'white' || a.rack === 'blue' ? 0.4 : 0.7 });
    const dark = s.material({ beech: '#7a5a34', stained: '#22140c', white: '#b9b9b2', blue: '#173a70' }[a.rack], { roughness: 0.9 });
    const glass = new THREE.MeshPhysicalMaterial({ color: '#d8eef2', transparent: true, opacity: 0.18, roughness: 0.04, depthWrite: false, side: THREE.DoubleSide });
    const rimMat = s.material('#ecf6f7', { roughness: 0.1 });
    const cork = s.material('#b98a55', { roughness: 0.95 });

    // The rack: base, two ends, a drilled top rail and a lower rail.
    s.box([L + 0.02, 0.012, depth + 0.012], [0, 0.006, 0], wood);
    for (const x of [-1, 1]) s.box([0.012, 0.09, depth], [x * (L / 2 + 0.004), 0.057, 0], wood);
    const railY = 0.08;
    s.box([L, 0.009, depth - 0.006], [0, railY, 0], wood);
    for (const x of [-1, 1]) for (const z of [-1, 1]) s.cylinder(0.0035, 0.0035, 0.002, [x * (L / 2 + 0.0105), railY, z * depth * 0.3], dark, 8).rotation.z = Math.PI / 2;

    const R = 0.0095, len = 0.15, y0 = 0.014;
    const order = Array.from({ length: n }, (_u, i) => i);
    // Shuffle a share of the series according to the mess.
    for (let i = 0; i < Math.round(mess * n * 0.8); i++) {
      const p = Math.floor(random() * n), q = Math.floor(random() * n);
      [order[p], order[q]] = [order[q], order[p]];
    }
    const flawAt = a.flaw === 'complete' ? -1 : Math.min(n - 1, Math.max(0, Math.floor(perRow * (0.3 + random() * 0.45)) + (rows === 2 ? perRow : 0)));
    const baseLevel = mix(0.66, 0.82, random());

    const tube = (group: THREE.Group, colour: THREE.Color | null, level: number, cracked: boolean, corked: boolean, sticker: boolean) => {
      const put = (m: THREE.Object3D) => { group.add(m); return m; };
      put(s.mesh(new THREE.CylinderGeometry(R, R, len - R, 16, 1, true), glass, [0, R + (len - R) / 2, 0]));
      put(s.mesh(new THREE.SphereGeometry(R, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), glass, [0, R, 0]));
      put(s.ring(R + 0.0012, 0.0014, [0, len, 0], rimMat)).rotation.x = Math.PI / 2;
      if (colour && level > 0.02) {
        const paint = s.material(colour, { roughness: 0.2, emissive: colour, emissiveIntensity: 0.18 });
        const top = len * level;
        put(s.cylinder(R - 0.0018, R - 0.0018, top - R, [0, R + (top - R) / 2, 0], paint, 14));
        put(s.ball([R - 0.0018, R - 0.0018, R - 0.0018], [0, R, 0], paint, 14));
      }
      if (cracked) {
        const line = s.material('#f7fbfb', { roughness: 0.3 });
        let y = 0.03, t = 0.3;
        for (let i = 0; i < 5; i++) {
          const y2 = y + 0.012 + random() * 0.012, t2 = t + (random() - 0.5) * 1.2;
          put(s.rod([Math.sin(t) * (R + 0.0006), y, Math.cos(t) * (R + 0.0006)], [Math.sin(t2) * (R + 0.0006), y2, Math.cos(t2) * (R + 0.0006)], 0.0009, line));
          y = y2; t = t2;
        }
      }
      if (corked) put(s.cylinder(0.0105, 0.008, 0.016, [0, len + 0.002, 0], cork, 12));
      if (sticker) {
        const tag = put(s.box([0.011, 0.014, 0.0006], [0, len * 0.84, R + 0.0005], s.material('#f7f3e6', { roughness: 0.9 })));
        tag.rotation.z = (random() - 0.5) * 0.3 * (0.3 + mess);
      }
    };

    for (let i = 0; i < n; i++) {
      const row = Math.floor(i / perRow), col = i % perRow;
      const x = (col - (perRow - 1) / 2) * pitch, z = rows === 2 ? (row === 0 ? 0.024 : -0.024) : 0;
      // Hole in the top rail and dimple in the base.
      s.cylinder(0.0125, 0.0125, 0.0095, [x, railY + 0.0004, z], dark, 14);
      const t = n > 1 ? order[i] / (n - 1) : 0;
      const colour = a.series === 'flame' ? new THREE.Color(STOPS.flame[(order[i] + Math.floor(random() * 2 * mess)) % STOPS.flame.length]) : ramp(STOPS[a.series], t);
      const isFlaw = i === flawAt;
      if (isFlaw && (a.flaw === 'missing' || a.flaw === 'shattered' || a.flaw === 'fallen')) {
        const zf = depth / 2 + 0.035 + random() * 0.02;
        if (a.flaw === 'fallen') {
          const g = new THREE.Group();
          tube(g, colour, 0.16, false, false, a.labelled);
          g.rotation.z = Math.PI / 2; g.rotation.y = 0.2 + random() * 0.5;
          g.position.set(x + 0.07, R + 0.001, zf);
          s.root.add(g);
          const paint = s.material(colour, { roughness: 0.2 });
          for (let k = 0; k < 6; k++) s.cylinder(0.012 + random() * 0.012, 0.012, 0.0014, [x - 0.085 - k * 0.012 + random() * 0.01, 0.001, zf + 0.012 + (random() - 0.5) * 0.03], paint, 14).scale.z = 0.6 + random() * 0.5;
        } else if (a.flaw === 'shattered') {
          const shard = new THREE.MeshPhysicalMaterial({ color: '#e3f3f5', roughness: 0.05, transparent: true, opacity: 0.8 });
          const paint = s.material(colour, { roughness: 0.2 });
          s.cylinder(0.03, 0.03, 0.0014, [x, 0.001, zf], paint, 16).scale.z = 0.7;
          for (let k = 0; k < 11; k++) {
            const bit = s.box([0.006 + random() * 0.014, 0.0012, 0.004 + random() * 0.007], [x + (random() - 0.5) * 0.09, 0.003, zf + (random() - 0.5) * 0.05], shard);
            bit.rotation.set((random() - 0.5) * 0.5, random() * 3, (random() - 0.5) * 0.5);
          }
          const g = new THREE.Group();
          g.add(s.mesh(new THREE.SphereGeometry(R, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), shard, [0, R, 0]));
          g.position.set(x + 0.02, 0, zf + 0.01); g.rotation.z = 1.2;
          s.root.add(g);
        }
        continue;
      }
      const g = new THREE.Group();
      const level = isFlaw && a.flaw === 'empty' ? 0 : isFlaw && a.flaw === 'cracked' ? 0.14 : baseLevel + (random() - 0.5) * 0.5 * mess;
      const corked = a.tops === 'corked' || (a.tops === 'some' && random() < 0.35);
      tube(g, colour, level, isFlaw && a.flaw === 'cracked', corked && !(isFlaw && a.flaw === 'empty'), a.labelled);
      g.position.set(x, y0, z);
      // A tube leans in its hole when nobody has straightened it.
      const lean = mess * 0.09;
      g.rotation.set((random() - 0.5) * lean, random() * 0.6, (random() - 0.5) * lean);
      s.root.add(g);
      if (isFlaw && a.flaw === 'cracked') {
        const paint = s.material(colour, { roughness: 0.2 });
        for (let k = 0; k < 5; k++) s.cylinder(0.012 + random() * 0.012, 0.012, 0.0014, [x + (random() - 0.5) * 0.03, 0.013, z + (random() - 0.5) * 0.02], paint, 14);
        for (let k = 0; k < 4; k++) s.cylinder(0.014 + random() * 0.012, 0.012, 0.0014, [x + (random() - 0.5) * 0.04, 0.001, depth / 2 + 0.012 + random() * 0.025], paint, 14);
      }
      if (mess > 0.55 && random() < mess * 0.5) {
        const paint = s.material(colour, { roughness: 0.2 });
        s.cylinder(0.005 + random() * 0.005, 0.005, 0.0012, [x + (random() - 0.5) * 0.02, railY + 0.0052, z + 0.014], paint, 10);
        s.cylinder(0.006 + random() * 0.008, 0.006, 0.0012, [x + (random() - 0.5) * 0.03, 0.001, depth / 2 + 0.015 + random() * 0.03], paint, 10);
      }
    }
    if (mood.wear > 0.5) for (let k = 0; k < 5; k++) s.cylinder(0.006 + random() * 0.008, 0.006, 0.0008, [(random() - 0.5) * L * 0.9, 0.0124, (random() - 0.5) * depth * 0.7], dark, 10);

    const zb = -(depth / 2 + 0.04), clear = s.material('#e2f2f4', { roughness: 0.08 });
    const span = Math.min(L * 0.4, 0.07);
    if (a.beside === 'dropper') {
      s.rod([-span, 0.005, zb], [span * 0.4, 0.005, zb - 0.01], 0.0045, clear, 0.0045);
      s.rod([span * 0.4, 0.005, zb - 0.01], [span, 0.003, zb - 0.016], 0.004, clear, 0.001);
      s.ball([0.016, 0.009, 0.009], [-span - 0.012, 0.009, zb + 0.002], s.material('#a5382e'), 12);
    } else if (a.beside === 'brush') {
      const wire = s.material('#9aa0a2', { metalness: 0.8, roughness: 0.35 });
      s.rod([-span, 0.004, zb], [span, 0.004, zb - 0.012], 0.0015, wire);
      s.ring(0.006, 0.0015, [-span - 0.006, 0.004, zb + 0.001], wire).rotation.x = Math.PI / 2;
      const bristle = s.cylinder(0.009, 0.009, 0.05, [span * 0.72, 0.009, zb - 0.0095], s.material('#f1eee4', { roughness: 1 }), 10);
      bristle.rotation.z = Math.PI / 2; bristle.rotation.y = 0.09;
    } else if (a.beside === 'holder') {
      const peg = s.material('#d9b57c', { roughness: 0.8 });
      const at: P3 = [0, 0.006, zb];
      s.box([span * 2, 0.007, 0.012], [at[0], 0.0045, at[2] + 0.007], peg).rotation.y = 0.05;
      s.box([span * 2, 0.007, 0.012], [at[0], 0.0045, at[2] - 0.007], peg).rotation.y = -0.05;
      s.ring(0.01, 0.0018, [span * 0.3, 0.007, zb], s.material('#8d9396', { metalness: 0.8, roughness: 0.3 })).rotation.x = Math.PI / 2;
    }
    return s.finish();
  },
});
