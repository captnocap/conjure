import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';
import { gearGeometry, painted, windKey } from './parts';

type P = readonly [number, number, number];

export default defineThing({
  questions: {
    trade: choice('What was the figure built to do?', {
      lamplighter: 'A lamplighter in a top hat, holding up a long pole with a small flame at its tip.',
      'tea-server': 'A tea server gliding on a bell-shaped skirt, offering a tray with a pot and cups.',
      constable: 'A constable in a domed helmet, white-gloved palm raised to say stop, truncheon at its side.',
      dancer: 'A ballerina balanced on one pointed toe, a cog for a tutu, arm arched over her head.',
      crier: 'A town crier in a tricorn hat ringing a hand bell, a scroll in the other hand.',
    }),
    state: choice('What is it doing right now?', {
      wound: 'Freshly wound and working: upright, eyes lit, key turning steadily.',
      'winding-down': 'Running down: slumped forward at the waist, head hanging, arm sinking, the key barely moving.',
      frozen: 'Stopped long ago mid-gesture, cobwebbed, a small bird perched on its raised hand.',
      sprung: 'Broken: the chest has burst and a mainspring coils out, cogs scattered at its feet.',
    }),
    metal: choice('What is its body made of?', {
      brass: 'Polished yellow brass.',
      copper: 'Rose-red copper.',
      gunmetal: 'Blackened gunmetal with gold trim, severe and official.',
      enamel: 'White enamel with gilt edging, like a music-box figurine.',
    }),
    face: choice('What is painted on its porcelain face?', {
      serene: 'A calm doll face with lowered lashes and a small red mouth.',
      smiling: 'Rosy cheeks and a fixed wide smile.',
      cracked: 'A cracked face with a piece missing over one eye.',
      blank: 'A smooth mask with no features but two dark eyeholes.',
      weeping: 'Downcast eyes and a single painted blue tear.',
    }),
    key: choice('What shape is the bow of the key in its back?', {
      butterfly: 'Two loops, the classic toy key.',
      heart: 'A heart.',
      ring: 'A single plain ring.',
      tbar: 'A blunt T-bar with ball ends, industrial.',
    }),
    keySize: score('How large is the key?', ['A modest key between the shoulders', 'As wide as its back', 'Enormous, wider than the figure']),
    chest: choice('What is in the middle of its chest?', {
      plate: 'A plain riveted plate.',
      window: 'A round glass window showing turning gears.',
      heart: 'A small glowing heart-shaped lamp.',
    }),
    base: noul('Does it stand on a round music-box base?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const stopped = a.state === 'frozen' || a.state === 'sprung';
    const slump = a.state === 'winding-down' ? 0.42 : a.state === 'sprung' ? 0.16 : 0;
    const bodyColour = { brass: '#d0a444', copper: '#c9764a', gunmetal: '#3b3f46', enamel: '#eeeadf' }[a.metal];
    const trimColour = { brass: '#8a6a2c', copper: '#7c4a2e', gunmetal: '#d6ac48', enamel: '#d6ac48' }[a.metal];
    const patina = new THREE.Color(bodyColour).lerp(new THREE.Color('#5f9a84'), mood.wear * (a.state === 'frozen' ? 0.55 : 0.3));
    const metalness = a.metal === 'enamel' ? 0.1 : 0.55;
    const body = s.material(patina, { metalness, roughness: 0.38 });
    const trim = s.material(trimColour, { metalness: 0.6, roughness: 0.4 });
    const dark = s.material('#2a2623', { roughness: 0.7 });
    const white = s.material('#f1ece2', { roughness: 0.35 });
    const glowOn = !stopped;
    const amber = new THREE.Color().setHSL(mix(0.52, 0.09, mood.warmth), 0.9, 0.6);

    const baseY = a.base ? 0.16 : 0;
    if (a.base) {
      s.lathe([[0, 0], [0.5, 0], [0.5, 0.03], [0.46, 0.05], [0.46, 0.12], [0.42, 0.16], [0, 0.16]], trim);
      const n = 18;
      for (let i = 0; i < n; i++) s.ball([0.018, 0.018, 0.018], [Math.cos(i / n * Math.PI * 2) * 0.465, 0.085, Math.sin(i / n * Math.PI * 2) * 0.465], body, 8);
    }

    // Everything above the waist leans as one piece.
    const waistY = baseY + 0.98;
    const upper = new THREE.Group();
    upper.position.set(0, waistY, 0);
    upper.rotation.x = slump;
    upper.rotation.z = a.state === 'sprung' ? -0.08 : 0;
    s.root.add(upper);
    const up = <T extends THREE.Object3D>(node: T) => { upper.add(node); return node; };

    // Lower body by trade.
    const hipY = waistY - 0.04;
    const leg = (x: number, foot: P, kneeBend = 0.04) => {
      const hip: P = [x, hipY, 0];
      const knee: P = [(x + foot[0]) / 2, (hipY + foot[1]) / 2 + 0.02, (foot[2]) / 2 + kneeBend];
      s.rod(hip, knee, 0.062, body, 0.05);
      s.ball([0.062, 0.062, 0.062], knee, trim, 12);
      s.rod(knee, foot, 0.048, body, 0.036);
      return knee;
    };
    if (a.trade === 'tea-server') {
      s.lathe([[0.34, 0.04], [0.4, 0.04], [0.4, 0.08], [0.36, 0.2], [0.24, 0.6], [0.17, 0.9], [0.13, 0.98]], body, [0, baseY, 0]);
      for (const y of [0.1, 0.42, 0.72]) s.ring(y === 0.1 ? 0.4 : y === 0.42 ? 0.3 : 0.215, 0.012, [0, baseY + y, 0], trim).rotation.x = Math.PI / 2;
      for (let i = 0; i < 3; i++) {
        const angle = i / 3 * Math.PI * 2 + 0.5;
        s.cylinder(0.05, 0.05, 0.03, [Math.cos(angle) * 0.3, baseY + 0.05, Math.sin(angle) * 0.3], dark, 14).rotation.z = Math.PI / 2;
      }
    } else if (a.trade === 'dancer') {
      leg(0.04, [0.02, baseY + 0.1, 0.02], 0.01);
      s.rod([0.02, baseY + 0.12, 0.02], [0.02, baseY, 0.05], 0.036, white, 0.012);
      const knee = leg(-0.07, [-0.52, baseY + 0.78, -0.3], -0.06);
      void knee;
      s.rod([-0.52, baseY + 0.78, -0.3], [-0.66, baseY + 0.8, -0.36], 0.034, white, 0.012);
      const tutu = s.mesh(gearGeometry(0.44, 20, 0.022, 0.12, 0, 0.06), s.material(a.metal === 'enamel' ? '#e9b7c2' : trimColour, { metalness: 0.4, roughness: 0.45 }), [0, hipY + 0.03, 0]);
      tutu.rotation.x = Math.PI / 2 - 0.08;
    } else {
      for (const side of [-1, 1]) {
        const foot: P = [side * 0.11, baseY + 0.08, side * 0.03];
        leg(side * 0.09, foot);
        s.box([0.1, 0.08, 0.24], [side * 0.11, baseY + 0.04, side * 0.03 + 0.05], dark);
      }
      if (a.trade === 'constable') s.lathe([[0.19, -0.26], [0.2, -0.26], [0.19, 0.0], [0.15, 0.2]], body, [0, hipY, 0]).scale.set(1, 1, 0.8);
    }
    s.ball([0.15, 0.07, 0.13], [0, hipY, 0], trim, 16);

    // Torso, a waisted lathe with a collar.
    const torso = up(s.lathe([[0.12, 0], [0.13, 0.05], [0.17, 0.2], [0.2, 0.36], [0.19, 0.44], [0.12, 0.5], [0.06, 0.52], [0.05, 0.58]], body));
    torso.scale.set(1, 1, 0.78);
    up(s.ring(0.128, 0.018, [0, 0.03, 0], trim)).rotation.x = Math.PI / 2;
    for (let i = 0; i < 5; i++) up(s.ball([0.012, 0.012, 0.012], [0, 0.12 + i * 0.075, 0.105 + Math.sin(i / 4 * Math.PI) * 0.04 + (i < 3 ? i * 0.012 : 0.03)], trim, 8)).position.x = -0.1;
    const spinners: { node: THREE.Object3D; speed: number }[] = [];
    if (a.state === 'sprung') {
      up(s.cylinder(0.1, 0.1, 0.03, [0, 0.3, 0.14], dark, 20)).rotation.x = Math.PI / 2;
      const coil: P[] = [];
      for (let i = 0; i <= 40; i++) {
        const turn = i / 40 * Math.PI * 7, r = 0.03 + i * 0.0035;
        coil.push([Math.cos(turn) * r + i * 0.002, 0.3 + Math.sin(turn) * r - i * 0.003, 0.16 + i * 0.0085]);
      }
      up(s.tube(coil, 0.009, s.material('#8d98a3', { metalness: 0.6, roughness: 0.3 })));
    } else if (a.chest === 'window') {
      up(s.ring(0.095, 0.014, [0, 0.3, 0.148], trim));
      up(s.cylinder(0.09, 0.09, 0.012, [0, 0.3, 0.142], dark, 20)).rotation.x = Math.PI / 2;
      const cogs: [number, number, number, number][] = [[-0.025, 0.31, 0.05, 10], [0.04, 0.275, 0.035, 8], [0.035, 0.345, 0.025, 7]];
      cogs.forEach(([x, y, r, teeth], index) => {
        const cog = up(s.mesh(gearGeometry(r, teeth, 0.012, r * 0.2), index === 0 ? body : trim, [x, 0.0 + y, 0.156]));
        spinners.push({ node: cog, speed: (index % 2 ? -1 : 1) * 0.05 / r });
      });
    } else if (a.chest === 'heart') {
      const heart = new THREE.Shape();
      heart.moveTo(0, -0.07);
      heart.bezierCurveTo(-0.12, 0.02, -0.06, 0.09, 0, 0.04);
      heart.bezierCurveTo(0.06, 0.09, 0.12, 0.02, 0, -0.07);
      const lamp = up(s.mesh(new THREE.ExtrudeGeometry(heart, { depth: 0.03, bevelEnabled: false }), s.material('#e3463a', { emissive: '#ff5a3c', emissiveIntensity: glowOn ? mix(0.5, 1.6, mood.cheer) : 0.02, roughness: 0.3 }), [0, 0.31, 0.135]));
      lamp.scale.setScalar(0.95);
    } else {
      up(s.box([0.16, 0.2, 0.02], [0, 0.3, 0.142], trim));
      for (const x of [-1, 1]) for (const y of [-1, 1]) up(s.ball([0.012, 0.012, 0.012], [x * 0.065, 0.3 + y * 0.085, 0.155], body, 8));
    }

    // Head: porcelain with a painted face. u = 0.25 of a sphere faces +z.
    const face = painted(512, 256, (ctx) => {
      ctx.fillStyle = '#f4efe6';
      ctx.fillRect(0, 0, 512, 256);
      const cx = 128, eyeY = 118, dx = 30;
      if (a.face !== 'blank') {
        ctx.fillStyle = a.face === 'smiling' ? 'rgba(232,110,120,0.75)' : 'rgba(232,140,140,0.35)';
        for (const side of [-1, 1]) { ctx.beginPath(); ctx.arc(cx + side * 40, 152, a.face === 'smiling' ? 15 : 12, 0, Math.PI * 2); ctx.fill(); }
      }
      ctx.fillStyle = ctx.strokeStyle = '#1f1a1c';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      for (const side of [-1, 1]) {
        const x = cx + side * dx;
        if (a.face === 'blank') { ctx.beginPath(); ctx.ellipse(x, eyeY, 12, 15, 0, 0, Math.PI * 2); ctx.fill(); continue; }
        if (a.face === 'serene' || a.face === 'weeping') {
          ctx.beginPath(); ctx.arc(x, eyeY - (a.face === 'weeping' ? 2 : 6), 11, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
          for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(x + i * 7, eyeY + 4); ctx.lineTo(x + i * 10, eyeY + 11); ctx.stroke(); }
        } else {
          ctx.beginPath(); ctx.ellipse(x, eyeY, 8, 11, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x - 3, eyeY - 4, 3, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#1f1a1c';
        }
        ctx.beginPath(); ctx.moveTo(x - 12, eyeY - 24 + (a.face === 'weeping' ? side * 5 : 0)); ctx.quadraticCurveTo(x, eyeY - 31, x + 12, eyeY - 24 - (a.face === 'weeping' ? side * 5 : 0)); ctx.stroke();
      }
      if (a.face !== 'blank') {
        ctx.strokeStyle = ctx.fillStyle = '#b3242c';
        ctx.lineWidth = 6;
        ctx.beginPath();
        if (a.face === 'smiling') { ctx.arc(cx, 160, 24, 0.12 * Math.PI, 0.88 * Math.PI); ctx.stroke(); }
        else if (a.face === 'weeping') { ctx.arc(cx, 196, 14, 1.2 * Math.PI, 1.8 * Math.PI); ctx.stroke(); }
        else { ctx.ellipse(cx, 178, 11, 6, 0, 0, Math.PI * 2); ctx.fill(); }
      }
      if (a.face === 'weeping') {
        ctx.fillStyle = '#3f86d8';
        ctx.beginPath(); ctx.moveTo(cx + dx + 4, eyeY + 14); ctx.quadraticCurveTo(cx + dx + 15, eyeY + 44, cx + dx + 4, eyeY + 48); ctx.quadraticCurveTo(cx + dx - 7, eyeY + 44, cx + dx + 4, eyeY + 14); ctx.fill();
      }
      if (a.face === 'cracked') {
        ctx.fillStyle = '#17120f';
        ctx.beginPath(); ctx.moveTo(cx + 10, 60); ctx.lineTo(cx + 62, 70); ctx.lineTo(cx + 52, 132); ctx.lineTo(cx + 24, 140); ctx.lineTo(cx + 30, 100); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#17120f'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(cx + 24, 140); ctx.lineTo(cx + 6, 170); ctx.lineTo(cx + 16, 196); ctx.lineTo(cx - 6, 232); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx + 10, 60); ctx.lineTo(cx - 22, 40); ctx.lineTo(cx - 30, 10); ctx.stroke();
      }
      // Wear: hairline crazing across the glaze.
      ctx.strokeStyle = 'rgba(70,55,45,0.5)'; ctx.lineWidth = 1.2;
      for (let i = 0; i < Math.floor(mood.wear * 14); i++) {
        let x = random() * 256, y = random() * 256;
        ctx.beginPath(); ctx.moveTo(x, y);
        for (let k = 0; k < 4; k++) { x += (random() - 0.5) * 50; y += random() * 30; ctx.lineTo(x, y); }
        ctx.stroke();
      }
    });
    const head = new THREE.Group();
    head.position.set(0, 0.7, 0.01);
    head.rotation.x = a.state === 'winding-down' ? 0.32 : a.state === 'sprung' ? 0.2 : 0;
    head.rotation.z = a.state === 'sprung' ? 0.3 : a.state === 'frozen' ? -0.12 : 0;
    head.rotation.y = a.state === 'frozen' ? 0.3 : 0;
    up(head);
    const hd = <T extends THREE.Object3D>(node: T) => { head.add(node); return node; };
    up(s.cylinder(0.04, 0.05, 0.1, [0, 0.58, 0], trim, 12));
    hd(s.ball([0.115, 0.135, 0.12], [0, 0, 0], new THREE.MeshStandardMaterial({ map: face, roughness: 0.28 }), 28));
    if (glowOn && a.face !== 'cracked') for (const side of [-1, 1]) hd(s.ball([0.012, 0.012, 0.008], [side * 0.042, 0.01, 0.112], new THREE.MeshStandardMaterial({ color: amber, emissive: amber, emissiveIntensity: 1.6 }), 8));
    // Brass skull cap behind the face, then the hat of the trade.
    const cap = hd(s.mesh(new THREE.SphereGeometry(0.125, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.42), body, [0, 0.012, -0.012]));
    cap.rotation.x = -0.85;
    cap.scale.set(1, 1.1, 1);
    const hat = new THREE.Group();
    hat.position.set(0, 0.105, -0.01);
    hat.rotation.x = -0.12;
    hd(hat);
    const ht = <T extends THREE.Object3D>(node: T) => { hat.add(node); return node; };
    const felt = s.material(a.metal === 'gunmetal' ? '#23262c' : '#2f3540', { roughness: 0.8 });
    if (a.trade === 'lamplighter') {
      ht(s.cylinder(0.17, 0.17, 0.014, [0, 0.01, 0], felt, 24));
      ht(s.cylinder(0.105, 0.098, 0.2, [0, 0.11, 0], felt, 24));
      ht(s.cylinder(0.102, 0.102, 0.035, [0, 0.035, 0], trim, 24));
    } else if (a.trade === 'constable') {
      ht(s.lathe([[0.15, 0], [0.135, 0.02], [0.125, 0.1], [0.085, 0.19], [0.03, 0.23], [0, 0.235]], felt, [0, -0.02, 0]));
      ht(s.ball([0.022, 0.03, 0.022], [0, 0.235, 0], trim, 10));
      ht(s.mesh(gearGeometry(0.045, 8, 0.012, 0.012), trim, [0, 0.085, 0.128])).rotation.x = -0.2;
    } else if (a.trade === 'tea-server') {
      ht(s.cylinder(0.1, 0.12, 0.05, [0, 0.0, -0.02], white, 20));
      const frill = 12;
      for (let i = 0; i < frill; i++) ht(s.ball([0.026, 0.02, 0.026], [Math.cos(i / frill * Math.PI * 2) * 0.115, -0.02, Math.sin(i / frill * Math.PI * 2) * 0.115 - 0.02], white, 8));
    } else if (a.trade === 'dancer') {
      ht(s.ball([0.06, 0.055, 0.06], [0, 0.02, -0.05], trim, 14));
      for (let i = -2; i <= 2; i++) ht(s.rod([i * 0.03, -0.01, 0.07 - Math.abs(i) * 0.012], [i * 0.036, 0.05 - Math.abs(i) * 0.012, 0.075 - Math.abs(i) * 0.012], 0.006, trim, 0.002));
    } else {
      hat.scale.setScalar(0.8);
      ht(s.cylinder(0.2, 0.2, 0.02, [0, 0.01, 0], felt, 3));
      ht(s.lathe([[0.1, 0], [0.095, 0.06], [0.06, 0.1], [0, 0.11]], felt, [0, 0.01, 0]));
      for (let i = 0; i < 3; i++) {
        const angle = (i * 120 + 60) * Math.PI / 180;
        const flap = ht(s.box([0.34, 0.085, 0.014], [Math.sin(angle) * 0.105, 0.05, Math.cos(angle) * 0.105], felt));
        flap.rotation.order = 'YXZ';
        flap.rotation.y = angle;
        flap.rotation.x = 0.25;
        ht(s.box([0.34, 0.012, 0.018], [Math.sin(angle) * 0.115, 0.093, Math.cos(angle) * 0.115], trim)).rotation.y = angle;
      }
      ht(s.ring(0.092, 0.008, [0, 0.03, 0], trim)).rotation.x = Math.PI / 2;
    }

    // Arms. The figure's raised hand is on +x.
    const arm = (side: number, hand: P, out = 0.06) => {
      const shoulder: P = [side * 0.215, 0.42, 0];
      const elbow: P = [(shoulder[0] + hand[0]) / 2 + side * out, (shoulder[1] + hand[1]) / 2 - 0.06, (hand[2]) / 2 - 0.03];
      up(s.ball([0.062, 0.062, 0.062], shoulder, trim, 14));
      up(s.rod(shoulder, elbow, 0.045, body, 0.038));
      up(s.ball([0.045, 0.045, 0.045], elbow, trim, 12));
      up(s.rod(elbow, hand, 0.036, body, 0.028));
      up(s.ball([0.042, 0.05, 0.042], hand, a.trade === 'constable' || a.metal === 'enamel' ? white : trim, 12));
    };
    const droop = a.state === 'winding-down' ? 0.55 : a.state === 'sprung' ? 0.85 : 0;
    const lerpP = (p: P, q: P, t: number): P => [mix(p[0], q[0], t), mix(p[1], q[1], t), mix(p[2], q[2], t)];
    const rest: P = [0.3, 0.02, 0.1];
    const raisedBy: Record<typeof a.trade, P> = {
      lamplighter: [0.36, 0.62, 0.2],
      'tea-server': [0.3, 0.3, 0.34],
      constable: [0.3, 0.74, 0.3],
      dancer: [0.12, 0.98, 0.04],
      crier: [0.38, 0.78, 0.16],
    };
    const otherBy: Record<typeof a.trade, P> = {
      lamplighter: [-0.3, 0.0, 0.08],
      'tea-server': [-0.22, 0.16, 0.22],
      constable: [-0.3, 0.0, 0.06],
      dancer: [-0.5, 0.34, 0.06],
      crier: [-0.26, 0.2, 0.3],
    };
    const hand = lerpP(raisedBy[a.trade], rest, droop);
    arm(1, hand, a.trade === 'dancer' ? 0.18 : 0.06);
    const other = otherBy[a.trade];
    arm(-1, other);

    // What the hands hold.
    const prop = new THREE.Group();
    prop.position.set(...hand);
    prop.rotation.z = -droop * 0.9;
    up(prop);
    const pr = <T extends THREE.Object3D>(node: T) => { prop.add(node); return node; };
    let flame: THREE.Mesh | null = null;
    if (a.trade === 'lamplighter') {
      pr(s.rod([0, -0.75, 0], [0, 1.05, 0], 0.014, dark));
      pr(s.ring(0.045, 0.008, [0.045, 1.05, 0], trim, Math.PI));
      flame = pr(s.ball([0.03, 0.06, 0.03], [0, 1.12, 0], new THREE.MeshStandardMaterial({ color: '#ffd27a', emissive: '#ffa630', emissiveIntensity: glowOn ? 2.2 : 0, roughness: 0.4 }), 10));
      if (!glowOn) flame.scale.setScalar(0.012);
      // A little lantern in the other hand.
      up(s.rod([other[0], other[1], other[2]], [other[0], other[1] - 0.12, other[2]], 0.005, dark));
      up(s.cylinder(0.045, 0.055, 0.12, [other[0], other[1] - 0.18, other[2]], new THREE.MeshStandardMaterial({ color: '#ffe7a6', emissive: '#ffb648', emissiveIntensity: glowOn ? 1.1 : 0.03, roughness: 0.4 }), 6));
      up(s.cylinder(0.01, 0.06, 0.04, [other[0], other[1] - 0.105, other[2]], trim, 6));
      up(s.cylinder(0.06, 0.06, 0.015, [other[0], other[1] - 0.245, other[2]], trim, 6));
    } else if (a.trade === 'tea-server') {
      const silver = s.material('#cfd3d6', { metalness: 0.6, roughness: 0.25 });
      pr(s.cylinder(0.2, 0.19, 0.015, [-0.02, 0.06, 0.03], silver, 24));
      pr(s.ring(0.195, 0.008, [-0.02, 0.07, 0.03], silver)).rotation.x = Math.PI / 2;
      pr(s.lathe([[0, 0], [0.05, 0], [0.075, 0.04], [0.07, 0.09], [0.035, 0.115], [0.035, 0.125], [0, 0.135]], white, [-0.07, 0.068, 0.0]));
      pr(s.tube([[-0.01, 0.1, 0], [0.04, 0.12, 0], [0.065, 0.16, 0]], 0.012, white));
      pr(s.ring(0.03, 0.007, [-0.145, 0.125, 0], white, Math.PI)).rotation.z = Math.PI / 2;
      const cups = droop > 0.3 ? 1 : 2;
      for (let i = 0; i < cups; i++) pr(s.cylinder(0.032, 0.022, 0.04, [0.06 - i * 0.11, 0.09, 0.12 - i * 0.02], white, 14));
      if (droop > 0.3) {
        const fallen = s.cylinder(0.032, 0.022, 0.04, [0.34 + random() * 0.1, baseY + 0.032, 0.42 + random() * 0.1], white, 14);
        fallen.rotation.z = Math.PI / 2;
        fallen.rotation.y = random() * 3;
      }
    } else if (a.trade === 'constable') {
      for (let i = 0; i < 4; i++) pr(s.rod([-0.03 + i * 0.02, 0.03, 0], [-0.036 + i * 0.024, 0.11 - Math.abs(i - 1.5) * 0.012, 0.01], 0.01, white));
      up(s.rod([other[0], other[1] - 0.02, other[2] - 0.08], [other[0] - 0.03, other[1] - 0.06, other[2] + 0.42], 0.022, dark, 0.028));
    } else if (a.trade === 'crier') {
      pr(s.cylinder(0.014, 0.014, 0.1, [0, 0.07, 0], dark, 8));
      const bell = pr(s.lathe([[0.012, 0], [0.05, -0.02], [0.065, -0.1], [0.09, -0.14], [0.085, -0.14], [0.06, -0.1], [0, -0.02]], s.material('#e2b84c', { metalness: 0.6, roughness: 0.3, side: THREE.DoubleSide }), [0, 0.03, 0]));
      bell.position.y = 0.0;
      prop.rotation.z += glowOn ? -0.5 : 0;
      prop.rotation.x = Math.PI;
      const scroll = up(s.cylinder(0.035, 0.035, 0.3, [other[0], other[1], other[2] + 0.03], white, 12));
      scroll.rotation.z = Math.PI / 2 - 0.2;
      up(s.box([0.22, 0.3, 0.004], [other[0], other[1] - 0.15, other[2] + 0.05], white)).rotation.z = -0.2;
    }

    // The key in its back.
    const keySize = mix(0.3, 0.85, a.keySize);
    const key = windKey(s.material(a.metal === 'gunmetal' ? '#d6ac48' : '#b98b34', { metalness: 0.6, roughness: 0.3 }), keySize, a.key);
    const keyMount = new THREE.Group();
    keyMount.position.set(0, 0.3, -0.13);
    keyMount.rotation.x = -Math.PI / 2;
    keyMount.add(key);
    key.rotation.y = random() * Math.PI;
    up(keyMount);
    up(s.cylinder(0.05, 0.06, 0.03, [0, 0.3, -0.14], trim, 14)).rotation.x = Math.PI / 2;

    // What time has left around it.
    if (a.state === 'frozen') {
      const web = new THREE.MeshStandardMaterial({ color: '#f2f2ee', roughness: 1 });
      const anchor: P[] = [[0.1, 0.78, 0.02], [0.215, 0.44, 0.02], [0.02, 0.62, 0.1]];
      for (const p of anchor) for (let i = 0; i < 2; i++) up(s.rod([hand[0] + (random() - 0.5) * 0.05, hand[1] - i * 0.12, hand[2] - i * 0.06], p, 0.0035, web));
      // A sparrow that trusts it completely.
      const bird = new THREE.Group();
      bird.position.set(hand[0] + (a.trade === 'tea-server' ? 0.12 : 0), hand[1] + (a.trade === 'tea-server' ? 0.1 : 0.06), hand[2] + (a.trade === 'tea-server' ? 0.12 : 0));
      bird.rotation.y = random() * 6;
      up(bird);
      const feather = s.material('#6b5140');
      bird.add(s.ball([0.035, 0.03, 0.05], [0, 0.03, 0], feather, 10), s.ball([0.022, 0.022, 0.022], [0, 0.058, 0.035], feather, 10), s.rod([0, 0.055, 0.052], [0, 0.052, 0.075], 0.006, s.material('#d9a13a'), 0.001), s.rod([0, 0.035, -0.04], [0, 0.05, -0.1], 0.012, feather, 0.006));
    }
    if (a.state === 'sprung' || (a.state === 'winding-down' && mood.wear > 0.5)) {
      const count = a.state === 'sprung' ? 5 + Math.floor(random() * 4) : 2;
      for (let i = 0; i < count; i++) {
        const r = 0.03 + random() * 0.05, angle = random() * Math.PI * 2, distance = 0.25 + random() * 0.4;
        const cog = s.mesh(gearGeometry(r, 8 + Math.floor(random() * 5), 0.012, r * 0.25), random() > 0.5 ? body : trim, [Math.cos(angle) * distance, baseY + 0.008, Math.abs(Math.sin(angle)) * distance + 0.1]);
        cog.rotation.x = Math.PI / 2;
        cog.rotation.z = random() * 3;
      }
    }

    const speed = a.state === 'wound' ? mix(0.6, 3.2, mood.energy) : a.state === 'winding-down' ? mix(0.05, 0.3, mood.energy) : 0;
    return s.finish({
      footprint: 0.5,
      update: (dt, time) => {
        key.rotation.y += dt * speed;
        for (const spinner of spinners) spinner.node.rotation.z += dt * speed * spinner.speed * 6;
        if (speed > 0) {
          head.rotation.y = Math.sin(time * speed * 0.6) * 0.18 * Math.min(speed, 1);
          if (a.state === 'wound') prop.rotation.x = (a.trade === 'crier' ? Math.PI : 0) + Math.sin(time * speed * 1.7) * (a.trade === 'crier' ? 0.35 : 0.05);
          if (flame) flame.scale.y = 0.06 * (1 + Math.sin(time * 11) * 0.15);
        }
      },
    });
  },
});
