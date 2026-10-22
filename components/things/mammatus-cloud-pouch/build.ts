import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

const LIGHTS = {
  sulphur: 'Sulphur yellow, the sick light before hail.',
  rose: 'Rose and salmon pink, a sunset coming back under the anvil.',
  slate: 'Cold slate blue with pewter highlights, no sun at all.',
  ember: 'Deep ember orange against near-black, the last minute of dusk.',
  green: 'Bruised green, the colour people remember from tornado days.',
  pearl: 'Pearl white and soft grey, almost gentle.',
} as const;
const TONES: Record<keyof typeof LIGHTS, [string, string, string]> = {
  sulphur: ['#f1d256', '#8c7a3a', '#4c4a3c'],
  rose: ['#f6a58c', '#a8607a', '#4f4560'],
  slate: ['#c3d0dc', '#6f8196', '#3c4656'],
  ember: ['#f58a2c', '#8f3d26', '#33282c'],
  green: ['#b9d477', '#5f7f58', '#2f4240'],
  pearl: ['#f4f1ea', '#b5b8c0', '#72788a'],
};

export default defineThing({
  questions: {
    lobes: score('How big are the pouches?', ['Small and pebbly, like bubble wrap', 'Fist-like', 'Heavy udders', 'A few enormous sagging sacks']),
    crowd: score('How many pouches hang there?', ['A lone cluster of four or five', 'A loose patch', 'A full field', 'Packed edge to edge as far as the cloud runs']),
    light: choice('What colour is the light under the cloud?', LIGHTS),
    form: choice('What are the lobes like?', {
      smooth: 'Smooth, round and taut, like polished pearls.',
      ragged: 'Ragged, with torn wisps trailing from their bellies.',
      drooping: 'Long and drooping, stretched into teats and tubes.',
      lumpy: 'Lumpy, each pouch made of smaller pouches.',
    }),
    below: choice('What lies underneath it?', {
      prairie: 'Flat prairie with a line of telephone poles running away.',
      farm: 'A small farmhouse with a silo and a windbreak of trees.',
      sea: 'A dark sea with whitecaps and one small boat.',
      road: 'A wet two-lane road with a single car, headlights on.',
      town: 'The roofs and water tower of a small town.',
    }),
    aftermath: choice('What is the storm still doing?', {
      spent: 'Nothing: it is over, the air washed and still.',
      virga: 'Streaks of rain hang from the pouches and evaporate before the ground.',
      hail: 'A last curtain of hail is falling at one edge.',
      flicker: 'Lightning still flickers up inside the cloud above the pouches.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const [lit, mid, dark] = TONES[a.light].map((hex) => new THREE.Color(hex));
    dark.lerp(new THREE.Color('#20222a'), (1 - mood.cheer) * 0.35);
    // The low sun comes from one side or the other with the hour.
    const sunSide = mood.daylight < 0.5 ? -1 : 1;
    const L = new THREE.Vector3(sunSide * 0.85, -0.35, 0.4).normalize();

    // One lobe: a sphere with its shading baked in, so the under-lighting survives any world's lamps.
    const lobeGeometry = (lumps: number) => {
      const g = new THREE.SphereGeometry(1, 20, 14);
      const p = g.attributes.position as THREE.BufferAttribute;
      const v = new THREE.Vector3();
      const bumps = Array.from({ length: lumps }, () => ({ d: new THREE.Vector3(random() - 0.5, -random() * 0.8, random() - 0.5).normalize(), amp: mix(0.12, 0.3, random()) }));
      for (let i = 0; i < p.count; i++) {
        v.fromBufferAttribute(p, i).normalize();
        let push = 0;
        for (const bump of bumps) push += bump.amp * Math.pow(Math.max(0, v.dot(bump.d)), 6);
        v.multiplyScalar(1 + push);
        p.setXYZ(i, v.x, v.y, v.z);
      }
      g.computeVertexNormals();
      const n = g.attributes.normal as THREE.BufferAttribute;
      const colours = new Float32Array(p.count * 3);
      const c = new THREE.Color();
      for (let i = 0; i < p.count; i++) {
        v.fromBufferAttribute(n, i);
        const side = THREE.MathUtils.smoothstep(v.dot(L), -0.35, 0.85);
        const under = THREE.MathUtils.smoothstep(-v.y, -0.2, 0.9);
        c.copy(dark).lerp(mid, Math.max(side, under * 0.55)).lerp(lit, side * side * (0.45 + under * 0.55));
        // Lobes fade into the dark deck where they join it.
        c.lerp(dark, THREE.MathUtils.smoothstep(p.getY(i), 0.25, 0.95) * 0.85);
        colours.set([c.r, c.g, c.b], i * 3);
      }
      g.setAttribute('color', new THREE.BufferAttribute(colours, 3));
      return g;
    };
    const cloudMaterial = new THREE.MeshBasicMaterial({ vertexColors: true });
    const geometry = lobeGeometry(a.form === 'lumpy' ? 9 : a.form === 'ragged' ? 4 : 0);

    const W = 9, D = 3.4, deckY = 6.4;
    // The underside is tipped up toward the front, like a canopy seen from beneath, so the pouches face the viewer.
    const under = (z: number) => deckY + z * 2.1;
    const size = mix(0.3, 1.0, a.lobes);
    const pitch = size * mix(1.75, 1.45, a.crowd);
    const cover = mix(0.28, 1, a.crowd);
    const instances: THREE.Matrix4[] = [];
    const tips: THREE.Vector3[] = [];
    const m = new THREE.Matrix4();
    const place = (x: number, y: number, z: number, sx: number, sy: number, sz: number) => {
      instances.push(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion(), new THREE.Vector3(sx, sy, sz)));
    };
    // The deck: broad dark lumps forming the underside of the anvil.
    for (let ix = 0; ix < 7; ix++)
      for (let iz = 0; iz < 5; iz++) {
        const x = (ix / 6 - 0.5) * W * 0.92 + (random() - 0.5) * 0.5, z = (iz / 4 - 0.5) * D * 0.92 + (random() - 0.5) * 0.4;
        place(x, under(z) + 0.35 + random() * 0.2, z - 0.7, mix(1.05, 1.4, random()), mix(0.55, 0.75, random()), mix(0.5, 0.62, random()));
      }
    // A continuous dark ceiling between the pouches, so gaps read as cloud and not as sky.
    {
      const slope = Math.atan(2.1);
      const ceiling = s.mesh(new THREE.PlaneGeometry(W * 0.9, D * 0.88 / Math.cos(slope)), new THREE.MeshBasicMaterial({ color: dark.clone().lerp(mid, 0.22), side: THREE.DoubleSide }), [0, deckY + 0.12, 0]);
      ceiling.rotation.x = Math.PI / 2 - slope;
    }
    // Between the true pouches the ceiling is still quilted with shallow swellings, never flat.
    for (let iz = 0, z = -D / 2 + 0.1; z < D / 2; z += 0.27, iz++)
      for (let x = -W / 2 + 0.4 + (iz % 2) * 0.4; x < W / 2 - 0.2; x += 0.8) {
        const r = mix(0.5, 0.68, random());
        place(x + (random() - 0.5) * 0.3, under(z) - 0.02 + random() * 0.1, z + 0.02, r, r * mix(0.5, 0.7, random()), r * 0.5);
      }
    // The pouches, on a jittered hex grid, crowding toward the middle when there are few.
    const droop = a.form === 'drooping' ? 1.9 : 1.05;
    let row = 0;
    for (let z = -D / 2 + pitch * 0.2; z < D / 2; z += pitch * 0.4, row++) {
      for (let x = -W / 2 + pitch * 0.5 + (row % 2) * pitch * 0.5; x < W / 2; x += pitch) {
        const reach = Math.hypot(x / (W / 2), z / (D / 2));
        if (reach > cover * 1.25 + (random() - 0.5) * 0.25) continue;
        const r = size * mix(0.62, 1.05, random()) * mix(1, 0.72, Math.min(1, reach));
        const hang = r * droop * mix(0.8, 1.25, random());
        const px = x + (random() - 0.5) * pitch * 0.4, pz = z + (random() - 0.5) * pitch * 0.12;
        place(px, under(pz) - hang * 0.55, pz, r, hang, r);
        tips.push(new THREE.Vector3(px, under(pz) - hang * 1.55, pz));
        if (a.form === 'lumpy') for (let k = 0; k < 2; k++) place(px + (random() - 0.5) * r, under(pz) - hang * 0.9, pz + (random() - 0.5) * r, r * 0.5, r * 0.55, r * 0.5);
      }
    }
    const cloud = new THREE.InstancedMesh(geometry, cloudMaterial, instances.length);
    instances.forEach((matrix, index) => cloud.setMatrixAt(index, matrix));
    cloud.castShadow = true;
    s.root.add(cloud);
    void m;

    if (a.form === 'ragged') {
      const wisp = new THREE.MeshBasicMaterial({ color: mid.clone().lerp(lit, 0.35) });
      const shreds = tips.flatMap((tip) => Array.from({ length: 3 }, () => ({ at: [tip.x + (random() - 0.5) * size, tip.y - random() * size * 0.7, tip.z + (random() - 0.5) * size] as [number, number, number], size: size * mix(0.1, 0.24, random()) })));
      s.scatter(new THREE.IcosahedronGeometry(1, 0), wisp, shreds);
    }

    // What the storm is still doing.
    if (a.aftermath === 'virga' || a.aftermath === 'hail') {
      const hail = a.aftermath === 'hail';
      const streak = new THREE.MeshBasicMaterial({ color: hail ? '#eef2f5' : mid.clone().lerp(dark, 0.3) });
      const count = hail ? 70 : Math.min(tips.length * 2, 90);
      const rain = new THREE.InstancedMesh(new THREE.CylinderGeometry(hail ? 0.022 : 0.016, hail ? 0.022 : 0.004, 1, 4), streak, count);
      const lean = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, -sunSide * 0.18));
      for (let i = 0; i < count; i++) {
        const tip = tips[Math.floor(random() * tips.length)] ?? new THREE.Vector3(0, deckY - 1, 0);
        const hz = (random() - 0.5) * D * 0.8;
        const length = hail ? mix(0.25, 0.7, random()) : mix(0.7, 2.2, random());
        const at = hail
          ? new THREE.Vector3(-sunSide * mix(W * 0.25, W * 0.48, random()), mix(0.3, under(hz) - 0.8, random()), hz)
          : new THREE.Vector3(tip.x + (random() - 0.5) * size * 0.8, tip.y - length * 0.5 + 0.1, tip.z + (random() - 0.5) * size * 0.8);
        rain.setMatrixAt(i, new THREE.Matrix4().compose(at, lean, new THREE.Vector3(1, length, 1)));
      }
      s.root.add(rain);
    }
    let flash: THREE.MeshBasicMaterial | null = null;
    if (a.aftermath === 'flicker') {
      flash = new THREE.MeshBasicMaterial({ color: '#f4f0ff', transparent: true, opacity: 0.85 });
      for (let i = 0; i < 3; i++) {
        const x = (random() - 0.5) * W * 0.6, z = (random() - 0.5) * D * 0.4;
        s.ball([mix(0.7, 1.3, random()), 0.3, mix(0.5, 0.9, random())], [x, under(z) - 0.05, z + 0.05], flash, 14).castShadow = false;
        let from: [number, number, number] = [x, under(z) - 0.1, z + 0.1];
        for (let k = 0; k < 5; k++) {
          const dz = (random() - 0.5) * 0.4;
          const to: [number, number, number] = [from[0] + (random() - 0.5) * 1.3, from[1] + dz * 2.1, from[2] + dz];
          s.rod(from, to, 0.03, flash).castShadow = false;
          from = to;
        }
      }
    }

    // The country underneath, small and dark, to give the cloud its scale.
    const duskTint = (hex: string) => new THREE.Color(hex).lerp(dark, 0.45).lerp(lit, 0.12);
    const land = (hex: string) => new THREE.MeshStandardMaterial({ color: duskTint(hex), roughness: 1 });
    const lamp = new THREE.MeshStandardMaterial({ color: '#ffe9a8', emissive: '#ffd36a', emissiveIntensity: 1 });
    const gw = W * 0.95, gd = 4.6;
    if (a.below === 'sea') {
      s.box([gw, 0.12, gd], [0, 0.06, 0], new THREE.MeshStandardMaterial({ color: duskTint('#2f5a70'), roughness: 0.25, metalness: 0.3 }));
      const caps = Array.from({ length: 40 }, () => ({ at: [(random() - 0.5) * gw * 0.94, 0.125, (random() - 0.5) * gd * 0.92] as [number, number, number], size: mix(0.5, 1.3, random()) }));
      s.scatter(new THREE.BoxGeometry(0.22, 0.012, 0.03), new THREE.MeshStandardMaterial({ color: lit.clone().lerp(new THREE.Color('#ffffff'), 0.5) }), caps);
      const bx = (random() - 0.5) * 3, bz = 0.8;
      s.box([0.5, 0.1, 0.16], [bx, 0.17, bz], land('#7a2f25'));
      s.box([0.16, 0.12, 0.12], [bx - 0.08, 0.28, bz], land('#e6e0d0'));
      s.rod([bx + 0.1, 0.2, bz], [bx + 0.1, 0.55, bz], 0.008, land('#3a3a3a'));
      s.ball([0.018, 0.018, 0.018], [bx + 0.1, 0.56, bz], lamp, 6);
    } else {
      const groundTone = { prairie: '#8f8a4e', farm: '#6f8a48', road: '#6a7a4c', town: '#6d7458' }[a.below as 'prairie' | 'farm' | 'road' | 'town'];
      s.box([gw, 0.12, gd], [0, 0.06, 0], land(groundTone));
      const stripes = Array.from({ length: 12 }, (_unused, i) => ({ at: [0, 0.121, -gd / 2 + (i + 0.5) * (gd / 12)] as [number, number, number], size: 1 }));
      if (a.below === 'prairie' || a.below === 'farm') s.scatter(new THREE.BoxGeometry(gw * 0.98, 0.006, 0.05), land('#4f5a34'), stripes);
      if (a.below === 'prairie') {
        const pole = land('#3b3026');
        const poles = 7;
        for (let i = 0; i < poles; i++) {
          const x = -gw / 2 + 0.5 + i * ((gw - 1) / (poles - 1)), z = 0.9 - i * 0.12;
          s.rod([x, 0.1, z], [x, 0.78, z], 0.016, pole);
          s.box([0.03, 0.02, 0.26], [x, 0.7, z], pole);
          if (i > 0) {
            const px = x - (gw - 1) / (poles - 1), pz = z + 0.12;
            for (const side of [-0.11, 0.11]) s.tube([[px, 0.71, pz + side], [(px + x) / 2, 0.62, (pz + z) / 2 + side], [x, 0.71, z + side]], 0.004, pole);
          }
        }
        s.box([gw, 0.004, 0.18], [0, 0.123, 1.35], land('#a79a78')).rotation.y = -0.03;
      } else if (a.below === 'farm') {
        const fx = (random() - 0.5) * 3;
        s.box([0.5, 0.3, 0.38], [fx, 0.27, 0.5], land('#e8e2d2'));
        const roof = s.mesh(new THREE.CylinderGeometry(0.001, 0.31, 0.2, 4, 1), land('#6a2f28'), [fx, 0.52, 0.5]);
        roof.rotation.y = Math.PI / 4;
        roof.scale.set(1.2, 1, 0.95);
        s.box([0.07, 0.08, 0.005], [fx - 0.1, 0.3, 0.692], lamp);
        s.box([0.6, 0.42, 0.44], [fx + 0.9, 0.33, 0.2], land('#8f2f26'));
        s.cylinder(0.14, 0.14, 0.75, [fx + 1.45, 0.49, 0.2], land('#b9bcbd'), 14);
        s.ball([0.14, 0.09, 0.14], [fx + 1.45, 0.87, 0.2], land('#9da2a5'), 12);
        const trees = Array.from({ length: 9 }, (_unused, i) => ({ at: [fx - 0.9 - i * 0.02, 0.32 + random() * 0.08, -0.5 + i * 0.26] as [number, number, number], size: mix(0.16, 0.26, random()) }));
        s.scatter(new THREE.IcosahedronGeometry(1, 1), land('#2f4a2c'), trees);
      } else if (a.below === 'road') {
        const road = s.box([gw * 1.0, 0.006, 0.5], [0, 0.123, 0.6], new THREE.MeshStandardMaterial({ color: duskTint('#3c4046'), roughness: 0.2, metalness: 0.35 }));
        road.rotation.y = 0.06;
        const dashes = Array.from({ length: 14 }, (_unused, i) => ({ at: [-gw / 2 + 0.35 + i * (gw / 14), 0.128, 0.6 - (-gw / 2 + 0.35 + i * (gw / 14)) * 0.06] as [number, number, number], size: 1 }));
        s.scatter(new THREE.BoxGeometry(0.22, 0.004, 0.022), new THREE.MeshStandardMaterial({ color: '#e9dc9a' }), dashes);
        const cx = (random() - 0.5) * 4, cz = 0.72 - cx * 0.06;
        s.box([0.44, 0.1, 0.19], [cx, 0.2, cz], land(mood.cheer > 0.5 ? '#c9352b' : '#3d5f86'));
        s.box([0.22, 0.09, 0.17], [cx - 0.03, 0.29, cz], land('#27303a'));
        for (const z of [-0.06, 0.06]) s.ball([0.022, 0.022, 0.022], [cx + sunSide * -0.225, 0.2, cz + z], lamp, 6);
        for (const x of [-0.14, 0.14]) for (const z of [-0.1, 0.1]) s.cylinder(0.045, 0.045, 0.03, [cx + x, 0.165, cz + z], land('#151515'), 10).rotation.x = Math.PI / 2;
      } else {
        const walls = ['#d9d0bd', '#b9a78a', '#9fa9ad', '#c9b5a0'], roofs = ['#6a2f28', '#3f4a52', '#5c4a38'];
        for (let i = 0; i < 16; i++) {
          const x = (random() - 0.5) * gw * 0.8, z = (random() - 0.5) * gd * 0.6 + 0.3;
          const w = mix(0.28, 0.5, random()), h = mix(0.18, 0.34, random());
          s.box([w, h, 0.3], [x, 0.12 + h / 2, z], land(walls[i % 4]));
          const roof = s.mesh(new THREE.CylinderGeometry(0.001, 0.25, 0.15, 4, 1), land(roofs[i % 3]), [x, 0.195 + h, z]);
          roof.rotation.y = Math.PI / 4;
          roof.scale.set(w / 0.3, 1, 1);
          if (random() < 0.55) s.box([0.05, 0.06, 0.005], [x + (random() - 0.5) * w * 0.5, 0.12 + h * 0.55, z + 0.152], lamp);
        }
        const tx = (random() - 0.5) * 2;
        for (const dx of [-0.1, 0.1]) for (const dz of [-0.1, 0.1]) s.rod([tx + dx * 1.3, 0.12, -0.9 + dz * 1.3], [tx + dx, 0.95, -0.9 + dz], 0.012, land('#5a6066'));
        s.cylinder(0.2, 0.2, 0.26, [tx, 1.08, -0.9], land('#b7c0c4'), 16);
        s.cylinder(0.01, 0.2, 0.1, [tx, 1.26, -0.9], land('#8f989c'), 16);
        s.rod([tx + 2.2, 0.12, 0.2], [tx + 2.2, 1.0, 0.2], 0.02, land('#e6e0d0'), 0.004);
      }
    }

    // Built small, then enlarged to something like its true size.
    s.root.scale.setScalar(90);
    const pace = mix(0.4, 2, mood.energy);
    return s.finish({
      footprint: 330,
      update(_dt, time) {
        if (flash) flash.opacity = 0.25 + 0.7 * Math.pow(Math.abs(Math.sin(time * pace * 3.1) * Math.sin(time * pace * 1.3)), 3);
      },
    });
  },
});
