import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';
import { PAINT, glyph, lerpHex, paintCanvas, stone, stoneTone, textured, tuft, weather } from './maya';

export default defineThing({
  questions: {
    marker: choice('What is the stone marker it rests on?', {
      quatrefoil: 'A round disc carved with a four-lobed portal to the underworld.',
      calendar: 'A round disc ringed with date glyphs around a blank centre.',
      skull: 'A round disc with a skull carved in the middle: the game as death.',
      square: 'A square stepped altar block with a fret border.',
      rough: 'A rough unworked boulder slab with a hollow worn into it.',
    }),
    size: score('How big is the ball?', ['A fist-sized practice ball', 'The size of a head', 'A huge ceremonial ball, knee high']),
    make: choice('How is the ball made?', {
      smooth: 'One smooth glossy black sphere, cured hard.',
      wound: 'Wound from long strips of latex, the bands still showing as ridges.',
      skull: 'Built around a human skull: brow, sockets and teeth press faintly through the rubber.',
      banded: 'Black with a painted red band and a ring of white dots, a ball for a named team.',
    }),
    moment: choice('What state is it in right now?', {
      resting: 'Sitting dead centre on the marker, waiting for the first serve.',
      rolled: 'It has rolled to the edge of the marker and stopped, leaving a dark smear.',
      curing: 'Freshly made: still smoking over a few embers, latex dripping down its sides.',
      netted: 'Tied up in a rope carrying net with a loop handle, ready to travel.',
      paired: 'A second, smaller ball sits beside it, the spare.',
      sacrificed: 'Split open by a blade, a wedge cut out of it, the game over for good.',
    }),
    beside: choice('What has been left beside it?', {
      nothing: 'Nothing at all.',
      handstone: 'A carved stone handstone with a grip, used to serve the ball.',
      latex: 'A gourd bowl of white latex with a stirring stick and a coil of vine.',
      flowers: 'A scatter of marigolds and a few cacao pods, an offering.',
      beads: 'A loop of jade beads, the wager.',
    }),
    paint: choice('If the marker is still painted, what colour is it?', {
      red: 'Cinnabar red.',
      blue: 'Maya blue.',
      ochre: 'Yellow ochre.',
      bare: 'Bare pale limestone.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const wear = mood.wear;
    const fresh = Math.max(0, Math.min(1, 1.15 - wear * 1.5));
    const base = stoneTone(wear);
    const tint = a.paint === 'bare' ? base : lerpHex(base, PAINT[a.paint], fresh * 0.85);
    const ink = lerpHex(tint, '#241d18', 0.8);
    const R = mix(0.1, 0.34, a.size ** 1.2);
    const disc = R * 2 + 0.07;
    const top = a.marker === 'rough' ? 0.16 : a.marker === 'square' ? 0.2 : 0.13;

    // The marker's carved top face.
    const art = paintCanvas(512, 512, (ctx, w, h) => {
      stone(ctx, w, h, random, { base: tint, wear: 0 });
      const c = w / 2;
      ctx.strokeStyle = ink; ctx.lineWidth = 9;
      if (a.marker === 'square') {
        ctx.strokeRect(22, 22, w - 44, h - 44);
        ctx.lineWidth = 6;
        for (let i = 0; i < 4; i++) { ctx.save(); ctx.translate(c, c); ctx.rotate(i * Math.PI / 2); for (let k = 0; k < 4; k++) { const x = -c + 60 + k * 102; ctx.strokeRect(x, -c + 44, 62, 50); ctx.strokeRect(x + 18, -c + 60, 26, 34); } ctx.restore(); }
        ctx.beginPath(); ctx.arc(c, c, c * 0.5, 0, 7); ctx.stroke();
      } else if (a.marker !== 'rough') {
        ctx.beginPath(); ctx.arc(c, c, c * 0.95, 0, 7); ctx.stroke();
        ctx.beginPath(); ctx.arc(c, c, c * 0.66, 0, 7); ctx.stroke();
        const n = 12, size = c * 0.25;
        for (let i = 0; i < n; i++) { ctx.save(); ctx.translate(c, c); ctx.rotate(i / n * Math.PI * 2); glyph(ctx, -size / 2, -c * 0.81 - size / 2, size, random, ink, lerpHex(tint, PAINT.cream, fresh > 0.2 ? 0.6 : 0.12)); ctx.restore(); }
        if (a.marker === 'quatrefoil') {
          ctx.lineWidth = 10; ctx.fillStyle = lerpHex(tint, '#2a2420', 0.45);
          ctx.beginPath();
          for (let i = 0; i < 4; i++) { const t = i * Math.PI / 2; ctx.arc(c + Math.cos(t) * c * 0.27, c + Math.sin(t) * c * 0.27, c * 0.25, t - 1.9, t + 1.9); }
          ctx.closePath(); ctx.fill(); ctx.stroke();
        } else if (a.marker === 'skull') {
          ctx.fillStyle = lerpHex(tint, '#f4ecd8', 0.6); ctx.lineWidth = 8;
          ctx.beginPath(); ctx.arc(c, c - 20, c * 0.4, Math.PI * 0.9, Math.PI * 2.1); ctx.lineTo(c + 70, c + 110); ctx.lineTo(c - 70, c + 110); ctx.closePath(); ctx.fill(); ctx.stroke();
          ctx.fillStyle = ink;
          for (const x of [-42, 42]) { ctx.beginPath(); ctx.arc(c + x, c - 20, 27, 0, 7); ctx.fill(); }
          ctx.beginPath(); ctx.moveTo(c, c + 12); ctx.lineTo(c - 14, c + 44); ctx.lineTo(c + 14, c + 44); ctx.fill();
          for (let i = -3; i <= 3; i++) ctx.fillRect(c + i * 19 - 2, c + 62, 5, 46);
        }
      }
      weather(ctx, w, h, random, wear);
    });
    const topPaint = textured(art, { bumpScale: 2.5 });
    const side = textured(paintCanvas(256, 64, (ctx, w, h) => { stone(ctx, w, h, random, { base: tint, wear: wear * 0.6 }); ctx.strokeStyle = ink; ctx.lineWidth = 4; ctx.strokeRect(-5, 12, w + 10, h - 24); }));
    side.map!.repeat.set(4, 1);

    if (a.marker === 'square') {
      const half = disc * 1.05;
      s.box([half * 2.3, 0.08, half * 2.3], [0, 0.04, 0], side);
      s.box([half * 2, top - 0.08, half * 2], [0, 0.08 + (top - 0.08) / 2, 0], side);
      const face = s.mesh(new THREE.PlaneGeometry(half * 2, half * 2), topPaint, [0, top + 0.003, 0]);
      face.rotation.x = -Math.PI / 2;
    } else if (a.marker === 'rough') {
      const rock = new THREE.IcosahedronGeometry(1, 2);
      const p = rock.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < p.count; i++) {
        const v = new THREE.Vector3().fromBufferAttribute(p, i);
        const jitter = 1 + Math.sin(v.x * 5.1 + context.seed % 7) * 0.08 + Math.cos(v.z * 4.3 + v.y * 3) * 0.08;
        v.multiplyScalar(jitter); if (v.y > 0.55) v.y = 0.55 - (v.y - 0.55) * 0.5;
        p.setXYZ(i, v.x, v.y, v.z);
      }
      rock.computeVertexNormals();
      const boulder = s.mesh(rock, s.material(lerpHex(base, '#6f6a5e', 0.3), { roughness: 0.95, flatShading: true }), [0, 0, 0]);
      boulder.scale.set(disc * 1.05, top / 0.55, disc * 0.9);
    } else {
      s.lathe([[0, 0], [disc * 1.02, 0], [disc * 1.04, 0.02], [disc * 1.04, top - 0.03], [disc, top], [0, top]], side);
      const face = s.mesh(new THREE.CircleGeometry(disc, 48), topPaint, [0, top + 0.003, 0]);
      face.rotation.x = -Math.PI / 2;
    }
    if (wear > 0.6) for (let i = 0; i < Math.round((wear - 0.5) * 8); i++) { const t = random() * 7; s.root.add(tuft(random, [Math.cos(t) * disc * 1.15, 0, Math.sin(t) * disc * 1.15], disc * (0.3 + random() * 0.3), lerpHex('#3f7a3c', '#8aa648', random() * 0.6), 7)); }

    // The ball: black rubber with scuffs, dust and whatever its making left on the surface.
    const skin = paintCanvas(512, 256, (ctx, w, h) => {
      ctx.fillStyle = '#1b1918'; ctx.fillRect(0, 0, w, h);
      if (a.make === 'wound') {
        ctx.strokeStyle = '#3a3532'; ctx.lineWidth = 5;
        for (let k = 0; k < 9; k++) { ctx.beginPath(); for (let x = 0; x <= w; x += 8) { const y = h * (0.5 + 0.42 * Math.sin(x / w * Math.PI * 2 + k * 0.7)) + (k - 4) * 9; if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); } ctx.stroke(); }
      } else if (a.make === 'banded') {
        ctx.fillStyle = PAINT.red; ctx.fillRect(0, h * 0.4, w, h * 0.2);
        ctx.fillStyle = '#efe6d2'; for (let i = 0; i < 16; i++) { ctx.beginPath(); ctx.arc((i + 0.5) * w / 16, h * 0.3, 7, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc((i + 0.5) * w / 16, h * 0.7, 7, 0, 7); ctx.fill(); }
      } else if (a.make === 'skull') {
        const cx = w * 0.25, cy = h * 0.47;
        ctx.fillStyle = '#34302d'; ctx.beginPath(); ctx.ellipse(cx, cy, 58, 66, 0, 0, 7); ctx.fill();
        ctx.fillStyle = '#050505'; for (const x of [-24, 24]) { ctx.beginPath(); ctx.ellipse(cx + x, cy - 8, 15, 18, 0, 0, 7); ctx.fill(); }
        ctx.beginPath(); ctx.moveTo(cx, cy + 12); ctx.lineTo(cx - 8, cy + 30); ctx.lineTo(cx + 8, cy + 30); ctx.fill();
        for (let i = -3; i <= 3; i++) ctx.fillRect(cx + i * 10 - 1.5, cy + 38, 3, 20);
      }
      const scuffs = 20 + wear * 160;
      for (let i = 0; i < scuffs; i++) {
        ctx.strokeStyle = `rgba(${150 + random() * 60},${140 + random() * 50},${120 + random() * 40},${0.08 + random() * 0.25 * (0.4 + wear)})`;
        ctx.lineWidth = 1 + random() * 3;
        const x = random() * w, y = random() * h, t = random() * 7, l = 6 + random() * 30;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(t) * l, y + Math.sin(t) * l * 0.5); ctx.stroke();
      }
      // Dust settles on the lower half as it ages.
      const dust = ctx.createLinearGradient(0, h * 0.45, 0, h);
      dust.addColorStop(0, 'rgba(150,135,110,0)'); dust.addColorStop(1, `rgba(150,135,110,${wear * 0.5})`);
      ctx.fillStyle = dust; ctx.fillRect(0, 0, w, h);
    });
    const rubber = new THREE.MeshStandardMaterial({ map: skin, bumpMap: skin, bumpScale: a.make === 'smooth' ? 0.3 : 1.5, roughness: mix(0.22, 0.7, wear), metalness: 0.05 });
    const group = new THREE.Group();
    const offset = a.moment === 'rolled' ? disc * 0.72 : 0;
    const angle = 0.5 + random() * 0.8;
    const ballGeometry = a.moment === 'sacrificed'
      ? new THREE.SphereGeometry(1, 40, 24, 0.55, Math.PI * 2 - 0.9)
      : new THREE.SphereGeometry(1, 40, 24);
    const ball = new THREE.Mesh(ballGeometry, rubber);
    ball.castShadow = ball.receiveShadow = true;
    ball.scale.setScalar(R);
    group.add(ball);
    group.position.set(Math.sin(angle) * offset, top + R * 0.985, Math.cos(angle) * offset);
    s.root.add(group);
    const bx = group.position.x, bz = group.position.z;
    if (a.moment === 'sacrificed') {
      // The cut faces show the paler core, and the wedge lies where it fell.
      const core = new THREE.MeshStandardMaterial({ color: '#57463a', roughness: 0.9, side: THREE.DoubleSide });
      for (const t of [0.55, 0.55 + Math.PI * 2 - 0.9]) {
        const cut = new THREE.Mesh(new THREE.CircleGeometry(1, 24, -Math.PI / 2, Math.PI), core);
        cut.rotation.y = -t; cut.castShadow = true; ball.add(cut);
      }
      const wedge = new THREE.Mesh(new THREE.SphereGeometry(R, 12, 16, 0, 0.8), rubber);
      wedge.castShadow = true;
      wedge.position.set(bx + R * 1.5, top + R * 0.3, bz + R * 0.8); wedge.rotation.set(1.5, 0.4, 0.6);
      s.root.add(wedge);
      const blade = s.material('#16181a', { roughness: 0.2, metalness: 0.3 });
      const knife = s.mesh(new THREE.ConeGeometry(R * 0.2, R * 1.3, 4), blade, [bx - R * 1.5, top + 0.012, bz + R * 0.9]);
      knife.scale.z = 0.25; knife.rotation.set(Math.PI / 2, 0, 0.9);
    }
    if (a.moment === 'rolled') {
      const smear = s.mesh(new THREE.PlaneGeometry(R * 0.7, offset), new THREE.MeshBasicMaterial({ color: '#1d1a17', transparent: true, opacity: 0.4, depthWrite: false }), [bx / 2, top + 0.006, bz / 2]);
      smear.rotation.set(-Math.PI / 2, 0, -angle); smear.castShadow = false;
    }
    if (a.moment === 'netted') {
      const rope = s.material('#b89a64', { roughness: 1 });
      for (let i = 0; i < 6; i++) { const hoop = new THREE.Mesh(new THREE.TorusGeometry(R * 1.02, R * 0.035, 6, 40), rope); hoop.rotation.y = i * Math.PI / 6; hoop.castShadow = true; group.add(hoop); }
      for (const y of [-0.45, 0.1, 0.6]) { const band = new THREE.Mesh(new THREE.TorusGeometry(R * 1.02 * Math.sqrt(1 - y * y), R * 0.035, 6, 40), rope); band.rotation.x = Math.PI / 2; band.position.y = y * R; group.add(band); }
      const loop = new THREE.Mesh(new THREE.TorusGeometry(R * 0.38, R * 0.05, 6, 24), rope);
      loop.position.y = R * 1.3; loop.rotation.y = 0.6; loop.castShadow = true; group.add(loop);
    }
    if (a.moment === 'paired') {
      const spare = new THREE.Mesh(new THREE.SphereGeometry(R * 0.55, 28, 16), rubber);
      spare.castShadow = true; spare.rotation.set(1, 2, 0.4);
      spare.position.set(bx + R * 1.35, top + R * 0.55, bz + R * 0.5);
      s.root.add(spare);
    }
    const wisps: THREE.Mesh[] = [];
    if (a.moment === 'curing') {
      const latex = s.material('#e9e2cf', { roughness: 0.4 });
      for (let i = 0; i < 7; i++) {
        const t = random() * Math.PI * 2, drop = 0.5 + random() * 0.8;
        const points: [number, number, number][] = [];
        for (let k = 0; k <= 5; k++) { const phi = 0.5 + (k / 5) * drop; points.push([bx + Math.cos(t) * Math.sin(phi) * R * 1.01, top + R + Math.cos(phi) * R * 1.01, bz + Math.sin(t) * Math.sin(phi) * R * 1.01]); }
        s.tube(points, R * 0.035, latex);
      }
      s.ball([R * 0.45, R * 0.12, R * 0.45], [bx, top + R * 1.96, bz], latex, 12);
      const ember = s.material('#ff7a2a', { emissive: '#ff5a10', emissiveIntensity: 1.6 });
      const coal = s.material('#2a2422');
      for (let i = 0; i < 9; i++) { const t = i / 9 * Math.PI * 2 + random(); s.mesh(new THREE.DodecahedronGeometry(R * (0.14 + random() * 0.1), 0), i % 2 ? ember : coal, [bx + Math.cos(t) * R * 1.25, top + R * 0.1, bz + Math.sin(t) * R * 1.25]); }
      const smoke = new THREE.MeshBasicMaterial({ color: '#f3f0ea', transparent: true, opacity: 0.3, depthWrite: false });
      for (let i = 0; i < 3; i++) {
        const t = i * 2.1 + random(), x = bx + Math.cos(t) * R * 1.2, z = bz + Math.sin(t) * R * 1.2;
        const wisp = s.tube([[x, top + R * 0.2, z], [x + R * 0.3, top + R * 1.4, z - R * 0.2], [x - R * 0.2, top + R * 2.6, z + R * 0.1], [x + R * 0.25, top + R * 4, z]], R * 0.09, smoke);
        wisp.castShadow = false; wisps.push(wisp);
      }
    }

    const px = -disc * 1.45, pz = disc * 0.75;
    if (a.beside === 'handstone') {
      const carved = s.material(lerpHex(base, '#6b7a66', 0.4), { roughness: 0.7 });
      s.ball([R * 0.5 + 0.03, R * 0.42 + 0.025, R * 0.42 + 0.025], [px, R * 0.42 + 0.025, pz], carved, 16);
      const grip = s.ring(R * 0.3 + 0.03, 0.016 + R * 0.05, [px, R * 0.85 + 0.06, pz], carved, Math.PI);
      grip.rotation.y = 0.5;
    } else if (a.beside === 'latex') {
      const gourd = s.material('#b98a4a', { roughness: 0.8 });
      const r = 0.1 + R * 0.4;
      s.lathe([[0.01, 0], [r * 0.6, 0.02], [r, r * 0.6], [r * 0.92, r * 0.85], [r * 0.85, r * 0.8], [r * 0.6, r * 0.4], [0, r * 0.3]], gourd, [px, 0, pz]);
      s.cylinder(r * 0.86, r * 0.86, 0.01, [px, r * 0.7, pz], s.material('#f2ecdc', { roughness: 0.3 }), 20);
      s.rod([px + r * 0.2, r * 0.6, pz], [px + r * 1.2, r * 1.7, pz - r * 0.5], 0.012, s.material('#6a4b2e'));
      const vine = s.ring(r * 0.8, 0.018, [px + r * 2.3, 0.02, pz + r * 0.6], s.material('#55713a'));
      vine.rotation.x = Math.PI / 2;
      s.ring(r * 0.65, 0.016, [px + r * 2.3, 0.05, pz + r * 0.6], s.material('#4c6a36')).rotation.x = Math.PI / 2 - 0.15;
    } else if (a.beside === 'flowers') {
      const heap: { at: [number, number, number]; size: number; color: string }[] = [];
      const n = 16 + Math.round(mood.density * 40);
      for (let i = 0; i < n; i++) { const t = random() * 7, r = disc * (1.15 + random() * 0.5); heap.push({ at: [Math.cos(t) * r, 0.03, Math.sin(t) * r], size: 0.015 + R * 0.07 + random() * 0.012, color: random() < 0.75 ? '#f29a1f' : '#f7d038' }); }
      s.scatter(new THREE.IcosahedronGeometry(1, 0), s.material('#ffffff'), heap);
      const pod = s.material(lerpHex('#8a3b22', '#c2852c', random()), { roughness: 0.7 });
      for (let i = 0; i < 3; i++) { const cacao = s.ball([0.04 + R * 0.18, 0.04 + R * 0.18, 0.09 + R * 0.38], [px + i * (0.09 + R * 0.3), 0.04 + R * 0.18, pz + (random() - 0.5) * 0.1], pod, 10); cacao.rotation.y = random() * 3; }
    } else if (a.beside === 'beads') {
      const beads: { at: [number, number, number]; size: number; color: string }[] = [];
      const r = 0.1 + R * 0.5;
      for (let i = 0; i < 26; i++) { const t = i / 26 * Math.PI * 2; beads.push({ at: [px + Math.cos(t) * r * (1 + 0.25 * Math.sin(t * 3)), 0.02 + R * 0.05, pz + Math.sin(t) * r * 0.8], size: 0.014 + R * 0.07, color: lerpHex('#3f9a6b', '#8fd0a8', random()) }); }
      s.scatter(new THREE.SphereGeometry(1, 8, 6), s.material('#ffffff', { roughness: 0.3 }), beads);
    }

    const rock = mix(0, 0.05, mood.energy), speed = mix(0.5, 3, mood.energy);
    return s.finish({
      footprint: disc * 1.5,
      update: (_dt, time) => {
        if (a.moment !== 'sacrificed') { group.rotation.z = Math.sin(time * speed) * rock; }
        wisps.forEach((wisp, index) => { wisp.rotation.y = Math.sin(time * speed * 0.5 + index) * 0.25; });
      },
    });
  },
});
