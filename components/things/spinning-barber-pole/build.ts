import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

const STRIPES = {
  classic: 'Red, white and blue: the American standard.',
  redwhite: 'Red and white only, the old European bandage-and-blood pole.',
  bluewhite: 'Blue and white, cool and clinical.',
  tricolore: 'Green, white and red, an Italian shop proud of it.',
  blackgold: 'Black and gold, a smart modern gentleman’s barber.',
  neon: 'Hot pink and turquoise, loud as the music inside.',
  faded: 'Stripes bleached to salmon and pale grey-blue by forty summers.',
} as const;
const BANDS: Record<keyof typeof STRIPES, string[]> = {
  classic: ['#c8202c', '#f4f1e8', '#1f4fa3', '#f4f1e8'],
  redwhite: ['#c8202c', '#f4f1e8'],
  bluewhite: ['#1f5fb0', '#f4f1e8'],
  tricolore: ['#1f8a4c', '#f4f1e8', '#c8202c', '#f4f1e8'],
  blackgold: ['#1b1a18', '#d2a43a'],
  neon: ['#ff3d9a', '#f4f1e8', '#18c9c0', '#f4f1e8'],
  faded: ['#d9a79b', '#e9e4d6', '#a9b6c6', '#e9e4d6'],
};
const SIGNS = { none: '', barber: 'BARBER', barberia: 'BARBERIA', berber: 'BERBER', tokoya: 'TOKOYA', shave: 'SHAVE 25c', closed: 'CLOSED' } as const;
type V3 = [number, number, number];

