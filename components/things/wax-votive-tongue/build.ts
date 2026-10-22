import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

type P3 = [number, number, number];
const NAMES = ['JAN', 'ROSA', 'MARIA', 'TOMAS', 'ANNA', 'JOSEF', 'LUCIA', 'PEDRO'];
const WORDS = ['TACUI', 'GRATIAS', 'MAMA', 'EFFATA', 'PAX', 'SILENTIUM', 'AMEN'];

export default defineThing({
  questions: {
    material: choice('What is the tongue made of?', {
      red: 'Glossy blood-red wax.',
      pale: 'Pale cream wax, almost flesh.',
      silver: 'Beaten silver, cold and bright.',
      coral: 'Carved red-orange coral, polished, precious.',
    }),
    presentation: choice('How is it presented?', {
      hanging: 'Hanging tip-down on a ribbon from a little wrought-iron hook stand.',
      stars: 'Standing upright like a small flame inside a halo of five gold stars.',
      dish: 'Lying on a small footed dish.',
      capsule: 'Sealed upright in an egg-shaped glass capsule with gilt caps, on a foot.',
    }),
    state: choice('What state is it in?', {
      fresh: 'Fresh and whole.',
      melted: 'Melted at the tip: slumped, with runs and a drip.',
      cracked: 'Cracked across, a chip fallen away.',
    }),
    reason: choice('Why was it offered? (A token is left with it.)', {
      stammer: 'A stammer cured: a small brass bell, for a voice that now rings clear.',
      silence: 'A vow of silence kept: a padlock and its key.',
      slander: 'A slander forgiven: a folded letter closed with a red seal.',
      firstword: 'A child\'s first word: a baby\'s rattle.',
    }),
    inscription: choice('Is anything written on the little plaque?', {
      none: 'No plaque at all.',
      name: 'A first name.',
      word: 'A single word.',
    }),
    ribbon: choice('What colour is the ribbon or cloth with it?', {
      red: 'Red.', blue: 'Blue.', white: 'White.', violet: 'Penitential violet.', gold: 'Gold.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const wear = (hex: string) => new THREE.Color(hex).lerp(new THREE.Color('#7a7468'), mood.wear * 0.3);
    const cloth = s.material({ red: '#b8232f', blue: '#2f5fae', white: '#efe9dc', violet: '#5c2d7a', gold: '#c99a2e' }[a.ribbon], { roughness: 0.6, side: THREE.DoubleSide });
    const gold = new THREE.MeshStandardMaterial({ color: wear('#e3b23a'), metalness: 0.45, roughness: 0.3, emissive: wear('#e3b23a'), emissiveIntensity: 0.16 });
    const iron = s.material('#2a2724', { metalness: 0.5, roughness: 0.6 });
    const glass = new THREE.MeshPhysicalMaterial({ color: '#cfe8f4', transparent: true, opacity: 0.2, roughness: 0.03, depthWrite: false, side: THREE.DoubleSide });
    const glint = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 0.5, transparent: true, opacity: 0.6, depthWrite: false });

    // Surface: papillae and the darker midline, painted once.
    const tint = wear({ red: '#b5222c', pale: '#ecd6ae', silver: '#dfe2e4', coral: '#e8623f' }[a.material]);
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < (a.material === 'silver' ? 250 : 900); i++) {
      ctx.fillStyle = random() < 0.6 ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.1)';
      ctx.beginPath();
      ctx.arc(random() * 256, random() * 256, 1 + random() * 2.2, 0, 7);
      ctx.fill();
    }
    const line = ctx.createLinearGradient(44, 0, 84, 0);
    line.addColorStop(0, 'rgba(0,0,0,0)'); line.addColorStop(0.5, 'rgba(0,0,0,0.3)'); line.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = line;
    ctx.fillRect(44, 20, 40, 180);
    if (a.material === 'coral') { ctx.strokeStyle = 'rgba(120,20,10,0.25)'; for (let i = 0; i < 14; i++) { ctx.beginPath(); ctx.moveTo(random() * 256, 0); ctx.bezierCurveTo(random() * 256, 80, random() * 256, 170, random() * 256, 256); ctx.stroke(); } }
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    const flesh = new THREE.MeshStandardMaterial({ color: tint, map, metalness: a.material === 'silver' ? 0.5 : 0, roughness: a.material === 'silver' ? 0.3 : a.material === 'coral' ? 0.3 : a.state === 'cracked' ? 0.7 : 0.28, emissive: tint, emissiveIntensity: a.material === 'silver' ? 0.15 : 0.12 });
    const dark = new THREE.MeshStandardMaterial({ color: tint.clone().multiplyScalar(0.3), roughness: 1 });

    // The tongue: root at y = 0, tip at y = 1 before scaling, upper surface toward +z.
    const upright = a.presentation === 'stars' || a.presentation === 'capsule';
    const melted = a.state === 'melted';
    const shape = new THREE.SphereGeometry(1, 36, 28);
    const position = shape.attributes.position;
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i), z = position.getZ(i);
      const y = Math.max(position.getY(i), -0.72);
      const t = (y + 0.72) / 1.72; // 0 root .. 1 tip
      const ref = Math.sqrt(Math.max(1e-4, 1 - y * y));
      const cx = x / ref, cz = z / ref; // unit cross-section, shrinking only on the cut root face
      const round = t < 0.72 ? 1 : Math.sqrt(Math.max(0, 1 - ((t - 0.72) / 0.28) ** 2));
      const width = 0.2 * (1 - 0.1 * Math.sin(t * Math.PI * 1.2)) * (upright ? 1 - t * t * 0.28 : 1) * mix(0.25, 1, round);
      const thick = mix(0.085, 0.045, t) * mix(0.3, 1, round) * (cz > 0 ? 0.7 : 1);
      const groove = cz > 0 ? 0.03 * Math.exp(-((cx / 0.3) ** 2)) * (1 - t * 0.6) : 0;
      let px = cx * width, py = t, pz = cz * thick - groove * Math.min(1, Math.hypot(cx, cz) * 1.5);
      pz += (upright ? 0.1 * Math.sin(t * Math.PI) : 0.16 * t * t); // a living curve
      if (upright) px += 0.04 * Math.sin(t * 5);
      if (melted) {
        const m = Math.max(0, t - 0.6) / 0.4;
        if (upright) { px += m * m * 0.2; py -= m * m * 0.16; }
        else { py += m * m * 0.18; px *= 1 - m * 0.4; }
      }
      position.setXYZ(i, px, py, pz);
    }
    shape.computeVertexNormals();
    const L = 0.115;
    const tongue = new THREE.Group();
    const body = new THREE.Mesh(shape, flesh);
    body.castShadow = body.receiveShadow = true;
    tongue.add(body);
    if (a.state === 'cracked') {
      const cut = 0.35 + random() * 0.3;
      for (let k = 0; k < 7; k++) {
        const x0 = mix(-0.19, 0.19, k / 7), x1 = mix(-0.19, 0.19, (k + 1) / 7);
        const y0 = cut + (random() - 0.5) * 0.07, y1 = cut + (random() - 0.5) * 0.07;
        const seg = new THREE.Mesh(new THREE.BoxGeometry(Math.hypot(x1 - x0, y1 - y0) * 1.1, 0.014, 0.16), dark);
        seg.position.set((x0 + x1) / 2, (y0 + y1) / 2, upright ? 0.1 * Math.sin(cut * Math.PI) : 0.16 * cut * cut);
        seg.rotation.z = Math.atan2(y1 - y0, x1 - x0);
        tongue.add(seg);
      }
      const bite = new THREE.Mesh(new THREE.DodecahedronGeometry(0.07), dark);
      bite.position.set(0.19, 0.2 + random() * 0.4, 0.03);
      tongue.add(bite);
    }
    tongue.scale.setScalar(L);

    let plaqueAt: P3 = [-0.06, 0, 0.07], tokenAt: P3 = [0.075, 0, 0.06];
    let sway: THREE.Group | null = null;
    const stars: THREE.Mesh[] = [];
    const drip = (from: P3, length: number) => {
      s.rod(from, [from[0], from[1] - length, from[2]], 0.0035, flesh, 0.0018);
      s.ball([0.004, 0.006, 0.004], [from[0], from[1] - length, from[2]], flesh, 8);
    };
    const puddle = (at: P3, size: number) => s.ball([size, 0.0025, size * 0.8], at, flesh, 14);

    if (a.presentation === 'hanging') {
      s.cylinder(0.055, 0.062, 0.012, [0, 0.006, 0], iron, 20);
      s.rod([-0.05, 0.01, -0.01], [-0.05, 0.25, -0.01], 0.005, iron);
      s.tube([[-0.05, 0.25, -0.01], [-0.045, 0.285, -0.005], [-0.01, 0.295, 0], [0.012, 0.275, 0], [0, 0.258, 0], [-0.012, 0.268, 0]], 0.004, iron);
      for (const turn of [0.5, 2.6, 4.7]) s.tube([[-0.05, 0.012, -0.01], [-0.05 + Math.cos(turn) * 0.03, 0.03, -0.01 + Math.sin(turn) * 0.03], [-0.05 + Math.cos(turn) * 0.05, 0.012, -0.01 + Math.sin(turn) * 0.05]], 0.003, iron);
      sway = new THREE.Group();
      sway.position.set(0, 0.26, 0);
      const strap = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.06, 0.0012), cloth);
      strap.position.y = -0.03;
      strap.castShadow = true;
      for (const side of [-1, 1]) {
        const loop = new THREE.Mesh(new THREE.TorusGeometry(0.012, 0.0035, 6, 20), cloth);
        loop.scale.set(1, 0.6, 0.5);
        loop.position.set(side * 0.012, -0.056, 0.002);
        loop.rotation.z = side * 0.4;
        sway.add(loop);
      }
      tongue.rotation.z = Math.PI; // tip down
      tongue.position.y = -0.058;
      sway.add(strap, tongue);
      sway.rotation.z = (random() - 0.5) * 0.12;
      s.root.add(sway);
      if (melted) { puddle([0.004, 0.014, 0.01], 0.02); s.ball([0.004, 0.006, 0.004], [0.002, 0.26 - 0.058 - L * 1.2 - 0.012, -0.02], flesh, 8); }
      plaqueAt = [0.01, 0.012, 0.05]; tokenAt = [0.09, 0, 0.03];
    } else if (a.presentation === 'stars') {
      s.cylinder(0.05, 0.058, 0.014, [0, 0.007, 0], gold, 6);
      s.cylinder(0.034, 0.042, 0.014, [0, 0.021, 0], s.material('#3b2a1e'), 6);
      s.cylinder(0.02, 0.026, 0.012, [0, 0.034, 0], gold, 16);
      tongue.position.set(0, 0.036, 0);
      s.root.add(tongue);
      const cy = 0.036 + L * 0.5, ringR = 0.082;
      const halo = s.ring(ringR, 0.0022, [0, cy, -0.012], gold);
      halo.castShadow = true;
      s.rod([0, 0.036, -0.012], [0, cy - ringR, -0.012], 0.003, gold);
      const starShape = new THREE.Shape();
      for (let i = 0; i < 10; i++) { const angle = i / 10 * 6.283 + Math.PI / 2, r = i % 2 ? 0.0075 : 0.018; if (i) starShape.lineTo(Math.cos(angle) * r, Math.sin(angle) * r); else starShape.moveTo(Math.cos(angle) * r, Math.sin(angle) * r); }
      const starGeometry = new THREE.ExtrudeGeometry(starShape, { depth: 0.004, bevelEnabled: false });
      for (let i = 0; i < 5; i++) {
        const angle = Math.PI / 2 + (i - 2) * 0.95;
        const star = s.mesh(i ? starGeometry.clone() : starGeometry, new THREE.MeshStandardMaterial({ color: '#f2c94a', metalness: 0.3, roughness: 0.3, emissive: '#f2b93a', emissiveIntensity: mix(0.3, 0.9, mood.cheer) }), [Math.cos(angle) * ringR, cy + Math.sin(angle) * ringR, -0.012]);
        star.rotation.z = (random() - 0.5) * 0.5;
        stars.push(star);
      }
      if (melted) { puddle([0.02, 0.041, 0.012], 0.016); drip([0.022, 0.036 + L * 0.7, 0.008], 0.03); }
      plaqueAt = [0, 0, 0.068]; tokenAt = [0.095, 0, 0.03];
    } else if (a.presentation === 'dish') {
      const pewter = a.material === 'silver' ? gold : new THREE.MeshStandardMaterial({ color: wear('#b9bcbd'), metalness: 0.4, roughness: 0.4, side: THREE.DoubleSide });
      (pewter as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
      s.lathe([[0, 0], [0.035, 0], [0.037, 0.005], [0.014, 0.012], [0.012, 0.028], [0.03, 0.036], [0.085, 0.048], [0.09, 0.052], [0.084, 0.054], [0.03, 0.042], [0, 0.04]], pewter);
      s.cylinder(0.05, 0.05, 0.002, [0, 0.043, 0], cloth, 20);
      tongue.rotation.set(-Math.PI / 2 + 0.12, 0, (random() - 0.5) * 0.5);
      tongue.rotation.order = 'ZXY';
      tongue.position.set(0, 0.062, -0.05);
      const turn = new THREE.Group();
      turn.rotation.y = (random() - 0.5) * 0.8;
      turn.add(tongue);
      s.root.add(turn);
      if (melted) puddle([0.01, 0.047, 0.045], 0.028);
      plaqueAt = [-0.03, 0, 0.11]; tokenAt = [0.12, 0, 0.03];
    } else {
      s.lathe([[0, 0], [0.05, 0], [0.053, 0.007], [0.03, 0.018], [0.012, 0.035], [0.012, 0.05], [0.03, 0.058], [0.036, 0.066], [0, 0.066]], gold);
      s.lathe([[0.034, 0.066], [0.052, 0.1], [0.056, 0.14], [0.046, 0.185], [0.024, 0.208]], glass);
      s.box([0.003, 0.08, 0.003], [0.03, 0.135, 0.044], glint).rotation.z = 0.12;
      s.box([0.002, 0.04, 0.002], [-0.034, 0.15, 0.036], glint).rotation.z = -0.15;
      s.lathe([[0.026, 0.206], [0.022, 0.222], [0.008, 0.23], [0.008, 0.238], [0.013, 0.244], [0, 0.25]], gold);
      s.box([0.005, 0.03, 0.005], [0, 0.264, 0], gold);
      s.box([0.02, 0.005, 0.005], [0, 0.268, 0], gold);
      s.ring(0.036, 0.003, [0, 0.068, 0], cloth).rotation.x = Math.PI / 2;
      tongue.position.set(0, 0.07, 0);
      tongue.scale.setScalar(L * 1.05);
      s.root.add(tongue);
      if (melted) puddle([0.012, 0.069, 0.006], 0.02);
      plaqueAt = [0, 0, 0.066]; tokenAt = [0.09, 0, 0.03];
    }
    if (a.state === 'cracked') {
      const chip = s.mesh(new THREE.TetrahedronGeometry(0.012), flesh, [plaqueAt[0] - 0.05, 0.005, plaqueAt[2] - 0.01]);
      chip.rotation.set(random() * 3, random() * 3, 0);
    }

    // The plaque.
    if (a.inscription !== 'none') {
      const text = a.inscription === 'name' ? NAMES[Math.floor(random() * NAMES.length)] : WORDS[Math.floor(random() * WORDS.length)];
      const w = 0.03 + text.length * 0.008;
      const wedge = s.box([w + 0.008, 0.012, 0.022], [plaqueAt[0], 0.006, plaqueAt[2]], s.material('#3b2a1e'));
      wedge.rotation.y = (random() - 0.5) * 0.3;
      const label = s.label(text, w, 0.026, [plaqueAt[0], 0.02, plaqueAt[2] + 0.004], '#3b2a1e', a.material === 'silver' ? '#dfe2e4' : '#e9d9a8');
      label.rotation.set(-0.7, wedge.rotation.y, 0, 'YXZ');
    }

    // The token that says why.
    const [tx, , tz] = tokenAt;
    let bell: THREE.Object3D | null = null;
    if (a.reason === 'stammer') {
      const brass = new THREE.MeshStandardMaterial({ color: wear('#c79c48'), metalness: 0.45, roughness: 0.3, side: THREE.DoubleSide, emissive: wear('#c79c48'), emissiveIntensity: 0.12 });
      bell = s.lathe([[0.024, 0], [0.022, 0.004], [0.016, 0.02], [0.012, 0.034], [0.006, 0.042], [0, 0.044]], brass, [tx, 0, tz]);
      s.ring(0.006, 0.0018, [tx, 0.049, tz], brass);
      s.ball([0.005, 0.005, 0.005], [tx + 0.004, 0.006, tz + 0.004], iron, 8);
      s.tube([[tx, 0.054, tz], [tx - 0.012, 0.05, tz + 0.012], [tx - 0.03, 0.004, tz + 0.02]], 0.0016, cloth);
    } else if (a.reason === 'silence') {
      const brass = new THREE.MeshStandardMaterial({ color: wear('#c79c48'), metalness: 0.45, roughness: 0.35 });
      const lock = s.box([0.036, 0.03, 0.012], [tx, 0.007, tz], brass);
      lock.rotation.set(-1.35, 0.3, 0);
      const shackle = s.ring(0.011, 0.0035, [tx - 0.004, 0.006, tz - 0.018], iron, Math.PI);
      shackle.rotation.set(-1.35, 0.3, 0);
      s.cylinder(0.006, 0.006, 0.002, [tx + 0.034, 0.002, tz + 0.016], iron, 10);
      s.rod([tx + 0.034, 0.002, tz + 0.016], [tx + 0.06, 0.002, tz + 0.004], 0.0016, iron);
      s.box([0.006, 0.002, 0.006], [tx + 0.058, 0.002, tz + 0.008], iron);
      s.ring(0.007, 0.0015, [tx + 0.03, 0.002, tz + 0.018], iron).rotation.x = Math.PI / 2;
    } else if (a.reason === 'slander') {
      const paper = s.material('#efe8d4', { roughness: 0.9 });
      const letter = s.box([0.07, 0.003, 0.045], [tx, 0.0025, tz], paper);
      letter.rotation.y = 0.4 + (random() - 0.5) * 0.4;
      const flap = s.mesh(new THREE.ConeGeometry(0.036, 0.022, 3), s.material('#e2d9c0', { roughness: 0.9 }), [tx, 0.0045, tz]);
      flap.rotation.set(Math.PI / 2, 0, letter.rotation.y, 'YXZ');
      flap.rotation.y = letter.rotation.y;
      flap.scale.z = 0.05;
      s.cylinder(0.007, 0.008, 0.003, [tx, 0.0055, tz], new THREE.MeshStandardMaterial({ color: '#a3202a', roughness: 0.3 }), 10);
    } else {
      const toy = s.material(mood.cheer > 0.5 ? '#f2c94a' : '#9fc4d8', { roughness: 0.4 });
      s.ball([0.018, 0.018, 0.018], [tx, 0.018, tz], toy, 16);
      s.ring(0.0185, 0.003, [tx, 0.018, tz], cloth).rotation.x = Math.PI / 2;
      s.rod([tx + 0.014, 0.012, tz + 0.01], [tx + 0.05, 0.005, tz + 0.03], 0.0035, s.material('#f1ecdc'));
      s.ring(0.008, 0.003, [tx + 0.056, 0.004, tz + 0.034], toy).rotation.x = Math.PI / 2;
    }

    const rest = sway ? sway.rotation.z : 0;
    return s.finish({
      update: (_dt, time) => {
        if (sway) sway.rotation.z = rest + Math.sin(time * (0.8 + mood.energy * 1.6)) * 0.1 * mood.energy;
        stars.forEach((star, i) => { (star.material as THREE.MeshStandardMaterial).emissiveIntensity = mix(0.3, 0.9, mood.cheer) * (1 + Math.sin(time * 2.3 + i * 1.3) * 0.4 * (0.3 + mood.energy)); });
        if (bell) bell.rotation.z = Math.sin(time * 9) * 0.05 * Math.max(0, mood.energy - 0.6);
      },
    });
  },
});
