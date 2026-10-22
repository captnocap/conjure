import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

type P3 = [number, number, number];

export default defineThing({
  questions: {
    chair: choice('What kind of chair is it?', {
      wingback: 'A threadbare upholstered wingback with rolled arms and buttoned back.',
      deck: 'A folding wooden deck chair with a striped canvas sling.',
      captain: 'A bridge captain’s seat on a pedestal, high-backed, with small consoles in the arms.',
      kitchen: 'A plain wooden kitchen chair with a spindle back.',
      rocker: 'A wooden rocking chair with arms and curved runners.',
    }),
    table: choice('What is on the little side table?', {
      cup: 'A cup and saucer.',
      book: 'A book left face down to keep the page.',
      radio: 'A small radio with its aerial up.',
      candle: 'A candle burned low in a holder.',
      nothing: 'Nothing at all.',
    }),
    presence: choice('Is anyone’s presence still in it?', {
      'just-left': 'Someone has only just stood up: a dent in the seat, the blanket pushed aside, slippers on the floor, the cup still steaming.',
      never: 'Truly empty and waiting: everything squared away, the blanket folded.',
      'long-gone': 'Left long ago: dusted pale, cobwebbed, whatever was on the table knocked over.',
    }),
    blanket: choice('What is the blanket over its arm like?', {
      tartan: 'Red tartan wool.',
      grey: 'Plain grey wool with a blanket-stitched edge.',
      granny: 'Crocheted granny squares in every leftover colour.',
      none: 'There is no blanket.',
    }),
    facing: choice('Which way does it face?', {
      toward: 'Toward us, as if we are what it watches.',
      away: 'Away from us: we stand behind it and look where it looks.',
      profile: 'Side on, in profile.',
    }),
    rug: noul('Does it stand on a small rug, a patch of home?'),
    lamp: noul('Is a reading lamp still switched on beside it?'),
  },

  build(a, context) {
    const set = new Sculpture(context);
    const s = set;
    const { mood, random } = context;
    const dusty = a.presence === 'long-gone';
    const dust = (colour: THREE.ColorRepresentation) => { const c = new THREE.Color(colour); if (dusty) c.lerp(new THREE.Color('#b4b0a8'), 0.45); return c; };

    const cloth = (paint: (ctx: CanvasRenderingContext2D) => void, repeat = 1) => {
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
      const ctx = canvas.getContext('2d')!;
      paint(ctx);
      for (let i = 0; i < 1400; i++) { ctx.fillStyle = random() < 0.5 ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)'; ctx.fillRect(random() * 256, random() * 256, 1 + random() * 3, 1); }
      for (let i = 0; i < mood.wear * 26; i++) { ctx.fillStyle = 'rgba(214,205,190,0.3)'; ctx.beginPath(); ctx.ellipse(random() * 256, random() * 256, 4 + random() * 12, 3 + random() * 8, random() * 3, 0, 7); ctx.fill(); }
      if (dusty) { ctx.fillStyle = 'rgba(190,186,178,0.4)'; ctx.fillRect(0, 0, 256, 256); }
      const map = new THREE.CanvasTexture(canvas);
      map.colorSpace = THREE.SRGBColorSpace; map.wrapS = map.wrapT = THREE.RepeatWrapping; map.repeat.set(repeat, repeat);
      return new THREE.MeshStandardMaterial({ map, roughness: 0.95, side: THREE.DoubleSide });
    };
    const wood = s.material(dust(new THREE.Color().setHSL(0.07, 0.45, mix(0.2, 0.34, random()), THREE.SRGBColorSpace)), { roughness: 0.6 });
    const upholstery = new THREE.Color().setHSL(mix(0.47, 0.98, mood.warmth) % 1, 0.3, 0.38, THREE.SRGBColorSpace);
    const fabric = cloth((ctx) => { ctx.fillStyle = `#${upholstery.getHexString()}`; ctx.fillRect(0, 0, 256, 256); ctx.strokeStyle = 'rgba(0,0,0,0.1)'; for (let i = 0; i < 256; i += 6) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 256); ctx.stroke(); } });

    // A sheet of cloth hung over a rail: over the top, then down both sides with soft folds.
    const drape = (material: THREE.Material, centre: P3, along: 'x' | 'z', width: number, radius: number, near: number, far: number, rumple: number) => {
      const geometry = new THREE.PlaneGeometry(1, 1, 10, 28);
      const position = geometry.getAttribute('position') as THREE.BufferAttribute;
      const arc = Math.PI * radius, total = near + arc + far;
      const phase = random() * 6;
      for (let i = 0; i < position.count; i++) {
        const w = position.getX(i) * width, d = (position.getY(i) + 0.5) * total;
        let across: number, y: number;
        if (d < near) { across = radius; y = -(near - d); }
        else if (d < near + arc) { const t = (d - near) / radius; across = Math.cos(t) * radius; y = Math.sin(t) * radius; }
        else { across = -radius; y = -(d - near - arc); }
        const hang = Math.max(0, -y);
        const fold = Math.sin(w / width * 9 + phase) * 0.02 * rumple * Math.min(1, hang * 5) + Math.sin(w * 23 + d * 7 + phase) * 0.008 * rumple;
        across += Math.sign(across || 1) * (0.012 + fold);
        const skew = rumple > 1 ? Math.sin(d * 3 + phase) * 0.05 : 0;
        if (along === 'z') position.setXYZ(i, centre[0] + across, centre[1] + y, centre[2] + w + skew);
        else position.setXYZ(i, centre[0] + w + skew, centre[1] + y, centre[2] + across);
      }
      geometry.computeVertexNormals();
      const mesh = s.mesh(geometry, material);
      return mesh;
    };

    // Where the blanket hangs and where the seat is, per chair.
    let rail: { centre: P3; along: 'x' | 'z'; radius: number; drop: number } = { centre: [0.42, 0.66, 0.02], along: 'z', radius: 0.1, drop: 0.5 };
    let seat: P3 = [0, 0.5, 0.05];
    let backTop: P3 = [0, 1.15, -0.4];

    if (a.chair === 'wingback') {
      for (const x of [-1, 1]) for (const z of [-1, 1]) s.cylinder(0.035, 0.022, 0.2, [x * 0.3, 0.1, z * 0.28], wood, 10);
      s.box([0.78, 0.22, 0.72], [0, 0.31, 0], fabric);
      const cushion = s.box([0.56, 0.13, 0.6], [0, 0.48, 0.05], fabric);
      cushion.scale.y = a.presence === 'just-left' ? 0.8 : 1;
      if (a.presence === 'just-left') { const dent = s.ball([0.2, 0.012, 0.2], [0, 0.535, 0.06], new THREE.MeshStandardMaterial({ color: upholstery.clone().multiplyScalar(0.72), roughness: 1 })); dent.castShadow = false; }
      const back = s.box([0.6, 0.86, 0.15], [0, 0.82, -0.33], fabric); back.rotation.x = -0.14;
      const head = s.cylinder(0.075, 0.075, 0.6, [0, 1.26, -0.39], fabric, 14); head.rotation.z = Math.PI / 2;
      for (const x of [-1, 1]) {
        const wing = s.box([0.09, 0.55, 0.3], [x * 0.335, 0.98, -0.2], fabric); wing.rotation.set(-0.14, -x * 0.22, 0);
        s.box([0.13, 0.36, 0.66], [x * 0.385, 0.42, 0.0], fabric);
        const roll = s.cylinder(0.095, 0.095, 0.66, [x * 0.4, 0.62, 0.0], fabric, 14); roll.rotation.x = Math.PI / 2;
        s.cylinder(0.1, 0.1, 0.02, [x * 0.4, 0.62, 0.335], wood, 14).rotation.x = Math.PI / 2;
      }
      const stud = s.material(dust('#3b2a22'), { roughness: 0.4 });
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) s.ball([0.018, 0.018, 0.012], [(c - 1) * 0.16 + (r % 2) * 0.04 - 0.02, 0.78 + r * 0.17, -0.25 - (r + 1) * 0.024], stud, 8);
      if (mood.wear > 0.45) for (let i = 0; i < 3; i++) s.ball([0.05, 0.03, 0.04], [(random() - 0.5) * 0.5, 0.43 + random() * 0.04, 0.37], s.material('#e8e2d2'), 8);
      rail = { centre: [0.4, 0.62, 0.02], along: 'z', radius: 0.1, drop: 0.42 };
      seat = [0, 0.54, 0.05]; backTop = [0, 1.33, -0.39];
    }
    if (a.chair === 'deck') {
      const stripeA = dust(new THREE.Color().setHSL(mix(0.58, 0.02, mood.warmth), 0.55, 0.45, THREE.SRGBColorSpace)).getStyle();
      const canvasCloth = cloth((ctx) => { ctx.fillStyle = '#e9e2cf'; ctx.fillRect(0, 0, 256, 256); ctx.fillStyle = stripeA; for (let i = 0; i < 4; i++) ctx.fillRect(i * 64 + 8, 0, 32, 256); });
      for (const x of [-0.3, 0.3]) {
        s.rod([x, 0.02, 0.5], [x, 1.02, -0.52], 0.02, wood);
        s.rod([x * 0.9, 0.02, -0.42], [x * 0.9, 0.44, 0.52], 0.02, wood);
        s.rod([x * 0.95, 0.3, -0.62], [x * 0.95, 0.72, -0.22], 0.016, wood);
      }
      for (const [y, z, w] of [[1.02, -0.52, 0.64], [0.44, 0.52, 0.58], [0.02, 0.5, 0.64], [0.02, -0.42, 0.58], [0.3, -0.62, 0.6]] as const) s.rod([-w / 2, y, z], [w / 2, y, z], 0.02, wood);
      const sag = a.presence === 'just-left' ? 0.24 : 0.16;
      const sling = new THREE.PlaneGeometry(0.52, 1, 4, 24);
      const position = sling.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < position.count; i++) { const t = position.getY(i) + 0.5; position.setXYZ(i, position.getX(i), mix(0.44, 1.02, t) - Math.sin(t * Math.PI) * sag * (1 - Math.abs(position.getX(i)) * 0.8), mix(0.52, -0.52, t) - Math.sin(t * Math.PI) * 0.05); }
      sling.computeVertexNormals();
      s.mesh(sling, canvasCloth);
      rail = { centre: [0, 1.02, -0.52], along: 'x', radius: 0.03, drop: 0.4 };
      seat = [0, 0.4, 0.2]; backTop = [0, 1.04, -0.52];
    }
    if (a.chair === 'captain') {
      const shell = s.material(dust('#5b6068'), { metalness: 0.4, roughness: 0.5 });
      const leather = s.material(dust(new THREE.Color().setHSL(mix(0.6, 0.04, mood.warmth), 0.25, 0.2, THREE.SRGBColorSpace)), { roughness: 0.55 });
      const stripe = s.material(dust(new THREE.Color().setHSL(mix(0.55, 0.08, mood.warmth), 0.7, 0.5, THREE.SRGBColorSpace)), { roughness: 0.5 });
      s.cylinder(0.36, 0.42, 0.06, [0, 0.03, 0], shell, 28);
      s.cylinder(0.07, 0.11, 0.36, [0, 0.24, 0], shell, 14);
      s.box([0.66, 0.1, 0.62], [0, 0.45, 0], shell);
      const pad = s.box([0.52, 0.09, 0.52], [0, 0.535, 0.03], leather);
      pad.scale.y = a.presence === 'just-left' ? 0.7 : 1;
      const back = s.box([0.56, 0.86, 0.1], [0, 0.95, -0.3], shell); back.rotation.x = -0.12;
      const backPad = s.box([0.44, 0.6, 0.06], [0, 0.9, -0.235], leather); backPad.rotation.x = -0.12;
      s.box([0.34, 0.2, 0.1], [0, 1.4, -0.34], leather).rotation.x = -0.12;
      s.box([0.06, 0.6, 0.065], [0, 0.9, -0.228], stripe).rotation.x = -0.12;
      for (const x of [-1, 1]) {
        s.box([0.13, 0.24, 0.56], [x * 0.37, 0.6, 0.02], shell);
        s.box([0.15, 0.04, 0.6], [x * 0.37, 0.74, 0.04], leather);
        const panel = s.box([0.12, 0.02, 0.16], [x * 0.37, 0.775, 0.26], s.material('#1b1e22')); panel.rotation.x = 0.25;
        for (let k = 0; k < 6; k++) {
          const live = !dusty && random() < mix(0.2, 0.8, mood.cheer);
          const hue = ['#ffb23a', '#4fd08a', '#ff5a3c', '#5aa8ff'][Math.floor(random() * 4)];
          const key = s.box([0.022, 0.012, 0.022], [x * 0.37 + ((k % 3) - 1) * 0.035, 0.79 + Math.floor(k / 3) * 0.009, 0.235 + Math.floor(k / 3) * 0.05], new THREE.MeshStandardMaterial({ color: live ? hue : '#3b4047', emissive: live ? hue : '#000000', emissiveIntensity: live ? 1.1 : 0 }));
          key.castShadow = false;
        }
      }
      rail = { centre: [0.37, 0.76, -0.02], along: 'z', radius: 0.085, drop: 0.36 };
      seat = [0, 0.58, 0.03]; backTop = [0, 1.5, -0.36];
    }
    if (a.chair === 'kitchen' || a.chair === 'rocker') {
      const arms = a.chair === 'rocker';
      const w = arms ? 0.27 : 0.21, lift = arms ? 0.06 : 0;
      for (const x of [-1, 1]) {
        s.rod([x * w, lift, 0.2], [x * w * 0.95, 0.45 + lift, 0.19], 0.022, wood);
        s.rod([x * w, lift, -0.22], [x * w * 0.92, 1.0 + lift, -0.3], 0.022, wood);
        s.rod([x * w, 0.2 + lift, 0.2], [x * w, 0.2 + lift, -0.22], 0.012, wood);
        if (arms) {
          s.rod([x * (w + 0.03), 0.7, -0.27], [x * (w + 0.04), 0.68, 0.24], 0.022, wood);
          s.rod([x * w * 0.96, 0.46, 0.19], [x * (w + 0.04), 0.68, 0.22], 0.016, wood);
          const runner = s.mesh(new THREE.TorusGeometry(1.5, 0.022, 6, 28, 0.62), wood, [x * w, 1.52, -0.02]);
          runner.rotation.set(0, Math.PI / 2, 0); runner.rotation.z = 0; runner.rotateZ(-Math.PI / 2 - 0.31);
        }
      }
      s.box([w * 2 + 0.06, 0.035, 0.46], [0, 0.46 + lift, 0], wood);
      if (a.presence !== 'never') s.box([w * 2 - 0.02, 0.035, 0.4], [0, 0.495 + lift, 0], cloth((ctx) => { ctx.fillStyle = `#${upholstery.getHexString()}`; ctx.fillRect(0, 0, 256, 256); ctx.fillStyle = 'rgba(255,255,255,0.25)'; for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) if ((i + j) % 2) ctx.fillRect(i * 32, j * 32, 32, 32); }));
      s.rod([-w * 0.92, 0.98 + lift, -0.3], [w * 0.92, 0.98 + lift, -0.3], 0.03, wood);
      s.rod([-w * 0.95, 0.62 + lift, -0.26], [w * 0.95, 0.62 + lift, -0.26], 0.016, wood);
      const spindles = arms ? 5 : 4;
      for (let k = 0; k < spindles; k++) { const x = (k - (spindles - 1) / 2) * (w * 1.5 / spindles); s.rod([x, 0.62 + lift, -0.26], [x, 0.98 + lift, -0.3], 0.011, wood); }
      rail = arms ? { centre: [w + 0.035, 0.69, 0], along: 'z', radius: 0.03, drop: 0.36 } : { centre: [0.04, 0.98, -0.3], along: 'x', radius: 0.035, drop: 0.42 };
      seat = [0, 0.52 + lift, 0]; backTop = [0, 1.02 + lift, -0.3];
    }

    // Blanket: draped where a hand would leave it, or folded square if nobody ever sat here.
    if (a.blanket !== 'none') {
      const wool = cloth((ctx) => {
        if (a.blanket === 'tartan') {
          ctx.fillStyle = '#9c2b27'; ctx.fillRect(0, 0, 256, 256);
          for (const [at, wide, colour] of [[20, 34, 'rgba(20,40,30,0.55)'], [84, 12, 'rgba(240,220,150,0.6)'], [128, 44, 'rgba(15,25,60,0.55)'], [208, 10, 'rgba(240,240,240,0.5)']] as const) { ctx.fillStyle = colour; ctx.fillRect(at, 0, wide, 256); ctx.fillRect(0, at, 256, wide); }
        } else if (a.blanket === 'grey') {
          ctx.fillStyle = '#8b8c8e'; ctx.fillRect(0, 0, 256, 256); ctx.fillStyle = '#c9c1ae'; for (let i = 0; i < 256; i += 16) { ctx.fillRect(i, 0, 5, 14); ctx.fillRect(i, 242, 5, 14); }
        } else {
          const hues = ['#d9534f', '#f0ad4e', '#5bc0de', '#5cb85c', '#b06ab3', '#f7e08a', '#e98fa5'];
          ctx.fillStyle = '#2f2a33'; ctx.fillRect(0, 0, 256, 256);
          for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) for (let k = 0; k < 3; k++) { ctx.fillStyle = hues[Math.floor(random() * hues.length)]; const inset = 5 + k * 9; ctx.fillRect(i * 64 + inset, j * 64 + inset, 64 - inset * 2, 64 - inset * 2); }
        }
      }, a.blanket === 'granny' ? 1.5 : 2);
      if (a.presence === 'never') {
        const [x, y, z] = rail.centre;
        const flat = rail.along === 'z' ? [0.2, 0.05, 0.36] as P3 : [0.36, 0.05, 0.14] as P3;
        const at: P3 = a.chair === 'deck' || a.chair === 'kitchen' ? [seat[0], seat[1] + 0.05, seat[2]] : [x, y + rail.radius + 0.03, z];
        const size: P3 = a.chair === 'deck' || a.chair === 'kitchen' ? [0.34, 0.07, 0.3] : flat;
        s.box(size, at, wool); s.box([size[0] * 0.96, 0.05, size[2] * 0.96], [at[0], at[1] + 0.055, at[2]], wool);
      } else {
        const rumple = a.presence === 'just-left' ? 1.8 : 1;
        drape(wool, [rail.centre[0], rail.centre[1], rail.centre[2] + (rail.along === 'z' ? 0.02 : 0)], rail.along, rail.along === 'z' ? 0.5 : 0.36, rail.radius, rail.drop * (0.75 + random() * 0.25), rail.drop * (a.presence === 'just-left' ? 0.45 : 0.7), rumple);
      }
    }
    if (a.presence === 'just-left') {
      const felt = s.material(dust(new THREE.Color().setHSL(mix(0.6, 0.03, mood.warmth), 0.35, 0.3, THREE.SRGBColorSpace)));
      for (const [x, turn] of [[-0.1, 0.25], [0.12, -0.5]] as const) {
        const sole = s.box([0.1, 0.03, 0.26], [x, 0.015, 0.62 + Math.abs(turn) * 0.1], felt); sole.rotation.y = turn;
        const toe = s.ball([0.056, 0.045, 0.085], [x + Math.sin(turn) * 0.07, 0.05, 0.62 + Math.abs(turn) * 0.1 + Math.cos(turn) * 0.07], felt, 12); toe.rotation.y = turn;
      }
    }

    // Side table and what was left on it.
    const tx = -0.78, tz = 0.12, top = 0.56;
    s.cylinder(0.26, 0.26, 0.03, [tx, top - 0.015, tz], wood, 24);
    s.cylinder(0.022, 0.03, top - 0.06, [tx, (top - 0.03) / 2 + 0.02, tz], wood, 10);
    for (let k = 0; k < 3; k++) { const t = k * Math.PI * 2 / 3 + 0.5; s.rod([tx, 0.16, tz], [tx + Math.cos(t) * 0.2, 0.012, tz + Math.sin(t) * 0.2], 0.016, wood); }
    const steam: THREE.Mesh[] = [];
    let flame: THREE.Mesh | null = null;
    const china = s.material(dust('#efe9dc'), { roughness: 0.35 });
    if (a.table === 'cup') {
      s.cylinder(0.085, 0.06, 0.012, [tx, top + 0.006, tz], china, 20);
      const cup = new THREE.Group();
      const bowl = new THREE.Mesh(new THREE.LatheGeometry([[0.025, 0], [0.04, 0.008], [0.05, 0.04], [0.052, 0.075], [0.046, 0.075], [0.044, 0.04], [0.03, 0.014], [0, 0.014]].map(([x, y]) => new THREE.Vector2(x, y)), 20), china);
      bowl.castShadow = true;
      const tea = new THREE.Mesh(new THREE.CircleGeometry(0.045, 16), s.material('#5a3518', { roughness: 0.2 })); tea.rotation.x = -Math.PI / 2; tea.position.y = 0.06;
      const handle = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.006, 6, 12, Math.PI), china); handle.position.set(0.05, 0.042, 0); handle.rotation.z = -Math.PI / 2;
      cup.add(bowl, handle); if (!dusty) cup.add(tea);
      cup.position.set(tx, top + 0.012, tz);
      if (dusty) { cup.rotation.z = Math.PI / 2 - 0.1; cup.position.set(tx + 0.06, top + 0.06, tz + 0.05); }
      s.root.add(cup);
      if (a.presence === 'just-left') for (let k = 0; k < 3; k++) {
        const wisp = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([0, 1, 2, 3, 4].map((j) => new THREE.Vector3(Math.sin(j * 1.4 + k * 2) * 0.014, j * 0.045, Math.cos(j * 1.1 + k) * 0.014))), 16, 0.005, 5), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.4, depthWrite: false }));
        wisp.position.set(tx + (k - 1) * 0.014, top + 0.09, tz);
        s.root.add(wisp); steam.push(wisp);
      }
    }
    if (a.table === 'book') {
      const cover = s.material(dust(['#7a2d2a', '#2d4a6a', '#3f5a3a', '#6b5a2a'][Math.floor(random() * 4)]), { roughness: 0.7 });
      const book = new THREE.Group();
      for (const side of [-1, 1]) {
        const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.012, 0.21), cover); leaf.position.set(side * 0.068, 0.034, 0); leaf.rotation.z = -side * (dusty ? 0.08 : 0.42); leaf.castShadow = true;
        const pages = new THREE.Mesh(new THREE.BoxGeometry(0.135, 0.018, 0.195), china); pages.position.set(side * 0.064, 0.02, 0); pages.rotation.z = -side * (dusty ? 0.08 : 0.42);
        book.add(leaf, pages);
      }
      book.position.set(tx, top, tz); book.rotation.y = 0.5 + random();
      s.root.add(book);
    }
    if (a.table === 'radio') {
      const radio = new THREE.Group();
      const live = !dusty && a.presence !== 'never';
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.15, 0.08), s.material(dust(new THREE.Color().setHSL(mix(0.5, 0.06, mood.warmth), 0.4, 0.42, THREE.SRGBColorSpace)), { roughness: 0.5 })); body.position.y = 0.075; body.castShadow = true;
      const grille = new THREE.Mesh(new THREE.CircleGeometry(0.052, 20), s.material('#2a2622')); grille.position.set(-0.05, 0.075, 0.041);
      const dial = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.035, 0.004), new THREE.MeshStandardMaterial({ color: live ? '#ffe7a8' : '#77705f', emissive: '#ffcf70', emissiveIntensity: live ? 1.2 : 0 })); dial.position.set(0.06, 0.1, 0.042);
      const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.012, 12), china); knob.rotation.x = Math.PI / 2; knob.position.set(0.06, 0.05, 0.046);
      const aerial = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.38, 5), s.material('#c5c8ca', { metalness: 0.7 })); aerial.position.set(0.1, 0.32, -0.02); aerial.rotation.z = -0.3;
      radio.add(body, grille, dial, knob, aerial);
      radio.position.set(tx, top, tz); radio.rotation.y = 0.35;
      if (dusty) { radio.rotation.x = -Math.PI / 2; radio.position.y = top + 0.04; }
      s.root.add(radio);
    }
    if (a.table === 'candle') {
      s.cylinder(0.07, 0.08, 0.014, [tx, top + 0.007, tz], s.material(dust('#a8873e'), { metalness: 0.6, roughness: 0.4 }), 18);
      const stub = a.presence === 'never' ? 0.16 : 0.05 + random() * 0.04;
      s.cylinder(0.022, 0.026, stub, [tx, top + 0.014 + stub / 2, tz], china, 12);
      for (let k = 0; k < 4; k++) s.ball([0.012, 0.02, 0.012], [tx + Math.cos(k * 1.7) * 0.026, top + 0.03 + random() * stub * 0.5, tz + Math.sin(k * 1.7) * 0.026], china, 6);
      if (!dusty && a.presence !== 'never') { flame = s.ball([0.012, 0.03, 0.012], [tx, top + 0.014 + stub + 0.032, tz], new THREE.MeshStandardMaterial({ color: '#ffd27a', emissive: '#ffb53a', emissiveIntensity: 1.6 }), 10); flame.castShadow = false; }
    }
    if (dusty) {
      const web = new THREE.MeshBasicMaterial({ color: '#e9e9e4', transparent: true, opacity: 0.6, depthWrite: false });
      const anchors: [P3, P3][] = [[backTop, [tx, top, tz]], [backTop, [rail.centre[0], rail.centre[1] + 0.05, 0.3]], [[tx, top, tz], [seat[0] - 0.25, seat[1], 0.3]], [backTop, [-0.3, seat[1] + 0.1, 0.25]]];
      for (const [from, to] of anchors) for (let k = 0; k < 3; k++) {
        const mid: P3 = [(from[0] + to[0]) / 2 + (random() - 0.5) * 0.1, (from[1] + to[1]) / 2 - 0.08 - random() * 0.1, (from[2] + to[2]) / 2 + (random() - 0.5) * 0.1];
        const strand = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([from, mid, to].map((point) => new THREE.Vector3(...point))), 14, 0.003, 4), web);
        s.root.add(strand);
      }
    }

    if (a.lamp) {
      const brass = s.material(dust('#9a7d3c'), { metalness: 0.6, roughness: 0.4 });
      const lx = 0.62, lz = -0.52;
      s.cylinder(0.14, 0.16, 0.03, [lx, 0.015, lz], brass, 18);
      s.rod([lx, 0.03, lz], [lx, 1.42, lz], 0.014, brass);
      s.rod([lx, 1.42, lz], [lx - 0.22, 1.5, lz + 0.14], 0.012, brass);
      const glowColour = new THREE.Color().setHSL(mix(0.13, 0.08, mood.warmth), 0.9, 0.7, THREE.SRGBColorSpace);
      const shade = s.mesh(new THREE.CylinderGeometry(0.09, 0.2, 0.2, 20, 1, true), new THREE.MeshStandardMaterial({ color: glowColour, emissive: glowColour, emissiveIntensity: dusty ? 0.25 : 0.95, roughness: 0.8, side: THREE.DoubleSide }), [lx - 0.22, 1.42, lz + 0.14]);
      shade.castShadow = false;
      const pool = new THREE.Mesh(new THREE.ConeGeometry(0.62, 1.3, 24, 1, true), new THREE.MeshBasicMaterial({ color: glowColour, transparent: true, opacity: dusty ? 0.05 : 0.13, depthWrite: false, side: THREE.DoubleSide }));
      pool.position.set(lx - 0.22, 0.7, lz + 0.14);
      s.root.add(pool);
    }
    if (a.rug) {
      const hue = mix(0.55, 0.02, mood.warmth);
      const rug = cloth((ctx) => {
        ctx.fillStyle = dust(new THREE.Color().setHSL(hue, 0.4, 0.35, THREE.SRGBColorSpace)).getStyle(); ctx.fillRect(0, 0, 256, 256);
        ctx.strokeStyle = '#d9c9a0'; ctx.lineWidth = 8; ctx.strokeRect(18, 18, 220, 220); ctx.lineWidth = 3; ctx.strokeRect(34, 34, 188, 188);
        ctx.fillStyle = dust(new THREE.Color().setHSL((hue + 0.08) % 1, 0.45, 0.55, THREE.SRGBColorSpace)).getStyle();
        for (let i = 0; i < 3; i++) { ctx.save(); ctx.translate(128, 64 + i * 64); ctx.rotate(Math.PI / 4); ctx.fillRect(-20, -20, 40, 40); ctx.restore(); }
      });
      const mat = s.box([2.1, 0.02, 1.6], [-0.15, 0.01, 0.1], rug);
      mat.castShadow = false;
      mat.rotation.y = (random() - 0.5) * 0.15;
      const fringe = s.material('#d9c9a0');
      for (const side of [-1, 1]) for (let k = 0; k < 20; k++) s.box([0.06, 0.008, 0.012], [-0.15 + side * 1.08, 0.006, 0.1 - 0.76 + k * 0.08], fringe).castShadow = false;
    }

    s.root.rotation.y = { toward: 0.3, away: Math.PI - 0.55, profile: (random() < 0.5 ? 1 : -1) * 1.45 }[a.facing];
    const outer = new Sculpture(context);
    outer.root.add(s.root);
    const pace = mix(0.4, 1.4, mood.energy);
    return outer.finish({
      update(_dt, time) {
        steam.forEach((wisp, k) => { wisp.rotation.y = time * 0.8 * pace + k; wisp.scale.y = 1 + Math.sin(time * 1.3 * pace + k) * 0.2; });
        if (flame) flame.scale.set(1 + Math.sin(time * 11 * pace) * 0.12, 1 + Math.sin(time * 7 * pace + 1) * 0.2, 1);
      },
    });
  },
});
