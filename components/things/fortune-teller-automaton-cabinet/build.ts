import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

type P3 = [number, number, number];

const HEADERS = {
  zora: 'MADAME ZORA', swami: 'THE SWAMI SPEAKS', fortune: 'YOUR FORTUNE', grandma: 'GRANDMA KNOWS', bones: 'ASK THE BONES', order: 'OUT OF ORDER',
} as const;
const CARDS = {
  none: 'No card: the tray is empty.',
  travel: 'YOU WILL TRAVEL FAR',
  stranger: 'BEWARE A STRANGER',
  lucky: 'LUCKY NUMBER 7',
  again: 'ASK AGAIN LATER',
  late: 'IT IS TOO LATE',
  blank: 'A blank card with nothing printed on it.',
} as const;

export default defineThing({
  questions: {
    figure: choice('Who is the figure in the cabinet?', {
      swami: 'A turbaned swami with a jewel, a feather and a pointed black beard.',
      grandmother: 'A grandmother in a shawl with a grey bun and round spectacles.',
      pirate: 'A pirate with a tricorn hat, an eyepatch and a bushy beard.',
      wizard: 'A wizard in a tall starry pointed hat with a long white beard.',
      skull: 'A grinning skull in a black hood.',
    }),
    face: choice('What condition is the face in?', {
      pristine: 'Pristine wax: smooth, rosy-cheeked, freshly painted.',
      peeling: 'Peeling: paint and wax flaked away to white plaster in patches.',
      cracked: 'Crazed with fine dark cracks like old porcelain.',
      following: 'Intact, but with wide glassy eyes that follow you and a head turned to look.',
    }),
    light: choice('Is the cabinet lit?', {
      lit: 'Fully lit: warm lamp inside, header bulbs chasing.',
      dark: 'Dark and unplugged.',
      ball: 'Only the crystal glows, an eerie green from below the face.',
      failing: 'One weak bulb inside, the header dead.',
    }),
    holding: choice('What are the hands over?', {
      ball: 'A crystal ball on a brass stand.',
      cards: 'A fan of tarot cards laid on the cloth.',
      bones: 'A scatter of small bones and dice.',
    }),
    header: choice('What does the cabinet header say?', HEADERS),
    card: choice('What does the last card it dispensed read?', CARDS),
    finish: choice('How is the cabinet finished?', {
      carnival: 'Carnival red with gold scrollwork.',
      green: 'Deep green lacquer with brass trim.',
      oak: 'Plain varnished oak, an older and more serious machine.',
      blue: 'Circus blue with painted stars, chipped.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const lampOn = a.light === 'lit' || a.light === 'failing';
    const headerOn = a.light === 'lit';
    const ballOn = a.light === 'lit' || a.light === 'ball';
    const paintTint = { carnival: '#a8262a', green: '#1f4a37', oak: '#8a5f36', blue: '#2a4f9a' }[a.finish];
    const paint = s.material(paintTint, { roughness: a.finish === 'oak' ? 0.6 : 0.4 });
    const gold = s.material(a.finish === 'oak' ? '#5d3d20' : '#d6a93c', { metalness: a.finish === 'oak' ? 0 : 0.7, roughness: 0.35 });
    const dark = s.material('#17151a', { roughness: 0.7 });
    const brass = s.material('#c9a040', { metalness: 0.8, roughness: 0.3 });
    const Wd = 0.84, Dp = 0.72, baseH = 0.88, caseH = 0.92, top = baseH + caseH;

    // Lower cabinet.
    s.box([Wd, baseH, Dp], [0, baseH / 2, 0], paint);
    s.box([Wd + 0.06, 0.08, Dp + 0.06], [0, 0.04, 0], gold);
    s.box([Wd + 0.05, 0.05, Dp + 0.05], [0, baseH - 0.02, 0], gold);
    s.box([Wd * 0.72, 0.42, 0.01], [0, 0.36, Dp / 2 + 0.006], gold);
    s.box([Wd * 0.66, 0.36, 0.012], [0, 0.36, Dp / 2 + 0.008], paint);
    if (a.finish === 'blue') {
      const stars: { at: P3; size: number }[] = [];
      for (let i = 0; i < 14; i++) stars.push({ at: [(random() - 0.5) * Wd * 0.6, 0.22 + random() * 0.28, Dp / 2 + 0.017], size: 0.012 + random() * 0.014 });
      s.scatter(new THREE.OctahedronGeometry(1), s.material('#f2d24a'), stars);
    } else s.label('25¢', 0.3, 0.2, [0, 0.36, Dp / 2 + 0.016], a.finish === 'oak' ? '#e8d8a8' : '#f0cf6a', paintTint);
    // Coin plate, slot and ticket tray.
    s.box([0.14, 0.18, 0.012], [0.24, 0.7, Dp / 2 + 0.007], brass);
    s.box([0.008, 0.05, 0.016], [0.24, 0.74, Dp / 2 + 0.008], dark);
    s.cylinder(0.02, 0.02, 0.02, [0.24, 0.66, Dp / 2 + 0.015], dark, 10).rotation.x = Math.PI / 2;
    s.box([0.3, 0.035, 0.012], [-0.14, 0.72, Dp / 2 + 0.007], brass);
    s.box([0.24, 0.008, 0.016], [-0.14, 0.72, Dp / 2 + 0.008], dark);
    s.box([0.3, 0.012, 0.1], [-0.14, 0.64, Dp / 2 + 0.05], brass);
    if (a.card !== 'none') {
      const text = a.card === 'blank' ? ' ' : CARDS[a.card];
      const card = s.label(text, 0.24, 0.1, [-0.14 + (random() - 0.5) * 0.03, 0.685, Dp / 2 + 0.07], '#3a2418', '#f0e2b6');
      card.rotation.x = -0.75; card.rotation.z = (random() - 0.5) * 0.2;
    }

    // Glass case: posts, panes, a curtained back and a cloth shelf.
    for (const x of [-1, 1]) for (const z of [-1, 1]) s.box([0.05, caseH, 0.05], [x * (Wd / 2 - 0.025), baseH + caseH / 2, z * (Dp / 2 - 0.025)], paint);
    const glass = new THREE.MeshPhysicalMaterial({ color: '#dff0f2', transparent: true, opacity: 0.13, roughness: 0.05, depthWrite: false });
    const front = s.box([Wd - 0.1, caseH, 0.006], [0, baseH + caseH / 2, Dp / 2 - 0.02], glass); front.castShadow = false;
    for (const x of [-1, 1]) { const pane = s.box([0.006, caseH, Dp - 0.1], [x * (Wd / 2 - 0.02), baseH + caseH / 2, 0], glass); pane.castShadow = false; }
    const curtainTint = a.figure === 'skull' ? '#2a1c33' : mood.warmth > 0.5 ? '#6a1f2a' : '#2c2f5a';
    const cc = document.createElement('canvas'); cc.width = cc.height = 128; const cx = cc.getContext('2d')!;
    cx.fillStyle = curtainTint; cx.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 16; i++) { cx.fillStyle = i % 2 ? 'rgba(0,0,0,0.22)' : 'rgba(255,255,255,0.07)'; cx.fillRect(i * 8, 0, 4, 128); }
    cx.fillStyle = '#e6c85a'; for (let i = 0; i < 18; i++) { cx.beginPath(); cx.arc(random() * 128, random() * 128, 1.5 + random() * 2, 0, 6.3); cx.fill(); }
    const curtain = new THREE.CanvasTexture(cc); curtain.colorSpace = THREE.SRGBColorSpace;
    s.box([Wd - 0.08, caseH, 0.02], [0, baseH + caseH / 2, -Dp / 2 + 0.03], s.material('#ffffff', { map: curtain, roughness: 0.9, emissive: '#ffffff', emissiveMap: curtain, emissiveIntensity: lampOn ? 0.35 : 0 }));
    const clothY = baseH + 0.12;
    s.box([Wd - 0.1, 0.12, Dp * 0.42], [0, baseH + 0.06, Dp * 0.25], s.material(a.figure === 'skull' ? '#3a2a48' : '#5a2a6a', { roughness: 0.95 }));
    s.box([Wd - 0.09, 0.012, Dp * 0.43], [0, clothY, Dp * 0.25], gold);

    // Roof and header sign with bulbs.
    s.box([Wd + 0.03, 0.04, Dp + 0.03], [0, top + 0.02, 0], gold);
    const headH = 0.3;
    s.box([Wd, headH, 0.14], [0, top + 0.06 + headH / 2, Dp / 2 - 0.1], paint);
    const arch = s.cylinder(Wd * 0.36, Wd * 0.36, 0.14, [0, top + 0.06 + headH, Dp / 2 - 0.1], paint, 24, );
    arch.rotation.x = Math.PI / 2; arch.scale.y = 1; arch.scale.z = 0.45;
    const sign = s.label(HEADERS[a.header], Wd * 0.9, headH * 0.62, [0, top + 0.06 + headH * 0.5, Dp / 2 - 0.028], a.header === 'order' ? '#2a2420' : '#5a1a10', a.header === 'order' ? '#d8cfb8' : '#f6dc8a');
    const signMat = sign.material as THREE.MeshStandardMaterial;
    signMat.emissive = new THREE.Color('#ffffff'); signMat.emissiveMap = signMat.map; signMat.emissiveIntensity = headerOn ? mix(0.45, 0.9, mood.cheer) : 0;
    if (a.header === 'order') sign.rotation.z = -0.05;
    const bulbOn = new THREE.MeshStandardMaterial({ color: '#fff2c0', emissive: '#ffc850', emissiveIntensity: headerOn ? 1.8 : 0, roughness: 0.4 });
    const bulbs: { at: P3; size: number; color: string }[] = [];
    const nb = 11;
    for (let i = 0; i < nb; i++) {
      const missing = random() < mood.wear * 0.4;
      bulbs.push({ at: [-Wd / 2 + 0.04 + (i / (nb - 1)) * (Wd - 0.08), top + 0.1, Dp / 2 - 0.02], size: 0.022, color: missing ? '#3a3630' : '#ffffff' });
    }
    for (let i = 0; i < 7; i++) {
      const t = Math.PI * (i + 0.5) / 7;
      bulbs.push({ at: [Math.cos(t) * Wd * 0.34, top + 0.06 + headH + Math.sin(t) * Wd * 0.34 * 0.45, Dp / 2 - 0.02], size: 0.022, color: '#ffffff' });
    }
    s.scatter(new THREE.SphereGeometry(1, 8, 6), bulbOn, bulbs);
    // Interior lamp.
    const lamp = new THREE.MeshStandardMaterial({ color: '#fff0c4', emissive: '#ffd27a', emissiveIntensity: a.light === 'lit' ? 2.2 : a.light === 'failing' ? 0.9 : 0, roughness: 0.4 });
    s.ball([0.035, 0.045, 0.035], [0.12, top - 0.07, 0.12], lamp, 10);
    s.cylinder(0.02, 0.02, 0.03, [0.12, top - 0.02, 0.12], brass, 8);

    // The figure.
    const skull = a.figure === 'skull';
    const robeTint = { swami: '#7a2f8a', grandmother: '#5a6a4a', pirate: '#2f3440', wizard: '#283a7a', skull: '#151318' }[a.figure];
    const robe = s.material(robeTint, { roughness: 0.9 });
    const fz = -0.03, shoulderY = baseH + 0.5;
    s.cylinder(0.15, 0.25, 0.46, [0, baseH + 0.25, fz], robe, 18);
    s.ball([0.25, 0.1, 0.15], [0, shoulderY - 0.02, fz], robe, 16);
    const skinTint = skull ? '#e6dfc8' : a.figure === 'swami' ? '#c98f62' : a.figure === 'pirate' ? '#c9906a' : '#e8c2a0';
    const hc = document.createElement('canvas'); hc.width = 512; hc.height = 256; const hx = hc.getContext('2d')!;
    hx.fillStyle = skinTint; hx.fillRect(0, 0, 512, 256);
    const fx = 128, fy = 128;
    if (!skull) {
      for (const sgn of [-1, 1]) {
        const g = hx.createRadialGradient(fx + sgn * 34, fy + 22, 0, fx + sgn * 34, fy + 22, 20);
        g.addColorStop(0, 'rgba(214,80,80,0.75)'); g.addColorStop(1, 'rgba(214,80,80,0)');
        hx.fillStyle = g; hx.fillRect(fx + sgn * 34 - 22, fy, 44, 44);
      }
      hx.strokeStyle = '#8a1a22'; hx.lineWidth = 6; hx.lineCap = 'round';
      hx.beginPath(); hx.moveTo(fx - 16, fy + 50); hx.quadraticCurveTo(fx, fy + (mood.cheer > 0.4 ? 60 : 46), fx + 16, fy + 50); hx.stroke();
    } else {
      hx.fillStyle = '#1a1612';
      hx.beginPath(); hx.moveTo(fx - 8, fy + 26); hx.lineTo(fx, fy + 6); hx.lineTo(fx + 8, fy + 26); hx.fill();
      hx.fillRect(fx - 34, fy + 40, 68, 22);
      hx.fillStyle = '#efe8d2';
      for (let i = 0; i < 6; i++) { hx.fillRect(fx - 32 + i * 11, fy + 41, 8, 9); hx.fillRect(fx - 32 + i * 11, fy + 52, 8, 9); }
    }
    if (a.face === 'peeling') for (let i = 0; i < 9; i++) {
      const px = fx + (random() - 0.5) * 150, py = 40 + random() * 180, r = 10 + random() * 22;
      hx.beginPath();
      for (let k = 0; k < 9; k++) { const t = (k / 9) * 6.283, rr = r * (0.6 + random() * 0.6); if (k) hx.lineTo(px + Math.cos(t) * rr, py + Math.sin(t) * rr); else hx.moveTo(px + Math.cos(t) * rr, py + Math.sin(t) * rr); }
      hx.closePath(); hx.fillStyle = '#f4f1ea'; hx.fill(); hx.strokeStyle = 'rgba(70,50,36,0.8)'; hx.lineWidth = 2; hx.stroke();
    }
    if (a.face === 'cracked' || a.face === 'peeling') {
      hx.strokeStyle = 'rgba(40,28,20,0.85)'; hx.lineWidth = 1.6;
      for (let i = 0; i < (a.face === 'cracked' ? 16 : 5); i++) {
        let px = fx + (random() - 0.5) * 170, py = 20 + random() * 200;
        hx.beginPath(); hx.moveTo(px, py);
        for (let k = 0; k < 6; k++) { px += (random() - 0.5) * 36; py += 8 + random() * 22; hx.lineTo(px, py); }
        hx.stroke();
      }
    }
    for (let i = 0; i < mood.wear * 60; i++) { hx.fillStyle = 'rgba(70,60,48,0.25)'; hx.beginPath(); hx.arc(random() * 512, random() * 256, 2 + random() * 6, 0, 6.3); hx.fill(); }
    const headMap = new THREE.CanvasTexture(hc); headMap.colorSpace = THREE.SRGBColorSpace;
    const wax = s.material('#ffffff', { map: headMap, roughness: a.face === 'pristine' || a.face === 'following' ? 0.28 : 0.6 });
    const head = new THREE.Group();
    head.position.set(0, shoulderY + 0.14, fz + 0.05);
    s.root.add(head);
    const add = <T extends THREE.Object3D>(m: T, g: THREE.Object3D = head) => { g.add(m); return m; };
    add(s.cylinder(0.04, 0.05, 0.1, [0, -0.1, -0.01], wax, 10));
    add(s.ball([0.1, 0.125, 0.105], [0, 0, 0], wax, 24));
    if (!skull) add(s.mesh(new THREE.ConeGeometry(0.02, 0.055, 6), wax, [0, -0.005, 0.105])).rotation.x = 0.35;
    const follow = a.face === 'following';
    const eyeWhite = s.material('#f6f3ea', { roughness: 0.1 });
    const pupilMat = new THREE.MeshStandardMaterial({ color: follow ? '#1a8a5a' : '#2a1a10', emissive: follow ? '#2aff9a' : '#000000', emissiveIntensity: follow ? 0.7 : 0, roughness: 0.1 });
    for (const side of [-1, 1]) {
      if (a.figure === 'pirate' && side === 1) {
        add(s.ball([0.03, 0.03, 0.012], [0.04, 0.025, 0.09], dark, 10));
        add(s.box([0.21, 0.012, 0.004], [0, 0.045, 0.093], dark)).rotation.z = -0.25;
        continue;
      }
      if (skull) { add(s.ball([0.03, 0.034, 0.02], [side * 0.04, 0.025, 0.086], dark, 12)); if (follow || ballOn) add(s.ball([0.008, 0.008, 0.008], [side * 0.04, 0.025, 0.1], pupilMat, 8)); continue; }
      const big = follow ? 1.3 : 1;
      add(s.ball([0.02 * big, 0.016 * big, 0.012], [side * 0.04, 0.025, 0.09], eyeWhite, 12));
      add(s.ball([0.009 * big, 0.009 * big, 0.006], [side * 0.04 + (follow ? 0.004 : 0), 0.025, 0.1], pupilMat, 8));
      const brow = add(s.box([0.04, 0.008, 0.008], [side * 0.04, 0.052, 0.093], s.material(a.figure === 'grandmother' || a.figure === 'wizard' ? '#d9d6cf' : '#221812')));
      brow.rotation.z = side * (follow ? -0.3 : 0.12);
    }
    const hairWhite = s.material('#e4e1d8', { roughness: 0.95 }), hairBlack = s.material('#1c1612', { roughness: 0.95 });
    if (a.figure === 'swami') {
      const turban = s.material(mood.cheer > 0.5 ? '#e0a020' : '#b8862a', { roughness: 0.7 });
      add(s.ball([0.125, 0.085, 0.125], [0, 0.09, -0.01], turban, 16));
      add(s.mesh(new THREE.TorusGeometry(0.095, 0.035, 8, 20), turban, [0, 0.075, -0.01])).rotation.x = Math.PI / 2 + 0.2;
      add(s.ball([0.022, 0.028, 0.014], [0, 0.085, 0.115], new THREE.MeshStandardMaterial({ color: '#d0203a', emissive: '#ff2040', emissiveIntensity: lampOn ? 0.8 : 0.1, roughness: 0.1 }), 8));
      add(s.mesh(new THREE.ConeGeometry(0.018, 0.14, 5), s.material('#f2f0e6'), [0, 0.17, 0.09]));
      add(s.mesh(new THREE.ConeGeometry(0.045, 0.11, 8), hairBlack, [0, -0.13, 0.07])).rotation.x = Math.PI;
      for (const side of [-1, 1]) add(s.rod([side * 0.005, -0.04, 0.1], [side * 0.06, -0.055, 0.085], 0.008, hairBlack, 0.003));
    } else if (a.figure === 'grandmother') {
      add(s.ball([0.108, 0.1, 0.11], [0, 0.03, -0.02], hairWhite, 14));
      add(s.ball([0.05, 0.05, 0.05], [0, 0.12, -0.05], hairWhite, 10));
      for (const side of [-1, 1]) add(s.mesh(new THREE.TorusGeometry(0.026, 0.004, 6, 16), brass, [side * 0.04, 0.025, 0.1]));
      add(s.box([0.03, 0.004, 0.004], [0, 0.03, 0.104], brass));
      const shawl = s.mesh(new THREE.ConeGeometry(0.28, 0.24, 14, 1, true), s.material('#8a3a4a', { roughness: 0.95, side: THREE.DoubleSide }), [0, shoulderY - 0.03, fz]);
      shawl.scale.z = 0.7;
    } else if (a.figure === 'pirate') {
      const felt = s.material('#1d1a1e', { roughness: 0.7 });
      const brim = add(s.mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.02, 3), felt, [0, 0.1, -0.01])); brim.rotation.y = Math.PI;
      add(s.ball([0.1, 0.07, 0.1], [0, 0.11, -0.01], felt, 12));
      add(s.ball([0.02, 0.02, 0.01], [0, 0.12, 0.09], eyeWhite, 8));
      add(s.ball([0.09, 0.085, 0.06], [0, -0.075, 0.055], hairBlack, 12));
      add(s.ball([0.105, 0.06, 0.1], [0, 0.07, -0.01], s.material('#b02a2a'), 12));
    } else if (a.figure === 'wizard') {
      const hat = s.material('#2a3a8a', { roughness: 0.8 });
      const cone = add(s.mesh(new THREE.ConeGeometry(0.1, 0.25, 16), hat, [0, 0.2, -0.01])); cone.rotation.z = 0.08;
      add(s.cylinder(0.16, 0.16, 0.012, [0, 0.08, -0.01], hat, 20));
      const stars: { at: P3; size: number }[] = [];
      for (let i = 0; i < 9; i++) { const t = random() * 6.283, h = random() * 0.17; stars.push({ at: [Math.sin(t) * (0.1 - h * 0.4), 0.1 + h, Math.cos(t) * (0.1 - h * 0.4) - 0.01], size: 0.008 + random() * 0.006 }); }
      add(s.scatter(new THREE.OctahedronGeometry(1), s.material('#f2d24a', { emissive: '#f2d24a', emissiveIntensity: 0.3 }), stars));
      add(s.mesh(new THREE.ConeGeometry(0.075, 0.26, 10), hairWhite, [0, -0.19, 0.06])).rotation.x = Math.PI;
      add(s.ball([0.085, 0.05, 0.05], [0, -0.065, 0.07], hairWhite, 10));
    } else {
      const hood = add(s.mesh(new THREE.SphereGeometry(0.14, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.62), s.material('#151318', { roughness: 0.95, side: THREE.DoubleSide }), [0, 0.0, -0.035]));
      hood.rotation.x = -0.95;
    }

    // Arms reaching forward to the prop.
    const propAt: P3 = [0, clothY + 0.02, Dp * 0.24];
    const handMat = skull ? s.material('#e6dfc8') : wax;
    for (const side of [-1, 1]) {
      const sh: P3 = [side * 0.21, shoulderY - 0.03, fz], el: P3 = [side * 0.27, clothY + 0.14, 0.04], hd: P3 = [side * 0.105, clothY + 0.1, propAt[2] + 0.01];
      s.rod(sh, el, 0.055, robe, 0.05); s.ball([0.052, 0.052, 0.052], el, robe, 10); s.rod(el, hd, 0.05, robe, 0.035);
      s.ball([0.04, 0.022, 0.05], [hd[0] - side * 0.02, hd[1], hd[2] + 0.02], handMat, 10);
      for (let f = 0; f < 4; f++) s.rod([hd[0] - side * 0.02 + (f - 1.5) * 0.014, hd[1], hd[2] + 0.05], [hd[0] - side * (0.03 + f * 0.004) + (f - 1.5) * 0.016, hd[1] - 0.03, hd[2] + 0.1], 0.007, handMat, 0.005);
    }
    const ballGlow = new THREE.MeshStandardMaterial({ color: '#bfeee0', emissive: a.light === 'ball' ? '#3aff9a' : '#9ad8ff', emissiveIntensity: ballOn ? (a.light === 'ball' ? 2.2 : 1.1) : 0.05, roughness: 0.05, transparent: false });
    if (a.holding === 'ball') {
      s.cylinder(0.035, 0.055, 0.035, [propAt[0], propAt[1] + 0.012, propAt[2]], brass, 14);
      s.ball([0.075, 0.075, 0.075], [propAt[0], propAt[1] + 0.095, propAt[2]], ballGlow, 20);
    } else if (a.holding === 'cards') {
      for (let i = 0; i < 6; i++) {
        const cardMesh = s.box([0.05, 0.003, 0.08], [(i - 2.5) * 0.045, propAt[1] + i * 0.0015, propAt[2] + 0.07 - Math.abs(i - 2.5) * 0.012], s.material(i === 3 ? '#1a1a22' : '#f0e6c8', { emissive: '#f0e6c8', emissiveIntensity: lampOn ? 0.15 : 0 }));
        cardMesh.rotation.y = -(i - 2.5) * 0.22;
        if (i !== 3) { const pip = s.box([0.02, 0.004, 0.03], [(i - 2.5) * 0.045, propAt[1] + i * 0.0015 + 0.001, propAt[2] + 0.07 - Math.abs(i - 2.5) * 0.012], s.material(['#b02a2a', '#2a4f9a', '#d6a93c'][i % 3])); pip.rotation.y = cardMesh.rotation.y; }
      }
      s.ball([0.03, 0.03, 0.03], [0.26, propAt[1] + 0.03, propAt[2] + 0.02], ballGlow, 12);
    } else {
      const bone = s.material('#e9e2cc', { roughness: 0.6 });
      for (let i = 0; i < 7; i++) {
        const bx = (random() - 0.5) * 0.24, bz = propAt[2] + 0.02 + random() * 0.1, t = random() * 3;
        s.rod([bx, propAt[1] + 0.008, bz], [bx + Math.cos(t) * 0.05, propAt[1] + 0.008, bz + Math.sin(t) * 0.03], 0.006, bone);
        s.ball([0.009, 0.009, 0.009], [bx, propAt[1] + 0.008, bz], bone, 6);
      }
      for (let i = 0; i < 2; i++) s.box([0.022, 0.022, 0.022], [-0.05 + i * 0.09, propAt[1] + 0.011, propAt[2] + 0.11], s.material('#f4f0e4')).rotation.y = random();
      s.ball([0.03, 0.03, 0.03], [0.26, propAt[1] + 0.03, propAt[2] + 0.02], ballGlow, 12);
    }

    const restY = follow ? 0.5 : (random() - 0.5) * 0.3;
    head.rotation.set(follow ? 0.12 : 0.08, restY, follow ? 0.1 : 0);
    const active = a.light !== 'dark', phase = random() * 9;
    const failing = a.light === 'failing';
    return s.finish({
      update: (_dt, time) => {
        if (!active && !follow) return;
        const t = time * mix(0.25, 1.4, mood.energy) + phase;
        head.rotation.y = follow ? 0.5 + Math.sin(t * 0.5) * 0.15 : restY + Math.sin(t) * 0.5 * (active ? 1 : 0);
        if (active) head.rotation.x = 0.08 + Math.max(0, Math.sin(t * 2.3)) * 0.1;
        if (ballOn) ballGlow.emissiveIntensity = (a.light === 'ball' ? 2.2 : 1.1) * (0.8 + 0.2 * Math.sin(t * 3));
        if (failing) lamp.emissiveIntensity = Math.sin(t * 13) + Math.sin(t * 31) > 0.9 ? 0.15 : 0.9;
        if (headerOn) bulbOn.emissiveIntensity = 1.3 + 0.7 * Math.sin(t * 6);
      },
    });
  },
});
