import * as THREE from 'three';
import { Sculpture, choice, clamp01, defineThing, mix, noul } from '@conjure/kit';
import { encrust, painted, stained } from './sea';

const WORDS = {
  english: { full: 'FULL', half: 'HALF', slow: 'SLOW', done: 'FINISHED', stop: 'STOP', ready: 'STAND BY', ahead: 'AHEAD', astern: 'ASTERN' },
  german: { full: 'VOLL', half: 'HALB', slow: 'LANGSAM', done: 'FERTIG', stop: 'STOP', ready: 'ACHTUNG', ahead: 'VORAUS', astern: 'ZURÜCK' },
  french: { full: 'TOUTE', half: 'DEMI', slow: 'LENTE', done: 'TERMINÉ', stop: 'STOP', ready: 'ATTENTION', ahead: 'AVANT', astern: 'ARRIÈRE' },
  russian: { full: 'ПОЛНЫЙ', half: 'СРЕДНИЙ', slow: 'МАЛЫЙ', done: 'ОТБОЙ', stop: 'СТОП', ready: 'ТОВСЬ', ahead: 'ВПЕРЁД', astern: 'НАЗАД' },
} as const;
const ORDER = { 'full-ahead': 120, 'half-ahead': 90, 'slow-ahead': 60, 'stand-by': 30, stop: 0, finished: -30, 'slow-astern': -60, 'half-astern': -90, 'full-astern': -120 } as const;

