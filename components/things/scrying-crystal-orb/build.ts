import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

export default defineThing({
  questions: {
    vision: choice('What does the orb show?', {
      face: 'A pale face with hollow eyes, turned toward the viewer.',
      storm: 'A black thunderhead split by a fork of lightning.',
      city: 'A distant city of thin towers under a moon.',
      fire: 'Flames climbing, a burning to come.',
      skull: 'A grinning skull: the worst omen.',
      nothing: 'Nothing at all, only slow curling mist.',
    }),
    state: choice('What condition is the glass in?', {
      clear: 'Clear and bright; the image is sharp.',
      clouded: 'Clouded: milk-white fog smothers most of the image.',
      cracked: 'Cracked: black fractures run across it and a chip lies beside the stand.',
      dark: 'Gone dark: nearly black glass with only an ember of the image left.',
    }),
    tint: choice('What colour is its light?', {
      moon: 'Cool moon blue.',
      violet: 'Deep violet.',
      witch: 'Sickly witchfire green.',
      rose: 'Warm rose and gold.',
      smoke: 'Smoky grey-amber, like old quartz.',
    }),
    stand: choice('What holds the sphere?', {
      claws: 'A brass stand of four talons gripping the glass.',
      serpent: 'A dark metal serpent coiled beneath it, its head rearing alongside.',
      cushion: 'A tasselled velvet cushion with a small brass ring.',
      tripod: 'A tall thin silver tripod topped with crescent moons.',
    }),
    cloth: noul('Is a silk cover cloth half pulled off it?'),
    around: choice('What lies around the foot of it?', {
      nothing: 'Nothing; it stands alone.',
      cards: 'A fan of fortune cards, one turned face up.',
      coins: 'A little pile of coins left by a client.',
      candles: 'Low candle stubs burning in a ring.',
      runes: 'Scattered rune stones with glowing marks.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const tint = { moon: '#7fb4ff', violet: '#9a5cf0', witch: '#7fe05a', rose: '#ff9a8a', smoke: '#d8b27a' }[a.tint];
    const deep = { moon: '#0f1f4a', violet: '#22104a', witch: '#0f2f1a', rose: '#4a1a2a', smoke: '#2f261c' }[a.tint];
    const R = 0.12;

    // The vision is painted twice around the sphere so it shows from either side.
    const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 512;
    const g = canvas.getContext('2d')!;
    const dark = a.state === 'dark';
    const sky = g.createLinearGradient(0, 0, 0, 512); sky.addColorStop(0, dark ? '#0a0a0e' : deep); sky.addColorStop(0.55, dark ? '#16141c' : tint); sky.addColorStop(1, dark ? '#050507' : deep);
    g.fillStyle = sky; g.fillRect(0, 0, 1024, 512);
    const swirl = (count: number, alpha: number, colour: string, width: number) => {
      g.strokeStyle = colour; g.lineCap = 'round';
      for (let i = 0; i < count; i++) { g.globalAlpha = alpha * (0.4 + random() * 0.6); g.lineWidth = width * (0.4 + random()); const x = random() * 1024, y = 60 + random() * 392, len = 120 + random() * 260, bend = (random() - 0.5) * 120; for (const dx of [-1024, 0, 1024]) { g.beginPath(); g.moveTo(x + dx, y); g.bezierCurveTo(x + dx + len * 0.3, y + bend, x + dx + len * 0.7, y - bend, x + dx + len, y + bend * 0.4); g.stroke(); } }
      g.globalAlpha = 1;
    };
    swirl(14, 0.35, '#ffffff', 26);
    const ink = dark ? '#3a2a2a' : '#0c0b12', pale = dark ? '#5a4a44' : '#f6f2e6';
    for (const cx of [256, 768]) {
      const cy = 210;
      if (a.vision === 'face') {
        g.fillStyle = pale; g.beginPath(); g.ellipse(cx, cy, 92, 124, 0, 0, 7); g.fill();
        g.fillStyle = ink; for (const side of [-1, 1]) { g.beginPath(); g.ellipse(cx + side * 38, cy - 22, 24, 17, side * 0.15, 0, 7); g.fill(); }
        g.beginPath(); g.ellipse(cx, cy + 62, 24, 15 + mood.energy * 14, 0, 0, 7); g.fill(); g.fillRect(cx - 5, cy + 4, 10, 26);
      } else if (a.vision === 'storm') {
        g.fillStyle = ink; for (let i = 0; i < 9; i++) { g.beginPath(); g.arc(cx - 150 + i * 38, cy - 90 + Math.sin(i * 1.7) * 26, 62, 0, 7); g.fill(); }
        g.strokeStyle = '#fff8c0'; g.lineWidth = 12; g.lineJoin = 'miter'; g.beginPath(); g.moveTo(cx - 10, cy - 60); g.lineTo(cx - 50, cy + 20); g.lineTo(cx, cy + 10); g.lineTo(cx - 40, cy + 110); g.lineTo(cx + 40, cy - 10); g.lineTo(cx - 6, cy); g.lineTo(cx + 30, cy - 60); g.stroke();
        g.strokeStyle = ink; g.lineWidth = 4; for (let i = 0; i < 26; i++) { const x = cx - 180 + random() * 360, y = cy + random() * 160; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 10, y + 30); g.stroke(); }
      } else if (a.vision === 'city') {
        g.fillStyle = pale; g.beginPath(); g.arc(cx + 80, cy - 90, 40, 0, 7); g.fill();
        g.fillStyle = ink; for (let i = 0; i < 11; i++) { const x = cx - 180 + i * 34, h = 60 + random() * 170, w = 22 + random() * 10; g.fillRect(x, cy + 130 - h, w, h); g.beginPath(); g.moveTo(x - 4, cy + 130 - h); g.lineTo(x + w / 2, cy + 130 - h - 30 - random() * 40); g.lineTo(x + w + 4, cy + 130 - h); g.fill(); }
        g.fillRect(cx - 220, cy + 124, 440, 60);
        g.fillStyle = '#ffd86a'; for (let i = 0; i < 26; i++) g.fillRect(cx - 176 + Math.floor(random() * 11) * 34 + 6, cy + 20 + random() * 96, 7, 9);
      } else if (a.vision === 'fire') {
        for (const [colour, scale] of [['#d8301a', 1], ['#ff8a1e', 0.72], ['#ffe26a', 0.42]] as const) { g.fillStyle = dark ? '#5a2a1a' : colour; g.beginPath(); g.moveTo(cx - 150 * scale, cy + 150); for (let i = 0; i <= 6; i++) { const x = cx - 150 * scale + i * 50 * scale; g.quadraticCurveTo(x - 30 * scale, cy + 150 - (i % 2 ? 300 : 190) * scale * (0.8 + random() * 0.4), x + 25 * scale, cy + 150 - 40 * scale); } g.lineTo(cx + 150 * scale, cy + 150); g.fill(); }
      } else if (a.vision === 'skull') {
        g.fillStyle = pale; g.beginPath(); g.ellipse(cx, cy - 26, 100, 96, 0, 0, 7); g.fill(); g.fillRect(cx - 58, cy + 30, 116, 74);
        g.fillStyle = ink; for (const side of [-1, 1]) { g.beginPath(); g.ellipse(cx + side * 42, cy - 22, 28, 30, 0, 0, 7); g.fill(); }
        g.beginPath(); g.moveTo(cx, cy + 10); g.lineTo(cx - 14, cy + 44); g.lineTo(cx + 14, cy + 44); g.fill();
        for (let i = 0; i < 6; i++) g.fillRect(cx - 50 + i * 20, cy + 62, 5, 42); g.fillRect(cx - 58, cy + 78, 116, 5);
      }
    }
    swirl(10, 0.3, tint, 14);
    if (a.state === 'clouded') { swirl(60, 0.55, '#f2f2ee', 46); g.globalAlpha = 0.35; g.fillStyle = '#f2f2ee'; g.fillRect(0, 0, 1024, 512); g.globalAlpha = 1; }
    if (a.state === 'cracked') {
      g.strokeStyle = '#08080a'; g.lineJoin = 'miter';
      for (const ox of [200 + random() * 100, 700 + random() * 100]) for (let k = 0; k < 6; k++) { let x = ox, y = 200 + random() * 60, t = k / 6 * 6.283 + random(); g.lineWidth = 7; g.beginPath(); g.moveTo(x, y); for (let j = 0; j < 6; j++) { t += (random() - 0.5) * 1.1; x += Math.cos(t) * 46; y += Math.sin(t) * 40; g.lineTo(x, y); } g.stroke(); g.strokeStyle = '#ffffff'; g.lineWidth = 2; g.stroke(); g.strokeStyle = '#08080a'; }
    }
    const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace; map.wrapS = THREE.RepeatWrapping;
    const cy = { claws: 0.27, serpent: 0.25, cushion: 0.2, tripod: 0.42 }[a.stand];
    const inner = s.mesh(new THREE.SphereGeometry(R, 40, 24), new THREE.MeshStandardMaterial({ map, emissive: '#ffffff', emissiveMap: map, emissiveIntensity: dark ? 0.12 : a.state === 'clouded' ? 0.3 : mix(0.4, 0.8, mood.cheer), roughness: 0.15 }), [0, cy, 0]);
    inner.rotation.y = random() * 6.283;
    s.mesh(new THREE.SphereGeometry(R * 1.035, 32, 20), new THREE.MeshPhysicalMaterial({ color: '#ffffff', transparent: true, opacity: 0.16, roughness: 0, depthWrite: false }), [0, cy, 0]);
    if (a.state === 'cracked') { const t = random() * 6.283; const chip = s.mesh(new THREE.TetrahedronGeometry(0.03), s.material('#dfeaf2', { roughness: 0.1, emissive: tint, emissiveIntensity: 0.3 }), [Math.cos(t) * 0.21, 0.012, Math.sin(t) * 0.21]); chip.rotation.set(0.6, random() * 3, 0.2); chip.scale.y = 0.5; for (let i = 0; i < 4; i++) s.mesh(new THREE.TetrahedronGeometry(0.01), s.material('#dfeaf2', { roughness: 0.1 }), [Math.cos(t + i * 0.3 - 0.4) * (0.19 + random() * 0.07), 0.006, Math.sin(t + i * 0.3 - 0.4) * (0.19 + random() * 0.07)]); }

    // Stands.
    const brass = s.material('#c49a44', { metalness: 0.75, roughness: 0.35 });
    if (a.stand === 'claws') {
      s.lathe([[0, 0], [0.13, 0], [0.135, 0.015], [0.1, 0.03], [0.05, 0.045], [0.035, 0.08], [0.05, 0.1], [0.03, 0.12], [0, 0.125]], brass);
      for (let i = 0; i < 4; i++) {
        const t = i * Math.PI / 2 + 0.6, cx = Math.cos(t), cz = Math.sin(t), r = R + 0.012;
        const pts: [number, number, number][] = [[cx * 0.03, 0.1, cz * 0.03]];
        for (let k = 0; k <= 5; k++) { const p = -1.25 + k * 0.33; pts.push([cx * Math.cos(p) * r, cy + Math.sin(p) * r, cz * Math.cos(p) * r]); }
        s.tube(pts, 0.012, brass);
        const end = pts[pts.length - 1], talon = s.mesh(new THREE.ConeGeometry(0.012, 0.05, 8), brass, [end[0] * 0.93, end[1] + 0.018, end[2] * 0.93]);
        talon.lookAt(0, cy + 0.02, 0); talon.rotateX(Math.PI / 2);
        s.ball([0.017, 0.017, 0.017], [pts[3][0], pts[3][1], pts[3][2]], brass, 8);
      }
    } else if (a.stand === 'serpent') {
      const scale = s.material('#2e3a34', { metalness: 0.6, roughness: 0.4 });
      const pts: [number, number, number][] = [];
      for (let i = 0; i <= 40; i++) { const t = i / 40, ang = t * 6.283 * 2.6, r = mix(0.15, 0.085, t); pts.push([Math.cos(ang) * r, 0.022 + t * 0.11, Math.sin(ang) * r]); }
      const last = pts[pts.length - 1], la = Math.atan2(last[2], last[0]);
      for (let k = 1; k <= 5; k++) { const ang = la + k * 0.22, r = R + 0.03; pts.push([Math.cos(ang) * r * (1 + k * 0.02), 0.132 + k * 0.045, Math.sin(ang) * r * (1 + k * 0.02)]); }
      s.tube(pts, 0.022, scale);
      const tip = pts[pts.length - 1], head = s.ball([0.03, 0.022, 0.045], [tip[0], tip[1] + 0.01, tip[2]], scale, 12);
      head.lookAt(0, cy + 0.02, 0);
      for (const side of [-1, 1]) { const eye = s.ball([0.007, 0.007, 0.007], [0, 0, 0], s.material('#ffd23a', { emissive: '#ffb800', emissiveIntensity: 1.5 }), 6); head.add(eye); eye.position.set(side * 0.7, 0.5, 0.5); eye.scale.set(0.25, 0.33, 0.17); }
      s.cylinder(0.02, 0.006, 0.07, [pts[0][0], 0.02, pts[0][2]], scale, 8).rotation.set(Math.PI / 2, 0, 0);
    } else if (a.stand === 'cushion') {
      const velvet = s.material({ moon: '#28346a', violet: '#4a2466', witch: '#274a30', rose: '#7a2438', smoke: '#5a4630' }[a.tint], { roughness: 0.95 });
      s.ball([0.2, 0.07, 0.2], [0, 0.065, 0], velvet, 20);
      for (const x of [-1, 1]) for (const z of [-1, 1]) { s.ball([0.03, 0.025, 0.03], [x * 0.14, 0.05, z * 0.14], velvet, 8); s.mesh(new THREE.ConeGeometry(0.018, 0.06, 8), brass, [x * 0.175, 0.03, z * 0.175]).rotation.set(z * 0.9, 0, -x * 0.9); }
      s.ring(0.07, 0.012, [0, 0.115, 0], brass).rotation.x = Math.PI / 2;
    } else {
      const silver = s.material('#c8ccd2', { metalness: 0.8, roughness: 0.25 });
      s.ring(R * 0.82, 0.008, [0, cy - R * 0.6, 0], silver).rotation.x = Math.PI / 2;
      for (let i = 0; i < 3; i++) {
        const t = i * 2.094 + 0.4, cx = Math.cos(t), cz = Math.sin(t);
        s.rod([cx * 0.17, 0, cz * 0.17], [cx * R * 0.82, cy - R * 0.6, cz * R * 0.82], 0.008, silver);
        s.rod([cx * R * 0.82, cy - R * 0.6, cz * R * 0.82], [cx * (R + 0.03), cy + 0.03, cz * (R + 0.03)], 0.006, silver);
        const moon = s.ring(0.022, 0.006, [cx * (R + 0.03), cy + 0.05, cz * (R + 0.03)], silver, 4.2); moon.rotation.set(0, -t + Math.PI / 2, 2.6);
        s.ball([0.014, 0.008, 0.014], [cx * 0.17, 0.006, cz * 0.17], silver, 8);
      }
      s.ring(0.1, 0.005, [0, 0.14, 0], silver).rotation.x = Math.PI / 2;
    }

    if (a.cloth) {
      const silk = s.material({ moon: '#3a2a6a', violet: '#1f1f2a', witch: '#4a1f3a', rose: '#2a3a5a', smoke: '#6a1f24' }[a.tint], { roughness: 0.5, side: THREE.DoubleSide });
      const yaw = random() * 6.283;
      const shell = s.mesh(new THREE.SphereGeometry(R * 1.08, 28, 12, 0, Math.PI * 1.05, 0, Math.PI * 0.5), silk, [0, cy, 0]); shell.rotation.y = yaw;
      const skirt = new THREE.CylinderGeometry(R * 1.08, R * 1.75, cy, 44, 6, true, -Math.PI / 2, Math.PI * 1.05), pos = skirt.attributes.position;
      for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), z = pos.getZ(i), down = 0.5 - pos.getY(i) / cy, ang = Math.atan2(z, x), k = 1 + Math.sin(ang * 11 + down * 2) * 0.09 * down + down * down * 0.12 * Math.sin(ang * 3); pos.setX(i, x * k); pos.setZ(i, z * k); }
      skirt.computeVertexNormals();
      s.mesh(skirt, silk, [0, cy / 2, 0]).rotation.y = yaw;
    }

    // Around the foot.
    const flames: THREE.Mesh[] = [];
    const count = 3 + Math.round(mood.density * 5);
    if (a.around === 'cards') {
      const start = random() * 6.283;
      for (let i = 0; i < count + 2; i++) {
        const t = start + i * 0.24, d = 0.27, up = i === count + 1;
        const card = s.box([0.065, 0.003, 0.105], [Math.cos(t) * d, 0.003 + i * 0.0025, Math.sin(t) * d], s.material(up ? '#efe6cc' : '#3a2458')); card.rotation.y = -t + Math.PI / 2;
        const mark = s.cylinder(0.018, 0.018, 0.002, [Math.cos(t) * d, 0.0055 + i * 0.0025, Math.sin(t) * d], s.material(up ? '#c8281e' : '#c9a23a', { emissive: up ? '#000' : '#6a5010', emissiveIntensity: 0.5 }), up ? 5 : 12); mark.rotation.y = -t;
      }
    } else if (a.around === 'coins') {
      const t = random() * 6.283, gold = s.material('#e0b84a', { metalness: 0.85, roughness: 0.3 });
      for (let i = 0; i < count * 2; i++) { const d = random() * 0.05, u = random() * 6.283, flat = i < count; s.cylinder(0.017, 0.017, 0.004, [Math.cos(t) * 0.25 + Math.cos(u) * d * (flat ? 2 : 1), 0.003 + (flat ? 0 : (i - count) * 0.0042), Math.sin(t) * 0.25 + Math.sin(u) * d * (flat ? 2 : 0.3)], gold, 12); }
    } else if (a.around === 'candles') {
      const fl = new THREE.Color().setHSL(mix(0.14, 0.06, mood.warmth), 1, 0.6).getStyle();
      for (let i = 0; i < count; i++) { const t = i / count * 6.283 + 0.3, d = 0.26 + random() * 0.03, h = 0.02 + random() * 0.06; s.cylinder(0.016, 0.019, h, [Math.cos(t) * d, h / 2, Math.sin(t) * d], s.material('#e9dfbf'), 10); s.ball([0.03, 0.006, 0.03], [Math.cos(t) * d, 0.004, Math.sin(t) * d], s.material('#e9dfbf'), 8); flames.push(s.mesh(new THREE.ConeGeometry(0.01, 0.036, 7), s.material(fl, { emissive: fl, emissiveIntensity: 2 }), [Math.cos(t) * d, h + 0.02, Math.sin(t) * d])); }
    } else if (a.around === 'runes') {
      for (let i = 0; i < count + 2; i++) { const t = random() * 6.283, d = 0.2 + random() * 0.1; s.ball([0.024, 0.01, 0.019], [Math.cos(t) * d, 0.009, Math.sin(t) * d], s.material('#4a4a50'), 8).rotation.y = random() * 3; s.box([0.004, 0.003, 0.022], [Math.cos(t) * d, 0.019, Math.sin(t) * d], s.material(tint, { emissive: tint, emissiveIntensity: 1.6 })).rotation.y = random() * 3; }
    }

    const speed = mix(0.04, 0.7, mood.energy);
    return s.finish({ footprint: 0.24, update: (dt, time) => { inner.rotation.y += dt * speed; for (const [i, f] of flames.entries()) f.scale.y = 1 + Math.sin(time * 10 + i * 2) * 0.2; } });
  },
});
