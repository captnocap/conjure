import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';
import { type Pt, blob, ell, g, horn, human, painted, shell, shellPoint, type ShellSpec } from './face';

const CORDS = {
  purple: 'Deep imperial purple silk.',
  vermilion: 'Vermilion red silk, festive and shrine-bright.',
  white: 'Plain white silk, funereal and pure.',
  indigo: 'Dark indigo silk, sober.',
  gold: 'Gold-yellow silk with heavy tassels.',
  green: 'Moss green silk.',
} as const;
const CORD_COLOUR: Record<keyof typeof CORDS, string> = {
  purple: '#5a2a7c', vermilion: '#d43a22', white: '#efe9dc', indigo: '#263a6b', gold: '#d5a021', green: '#4e7a3a',
};

export default defineThing({
  questions: {
    type: choice('Which Noh mask is it?', {
      'ko-omote': 'Ko-omote, the young woman: a smooth white oval, high smudged brows, narrow eyes, small red lips, black hair parted in the middle.',
      hannya: 'Hannya, the jealous demon: two sharp horns, glaring gold eyes, a leering mouth torn wide with fangs, flushed red toward the jaw.',
      okina: 'Okina, the blessed old man: laughing crescent eyes, deep wrinkles, tufted white pompom brows, a long wispy beard and a separate jaw tied on with cord.',
      warrior: 'A heavy-browed warrior: tanned skin, thick black brows drawn down, a moustache, a grim open mouth showing teeth.',
    }),
    tilt: score('How is the mask tilted?', ['Lowered and clouded, so it looks shadowed and grieving', 'Level and unreadable', 'Raised and shining, so it looks bright and smiling']),
    paint: choice('What state is the paint in?', {
      fresh: 'Fresh gofun: chalk white, smooth and newly finished.',
      yellowed: 'Age-yellowed like old ivory, with fine dark crackle.',
      flaking: 'Flaking away in patches down to the bare cypress wood.',
    }),
    cord: choice('What colour are the silk cords?', CORDS),
    stand: choice('What kind of stand holds it?', {
      post: 'A slim plain black lacquer post on a small rectangular foot.',
      crest: 'Black lacquer with a stepped base and a gold family crest, a collector\'s piece.',
      bamboo: 'A humble raw bamboo travelling stand lashed with cord, an actor\'s own.',
    }),
    bag: noul('Does its brocade storage bag lie beside it?'),
    fan: noul('Is a folding dance fan left open at its foot, as if the actor has just stepped away?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const type = a.type;
    const flake = a.paint === 'flaking' ? 1 : a.paint === 'yellowed' ? 0.25 : 0;
    const wear = Math.min(1, flake + mood.wear * 0.5);

    const reliefs = {
      'ko-omote': human({ nose: 0.75, brow: 0.35, cheek: 1.15, lips: 0.9, chin: 0.8, socket: 0.5 }),
      hannya: human({ nose: 1.25, brow: 2.3, cheek: 1.7, lips: 0, chin: 1.3, socket: 1.4 }),
      okina: human({ nose: 1.05, brow: 0.9, cheek: 1.7, lips: 0.5, chin: 1.1, socket: 0.7, smile: 1 }),
      warrior: human({ nose: 1.3, brow: 1.9, cheek: 1.2, lips: 0.4, chin: 1.3, socket: 1.2 }),
    };
    const base = reliefs[type];
    const spec: ShellSpec = {
      w: type === 'hannya' ? 0.15 : 0.136, h: 0.212, d: 0.062,
      taper: type === 'hannya' ? 0.34 : type === 'ko-omote' ? 0.2 : 0.26,
      round: type === 'ko-omote' ? 2.5 : 2.2,
      relief: (u, v) => base(u, v) + (type === 'hannya' ? 0.12 * g(v, 0.5, 0.12) * g(Math.abs(u), 0.42, 0.16) - 0.1 * g(v, -0.52, 0.16) * g(u, 0, 0.5) : 0),
      hole: (u, v) => {
        const au = Math.abs(u);
        if (type === 'ko-omote') return ell(au, v, 0.4, 0.15, 0.1, 0.022) < 1 || ell(u, v, 0, -0.48, 0.13, 0.022) < 1;
        if (type === 'hannya') return ell(au, v, 0.4, 0.17, 0.045, 0.035) < 1 || (au < 0.66 && v > -0.72 + 0.16 * u * u && v < -0.42 + 0.34 * u * u);
        if (type === 'okina') return (v > -0.47 && v < -0.415 && au < 0.9) || ell(au, v, 0.42, 0.16 - 0.25 * (au - 0.42) ** 2, 0.14, 0.02) < 1;
        return ell(au, v, 0.4, 0.15, 0.06, 0.04) < 1 || ell(u, v, 0, -0.5, 0.3, 0.07) < 1;
      },
    };

    const skin = { 'ko-omote': '#f5f0e3', hannya: '#f1e8d6', okina: '#dcc096', warrior: '#d2a47c' }[type];
    const tint = new THREE.Color(skin).lerp(new THREE.Color('#d9bf7e'), a.paint === 'fresh' ? mood.wear * 0.25 : 0.5);
    const texture = painted(512, 768, (ctx, X, Y, W, H) => {
      ctx.fillStyle = `#${tint.getHexString()}`;
      ctx.fillRect(0, 0, W, H);
      const ink = '#1b1512';
      const stroke = (pts: [number, number][], width: number, colour = ink) => {
        ctx.strokeStyle = colour; ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.beginPath(); pts.forEach(([u, v], i) => (i ? ctx.lineTo(X(u), Y(v)) : ctx.moveTo(X(u), Y(v)))); ctx.stroke();
      };
      if (type === 'hannya') {
        const flush = ctx.createLinearGradient(0, Y(0.1), 0, Y(-1));
        flush.addColorStop(0, 'rgba(190,40,30,0)'); flush.addColorStop(1, 'rgba(190,40,30,0.85)');
        ctx.fillStyle = flush; ctx.fillRect(0, 0, W, H);
      }
      for (const side of [-1, 1]) {
        if (type === 'ko-omote') {
          // Shaved brows repainted high on the forehead as soft smudges.
          const smudge = ctx.createRadialGradient(X(side * 0.36), Y(0.56), 2, X(side * 0.36), Y(0.56), 46);
          smudge.addColorStop(0, 'rgba(40,36,34,0.75)'); smudge.addColorStop(1, 'rgba(40,36,34,0)');
          ctx.fillStyle = smudge; ctx.fillRect(X(side * 0.36) - 60, Y(0.56) - 30, 120, 60);
          stroke([[side * 0.2, 0.175], [side * 0.4, 0.21], [side * 0.6, 0.16]], 9);
          for (let k = 0; k < 3; k++) stroke([[side * (0.1 + k * 0.03), 0.96], [side * (0.72 + k * 0.07), 0.5], [side * (0.86 + k * 0.035), -0.1 - k * 0.2]], 7);
        } else if (type === 'hannya') {
          ctx.fillStyle = '#d8a52a'; ctx.beginPath(); ctx.ellipse(X(side * 0.4), Y(0.17), 46, 30, side * 0.25, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = ink; ctx.lineWidth = 6; ctx.stroke();
          stroke([[side * 0.12, 0.3], [side * 0.45, 0.42], [side * 0.74, 0.34]], 12);
          for (let k = 0; k < 5; k++) stroke([[side * (0.05 + k * 0.05), 0.98], [side * (0.3 + k * 0.12), 0.7 - k * 0.03]], 3);
        } else if (type === 'okina') {
          for (let k = 0; k < 4; k++) stroke([[side * 0.04, 0.62 + k * 0.08], [side * 0.4, 0.68 + k * 0.08], [side * 0.74, 0.58 + k * 0.07]], 4, '#6d4a2c');
          for (let k = 0; k < 3; k++) stroke([[side * (0.58 + k * 0.08), 0.08], [side * (0.7 + k * 0.07), -0.14], [side * (0.5 + k * 0.08), -0.36]], 4, '#6d4a2c');
          stroke([[side * 0.26, 0.2], [side * 0.42, 0.26], [side * 0.6, 0.18]], 5, '#6d4a2c');
        } else {
          stroke([[side * 0.1, 0.27], [side * 0.4, 0.36], [side * 0.72, 0.3]], 26);
          ctx.strokeStyle = '#c99a2e'; ctx.lineWidth = 8; ctx.beginPath(); ctx.ellipse(X(side * 0.4), Y(0.15), 30, 26, 0, 0, Math.PI * 2); ctx.stroke();
          stroke([[side * 0.04, -0.36], [side * 0.3, -0.38], [side * 0.5, -0.5]], 16);
        }
      }
      if (type === 'ko-omote') {
        ctx.fillStyle = ink; ctx.beginPath(); ctx.ellipse(X(0), Y(1.02), W * 0.42, H * 0.09, 0, 0, Math.PI * 2); ctx.fill();
        stroke([[0, 0.99], [0, 0.82]], 3, `#${tint.getHexString()}`);
        ctx.fillStyle = '#b3261e';
        ctx.beginPath(); ctx.ellipse(X(0), Y(-0.44), 52, 13, 0, Math.PI, 0); ctx.fill();
        ctx.beginPath(); ctx.ellipse(X(0), Y(-0.52), 44, 16, 0, 0, Math.PI); ctx.fill();
      } else if (type === 'hannya') {
        stroke([[-0.68, -0.4 + 0.15], [-0.3, -0.38], [0, -0.41], [0.3, -0.38], [0.68, -0.25]], 9, '#7d1612');
        stroke([[-0.66, -0.66], [0, -0.74], [0.66, -0.66]], 9, '#7d1612');
      } else if (type === 'okina') {
        ctx.fillStyle = '#a9382a'; ctx.beginPath(); ctx.ellipse(X(0), Y(-0.39), 60, 9, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(X(0), Y(-0.5), 54, 9, 0, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.fillStyle = '#efe6d2'; ctx.fillRect(X(-0.26), Y(-0.415), X(0.26) - X(-0.26), 12);
        ctx.fillStyle = ink; ctx.beginPath(); ctx.ellipse(X(0), Y(-0.72), 36, 46, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillRect(0, 0, W, Y(0.86));
      }
      // Crackle and losses down to the wood.
      ctx.strokeStyle = 'rgba(70,50,30,0.5)'; ctx.lineWidth = 1.2;
      for (let i = 0; i < wear * 70; i++) {
        let x = random() * W, y = random() * H;
        ctx.beginPath(); ctx.moveTo(x, y);
        for (let k = 0; k < 5; k++) { x += (random() - 0.5) * 50; y += (random() - 0.5) * 50; ctx.lineTo(x, y); }
        ctx.stroke();
      }
      for (let i = 0; i < flake * 22 + mood.wear * 5; i++) {
        const x = random() * W, y = random() * H, r = 12 + random() * 46;
        ctx.fillStyle = '#7d552f'; blob(ctx, x, y, r * 1.08, random); ctx.fill();
        ctx.fillStyle = random() < 0.5 ? '#a9794a' : '#96673a'; blob(ctx, x, y, r, random); ctx.fill();
      }
    });
    const face = shell(spec, new THREE.MeshStandardMaterial({ map: texture, roughness: mix(0.42, 0.8, wear), side: THREE.DoubleSide }));

    const mask = new THREE.Group();
    mask.add(face);
    const on = (u: number, v: number, lift = 0): Pt => { const p = shellPoint(spec, u, v); return [p.x, p.y, p.z + lift]; };
    const part = (mesh: THREE.Mesh) => { mesh.castShadow = mesh.receiveShadow = true; mask.add(mesh); return mesh; };
    const bone = s.material('#e9dcb4', { roughness: 0.4, metalness: 0.15 });
    const giltTooth = s.material('#d9a934', { roughness: 0.3, metalness: 0.7 });
    if (type === 'hannya') {
      for (const side of [-1, 1]) {
        const [x, y, z] = on(side * 0.46, 0.6);
        mask.add(horn([[x, y, z - 0.004], [x + side * 0.018, y + 0.045, z + 0.012], [x + side * 0.03, y + 0.09, z + 0.008], [x + side * 0.022, y + 0.135, z - 0.012]], (t) => 0.013 * (1 - t) ** 0.8, bone));
        for (const [u, v, len] of [[0.5, -0.36, -0.03], [0.24, -0.42, -0.018], [0.42, -0.7, 0.03], [0.16, -0.72, 0.016]] as const) {
          const [fx, fy, fz] = on(side * u, v);
          mask.add(horn([[fx, fy, fz - 0.002], [fx, fy + len, fz + 0.004]], (t) => 0.0055 * (1 - t), giltTooth, { sides: 6, steps: 4 }));
        }
      }
    }
    if (type === 'okina') {
      const tuft = new THREE.MeshStandardMaterial({ color: '#f1ece0', roughness: 1 });
      for (const side of [-1, 1]) {
        const [x, y, z] = on(side * 0.42, 0.4);
        for (let k = 0; k < 6; k++)
          part(new THREE.Mesh(new THREE.IcosahedronGeometry(0.009 + random() * 0.004, 1), tuft)).position.set(x + (random() - 0.5) * 0.018, y + (random() - 0.5) * 0.012, z + 0.004 + random() * 0.006);
        const [jx, jy, jz] = on(side * 0.86, -0.4);
        part(new THREE.Mesh(new THREE.CylinderGeometry(0.0016, 0.0016, 0.03, 6), s.material(CORD_COLOUR[a.cord]))).position.set(jx, jy - 0.005, jz + 0.002);
      }
      const [bx, by, bz] = on(0, -0.9);
      for (let k = 0; k < 5; k++) {
        const dx = (k - 2) * 0.004;
        mask.add(horn([[bx + dx, by, bz - 0.004], [bx + dx * 1.6, by - 0.05, bz + 0.006], [bx + dx * 0.6 + (random() - 0.5) * 0.01, by - 0.1 - random() * 0.03, bz - 0.004]], (t) => 0.0035 * (1 - t * 0.9), tuft, { sides: 6, steps: 10 }));
      }
    }
    if (type === 'warrior') {
      const teeth = s.material('#efe6d2');
      for (let k = -3; k <= 3; k++) {
        const [x, y, z] = on(k * 0.07, -0.44);
        part(new THREE.Mesh(new THREE.BoxGeometry(0.0042, 0.006, 0.003), teeth)).position.set(x, y - 0.002, z - 0.004);
      }
    }

    // Stand.
    const lacquer = a.stand === 'bamboo' ? s.material('#c9ad63', { roughness: 0.55 }) : s.material('#141315', { roughness: 0.18, metalness: 0.25 });
    const gold = s.material('#d2a53a', { metalness: 0.8, roughness: 0.3 });
    const centre = 0.27;
    if (a.stand === 'crest') {
      s.box([0.2, 0.014, 0.13], [0, 0.007, 0], lacquer);
      s.box([0.15, 0.014, 0.095], [0, 0.021, 0], lacquer);
      s.box([0.202, 0.003, 0.132], [0, 0.0145, 0], gold);
      s.cylinder(0.016, 0.016, 0.002, [0, 0.022, 0.05], gold, 20).rotation.x = Math.PI / 2;
      s.rod([0, 0.028, -0.02], [0, centre + 0.03, -0.02], 0.009, lacquer, 0.006);
    } else if (a.stand === 'bamboo') {
      for (const x of [-0.07, 0.07]) s.rod([x, 0.008, -0.05], [x, 0.008, 0.06], 0.009, lacquer);
      s.rod([-0.085, 0.01, -0.02], [0.085, 0.01, -0.02], 0.008, lacquer);
      s.rod([0, 0.01, -0.02], [0, centre + 0.04, -0.02], 0.008, lacquer);
      for (const y of [0.08, 0.16, 0.24]) s.cylinder(0.0095, 0.0095, 0.004, [0, y, -0.02], s.material('#8d7438'), 10);
      s.ring(0.011, 0.0025, [0, 0.018, -0.02], s.material(CORD_COLOUR[a.cord])).rotation.x = Math.PI / 2;
    } else {
      s.box([0.16, 0.016, 0.1], [0, 0.008, 0], lacquer);
      s.rod([0, 0.016, -0.02], [0, centre + 0.03, -0.02], 0.007, lacquer, 0.005);
    }
    s.rod([-0.03, centre + 0.03, -0.02], [0.03, centre + 0.03, -0.02], 0.005, lacquer);
    s.ball([0.014, 0.014, 0.01], [0, centre + 0.03, -0.012], s.material('#7a2230', { roughness: 0.9 }), 12);

    const tilt = mix(0.14, -0.4, a.tilt);
    mask.position.set(0, centre, 0.0);
    mask.rotation.x = tilt;
    mask.rotation.z = (random() - 0.5) * 0.06;
    s.root.add(mask);
    mask.updateMatrixWorld(true);

    // Silk cords from the side holes, hanging to the base and ending in tassels.
    const silk = s.material(CORD_COLOUR[a.cord], { roughness: 0.5 });
    for (const side of [-1, 1]) {
      const from = mask.localToWorld(shellPoint(spec, side * 0.93, 0.2));
      const drop = 0.03 + random() * 0.06;
      const sway = side * (0.02 + random() * 0.025);
      const end: Pt = [from.x + sway, drop, from.z + 0.02 + random() * 0.03];
      s.root.add(horn([[from.x, from.y, from.z], [from.x + side * 0.012, from.y - 0.05, from.z + 0.004], [from.x + sway * 0.8, (from.y + drop) / 2, from.z + 0.02], end], () => 0.0028, silk, { sides: 6, steps: 20 }));
      s.cylinder(0.003, 0.008, 0.03, [end[0], end[1] - 0.012, end[2]], silk, 8);
      s.ball([0.005, 0.005, 0.005], [end[0], end[1] + 0.004, end[2]], silk, 8);
    }

    if (a.bag) {
      const pattern = painted(128, 128, (ctx, _X, _Y, W, H) => {
        ctx.fillStyle = '#6a2433'; ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = '#d7b256'; ctx.lineWidth = 3;
        for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { ctx.beginPath(); ctx.arc(i * 32 + 16, j * 32 + 16, 11, 0, Math.PI * 2); ctx.stroke(); ctx.strokeRect(i * 32 + 11, j * 32 + 11, 10, 10); }
      });
      pattern.wrapS = pattern.wrapT = THREE.RepeatWrapping; pattern.repeat.set(3, 2);
      const cloth = new THREE.MeshStandardMaterial({ map: pattern, roughness: 0.75 });
      const bx = 0.17, bz = 0.02;
      const bag = s.ball([0.075, 0.016, 0.1], [bx, 0.014, bz], cloth, 20);
      bag.rotation.y = 0.3 + random() * 0.5;
      s.ball([0.03, 0.012, 0.02], [bx - 0.02, 0.02, bz - 0.095], cloth, 12);
      s.tube([[bx - 0.03, 0.02, bz - 0.08], [bx - 0.07, 0.006, bz - 0.06], [bx - 0.09, 0.005, bz - 0.01], [bx - 0.075, 0.005, bz + 0.03]], 0.0022, silk);
    }
    if (a.fan) {
      const leaf = painted(256, 128, (ctx, _X, _Y, W, H) => {
        ctx.fillStyle = '#e9d9a0'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#c23a25'; ctx.beginPath(); ctx.arc(W * 0.5, H * 0.35, 30, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(60,40,20,0.35)'; for (let i = 0; i < 12; i++) { ctx.beginPath(); ctx.moveTo(i * W / 11, 0); ctx.lineTo(i * W / 11, H); ctx.stroke(); }
      });
      const fan = new THREE.Mesh(new THREE.RingGeometry(0.035, 0.12, 24, 1, Math.PI * 0.2, Math.PI * 0.6), new THREE.MeshStandardMaterial({ map: leaf, side: THREE.DoubleSide, roughness: 0.7 }));
      fan.rotation.x = -Math.PI / 2 + 0.12;
      fan.rotation.z = random() * 0.5 - 0.25;
      fan.position.set(a.bag ? -0.15 : -0.12, 0.012, 0.1);
      fan.castShadow = true;
      s.root.add(fan);
      for (let i = 0; i < 7; i++) {
        const ang = Math.PI * (0.2 + 0.1 * i) + fan.rotation.z;
        s.rod([fan.position.x, 0.006, fan.position.z], [fan.position.x + Math.cos(ang) * 0.11, 0.008, fan.position.z - Math.sin(ang) * 0.11], 0.0018, lacquer);
      }
    }
    return s.finish();
  },
});
