import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';
import { engraving } from './bits';

export default defineThing({
  questions: {
    body: choice('What is the loupe made of?', {
      black: 'Matt black ebonite, the standard issue.',
      horn: 'Mottled brown horn, old and warm.',
      aluminium: 'Turned grey aluminium with a knurled band.',
      brass: 'Lacquered brass gone dull.',
      cork: 'Black with a cork collar where it sits in the eye socket.',
    }),
    power: score('How strong is it?', ['A wide squat low-power glass', 'An ordinary 4x', 'A tall narrow high-power glass']),
    pose: choice('How was it put down?', {
      side: 'Tipped over on its side, rolled to a stop.',
      up: 'On its wide rim, lens upward, like a little domed pavilion.',
      down: 'Lens end down, the eye cup open to the ceiling like a bowl.',
    }),
    lens: choice('What is the lens like?', {
      clear: 'Clean and brilliant.',
      cloudy: 'Hazed with fingerprints and breath.',
      cracked: 'Cracked across from a fall.',
      missing: 'Gone: an empty black tube.',
    }),
    subject: choice('If you look into the lens, what does it show, enlarged?', {
      nothing: 'Only a dark reflection.',
      screw: 'The head of one blued screw, huge.',
      gear: 'The teeth of a brass wheel.',
      jewel: 'A ruby bearing, glowing red.',
      print: 'The whorls of a fingerprint.',
      text: 'A few letters of very small print.',
      eye: 'An eye, looking back.',
    }),
    band: choice('How is it worn?', {
      wire: 'On a loop of spring wire that goes round the head, now lying on the bench.',
      none: 'Held in the eye socket by the brow alone; no band.',
      clip: 'On a wire clip for the arm of a pair of spectacles.',
      cord: 'On a loop of worn cord, to hang round the neck.',
    }),
    vents: noul('Are there air holes drilled round the side to stop it fogging?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const H = mix(24, 44, a.power), topR = mix(15.5, 10.5, a.power), baseR = 19.5;
    const tint = { black: '#232427', horn: '#6b452a', aluminium: '#aab0b5', brass: '#b08f45', cork: '#232427' }[a.body];
    const shell = s.material(tint, {
      roughness: a.body === 'aluminium' ? 0.35 : mix(0.55, 0.85, mood.wear), metalness: a.body === 'aluminium' || a.body === 'brass' ? 0.6 : 0.05, side: THREE.DoubleSide,
    });
    const wire = s.material('#b9bfc4', { metalness: 0.7, roughness: 0.3 });

    const loupe = new THREE.Group(), stage = new THREE.Group();
    stage.add(loupe);
    s.root.add(stage);
    const put = <T extends THREE.Object3D>(part: T) => { loupe.attach(part); return part; };

    // The body: a flared eye cup narrowing to the lens bezel.
    put(s.lathe([
      [baseR - 1.2, 0], [baseR, 0.6], [baseR, 2.4], [baseR - 1.4, 3.6], [topR + 1.2, H - 3.4], [topR + 1.9, H - 3], [topR + 1.9, H], [topR + 0.2, H],
      [topR + 0.2, H - 2.6], [topR, H - 3], [baseR - 2.8, 3], [baseR - 1.2, 0],
    ], shell));
    if (a.body === 'horn') {
      // Streaks in the horn.
      const streak = s.material('#2e1c10', { roughness: 0.6, side: THREE.DoubleSide });
      for (let i = 0; i < 7; i++) {
        const y = 5 + random() * (H - 11), t = (y - 3.6) / (H - 7), radius = mix(baseR - 1.4, topR + 1.2, t) + 0.06;
        const band = put(s.mesh(new THREE.TorusGeometry(radius - 0.1, 0.5 + random() * 1.2, 4, 12, 0.25 + random() * 0.7), streak, [0, y, 0]));
        band.rotation.set(Math.PI / 2, 0, random() * 6);
      }
    } else if (a.body === 'aluminium') {
      for (let i = 0; i < 5; i++) put(s.mesh(new THREE.TorusGeometry(topR + 1.9, 0.22, 5, 40), shell, [0, H - 0.5 - i * 0.55, 0])).rotation.x = Math.PI / 2;
    } else if (a.body === 'cork') {
      put(s.lathe([[baseR + 0.4, 0.3], [baseR + 0.5, 4.2], [baseR - 1.5, 6.6], [baseR - 2.2, 6.6]], s.material('#c59b6a', { roughness: 0.95, side: THREE.DoubleSide })));
    }
    if (a.vents) {
      const dark = s.material('#08090a', { roughness: 1 });
      const count = 5 + Math.floor(random() * 3);
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2, y = H * 0.55, t = (y - 3.6) / (H - 7), radius = mix(baseR - 1.4, topR + 1.2, t);
        const hole = put(s.cylinder(1.2, 1.2, 0.5, [Math.cos(angle) * radius, y, Math.sin(angle) * radius], dark, 10));
        hole.rotation.z = Math.PI / 2;
        hole.rotation.y = -angle;
      }
    }

    // What the lens shows.
    const present = a.lens !== 'missing';
    const SIZE = 256, c = SIZE / 2;
    const view = engraving(SIZE, '#101214', '#000000', (ctx) => {
      const ground = (colour: string) => { ctx.fillStyle = colour; ctx.fillRect(0, 0, SIZE, SIZE); };
      if (!present || a.subject === 'nothing') {
        const sky = ctx.createLinearGradient(0, 0, SIZE, SIZE);
        sky.addColorStop(0, '#59636d');
        sky.addColorStop(0.5, '#1c2126');
        sky.addColorStop(1, '#3a4148');
        ctx.fillStyle = present ? sky : '#0a0b0c';
        ctx.fillRect(0, 0, SIZE, SIZE);
      } else if (a.subject === 'screw') {
        ground('#cdb46a');
        ctx.fillStyle = '#1b3fae';
        ctx.beginPath(); ctx.arc(c, c, 92, 0, 6.3); ctx.fill();
        ctx.fillStyle = '#4f7df0';
        ctx.beginPath(); ctx.arc(c - 18, c - 22, 62, 0, 6.3); ctx.fill();
        ctx.save(); ctx.translate(c, c); ctx.rotate(random() * 3);
        ctx.fillStyle = '#0a1230'; ctx.fillRect(-100, -13, 200, 26);
        ctx.restore();
      } else if (a.subject === 'gear') {
        ground('#e8e2d0');
        ctx.fillStyle = '#c8962e';
        ctx.beginPath();
        const cx = c + 70, cy = c + 90, teeth = 16;
        for (let i = 0; i < teeth * 4; i++) {
          const angle = (i / (teeth * 4)) * 6.283 + random() * 0.01, radius = i % 4 < 2 ? 190 : 150;
          ctx.lineTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
        }
        ctx.fill();
        ctx.fillStyle = '#e8e2d0';
        ctx.beginPath(); ctx.arc(cx, cy, 105, 0, 6.3); ctx.fill();
      } else if (a.subject === 'jewel') {
        ground('#c9c7bd');
        ctx.fillStyle = '#e2b23e'; ctx.beginPath(); ctx.arc(c, c, 104, 0, 6.3); ctx.fill();
        ctx.fillStyle = '#d70f3a'; ctx.beginPath(); ctx.arc(c, c, 76, 0, 6.3); ctx.fill();
        ctx.fillStyle = '#ff6a86'; ctx.beginPath(); ctx.arc(c - 16, c - 18, 44, 0, 6.3); ctx.fill();
        ctx.fillStyle = '#d70f3a'; ctx.beginPath(); ctx.arc(c - 4, c - 4, 40, 0, 6.3); ctx.fill();
        ctx.fillStyle = '#2a0408'; ctx.beginPath(); ctx.arc(c, c, 17, 0, 6.3); ctx.fill();
      } else if (a.subject === 'print') {
        ground('#e9dcc8');
        ctx.strokeStyle = '#6a3f33';
        ctx.lineWidth = 7;
        const ox = c + (random() - 0.5) * 40, oy = c + 30;
        for (let i = 1; i < 16; i++) {
          ctx.beginPath();
          ctx.ellipse(ox, oy, i * 13, i * 17, 0.2, Math.PI * (i < 4 ? 0 : 0.95), Math.PI * (i < 4 ? 2 : 2.05));
          ctx.stroke();
        }
      } else if (a.subject === 'text') {
        ground('#ece6d6');
        ctx.fillStyle = '#1d1b18';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = 'bold 120px serif';
        const word = ['time', 'ever', 'gone', 'wait', 'love', 'last'][Math.floor(random() * 6)];
        ctx.fillText(word, c + 4, c + 6);
        ctx.font = 'bold 120px serif';
        ctx.globalAlpha = 0.55;
        ctx.fillText('and the', c - 30, c - 118);
        ctx.fillText('was not', c + 20, c + 130);
        ctx.globalAlpha = 1;
      } else {
        ground('#e3b9a2');
        ctx.fillStyle = '#f4f1ea';
        ctx.beginPath(); ctx.ellipse(c, c, 122, 78, 0, 0, 6.3); ctx.fill();
        const iris = ['#4a7fae', '#6a4a2a', '#4f7a4a', '#7a8a96'][Math.floor(random() * 4)];
        const lookX = c + (random() - 0.5) * 50;
        ctx.fillStyle = iris; ctx.beginPath(); ctx.arc(lookX, c, 62, 0, 6.3); ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 2;
        for (let i = 0; i < 40; i++) { ctx.beginPath(); ctx.moveTo(lookX, c); ctx.lineTo(lookX + Math.cos(i * 0.157) * 62, c + Math.sin(i * 0.157) * 62); ctx.stroke(); }
        ctx.fillStyle = '#0b0b0d'; ctx.beginPath(); ctx.arc(lookX, c, 27, 0, 6.3); ctx.fill();
        ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(lookX - 18, c - 20, 10, 0, 6.3); ctx.fill();
        ctx.strokeStyle = '#6a3f33'; ctx.lineWidth = 9;
        ctx.beginPath(); ctx.ellipse(c, c, 122, 78, 0, Math.PI, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = '#e3b9a2';
        ctx.beginPath(); ctx.ellipse(c, c - 96, 150, 60, 0, 0, 6.3); ctx.fill();
      }
      if (a.lens === 'cracked') {
        const fromX = c + (random() - 0.5) * 90, fromY = c + (random() - 0.5) * 90;
        for (let i = 0; i < 5; i++) {
          let x = fromX, y = fromY, angle = (i / 5) * 6.3 + random();
          ctx.beginPath();
          ctx.moveTo(x, y);
          for (let k = 0; k < 6; k++) { angle += (random() - 0.5) * 0.7; x += Math.cos(angle) * 34; y += Math.sin(angle) * 34; ctx.lineTo(x, y); }
          ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 3.5; ctx.stroke();
          ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 1.2; ctx.stroke();
        }
      }
      if (a.lens === 'cloudy' || mood.wear > 0.6) {
        for (let i = 0; i < (a.lens === 'cloudy' ? 26 : 8); i++) {
          ctx.fillStyle = `rgba(235,235,225,${0.08 + random() * 0.12})`;
          ctx.beginPath(); ctx.ellipse(random() * SIZE, random() * SIZE, 16 + random() * 40, 10 + random() * 24, random() * 3, 0, 6.3); ctx.fill();
        }
      }
    });
    const picture = new THREE.Mesh(new THREE.CircleGeometry(topR + 0.1, 40), new THREE.MeshStandardMaterial({ map: view, roughness: 0.3, side: THREE.DoubleSide, emissive: '#ffffff', emissiveMap: view, emissiveIntensity: present ? 0.35 : 0 }));
    picture.rotation.x = -Math.PI / 2;
    picture.position.y = present ? H - 1.2 : H - 7;
    picture.castShadow = true;
    loupe.add(picture);
    if (present) {
      // The thick glass itself, proud of the bezel, and the window reflected in it.
      const angle = 0.62, radius = topR / Math.sin(angle);
      const glass = new THREE.Mesh(new THREE.SphereGeometry(radius, 28, 8, 0, Math.PI * 2, 0, angle), new THREE.MeshStandardMaterial({
        color: a.lens === 'cloudy' ? '#e6e8e2' : '#d8ecf4', roughness: a.lens === 'cloudy' ? 0.6 : 0.02, transparent: true, opacity: a.lens === 'cloudy' ? 0.45 : 0.2, depthWrite: false,
      }));
      glass.position.y = H - 1 - radius * Math.cos(angle);
      loupe.add(glass);
      const glint = new THREE.Mesh(new THREE.CircleGeometry(topR * 0.2, 12), new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 0.9, transparent: true, opacity: a.lens === 'cloudy' ? 0.35 : 0.8, depthWrite: false, side: THREE.DoubleSide }));
      glint.rotation.x = -Math.PI / 2 + 0.3;
      glint.scale.set(1.5, 0.7, 1);
      glint.position.set(-topR * 0.42, H + radius * (1 - Math.cos(angle)) * 0.55 - 1, -topR * 0.38);
      loupe.add(glint);
    }

    // Put it down.
    if (a.pose === 'down') {
      loupe.rotation.x = Math.PI;
      loupe.position.y = H + (present ? topR * 0.02 : 0);
    } else if (a.pose === 'side') {
      const slope = Math.atan((baseR - topR - 1.9) / H);
      loupe.rotation.order = 'YZX';
      loupe.rotation.z = -(Math.PI / 2 + slope);
      loupe.rotation.y = mix(0.5, 1.1, random());
      loupe.position.y = baseR * Math.cos(slope);
    } else loupe.rotation.y = (random() - 0.5) * 0.5;

    // How it is worn.
    const reach = baseR + 2;
    if (a.band === 'wire') {
      // A sprung loop that grips the head, lying open on the bench.
      const side = mix(2.4, 3.6, random());
      const path: [number, number, number][] = [];
      const cx = -Math.cos(side) * 46, cz = -Math.sin(side) * 46;
      for (let i = 0; i <= 26; i++) {
        const t = i / 26, angle = side + 0.5 + t * (Math.PI * 2 - 1.0);
        const lift = Math.max(0, 1 - Math.min(t, 1 - t) * 9);
        path.push([cx + Math.cos(angle) * 38 * (1 + 0.12 * Math.sin(angle * 2 + side)), 0.6 + lift * (a.pose === 'up' ? H * 0.5 : 4), cz + Math.sin(angle) * 31]);
      }
      s.tube(path, 0.55, wire);
      if (a.pose === 'up') put(s.mesh(new THREE.TorusGeometry(mix(baseR - 1.4, topR + 1.2, 0.5) + 0.4, 0.55, 6, 40), wire, [0, H * 0.5 + 1.6, 0])).rotation.x = Math.PI / 2;
    } else if (a.band === 'cord') {
      const cord = s.material('#6a5338', { roughness: 0.95 });
      const side = random() * 6.3;
      const path: [number, number, number][] = [];
      for (let i = 0; i <= 20; i++) {
        const t = i / 20, angle = side - 0.9 + t * 1.8;
        const out = reach - 2 + Math.sin(t * Math.PI) * mix(34, 52, random()) + Math.sin(t * 17) * 2.5;
        path.push([Math.cos(angle) * out, 0.7 + (Math.min(t, 1 - t) < 0.06 ? 3 : 0), Math.sin(angle) * out]);
      }
      s.tube(path, 0.7, cord);
    } else if (a.band === 'clip') {
      const side = random() * 6.3;
      const dx = Math.cos(side), dz = Math.sin(side);
      for (const offset of [-1, 1]) {
        const ox = -dz * offset * 3, oz = dx * offset * 3;
        s.tube([[dx * (reach - 3) + ox, 3, dz * (reach - 3) + oz], [dx * (reach + 6) + ox, 1.2, dz * (reach + 6) + oz], [dx * (reach + 16) + ox * 0.4, 0.6, dz * (reach + 16) + oz * 0.4], [dx * (reach + 22) + ox * 1.6, 0.6, dz * (reach + 22) + oz * 1.6]], 0.5, wire);
      }
      s.cylinder(1.6, 1.6, 7.5, [dx * (reach + 6), 1.6, dz * (reach + 6)], wire, 10).rotation.set(Math.PI / 2, 0, -side);
    }

    s.root.scale.setScalar(0.012);
    return s.finish({ footprint: a.band === 'none' ? undefined : baseR * 0.012 * 1.6 });
  },
});
