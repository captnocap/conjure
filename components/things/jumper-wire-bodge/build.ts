import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';
import { MASK_OPTIONS, board, instances, place } from './pcb';

type P = [number, number, number];

export default defineThing({
  questions: {
    wire: choice('What wire did they use?', {
      enamel: 'Hair-fine copper magnet wire with a reddish enamel coat, a professional rework.',
      blue: 'Thin blue wire-wrap wire, the factory engineer\'s choice.',
      red: 'Fat red hookup wire, whatever was within reach.',
      yellow: 'Fat yellow hookup wire, impossible to miss.',
      white: 'White wire gone slightly grey and sticky with age.',
      bare: 'Bare tinned wire with no insulation at all.',
    }),
    route: choice('How does the wire travel?', {
      arc: 'One clean arch through the air from pad to pad, like a bridge.',
      flat: 'Pressed flat to the board with a neat right-angle bend.',
      loopy: 'Far too long, wandering and looping before it arrives.',
      bundle: 'Four wires side by side in a ribbon, a whole bus rerouted.',
      crossed: 'Two wires crossing over each other in an X, swapping a pair that was wired backwards.',
    }),
    fix: choice('What holds it down?', {
      glue: 'Cloudy blobs of hot glue with a stray string pulled off one.',
      kapton: 'Strips of translucent amber kapton tape.',
      varnish: 'Dabs of red nail varnish over the joints.',
      nothing: 'Nothing. It is free in the air and trembles when the board moves.',
    }),
    reason: choice('Why is it there?', {
      cut: 'A track was cut with a knife and the wire carries the signal somewhere new.',
      chip: 'It runs to a single leg of a small surface-mount chip.',
      testpoint: 'It joins a pad to a labelled test point across the board.',
      burnt: 'It bridges a track that burnt away, around a scorched patch of board.',
    }),
    craft: score('How well is it soldered?', ['Big cold grey blobs, flux residue and a scorch mark', 'Workmanlike', 'Tiny shiny fillets, nearly invisible']),
    note: choice('Has someone written on the board in marker?', {
      none: 'No.',
      fix: 'FIX, with an arrow.',
      eco: 'ECO 14, an official change number.',
      query: 'A question mark, circled.',
      ok: 'OK and a tick.',
    }),
    board: choice('What kind of board is it on?', MASK_OPTIONS),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const w = 46, d = 32;
    const sloppy = 1 - a.craft;
    const tone = { enamel: '#b5532a', blue: '#2a5fd0', red: '#c9282c', yellow: '#e8c41c', white: '#dcd8cc', bare: '#c9ccc9' }[a.wire];
    const gauge = { enamel: 0.24, blue: 0.36, red: 0.6, yellow: 0.6, white: 0.55, bare: 0.3 }[a.wire];
    const insulated = a.wire !== 'enamel' && a.wire !== 'bare';
    const wireMaterial = s.material(tone, { roughness: a.wire === 'enamel' || a.wire === 'bare' ? 0.35 : 0.5, metalness: a.wire === 'enamel' ? 0.5 : a.wire === 'bare' ? 0.85 : 0 });
    const tin = s.material('#c9ccc9', { metalness: 0.85, roughness: 0.3 });
    const joint = s.material(sloppy > 0.6 ? '#8f9290' : '#d3d6d4', { metalness: sloppy > 0.6 ? 0.4 : 0.9, roughness: mix(0.18, 0.75, sloppy) });
    const black = s.material('#17181b', { roughness: 0.6 });

    const chipAt: P = [12, 0, -5];
    const runs: { from: P; to: P }[] = [];
    const A: P = [-14 + (random() - 0.5) * 3, 0, 6 + (random() - 0.5) * 2];
    const B: P = a.reason === 'chip' ? [chipAt[0] - 1.9, 0.45, chipAt[2] + 3.9] : [13 + (random() - 0.5) * 3, 0, -6 + (random() - 0.5) * 2];
    if (a.route === 'bundle') for (let i = 0; i < 4; i++) runs.push({ from: [A[0] + i * 0.3, 0, A[2] - 4.5 + i * 2.2], to: a.reason === 'chip' ? [chipAt[0] - 1.9 + i * 1.27, 0.45, chipAt[2] + 3.9] : [B[0] - i * 0.3, 0, B[2] - 3 + i * 2.2] });
    else if (a.route === 'crossed') runs.push({ from: [-12, 0, -4.5], to: [11, 0, 5] }, { from: [-12, 0, 5], to: [11, 0, -4.5] });
    else runs.push({ from: A, to: B });

    const cutX = -3 + random() * 4;
    board(s, {
      w, d, mask: a.board, random, wear: mood.wear,
      pads: runs.flatMap((run) => [{ x: run.from[0], z: run.from[2], r: 1.05 }, ...(run.to[1] > 0.1 ? [] : [{ x: run.to[0], z: run.to[2], r: 1.05 }])]),
      silk: [
        ...(a.reason === 'testpoint' ? [{ text: `TP${1 + Math.floor(random() * 9)}`, x: runs[0].to[0] + 0.5, z: runs[0].to[2] - 3.2, size: 2.3 }] : []),
        ...(a.reason === 'chip' ? [{ text: `U${3 + Math.floor(random() * 20)}`, x: chipAt[0] + 5.5, z: chipAt[2] - 4.6, size: 2.2 }] : []),
        ...(a.route === 'crossed' ? [{ text: 'TX', x: -17, z: -4.5, size: 2.2 }, { text: 'RX', x: -17, z: 5, size: 2.2 }, { text: 'TX', x: 16, z: -4.5, size: 2.2 }, { text: 'RX', x: 16, z: 5, size: 2.2 }] : []),
        { text: 'REV A', x: -w / 2 + 7, z: -d / 2 + 3, size: 1.9 },
      ],
      extra: (ctx) => {
        // The original track this wire replaces, with its wound.
        const z = runs[0].from[2] + 3.3 > d / 2 - 2 ? runs[0].from[2] - 3.3 : runs[0].from[2] + 3.3;
        if (a.reason === 'cut' || a.reason === 'burnt') {
          ctx.strokeStyle = a.board === 'tan' ? '#b5633a' : 'rgba(255,255,255,0.28)';
          ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(-w / 2, z); ctx.lineTo(w / 2, z); ctx.stroke();
          if (a.reason === 'cut') {
            ctx.strokeStyle = '#c9a66a';
            ctx.lineWidth = 0.75;
            for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(cutX - 0.8 + k * 0.5, z - 2.2 - random()); ctx.lineTo(cutX + 0.3 + k * 0.5, z + 2.2 + random()); ctx.stroke(); }
          } else {
            const burn = ctx.createRadialGradient(cutX, z, 0.5, cutX, z, 7.5);
            burn.addColorStop(0, 'rgba(12,9,6,1)'); burn.addColorStop(0.5, 'rgba(45,28,12,0.9)'); burn.addColorStop(1, 'rgba(60,40,20,0)');
            ctx.fillStyle = burn;
            ctx.fillRect(cutX - 9, z - 9, 18, 18);
          }
        }
        // Flux residue and scorch round sloppy joints.
        for (const run of runs) for (const end of [run.from, run.to]) {
          if (sloppy < 0.3) continue;
          const r = 1.5 + sloppy * 3.5;
          const flux = ctx.createRadialGradient(end[0], end[2], 0.4, end[0], end[2], r);
          flux.addColorStop(0, `rgba(${sloppy > 0.8 ? '40,26,12' : '190,140,50'},${0.75 * sloppy})`);
          flux.addColorStop(1, 'rgba(190,140,50,0)');
          ctx.fillStyle = flux;
          ctx.fillRect(end[0] - r, end[2] - r, r * 2, r * 2);
        }
        if (a.note !== 'none') {
          ctx.save();
          ctx.translate(-w / 2 + 11, d / 2 - 5.5);
          ctx.rotate(-0.12 + random() * 0.2);
          ctx.fillStyle = a.board === 'tan' ? '#1c2a8a' : '#e9e9e4';
          ctx.strokeStyle = ctx.fillStyle;
          ctx.font = 'italic bold 5px cursive';
          ctx.textAlign = 'center';
          ctx.lineWidth = 0.55;
          ctx.fillText({ fix: 'FIX', eco: 'ECO 14', query: '?', ok: 'OK' }[a.note], 0, 0);
          if (a.note === 'fix') { ctx.beginPath(); ctx.moveTo(6, -2); ctx.lineTo(12, -5); ctx.moveTo(12, -5); ctx.lineTo(9.8, -5.2); ctx.moveTo(12, -5); ctx.lineTo(10.8, -3); ctx.stroke(); }
          if (a.note === 'query') { ctx.beginPath(); ctx.arc(0, -1.8, 4, 0, Math.PI * 2); ctx.stroke(); }
          if (a.note === 'ok') { ctx.beginPath(); ctx.moveTo(6, -2); ctx.lineTo(7.6, 0); ctx.lineTo(11, -5); ctx.stroke(); }
          ctx.restore();
        }
      },
    });

    if (a.reason === 'chip') {
      s.box([10, 1.7, 5.4], [chipAt[0], 1.05, chipAt[2]], black);
      s.cylinder(0.5, 0.5, 0.05, [chipAt[0] - 4, 1.92, chipAt[2] + 1.8], s.material('#3a3c40'), 10);
      const legs: THREE.Matrix4[] = [];
      for (let i = 0; i < 8; i++) for (const side of [-1, 1]) legs.push(place([chipAt[0] - 4.45 + i * 1.27, 0.35, chipAt[2] + side * 3.4], [0, 0, 0], [0.5, 0.5, 1.6]));
      instances(s, new THREE.BoxGeometry(1, 1, 1), tin, legs);
    }

    // Surface-mount neighbours for scale, more of them on a crowded board.
    const bodies: THREE.Matrix4[] = [], ends: THREE.Matrix4[] = [];
    for (let k = 0; k < 4 + Math.round(mood.density * 10); k++) {
      const x = (random() - 0.5) * (w - 6), z = (random() < 0.5 ? -1 : 1) * (d / 2 - 2.5 - random() * 3.5), turn = random() < 0.5 ? 0 : Math.PI / 2;
      if (a.reason === 'chip' && Math.abs(x - chipAt[0]) < 8 && z < 0) continue;
      if (x < -w / 2 + 20 && z > 0) continue;
      bodies.push(place([x, 0.3, z], [0, turn, 0], [1.9, 0.6, 1.25]));
      ends.push(place([x, 0.32, z], [0, turn, 0], [2.4, 0.5, 1.3]));
    }
    instances(s, new THREE.BoxGeometry(1, 1, 1), tin, ends);
    instances(s, new THREE.BoxGeometry(1, 1, 1), s.material(random() < 0.5 ? '#1d1e21' : '#b08a52', { roughness: 0.6 }), bodies);

    const glue = new THREE.MeshStandardMaterial({ color: '#e6dfc4', roughness: 0.25, transparent: true, opacity: 0.82 });
    const tape = new THREE.MeshStandardMaterial({ color: '#c8841c', roughness: 0.3, transparent: true, opacity: 0.8 });
    const varnish = s.material('#c2182f', { roughness: 0.15 });

    runs.forEach((run, index) => {
      const { from, to } = run;
      const start: P = [from[0], 0.5, from[2]], end: P = [to[0], to[1] + 0.5, to[2]];
      const span = Math.hypot(end[0] - start[0], end[2] - start[2]);
      const lerp = (t: number, y: number, side = 0): P => {
        const nx = -(end[2] - start[2]) / span, nz = (end[0] - start[0]) / span;
        return [start[0] + (end[0] - start[0]) * t + nx * side, y, start[2] + (end[2] - start[2]) * t + nz * side];
      };
      let points: P[];
      if (a.route === 'flat' || a.route === 'bundle') {
        const lift = gauge + 0.12;
        const corner: P = a.route === 'bundle' ? [end[0] - 6 - index * 1.2, lift, start[2]] : [start[0] + 1, lift, end[2] + (random() - 0.5)];
        const toward = (p: P, q: P, amount: number): P => [p[0] + (q[0] - p[0]) * amount, lift, p[2] + (q[2] - p[2]) * amount];
        points = [start, toward(start, corner, 0.12), toward(start, corner, 0.85), corner, toward(corner, end, 0.15), toward(corner, end, 0.88), end];
      } else if (a.route === 'loopy') {
        points = [start, lerp(0.05, 3)];
        // Slack wire: one lazy sweep out to the side, a kink that doubles back, then home.
        const side = random() < 0.5 ? -1 : 1;
        points.push(lerp(0.22 + random() * 0.1, 2 + random() * 5, side * (5 + random() * 5)));
        points.push(lerp(0.55 + random() * 0.1, 0.6 + random() * 2, side * (1 + random() * 3)));
        points.push(lerp(0.42 + random() * 0.08, 3 + random() * 6, -side * (3 + random() * 5)));
        points.push(lerp(0.74 + random() * 0.1, 1 + random() * 4, -side * (5 + random() * 4)));
        points.push(lerp(0.95, 3), end);
      } else {
        const high = a.route === 'crossed' ? 4 + index * 3.2 : mix(6, 12, random());
        points = [start, lerp(0.06, high * 0.5), lerp(0.3, high, (random() - 0.5) * 2), lerp(0.7, high, (random() - 0.5) * 2), lerp(0.94, high * 0.5 + end[1]), end];
      }
      const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), false, 'centripetal');
      s.mesh(new THREE.TubeGeometry(curve, 90, gauge, 8), wireMaterial);
      for (const tip of [start, end]) {
        const size = mix(0.75, 1.9, sloppy) * (0.85 + random() * 0.3);
        s.ball([size, size * mix(0.55, 0.9, sloppy), size], [tip[0], tip[1] - 0.2, tip[2]], joint, 12);
        if (insulated) s.ball([gauge * 1.05, gauge * 1.05, gauge * 1.05], [tip[0], tip[1] + size * 0.5, tip[2]], tin, 8);
        if (a.fix === 'varnish') s.ball([size * 1.5, size * 0.8, size * 1.4], [tip[0] + 0.4, tip[1] - 0.1, tip[2]], varnish, 12);
      }
      const anchors = a.route === 'arc' || a.route === 'crossed' ? [0.06, 0.94] : a.route === 'loopy' ? [0.05, 0.5, 0.95] : [0.25, 0.75];
      for (const t of anchors) {
        const at = curve.getPointAt(t);
        if (a.fix === 'glue' && (index === 0 || t < 0.5)) {
          const size = 2 + random() * 1.6;
          s.ball([size * 1.2, Math.max(at.y * 0.9, size * 0.5), size], [at.x, Math.max(at.y * 0.45, 0.3), at.z], glue, 14);
          if (index === 0 && t < 0.3) s.rod([at.x, at.y + 0.6, at.z], [at.x + 5 + random() * 4, 0.1, at.z + 4 + random() * 3], 0.09, glue);
        } else if (a.fix === 'kapton') {
          const strip = s.box([4.2, 0.12, 7 + random() * 3], [at.x, Math.min(at.y, 1.6) + gauge + 0.05, at.z], tape);
          const ahead = curve.getTangentAt(t);
          strip.rotation.y = Math.atan2(ahead.x, ahead.z) + (random() - 0.5) * 0.5;
          strip.castShadow = false;
          if (at.y > 1.6) s.box([4.2, at.y, 0.12], [at.x, at.y / 2, at.z], tape).rotation.y = strip.rotation.y + Math.PI / 2;
        }
      }
    });
    if (a.fix === 'kapton' && (a.route === 'bundle' || a.route === 'flat')) {
      const strip = s.box([9, 0.12, 5], [(A[0] + B[0]) / 2 - 6, gauge * 2 + 0.35, A[2] - (a.route === 'bundle' ? 1.2 : 0)], tape);
      strip.rotation.y = Math.PI / 2 + (random() - 0.5) * 0.3;
      strip.castShadow = false;
    }

    s.root.scale.setScalar(0.001);
    // Unfixed wire trembles a little.
    return s.finish();
  },
});