export default defineThing({
  questions: {
    order: choice('What is the lever set to?', {
      'full-ahead': 'FULL AHEAD: flat out, running for it.',
      'half-ahead': 'HALF AHEAD: a steady passage.',
      'slow-ahead': 'SLOW AHEAD: feeling her way in fog or harbour.',
      'stand-by': 'STAND BY: waiting, something is about to happen.',
      stop: 'STOP: everything halted.',
      finished: 'FINISHED WITH ENGINES: the voyage is over.',
      'slow-astern': 'SLOW ASTERN: backing off gently.',
      'half-astern': 'HALF ASTERN.',
      'full-astern': 'FULL ASTERN: the emergency order, too late to miss the iceberg.',
    }),
    reply: choice('What does the inner reply pointer from the engine room show?', {
      answered: 'The same as the lever: the order was acknowledged and obeyed.',
      unanswered: 'It never moved: nobody below answered.',
      contrary: 'The opposite direction: confusion, or mutiny.',
    }),
    language: choice('What language is the dial lettered in?', {
      english: 'English: FULL, HALF, SLOW, STOP.',
      german: 'German: VOLL, HALB, LANGSAM.',
      french: 'French: TOUTE, DEMI, LENTE.',
      russian: 'Russian, in Cyrillic.',
    }),
    glass: choice('What state is the dial glass in?', {
      clear: 'Clear and whole.',
      cracked: 'Cracked across.',
      shattered: 'Shattered: only shards left in the bezel.',
      filmed: 'Whole, but filmed over green so the dial is barely readable.',
    }),
    form: choice('What form does it take?', {
      pedestal: 'A single head on a tall bridge pedestal.',
      twin: 'Twin heads on one column, for a ship with two engines.',
      desk: 'A short head on a wooden block: salvaged, a collector\'s piece.',
    }),
    metal: choice('What state is the brass in?', {
      polished: 'Polished bright, a proud bridge.',
      dull: 'Dull and brown, long untouched.',
      verdigris: 'Green with verdigris.',
      encrusted: 'Green and barnacled, from a wreck.',
    }),
    lit: noul('Is the dial still lit from within?'),
    pipe: noul('Does a brass voice pipe stand beside it?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const base = { polished: 0, dull: 0.5, verdigris: 0.7, encrusted: 0.8 }[a.metal];
    const amount = clamp01(base + (mood.wear - 0.5) * (a.metal === 'polished' ? 0.12 : 0.3));
    const stain = a.metal === 'dull' ? '#3f2c1e' : '#5fb39c';
    const brass = stained(random, '#d1a745', stain, amount, { drips: a.metal !== 'dull' });
    const dark = s.material('#1c1d1f', { roughness: 0.6 });
    const wood = s.material('#6b4426', { roughness: 0.7 });
    const words = WORDS[a.language];
    const hosts: THREE.Mesh[] = [];
    const cream = mood.warmth > 0.5 ? '#f1e6c6' : '#e9ebe2';

    const dialTexture = () => painted(512, 512, (g) => {
      g.fillStyle = '#16171a';
      g.fillRect(0, 0, 512, 512);
      g.translate(256, 256);
      const sectors: [number, string, boolean, string?][] = [
        [-120, words.full, false], [-90, words.half, false], [-60, words.slow, false], [-30, words.done, false, '#d8c690'],
        [0, words.stop, true, '#b3261e'], [30, words.ready, true, '#d8c690'], [60, words.slow, true], [90, words.half, true], [120, words.full, true],
      ];
      for (const [angle, text, ahead, fill] of sectors) {
        g.save();
        g.rotate((angle * Math.PI) / 180);
        g.beginPath();
        g.arc(0, 0, 244, -Math.PI / 2 - 0.255, -Math.PI / 2 + 0.255);
        g.arc(0, 0, 118, -Math.PI / 2 + 0.255, -Math.PI / 2 - 0.255, true);
        g.closePath();
        g.fillStyle = fill ?? (ahead ? cream : '#16171a');
        g.fill();
        g.strokeStyle = '#c9a548';
        g.lineWidth = 3;
        g.stroke();
        g.fillStyle = fill === '#b3261e' || (!ahead && !fill) ? '#f4f0e2' : '#16171a';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.font = `bold ${text.length > 6 ? 25 : 31}px sans-serif`;
        g.fillText(text, 0, -183, 92);
        g.restore();
      }
      g.fillStyle = cream;
      g.beginPath();
      g.arc(0, 0, 112, 0, 7);
      g.fill();
      g.fillStyle = '#16171a';
      g.textAlign = 'center';
      g.font = 'bold 24px sans-serif';
      g.fillText(words.ahead, 56, -8, 84);
      g.fillText(words.astern, -56, -8, 84);
      g.fillText('→', 56, 22);
      g.fillText('←', -56, 22);
      g.font = 'bold 20px sans-serif';
      g.fillStyle = '#c9a548';
      g.fillText('No ' + (1 + Math.floor(random() * 3)), 0, 196);
      // Age: brown blooms creeping in from the rim.
      for (let i = 0; i < 40 * mood.wear; i++) {
        const t = random() * 6.283, r = 150 + random() * 100;
        g.globalAlpha = 0.25;
        g.fillStyle = '#5a4022';
        g.beginPath();
        g.arc(Math.cos(t) * r, Math.sin(t) * r, 6 + random() * 22, 0, 7);
        g.fill();
      }
    });

    const R = 0.23, depth = 0.16;
    const heads: THREE.Group[] = [];
    const levers: { group: THREE.Group; angle: number }[] = [];
    const head = (x: number, y: number, order: keyof typeof ORDER) => {
      const group = new THREE.Group();
      group.position.set(x, y, 0);
      const add = <T extends THREE.Object3D>(node: T) => { node.castShadow = node.receiveShadow = true; group.add(node); return node; };
      const drum = add(new THREE.Mesh(new THREE.CylinderGeometry(R, R, depth, 40), brass));
      drum.rotation.x = Math.PI / 2;
      hosts.push(drum);
      const map = dialTexture();
      for (const side of [1, -1]) {
        const face = add(new THREE.Mesh(new THREE.CircleGeometry(R * 0.93, 48), new THREE.MeshStandardMaterial({
          map, roughness: 0.6, emissive: a.lit ? '#ffe2a0' : '#000000', emissiveMap: a.lit ? map : null, emissiveIntensity: a.lit ? mix(0.5, 1.1, mood.cheer) : 0,
        })));
        face.position.z = side * (depth / 2 + 0.002);
        if (side < 0) face.rotation.y = Math.PI;
        const bezel = add(new THREE.Mesh(new THREE.TorusGeometry(R * 0.96, 0.017, 8, 48), brass));
        bezel.position.z = side * (depth / 2 + 0.012);
        // Glass.
        if (a.glass === 'filmed') {
          const film = new THREE.Mesh(new THREE.CircleGeometry(R * 0.93, 32), new THREE.MeshStandardMaterial({ color: '#6f9a7c', transparent: true, opacity: 0.62, roughness: 0.9, depthWrite: false }));
          film.position.z = side * (depth / 2 + 0.02);
          if (side < 0) film.rotation.y = Math.PI;
          group.add(film);
        } else if (a.glass === 'cracked' || a.glass === 'shattered') {
          const gone = a.glass === 'shattered';
          const pane = new THREE.Mesh(new THREE.CircleGeometry(R * 0.93, 32), new THREE.MeshStandardMaterial({
            transparent: true, depthWrite: false, roughness: 0.2,
            map: painted(256, 256, (g) => {
              g.translate(128, 128);
              if (gone) {
                // Shards standing in from the rim.
                for (let i = 0; i < 11; i++) {
                  const t = random() * 6.283, w = 0.12 + random() * 0.3, reach = 30 + random() * 62;
                  g.fillStyle = 'rgba(214,236,232,0.6)';
                  g.strokeStyle = '#f2fbf8';
                  g.lineWidth = 2;
                  g.beginPath();
                  g.moveTo(Math.cos(t - w) * 128, Math.sin(t - w) * 128);
                  g.lineTo(Math.cos(t) * (128 - reach), Math.sin(t) * (128 - reach));
                  g.lineTo(Math.cos(t + w) * 128, Math.sin(t + w) * 128);
                  g.closePath();
                  g.fill();
                  g.stroke();
                }
              } else {
                g.fillStyle = 'rgba(214,236,232,0.14)';
                g.fillRect(-128, -128, 256, 256);
                g.strokeStyle = '#f4fbf9';
                const cx = (random() - 0.5) * 90, cy = (random() - 0.5) * 90;
                for (let i = 0; i < 8; i++) {
                  let t = (i / 8) * 6.283 + random() * 0.5, x = cx, y = cy;
                  g.lineWidth = 1.5 + random() * 2.2;
                  g.beginPath();
                  g.moveTo(x, y);
                  for (let k = 0; k < 9; k++) { t += (random() - 0.5) * 0.6; x += Math.cos(t) * 26; y += Math.sin(t) * 26; g.lineTo(x, y); }
                  g.stroke();
                }
              }
            }),
          }));
          pane.position.z = side * (depth / 2 + 0.02);
          if (side < 0) pane.rotation.y = Math.PI;
          group.add(pane);
        } else {
          const pane = new THREE.Mesh(new THREE.CircleGeometry(R * 0.93, 32), new THREE.MeshStandardMaterial({ color: '#dff1ee', transparent: true, opacity: 0.12, roughness: 0.05, depthWrite: false }));
          pane.position.z = side * (depth / 2 + 0.02);
          group.add(pane);
        }
      }
      // Reply pointer: a small red arrow moved by the engine room.
      const lever = ORDER[order];
      const reply = a.reply === 'answered' ? lever : a.reply === 'contrary' ? (lever === 0 ? 120 : -lever) : lever === 0 ? 120 : 0;
      const arrow = new THREE.Group();
      const red = new THREE.MeshStandardMaterial({ color: '#c0261c', roughness: 0.5 });
      const shaft = add(new THREE.Mesh(new THREE.BoxGeometry(0.012, R * 0.5, 0.004), red));
      shaft.position.y = R * 0.27;
      const tipMesh = add(new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.05, 3), red));
      tipMesh.position.y = R * 0.53;
      tipMesh.scale.z = 0.2;
      arrow.add(shaft, tipMesh);
      arrow.position.z = depth / 2 + 0.008;
      arrow.rotation.z = (-reply * Math.PI) / 180;
      group.add(arrow);
      // Order lever: a pointer over the dial, a brass arm over the rim and a turned grip.
      const arm = new THREE.Group();
      const part = <T extends THREE.Object3D>(node: T) => { node.castShadow = true; arm.add(node); return node; };
      part(new THREE.Mesh(new THREE.BoxGeometry(0.02, R * 0.88, 0.006), dark)).position.set(0, R * 0.44, depth / 2 + 0.014);
      part(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.03, 16), brass)).rotation.x = Math.PI / 2;
      arm.children[arm.children.length - 1].position.z = depth / 2 + 0.02;
      for (const side of [1, -1]) part(new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.2, 0.012), brass)).position.set(0, R + 0.06, side * (depth / 2 + 0.03));
      part(new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.02, depth + 0.07), brass)).position.set(0, R + 0.15, 0);
      const stem = part(new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.016, 0.1, 10), brass));
      stem.position.set(0, R + 0.2, 0);
      const grip = part(new THREE.Mesh(new THREE.LatheGeometry([[0.014, 0], [0.026, 0.02], [0.03, 0.06], [0.024, 0.1], [0.016, 0.115], [0.001, 0.12]].map(([px, py]) => new THREE.Vector2(px, py)), 14), wood));
      grip.position.set(0, R + 0.24, 0);
      const angle = (-lever * Math.PI) / 180;
      arm.rotation.z = angle;
      group.add(arm);
      levers.push({ group: arm, angle });
      // Oil-lamp chimney on the crown.
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.04, 10), brass)).position.set(0, R * 0.2, -depth / 2 - 0.02);
      s.root.add(group);
      heads.push(group);
    };

    const orders = Object.keys(ORDER) as (keyof typeof ORDER)[];
    if (a.form === 'desk') {
      s.box([0.4, 0.06, 0.3], [0, 0.03, 0], wood);
      s.box([0.34, 0.012, 0.24], [0, 0.066, 0], dark);
      hosts.push(s.lathe([[0.1, 0.07], [0.09, 0.09], [0.05, 0.12], [0.04, 0.2], [0.06, 0.24]], brass));
      head(0, 0.43, a.order);
      s.label({ english: 'S.S.', german: 'D.', french: 'S.S.', russian: 'П/Х' }[a.language] + ' ' + (1900 + Math.floor(random() * 50)), 0.16, 0.035, [0, 0.03, 0.152], '#2b2110', '#c9a548');
    } else {
      const top = a.form === 'twin' ? 0.95 : 1.02;
      hosts.push(s.lathe([[0.19, 0], [0.19, 0.035], [0.13, 0.07], [0.085, 0.16], [0.062, 0.3], [0.055, 0.62], [0.075, 0.68], [0.055, 0.74], [0.06, top - 0.06], [0.085, top], [0.07, top + 0.02]], brass));
      s.scatter(new THREE.CylinderGeometry(1, 1, 0.8, 6), brass, Array.from({ length: 6 }, (_u, i) => ({ at: [Math.sin(i * 1.047) * 0.16, 0.045, Math.cos(i * 1.047) * 0.16] as [number, number, number], size: 0.014 })));
      if (a.form === 'twin') {
        s.box([0.56, 0.07, 0.12], [0, top + 0.04, 0], brass);
        for (const x of [-1, 1]) s.cylinder(0.05, 0.06, 0.1, [x * 0.26, top + 0.1, 0], brass, 14);
        head(-0.26, top + 0.14 + R, a.order);
        // The second engine: usually the same order, sometimes not.
        head(0.26, top + 0.14 + R, random() < 0.6 ? a.order : orders[Math.floor(random() * orders.length)]);
      } else {
        head(0, top + R - 0.005, a.order);
      }
      // Linkage chain down the column to the engine room.
      s.rod([0.07, top - 0.02, -0.03], [0.1, 0.04, -0.05], 0.007, dark);
    }

    if (a.pipe && a.form !== 'desk') {
      const x = a.form === 'twin' ? 0.68 : 0.44, h = 1.12;
      hosts.push(s.tube([[x, 0, -0.05], [x, h * 0.7, -0.05], [x, h * 0.93, -0.03], [x - 0.02, h, 0.05]], 0.028, brass));
      const mouth = s.lathe([[0.03, 0], [0.036, 0.03], [0.06, 0.07], [0.068, 0.075]], brass, [x - 0.02, h, 0.05]);
      mouth.rotation.x = 1.0;
      (mouth.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
      s.cylinder(0.05, 0.06, 0.02, [x, 0.01, -0.05], brass, 12);
      // Its whistle plug, hanging on a chain.
      s.rod([x, h * 0.86, -0.02], [x + 0.03, h * 0.7, 0], 0.004, dark);
      s.ball([0.016, 0.022, 0.016], [x + 0.03, h * 0.69, 0], wood, 8);
    }

    if (a.metal === 'encrusted') {
      encrust(s, hosts, mix(90, 240, mood.wear) * mix(0.7, 1.2, mood.density), a.form === 'desk' ? 0.012 : 0.018);
      encrust(s, hosts, 16, a.form === 'desk' ? 0.02 : 0.03, ['#8c5a44', '#93784a', '#5f7350'], 'blob');
    }

    const energy = mood.energy;
    return s.finish({
      update: (_dt, time) => {
        // Machinery obeying: the lever shivers with the engines.
        for (const [i, lever] of levers.entries()) lever.group.rotation.z = lever.angle + Math.sin(time * 31 + i) * 0.012 * energy;
      },
    });
  },
});