export default defineThing({
  questions: {
    mount: choice('How is the pole mounted?', {
      wall: 'On an iron bracket high on a slice of shopfront wall.',
      pedestal: 'Floor-standing on a fat cast pedestal, shoulder high, the grand old kind.',
      post: 'On top of a tall thin kerbside post, seen from down the street.',
      counter: 'A small plug-in pole that sits on a counter or shelf.',
    }),
    stripes: choice('What colours are the stripes?', STRIPES),
    twist: score('How tight is the helix?', ['Long lazy diagonals', 'Even candy-cane turns', 'Tight busy coils']),
    globe: choice('What tops the pole?', {
      dome: 'A plain chrome dome and finial, no lamp.',
      white: 'A round white glass globe lamp.',
      amber: 'An amber globe, warm as a streetlight.',
      smashed: 'A globe that has been smashed: a jagged cup of glass and a bare bulb.',
    }),
    glass: choice('What state is the glass cylinder in?', {
      clean: 'Clean and whole.',
      cracked: 'Cracked: a starburst of white lines from one impact.',
      fogged: 'Whole but fogged and grimy, the stripes dim behind it.',
      broken: 'Broken away: only a jagged collar is left and the striped drum stands bare, shards below.',
    }),
    power: choice('What is it doing right now?', {
      turning: 'Lit and turning: the shop is open.',
      flicker: 'Turning, but the lamp inside stutters and flickers.',
      stopped: 'Lit but stopped, the motor dead or switched off for the night.',
      dark: 'Dark and still: nobody has plugged it in for a long time.',
    }),
    sign: choice('If a small sign hangs with it, what does it say?', {
      none: 'No sign.',
      barber: 'BARBER',
      barberia: 'BARBERIA, a Dominican or Italian shop.',
      berber: 'BERBER, a Turkish shop.',
      tokoya: 'TOKOYA, a Japanese neighbourhood barber.',
      shave: 'SHAVE 25c, a price nobody has updated.',
      closed: 'CLOSED',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const lit = a.power !== 'dark';
    const turning = a.power === 'turning' || a.power === 'flicker';
    const chrome = s.material('#dfe3e4', { metalness: 0.95, roughness: mix(0.14, 0.5, mood.wear) });
    const iron = s.material(mood.wear > 0.6 ? '#5a4234' : '#26282b', { roughness: 0.7, metalness: 0.4 });
    const enamel = s.material(a.stripes === 'blackgold' ? '#1f2022' : a.stripes === 'tricolore' ? '#1f6a45' : '#b3242c', { roughness: 0.35 });

    // The stripe drum: diagonal bands painted so the texture wraps without a seam.
    const bands = BANDS[a.stripes];
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    const bw = 256 / bands.length / 2;
    for (let i = -bands.length * 2; i < bands.length * 4; i++) {
      ctx.fillStyle = bands[((i % bands.length) + bands.length) % bands.length];
      ctx.beginPath();
      ctx.moveTo(i * bw, 0); ctx.lineTo((i + 1) * bw + 1, 0); ctx.lineTo((i + 1) * bw + 257, 256); ctx.lineTo(i * bw + 256, 256);
      ctx.fill();
    }
    if (mood.wear > 0.35) {
      ctx.fillStyle = `rgba(120,105,80,${(mood.wear - 0.35) * 0.5})`;
      ctx.fillRect(0, 0, 256, 256);
    }
    const stripe = new THREE.CanvasTexture(canvas);
    stripe.colorSpace = THREE.SRGBColorSpace;
    stripe.wrapS = stripe.wrapT = THREE.RepeatWrapping;

    const drums: THREE.Mesh[] = [];
    const lamps: THREE.MeshStandardMaterial[] = [];
    const glow = lit ? mix(0.35, 0.8, mood.cheer) : 0;

    /** One pole unit, standing on its own origin: cap, drum, glass, cap and whatever tops it. */
    const pole = (R: number, L: number) => {
      const g = new THREE.Group();
      const put = <T extends THREE.Object3D>(mesh: T) => { g.add(mesh); return mesh; };
      const cap = (y: number, flip: number) => {
        const m = put(s.lathe([[0, 0], [R * 0.75, 0], [R * 1.28, R * 0.25], [R * 1.3, R * 0.55], [R * 1.12, R * 0.7], [R * 1.12, R * 0.9], [0, R * 0.9]], chrome, [0, y, 0]));
        m.scale.y = flip;
        return m;
      };
      const capH = R * 0.9;
      cap(0, 1);
      cap(capH * 2 + L, -1);
      put(s.cylinder(R * 1.34, R * 1.34, R * 0.18, [0, R * 0.42, 0], enamel, 28));
      put(s.cylinder(R * 1.34, R * 1.34, R * 0.18, [0, capH * 2 + L - R * 0.42, 0], enamel, 28));
      const map = stripe.clone();
      map.needsUpdate = true;
      map.repeat.set(1, (L / (R * 6.283)) * mix(0.55, 1.9, a.twist));
      const paint = new THREE.MeshStandardMaterial({ map, roughness: 0.55, emissive: '#ffffff', emissiveMap: map, emissiveIntensity: glow * (a.glass === 'fogged' ? 0.5 : 1) });
      lamps.push(paint);
      const drum = put(s.mesh(new THREE.CylinderGeometry(R * 0.8, R * 0.8, L, 32, 1, true), paint, [0, capH + L / 2, 0]));
      drums.push(drum);
      // Glass.
      if (a.glass === 'broken') {
        const collar = new THREE.CylinderGeometry(R, R, L * 0.3, 28, 1, true);
        const p = collar.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < p.count; i++) if (p.getY(i) > 0) p.setY(i, p.getY(i) - random() * L * 0.26);
        collar.computeVertexNormals();
        put(s.mesh(collar, new THREE.MeshStandardMaterial({ color: '#cfe3e6', transparent: true, opacity: 0.45, roughness: 0.1, side: THREE.DoubleSide, depthWrite: false }), [0, capH + L * 0.15, 0]));
      } else {
        const gc = document.createElement('canvas');
        gc.width = gc.height = 256;
        const gx = gc.getContext('2d')!;
        const haze = a.glass === 'fogged' ? 0.55 : mix(0.08, 0.25, mood.wear);
        gx.fillStyle = a.glass === 'fogged' ? `rgba(205,200,180,${haze})` : `rgba(225,240,244,${haze})`;
        gx.fillRect(0, 0, 256, 256);
        // A highlight streak sells the cylinder as glass.
        gx.fillStyle = 'rgba(255,255,255,0.5)';
        gx.fillRect(150, 0, 9, 256);
        gx.fillStyle = 'rgba(255,255,255,0.25)';
        gx.fillRect(166, 0, 4, 256);
        if (a.glass === 'fogged') for (let i = 0; i < 40; i++) {
          gx.fillStyle = `rgba(120,110,90,${0.1 + random() * 0.25})`;
          gx.fillRect(random() * 256, random() * 256, 2 + random() * 5, 20 + random() * 80);
        }
        if (a.glass === 'cracked') {
          const cx = 120 + random() * 50, cy = 70 + random() * 110;
          gx.strokeStyle = 'rgba(255,255,255,0.95)';
          for (let ray = 0; ray < 9; ray++) {
            let x = cx, y = cy, t = (ray / 9) * 6.283 + random();
            gx.lineWidth = 2.4;
            gx.beginPath(); gx.moveTo(x, y);
            for (let step = 0; step < 6; step++) {
              t += (random() - 0.5) * 0.9;
              x += Math.cos(t) * (10 + random() * 18); y += Math.sin(t) * (14 + random() * 26);
              gx.lineTo(x, y);
            }
            gx.stroke();
          }
          gx.lineWidth = 1.4;
          for (const r of [14, 30]) { gx.beginPath(); gx.arc(cx, cy, r, random() * 3, random() * 3 + 4); gx.stroke(); }
        }
        const gm = new THREE.CanvasTexture(gc);
        gm.colorSpace = THREE.SRGBColorSpace;
        const glass = put(s.mesh(new THREE.CylinderGeometry(R, R, L, 32, 1, true), new THREE.MeshStandardMaterial({ map: gm, transparent: true, roughness: 0.08, depthWrite: false }), [0, capH + L / 2, 0]));
        glass.rotation.y = -1.9;
        glass.castShadow = false;
      }
      // Top.
      const top = capH * 2 + L;
      if (a.globe === 'dome') {
        put(s.ball([R * 0.75, R * 0.5, R * 0.75], [0, top, 0], chrome, 20));
        put(s.cylinder(R * 0.08, R * 0.14, R * 0.7, [0, top + R * 0.7, 0], chrome, 10));
        put(s.ball([R * 0.2, R * 0.2, R * 0.2], [0, top + R * 1.1, 0], chrome, 12));
      } else {
        put(s.cylinder(R * 0.55, R * 0.75, R * 0.3, [0, top + R * 0.15, 0], chrome, 20));
        const tint = a.globe === 'amber' ? '#ffb84a' : '#fff6de';
        const globeMat = new THREE.MeshStandardMaterial({ color: lit ? tint : '#d8d4c6', roughness: 0.3, emissive: tint, emissiveIntensity: lit ? glow * 1.3 : 0, side: THREE.DoubleSide });
        if (a.globe === 'smashed') {
          const cup = new THREE.SphereGeometry(R * 1.05, 20, 10, 0, Math.PI * 2, Math.PI * 0.45, Math.PI * 0.55);
          const p = cup.attributes.position as THREE.BufferAttribute;
          for (let i = 0; i < p.count; i++) if (p.getY(i) > -R * 0.2) p.setY(i, p.getY(i) + (random() - 0.3) * R * 0.7);
          cup.computeVertexNormals();
          globeMat.emissiveIntensity = 0;
          put(s.mesh(cup, globeMat, [0, top + R * 1.2, 0]));
          const bulb = new THREE.MeshStandardMaterial({ color: '#fff4c8', emissive: '#ffe9a0', emissiveIntensity: lit ? 1 : 0, roughness: 0.3 });
          lamps.push(bulb);
          put(s.ball([R * 0.3, R * 0.42, R * 0.3], [0, top + R * 0.75, 0], bulb, 12));
        } else {
          lamps.push(globeMat);
          put(s.ball([R * 1.05, R * 1.05, R * 1.05], [0, top + R * 1.2, 0], globeMat, 24));
        }
      }
      s.root.add(g);
      return { g, height: capH * 2 + L };
    };

    const plate = (text: string, w: number, h: number, at: V3) => {
      const dead = a.sign === 'closed';
      s.box([w + 0.03, h + 0.03, 0.025], [at[0], at[1], at[2] - 0.016], iron);
      const front = s.label(text, w, h, at, dead ? '#f4efdc' : '#f6f0dc', dead ? '#8c1f24' : '#1d3a5c');
      const rear = s.label(text, w, h, [at[0], at[1], at[2] - 0.032], dead ? '#f4efdc' : '#f6f0dc', dead ? '#8c1f24' : '#1d3a5c');
      rear.rotation.y = Math.PI;
      return front;
    };
    const text = SIGNS[a.sign];
    let shardsAt: V3 = [0, 0, 0], shardSpread = 0.2;

    if (a.mount === 'wall') {
      const wallTint = ['#b0563e', '#e6dfcc', '#7f8c86', '#c9a56a'][Math.floor(random() * 4)];
      const brick = wallTint === '#b0563e';
      s.box([0.62, 2.5, 0.16], [0, 1.25, -0.08], s.material(wallTint, { roughness: 0.9 }));
      if (brick) for (let row = 0; row < 28; row++) s.box([0.625, 0.008, 0.162], [0, 0.09 + row * 0.089, -0.08], s.material('#d8cdbd'));
      s.box([0.7, 0.14, 0.2], [0, 0.07, -0.08], s.material('#6f6a62', { roughness: 0.9 }));
      const R = 0.085, L = 0.62, { g, height } = pole(R, L);
      const y0 = 1.42, z = 0.3;
      g.position.set(0, y0, z);
      s.box([0.16, height + 0.3, 0.02], [0, y0 + height / 2, 0.01], iron);
      for (const y of [y0 + R * 0.45, y0 + height - R * 0.45]) {
        s.rod([0, y, 0.01], [0, y, z], 0.016, iron);
        s.ring(R * 1.36, 0.012, [0, y, z], iron).rotation.x = Math.PI / 2;
      }
      s.tube([[0, y0 + R * 0.4, 0.02], [0, y0 - 0.12, 0.1], [0, y0 - 0.02, 0.2], [0, y0 + R * 0.3, z - 0.06]], 0.008, iron);
      if (text) plate(text, 0.42, 0.11, [0, 1.16, 0.09]);
      shardsAt = [0, 0, z];
    } else if (a.mount === 'pedestal') {
      s.lathe([[0, 0], [0.24, 0], [0.25, 0.04], [0.2, 0.09], [0.12, 0.14], [0.085, 0.3], [0.075, 0.62], [0.11, 0.7], [0.075, 0.78], [0.085, 0.92], [0.13, 0.98], [0, 0.98]], enamel);
      s.ring(0.245, 0.014, [0, 0.03, 0], chrome).rotation.x = Math.PI / 2;
      s.ring(0.112, 0.01, [0, 0.7, 0], chrome).rotation.x = Math.PI / 2;
      const { g } = pole(0.115, 0.6);
      g.position.y = 0.97;
      if (text) plate(text, 0.3, 0.09, [0, 0.46, 0.105]);
      shardSpread = 0.34;
    } else if (a.mount === 'post') {
      s.cylinder(0.14, 0.17, 0.1, [0, 0.05, 0], iron, 20);
      s.cylinder(0.035, 0.05, 1.95, [0, 1.05, 0], iron, 14);
      for (const y of [0.5, 1.2]) s.ring(0.05, 0.012, [0, y, 0], iron).rotation.x = Math.PI / 2;
      const { g } = pole(0.1, 0.62);
      g.position.y = 2.0;
      if (text) {
        s.rod([0, 1.72, 0], [0.5, 1.72, 0], 0.012, iron);
        s.tube([[0.04, 1.5, 0], [0.2, 1.62, 0], [0.42, 1.72, 0]], 0.007, iron);
        plate(text, 0.4, 0.13, [0.28, 1.62, 0.017]).rotation.z = (random() - 0.5) * mood.wear * 0.25;
      }
      shardSpread = 0.3;
    } else {
      s.cylinder(0.075, 0.085, 0.05, [0, 0.025, 0], s.material('#2a2b2d', { roughness: 0.5 }), 24);
      const { g } = pole(0.05, 0.3);
      g.position.y = 0.045;
      s.tube([[0, 0.012, -0.08], [0.05, 0.006, -0.16], [-0.04, 0.006, -0.22], [0.02, 0.006, -0.3]], 0.004, s.material('#1b1b1b'));
      if (text) {
        const card = s.label(text, 0.13, 0.05, [0.13, 0.03, 0.05], '#f6f0dc', a.sign === 'closed' ? '#8c1f24' : '#1d3a5c');
        card.rotation.set(-0.35, -0.3, 0);
      }
      shardSpread = 0.12;
    }

    if (a.glass === 'broken' || a.globe === 'smashed') {
      const shard = new THREE.TetrahedronGeometry(1).scale(1, 0.12, 0.7);
      const pieces = Array.from({ length: 14 }, () => {
        const t = random() * 6.283, r = shardSpread * (0.4 + random() * 0.6);
        return { at: [shardsAt[0] + Math.cos(t) * r, 0.004, shardsAt[2] + Math.sin(t) * r] as V3, size: shardSpread * (0.05 + random() * 0.09) };
      });
      s.scatter(shard, s.material('#cfe6ea', { roughness: 0.15, metalness: 0.2 }), pieces);
    }

    const speed = turning ? mix(0.5, 3.4, mood.energy) : 0;
    const flicker = a.power === 'flicker';
    const base = lamps.map((lamp) => lamp.emissiveIntensity);
    return s.finish({
      update: (dt, time) => {
        for (const drum of drums) drum.rotation.y += dt * speed;
        if (flicker) {
          const on = Math.sin(time * 23) * Math.sin(time * 7.3) + Math.sin(time * 41) * 0.4 > -0.25 ? 1 : 0.15;
          lamps.forEach((lamp, index) => { lamp.emissiveIntensity = base[index] * on; });
        }
      },
    });
  },
});
