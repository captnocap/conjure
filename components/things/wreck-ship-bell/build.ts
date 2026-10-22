import * as THREE from 'three';
import { Sculpture, choice, clamp01, defineThing, mix, noul } from '@conjure/kit';
import { encrust, painted, stained } from './sea';

type P3 = [number, number, number];
const NAMES = { esperanza: 'ESPERANZA', star: 'NORTHERN STAR', mary: 'MARY ELLEN', providence: 'PROVIDENCE', komet: 'KOMET', atalanta: 'ATALANTA', worn: '' } as const;

export default defineThing({
  questions: {
    name: choice('What name is engraved on the bell?', {
      esperanza: 'ESPERANZA: hope, a southern trader.',
      star: 'NORTHERN STAR: a proud liner name.',
      mary: 'MARY ELLEN: a small coaster named for somebody\'s wife.',
      providence: 'PROVIDENCE: pious, old, ironic now.',
      komet: 'KOMET: a hard foreign name, a raider or a tramp.',
      atalanta: 'ATALANTA: a fast ship with a classical name.',
      worn: 'Worn away: only ghosts of letters, nobody can say who she was.',
    }),
    year: choice('What year is on it?', {
      y1898: '1898: the age of sail giving way to steam.',
      y1912: '1912: the year of the great liners.',
      y1927: '1927: between the wars.',
      y1941: '1941: wartime.',
      y1953: '1953: the last of the old cargo steamers.',
    }),
    hangs: choice('How does it hang?', {
      bracket: 'From a crooked gooseneck bracket on a torn piece of riveted bulkhead.',
      belfry: 'In a small arched belfry frame, as it stood on deck.',
      fallen: 'It does not: it lies on its side where it dropped.',
      stand: 'From a brass hook on a polished wooden stand, recovered and displayed.',
    }),
    clapper: choice('What about the clapper?', {
      rope: 'Present, with a plaited bell rope hanging from it.',
      bare: 'Present, but the rope has rotted off.',
      missing: 'Gone: the bell is mute.',
    }),
    metal: choice('What state is the bronze in?', {
      polished: 'Polished to a warm gold.',
      dull: 'Dull brown, weathered.',
      verdigris: 'Sea-green with verdigris, the lettering standing out dark.',
      encrusted: 'Green and thick with barnacles.',
    }),
    cracked: noul('Is the bell cracked?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const base = { polished: 0.02, dull: 0.5, verdigris: 0.8, encrusted: 0.85 }[a.metal];
    const amount = clamp01(base + (mood.wear - 0.5) * (a.metal === 'polished' ? 0.1 : 0.3));
    const stain = a.metal === 'dull' ? '#4a3524' : '#5fb39c';
    const bronzeBase = a.metal === 'polished' ? '#c89a3c' : '#a8782e';
    const brass = stained(random, '#c9a548', stain, amount * 0.8, { drips: a.metal !== 'dull' });
    const iron = stained(random, '#3a3d40', '#8a4a26', clamp01(0.25 + mood.wear * 0.55), { metalness: 0.3, roughness: 0.8 });
    const wood = s.material('#6b4426', { roughness: 0.6 });

    // The bell's skin: patina, two engraved rings, the name and the year.
    const text = NAMES[a.name], year = a.year.slice(1);
    const skin = painted(1024, 448, (g, w, h) => {
      g.fillStyle = bronzeBase;
      g.fillRect(0, 0, w, h);
      for (let i = 0; i < 200; i++) { g.globalAlpha = 0.05 + random() * 0.1 * (0.3 + amount); g.fillStyle = '#2a1c0c'; const r = 6 + random() * 34; g.beginPath(); g.ellipse(random() * w, random() * h, r, r * (0.4 + random()), random() * 3, 0, 7); g.fill(); }
      g.globalAlpha = amount * amount * 0.6; g.fillStyle = stain; g.fillRect(0, 0, w, h);
      for (let i = 0; i < amount * amount * 520 + amount * 80; i++) {
        const x = random() * w, y = random() * h, r = (4 + random() * random() * 34) * (0.5 + amount * 0.6);
        for (const dx of [-w, 0, w]) {
          const gradient = g.createRadialGradient(x + dx, y, 0, x + dx, y, r);
          gradient.addColorStop(0, stain); gradient.addColorStop(0.4, stain); gradient.addColorStop(1, 'rgba(0,0,0,0)');
          g.globalAlpha = 0.5 + random() * 0.4; g.fillStyle = gradient; g.beginPath(); g.arc(x + dx, y, r, 0, 7); g.fill();
          if (a.metal !== 'dull' && random() < 0.5) { g.globalAlpha = 0.3; g.fillStyle = stain; g.fillRect(x + dx - r * 0.2, y, r * 0.4, r * (2 + random() * 5)); }
        }
      }
      g.globalAlpha = 1;
      const cut = a.metal === 'polished' ? '#4a3210' : a.metal === 'dull' ? '#1f140a' : '#16302a';
      g.fillStyle = cut;
      for (const y of [h * 0.86, h * 0.83, h * 0.36, h * 0.33]) g.fillRect(0, y, w, 4);
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      const worn = a.name === 'worn';
      const shown = worn ? ['E', 'S', 'M', 'A', 'N', 'R', 'O'].sort(() => random() - 0.5).slice(0, 5).join(' ') : text;
      g.font = 'bold 70px serif';
      g.globalAlpha = worn ? 0.3 : 1;
      g.fillText(shown, w / 2, h * 0.52, 310);
      g.font = 'bold 54px serif';
      g.globalAlpha = worn ? 0.4 : 1;
      g.fillText(year, w / 2, h * 0.7, 300);
      g.globalAlpha = 1;
      if (worn || mood.wear > 0.6) {
        // Abrasion across the lettering.
        for (let i = 0; i < (worn ? 60 : 16); i++) { g.globalAlpha = 0.55; g.fillStyle = random() < 0.5 ? bronzeBase : stain; g.beginPath(); g.ellipse(w / 2 + (random() - 0.5) * 430, h * (0.45 + random() * 0.32), 8 + random() * 26, 4 + random() * 10, random() * 3, 0, 7); g.fill(); }
        g.globalAlpha = 1;
      }
      if (a.cracked) {
        g.strokeStyle = '#0c0805'; g.lineWidth = 7; g.lineJoin = 'round';
        let x = w / 2 + mix(120, 250, random()) * (random() < 0.5 ? -1 : 1), y = h;
        g.beginPath(); g.moveTo(x, y);
        while (y > h * mix(0.3, 0.5, random())) { x += (random() - 0.5) * 36; y -= 14 + random() * 22; g.lineTo(x, y); }
        g.stroke();
      }
    });
    skin.wrapS = THREE.RepeatWrapping;
    const bronze = new THREE.MeshStandardMaterial({ map: skin, metalness: 0.7 - amount * 0.5, roughness: 0.3 + amount * 0.5, side: THREE.DoubleSide });

    // Bell, built hanging below its pivot at the origin.
    const bell = new Sculpture(context);
    const drop = 0.07, tall = 0.4;
    const profile: [number, number][] = [[0.215, 0], [0.222, 0.012], [0.21, 0.035], [0.182, 0.085], [0.156, 0.16], [0.138, 0.24], [0.13, 0.3], [0.118, 0.345], [0.085, 0.38], [0.04, 0.396], [0.001, tall]];
    const body = bell.mesh(new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), 48), bronze, [0, -drop - tall, 0]);
    body.rotation.y = Math.PI; // the lettering faces forward
    const lip = bell.ring(0.216, 0.012, [0, -drop - tall + 0.008, 0], bronze.clone());
    (lip.material as THREE.MeshStandardMaterial).map = null;
    (lip.material as THREE.MeshStandardMaterial).color.set(bronzeBase).lerp(new THREE.Color(stain), amount * 0.7);
    lip.rotation.x = Math.PI / 2;
    bell.cylinder(0.03, 0.045, 0.03, [0, -drop + 0.01, 0], brass, 12);
    bell.ring(0.03, 0.011, [0, -drop + 0.045, 0], brass);
    let clapper: THREE.Group | null = null;
    if (a.clapper !== 'missing') {
      clapper = new THREE.Group();
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.012, 0.36, 8), iron);
      arm.position.y = -0.18;
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.042, 14, 10), iron);
      ball.position.y = -0.37;
      arm.castShadow = ball.castShadow = true;
      clapper.add(arm, ball);
      if (a.clapper === 'rope') {
        const cord = new THREE.MeshStandardMaterial({ color: mood.wear > 0.6 ? '#8f8a70' : '#e4dcc0', roughness: 1 });
        const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.24, 8), cord);
        rope.position.y = -0.53;
        clapper.add(rope);
        for (const [y, r] of [[-0.43, 0.022], [-0.5, 0.018], [-0.57, 0.018], [-0.655, 0.03]] as const) { const knot = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), cord); knot.position.y = y; knot.scale.y = 1.25; knot.castShadow = true; clapper.add(knot); }
        const tassel = new THREE.Mesh(new THREE.ConeGeometry(0.024, 0.07, 8), cord);
        tassel.position.y = -0.71;
        clapper.add(tassel);
      }
      clapper.position.y = -drop - 0.07;
      bell.root.add(clapper);
    }
    s.root.add(bell.root);
    const hosts: THREE.Mesh[] = [body];
    let swing = true;

    if (a.hangs === 'bracket') {
      // A torn square of bulkhead, and a gooseneck that has been knocked crooked.
      const paint = mood.warmth > 0.5 ? '#d9d4c0' : '#8f989a';
      const plateMat = stained(random, paint, '#8a4a26', clamp01(0.2 + mood.wear * 0.6), { metalness: 0.2, roughness: 0.8 });
      const outline: THREE.Vector2[] = [];
      const W = 0.78, H = 1.02;
      for (let i = 0; i <= 6; i++) outline.push(new THREE.Vector2(-W / 2 + (W * i) / 6, 0));
      for (let i = 1; i <= 6; i++) outline.push(new THREE.Vector2(W / 2 - random() * random() * 0.14, (H * i) / 6));
      for (let i = 1; i <= 6; i++) outline.push(new THREE.Vector2(W / 2 - (W * i) / 6, H - random() * random() * 0.2));
      for (let i = 1; i < 6; i++) outline.push(new THREE.Vector2(-W / 2 + random() * random() * 0.14, H - (H * i) / 6));
      const plate = s.mesh(new THREE.ExtrudeGeometry(new THREE.Shape(outline), { depth: 0.02, bevelEnabled: false }), plateMat, [0, 0, -0.26]);
      hosts.push(plate);
      const rivets: { at: P3; size: number }[] = [];
      for (const x of [-0.3, 0.3]) { for (let y = 0.07; y < 0.8; y += 0.085) rivets.push({ at: [x, y, -0.24], size: 0.013 }); s.box([0.02, 0.8, 0.08], [x, 0.4, -0.3], iron); }
      s.scatter(new THREE.SphereGeometry(1, 8, 5), s.material(paint), rivets);
      const bend = mix(0.04, 0.14, random()) * (random() < 0.5 ? -1 : 1);
      const hook: P3 = [bend, 0.86, 0.02];
      s.tube([[0, 0.72, -0.24], [bend * 0.2, 0.95, -0.2], [bend * 0.7, 1.0, -0.08], [bend, 0.95, 0.01], hook], 0.02, iron);
      s.cylinder(0.06, 0.06, 0.014, [0, 0.72, -0.235], iron, 12).rotation.x = Math.PI / 2;
      s.ring(0.026, 0.008, [hook[0], hook[1] - 0.02, hook[2]], iron).rotation.y = Math.PI / 2;
      bell.root.position.set(hook[0], hook[1] - 0.085, hook[2]);
      bell.root.rotation.z = bend * 0.5;
      s.ball([0.5, 0.06, 0.24], [0, 0, -0.2], s.material(mood.warmth > 0.5 ? '#cdb98a' : '#a8a48f', { roughness: 1 }), 16);
    } else if (a.hangs === 'belfry') {
      const post = [[0.045, 0], [0.06, 0.03], [0.04, 0.08], [0.05, 0.3], [0.036, 0.52], [0.05, 0.6], [0.04, 0.74]] as [number, number][];
      for (const x of [-1, 1]) hosts.push(s.lathe(post, wood, [x * 0.33, 0.05, 0]));
      s.box([0.9, 0.05, 0.3], [0, 0.025, 0], wood);
      // Arched headpiece.
      const arch = s.ring(0.33, 0.035, [0, 0.79, 0], wood, Math.PI);
      arch.scale.y = 0.5;
      hosts.push(arch);
      s.ball([0.05, 0.05, 0.05], [0, 0.985, 0], brass, 12);
      s.rod([0, 0.95, 0], [0, 0.86, 0], 0.012, brass);
      bell.root.position.set(0, 0.86 - 0.045, 0);
      for (const x of [-1, 1]) s.box([0.1, 0.012, 0.1], [x * 0.33, 0.056, 0], brass);
    } else if (a.hangs === 'stand') {
      s.cylinder(0.26, 0.29, 0.05, [0, 0.025, 0], wood, 32);
      s.cylinder(0.22, 0.26, 0.02, [0, 0.06, 0], wood, 32);
      s.label(text || '?', 0.2, 0.035, [0, 0.03, 0.288], '#2b2110', '#c9a548').rotation.x = -0.12;
      s.tube([[0, 0.07, -0.2], [0, 0.55, -0.22], [0, 0.78, -0.16], [0, 0.82, -0.02], [0, 0.74, 0.0]], 0.016, brass);
      s.ball([0.026, 0.026, 0.026], [0, 0.07, -0.2], brass, 10);
      bell.root.position.set(0, 0.74 - 0.045, 0);
    } else {
      swing = false;
      const sand = s.material(mood.warmth > 0.5 ? '#cdb98a' : '#a8a48f', { roughness: 1 });
      s.ball([0.4, 0.06, 0.32], [0.02, 0, 0], sand, 20);
      bell.root.rotation.set(mix(-0.2, 0.2, random()), mix(-0.5, 0.5, random()), 1.93);
      bell.root.rotation.order = 'YZX';
      bell.root.position.set(-0.26, 0.13, 0);
      if (clapper) clapper.rotation.z = -0.32;
      // The bracket it tore away from.
      s.tube([[0.25, 0.05, -0.3], [0.1, 0.09, -0.34], [-0.05, 0.06, -0.3], [-0.12, 0.05, -0.22]], 0.018, iron);
      s.cylinder(0.055, 0.055, 0.014, [0.25, 0.055, -0.3], iron, 10).rotation.z = 1.2;
    }

    if (a.metal === 'encrusted') {
      encrust(s, hosts, mix(110, 280, mood.wear) * mix(0.7, 1.2, mood.density), 0.017);
      encrust(s, hosts, 14, 0.028, ['#8c5a44', '#93784a', '#5f7350'], 'blob');
    }

    const rest = bell.root.rotation.z, energy = mood.energy;
    return s.finish({
      update: (_dt, time) => {
        if (!swing) return;
        // Struck by nobody: the bell and its clapper sway out of step.
        const swingBy = Math.sin(time * mix(0.8, 3.2, energy)) * mix(0.01, 0.16, energy * energy);
        bell.root.rotation.z = rest + swingBy;
        if (clapper) clapper.rotation.z = -swingBy * 1.7 + Math.sin(time * 4.1) * 0.02 * energy;
      },
    });
  },
});
