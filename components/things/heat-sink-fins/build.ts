import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';
import { MASK_OPTIONS, board, gather, instances, place } from './pcb';

export default defineThing({
  questions: {
    form: choice('What shape is the heat sink?', {
      straight: 'Tall parallel plate fins on a slab, like the nave of a cathedral or the decks of a car park.',
      pins: 'A square forest of upright pins.',
      radial: 'A round sunburst of thin fins fanning out from a solid core.',
      clipon: 'A small stamped comb bolted to the back of one upright power transistor.',
    }),
    finish: choice('What is the metal finish?', {
      bare: 'Bare silver aluminium.',
      black: 'Matte black anodised.',
      gold: 'Gold anodised, a little showy.',
      blue: 'Electric blue anodised, from an era of windowed cases.',
      copper: 'Solid copper, heavy and tarnishing.',
    }),
    tall: score('How tall are the fins?', ['Stubby ridges', 'Ordinary', 'Tall slabs', 'Towering, far taller than wide']),
    fan: choice('Is there a fan on top?', {
      none: 'No fan. It cools by standing there.',
      stalled: 'A small fan that has seized, its blades still and furred with dust.',
      spinning: 'A small fan still turning.',
      hanging: 'A fan hanging off by one screw with a blade snapped out.',
    }),
    lint: choice('What has collected between the fins?', {
      clean: 'Nothing. The channels are clear.',
      felted: 'Grey dust felted into a solid mat that fills the channels.',
      cobweb: 'A few cobweb strands strung from the fin tops down to the board.',
      scorched: 'Baked brown residue, with the metal heat-stained and the board browned around it.',
    }),
    seating: choice('How is it sitting on its chip?', {
      clipped: 'Held down square by a sprung wire clip, as designed.',
      pushpins: 'Held by four plastic push-pins at the corners.',
      askew: 'Slipped crooked on old thermal tape, half off the chip.',
      removed: 'Lifted off and set down beside the chip, which shows a dried square of grey paste.',
    }),
    board: choice('What kind of board is it on?', MASK_OPTIONS),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const tone = { bare: '#c6cacd', black: '#2a2c30', gold: '#c9a24a', blue: '#2f62b4', copper: '#b86a40' }[a.finish];
    const scorched = a.lint === 'scorched';
    const metal = s.material(new THREE.Color(tone).lerp(new THREE.Color('#5b4636'), scorched ? 0.4 : 0), {
      metalness: a.finish === 'black' ? 0.35 : 0.8, roughness: mix(0.32, 0.6, mood.wear) + (a.finish === 'black' ? 0.2 : 0),
    });
    const tin = s.material('#c9ccc9', { metalness: 0.85, roughness: 0.3 });
    const dark = s.material('#1b1c1f', { roughness: 0.7 });
    const felt = s.material(scorched ? '#4a3524' : '#8d897f', { roughness: 1 });
    const feltLight = s.material(scorched ? '#6b4a2c' : '#aba79b', { roughness: 1 });
    const clip = a.form === 'clipon';
    const round = a.form === 'radial';
    const W = clip ? 22 : 38, D = clip ? 12 : 38;
    const fin = clip ? mix(16, 34, a.tall) : mix(7, 40, a.tall);
    const chipH = 3, baseH = 3.2;
    const removed = !clip && a.seating === 'removed';
    const bw = W + (removed ? W + 22 : 18), bd = D + 16;
    const chipX = removed ? -(W + 8) / 2 : 0;
    const fanOn = !clip && a.fan !== 'none';
    const dustAmount = a.lint === 'felted' ? mix(0.45, 1, mood.wear) : scorched ? 0.3 : 0;

    board(s, {
      w: bw, d: bd, mask: a.board, random, wear: mood.wear,
      outlines: clip ? [{ x: 0, z: 2, w: 11, d: 5 }] : [{ x: chipX, z: 0, w: 34, d: 34 }],
      pads: clip ? [-2.54, 0, 2.54].map((x) => ({ x, z: 3.2, r: 0.9 })) : fanOn ? [{ x: bw / 2 - 5, z: bd / 2 - 3.5, r: 0.8, square: true }, { x: bw / 2 - 7.54, z: bd / 2 - 3.5, r: 0.8 }] : [],
      silk: clip
        ? [{ text: `Q${1 + Math.floor(random() * 9)}`, x: 8, z: 4, size: 2.6 }, { text: 'HOT!', x: -8.5, z: 4.5, size: 2 }]
        : [{ text: 'CPU1', x: chipX - 9, z: bd / 2 - 3, size: 2.6 }, ...(fanOn ? [{ text: 'FAN', x: bw / 2 - 13, z: bd / 2 - 3.5, size: 2 }] : [])],
      extra: (ctx) => {
        if (!scorched) return;
        const burn = ctx.createRadialGradient(chipX, 0, 6, chipX, 0, 32);
        burn.addColorStop(0, 'rgba(40,24,10,0.85)');
        burn.addColorStop(1, 'rgba(70,45,15,0)');
        ctx.fillStyle = burn;
        ctx.fillRect(-bw, -bd, bw * 2, bd * 2);
      },
    });

    let rotor: THREE.Group | null = null;
    let top = 0;
    const sink = gather(s, () => {
      if (clip) {
        // A comb extruded upward, fins facing away from the transistor.
        const comb = new THREE.Shape();
        comb.moveTo(-W / 2, 0); comb.lineTo(W / 2, 0); comb.lineTo(W / 2, 1.6);
        const teeth = 6, gap = W / teeth;
        for (let i = teeth - 1; i >= 0; i--) {
          const right = -W / 2 + (i + 1) * gap - (i === teeth - 1 ? 0 : gap - 1.5), left = -W / 2 + i * gap;
          comb.lineTo(-W / 2 + (i + 1) * gap, 1.6);
          comb.lineTo(-W / 2 + (i + 1) * gap, D);
          comb.lineTo(-W / 2 + (i + 1) * gap - 1.5, D);
          comb.lineTo(-W / 2 + (i + 1) * gap - 1.5, 1.6);
          void right; void left;
        }
        comb.lineTo(-W / 2 + 1.5, 1.6); comb.lineTo(-W / 2 + 1.5, D); comb.lineTo(-W / 2, D); comb.closePath();
        const geometry = new THREE.ExtrudeGeometry(comb, { depth: fin, bevelEnabled: false });
        geometry.rotateX(-Math.PI / 2); // shape y -> -z, extrusion -> +y
        s.mesh(geometry, metal, [0, 2.2, 1.2]);
        top = 2.2 + fin;
      } else if (round) {
        const R = 21, core = 8;
        s.cylinder(core, core, fin + baseH, [0, (fin + baseH) / 2, 0], metal, 28);
        s.cylinder(R * 0.55, R * 0.62, baseH, [0, baseH / 2, 0], metal, 28);
        const fins: THREE.Matrix4[] = [];
        const count = 40;
        for (let i = 0; i < count; i++) {
          const angle = (i / count) * Math.PI * 2;
          const mid = (R + core) / 2;
          fins.push(place([Math.cos(angle) * mid, baseH * 0.4 + fin / 2 + 0.3, -Math.sin(angle) * mid], [0, angle + 0.28, 0], [R - core + 1.5, fin + baseH * 0.2, 0.55]));
        }
        instances(s, new THREE.BoxGeometry(1, 1, 1), metal, fins);
        if (dustAmount > 0) {
          const mat = s.mesh(new THREE.CylinderGeometry(R * 0.97, R * 0.97, fin * dustAmount * 0.75, 40, 1, false), felt, [0, baseH + fin * (1 - dustAmount * 0.375) - 0.6, 0]);
          mat.castShadow = true;
        }
        top = baseH + fin;
      } else {
        s.box([W, baseH, D], [0, baseH / 2, 0], metal);
        if (a.form === 'straight') {
          const count = 11, gap = W / count, thick = 1.25;
          const comb = new THREE.Shape();
          comb.moveTo(-W / 2, 0); comb.lineTo(W / 2, 0);
          for (let i = count - 1; i >= 0; i--) {
            const cx = -W / 2 + gap * (i + 0.5);
            comb.lineTo(cx + thick / 2 + 0.25, 0.3); comb.lineTo(cx + thick / 2 - 0.2, fin); comb.lineTo(cx - thick / 2 + 0.2, fin); comb.lineTo(cx - thick / 2 - 0.25, 0.3);
          }
          comb.closePath();
          const geometry = new THREE.ExtrudeGeometry(comb, { depth: D, bevelEnabled: false });
          geometry.translate(0, 0, -D / 2);
          s.mesh(geometry, metal, [0, baseH - 0.1, 0]);
          if (dustAmount > 0) {
            const mats: THREE.Matrix4[] = [];
            for (let i = 0; i < count - 1; i++) {
              const depth = fin * dustAmount * mix(0.55, 1, random());
              mats.push(place([-W / 2 + gap * (i + 1), baseH + fin - depth / 2 - fin * (1 - dustAmount) * 0.3 - 0.4, 0], [0, 0, 0], [gap - thick + 0.3, depth, D * 0.985]));
            }
            instances(s, new THREE.BoxGeometry(1, 1, 1), felt, mats);
          }
        } else {
          const count = 9, gap = W / count;
          const pins: THREE.Matrix4[] = [];
          for (let i = 0; i < count; i++) for (let j = 0; j < count; j++)
            pins.push(place([-W / 2 + gap * (i + 0.5), baseH + fin / 2, -D / 2 + gap * (j + 0.5)], [0, 0, 0], [1.9, fin, 1.9]));
          instances(s, new THREE.BoxGeometry(1, 1, 1), metal, pins);
          if (dustAmount > 0) s.box([W * 0.97, fin * dustAmount * 0.8, D * 0.97], [0, baseH + fin * dustAmount * 0.4, 0], felt);
        }
        top = baseH + fin;
      }
      // Tufts of lint standing proud of the mat and hanging off the edges.
      if (dustAmount > 0 && !clip) {
        const tufts = Math.round(dustAmount * 46);
        for (let i = 0; i < tufts; i++) {
          const edge = random() < 0.4;
          const x = (random() - 0.5) * W * (edge ? 1.02 : 0.9), z = edge ? (random() < 0.5 ? -1 : 1) * D * 0.5 : (random() - 0.5) * D * 0.9;
          const size = 0.9 + random() * 2.2;
          if (round && Math.hypot(x, z) > 21) continue;
          s.ball([size, size * 0.5, size * (0.6 + random())], [x, top - (edge ? random() * fin * 0.7 : fin * (1 - dustAmount) * 0.3) + 0.1, z], i % 3 ? feltLight : felt, 8);
        }
      }
      if (a.lint === 'cobweb') {
        const silk = new THREE.MeshStandardMaterial({ color: '#f1f1ee', roughness: 1, transparent: true, opacity: 0.8 });
        const anchor: [number, number, number] = [W * 0.48, top, D * 0.48];
        for (let i = 0; i < 7; i++) {
          const far: [number, number, number] = [W * 0.5 + 3 + random() * 7, -1, D * 0.5 - i * 4 + random() * 3];
          s.rod(anchor, far, 0.11, silk);
          if (i) s.rod([anchor[0] + (far[0] - anchor[0]) * 0.55, top * 0.45, anchor[2] + (far[2] - anchor[2]) * 0.55], [W * 0.5 + 2.5, top * 0.5 + 1.5, D * 0.5 - (i - 1) * 4 + 1.5], 0.09, silk);
        }
        s.ball([1, 0.8, 1.2], [W * 0.5 + 2.2, top * 0.55, D * 0.3], dark, 8);
      }
    });

    if (clip) {
      // The transistor the comb is bolted to: black body, metal tab, three legs.
      s.box([10, 9, 4.4], [0, 8.2, 3.4], dark);
      s.box([10, 15.5, 1.3], [0, 11.5, 1.85], tin);
      const bolt = s.cylinder(2, 2, 1.6, [0, 16.2, 3.1], tin, 6);
      bolt.rotation.x = Math.PI / 2;
      for (const x of [-2.54, 0, 2.54]) { s.box([0.8, 6, 0.5], [x, 1.2, 3.2], tin); s.cylinder(0.3, 1, 0.6, [x, 0.3, 3.2], tin, 10); }
      s.label(['TIP31C', 'LM7805', 'IRF540', '2N3055'][Math.floor(random() * 4)], 8.6, 2.6, [0, 9.4, 5.62], '#b9bbb8', '#1b1c1f');
      sink.position.z = -1.3;
    } else {
      // The chip underneath, with paste squeezed out at the edges.
      const pack = s.material('#27382f', { roughness: 0.6 });
      s.box([32, chipH, 32], [chipX, chipH / 2, 0], pack);
      const paste = s.material('#aeb1ad', { roughness: 0.9 });
      if (removed) {
        s.box([20, 0.35, 20], [chipX, chipH + 0.15, 0], tin);
        for (let i = 0; i < 20; i++) s.ball([1.2 + random() * 2.5, 0.25, 1.2 + random() * 2.5], [chipX + (random() - 0.5) * 17, chipH + 0.4, (random() - 0.5) * 17], paste, 8);
        sink.position.set((W + 12) / 2, 0, (random() - 0.5) * 4);
        sink.rotation.y = (random() - 0.5) * 0.7;
        sink.rotation.z = -0.07;
      } else {
        for (let i = 0; i < 10; i++) {
          const along = (random() - 0.5) * 30, side = random() < 0.5 ? -1 : 1, onX = random() < 0.5;
          s.ball([1 + random() * 1.4, 0.5, 1 + random() * 1.4], [chipX + (onX ? along : side * 16.4), chipH + 0.1, onX ? side * 16.4 : along], paste, 8);
        }
        sink.position.y = chipH + 0.15;
        if (a.seating === 'askew') {
          sink.rotation.y = mix(0.18, 0.4, random()) * (random() < 0.5 ? -1 : 1);
          sink.position.x = 4 + random() * 4;
          sink.position.z = (random() - 0.5) * 6;
          sink.rotation.z = -0.045;
          s.box([24, 0.3, 24], [0, chipH + 0.1, 0], s.material('#d7d2c2', { roughness: 0.9 }));
        } else if (a.seating === 'pushpins') {
          const nylon = s.material(random() < 0.5 ? '#e9e6dc' : '#1b1c1f', { roughness: 0.6 });
          for (const x of [-1, 1]) for (const z of [-1, 1]) {
            const ear = s.box([9, 1.6, 4], [x * (W / 2 + 1.5), chipH + 1, z * (D / 2 + 1.5)], metal);
            ear.rotation.y = -x * z * Math.PI / 4;
            s.cylinder(1.2, 1.2, 9, [x * (W / 2 + 3.2), 4.5, z * (D / 2 + 3.2)], nylon, 10);
            s.cylinder(2.3, 2.3, 1.6, [x * (W / 2 + 3.2), 9.4, z * (D / 2 + 3.2)], nylon, 10);
          }
        } else {
          const y = chipH + baseH + (round ? 0.6 : 1.2);
          s.tube([[-W / 2 - 4.5, 0.3, 5], [-W / 2 - 3.5, y * 0.7, 4], [-W / 2 + 2, y + 0.4, 1], [W / 2 - 2, y + 0.4, -1], [W / 2 + 3.5, y * 0.7, -4], [W / 2 + 4.5, 0.3, -5]], 0.55, tin);
          for (const side of [-1, 1]) s.box([2.4, 2.4, 3.4], [side * (W / 2 + 4.6), 1.2, -side * 5], dark);
        }
      }
    }

    if (fanOn) {
      const F = round ? 44 : 40, thick = 10;
      const plastic = s.material('#17181b', { roughness: 0.55 });
      const fan = gather(s, () => {
        const frame = new THREE.Shape();
        const h = F / 2, r = 4;
        frame.moveTo(-h + r, -h); frame.lineTo(h - r, -h); frame.quadraticCurveTo(h, -h, h, -h + r); frame.lineTo(h, h - r);
        frame.quadraticCurveTo(h, h, h - r, h); frame.lineTo(-h + r, h); frame.quadraticCurveTo(-h, h, -h, h - r); frame.lineTo(-h, -h + r); frame.quadraticCurveTo(-h, -h, -h + r, -h);
        const hole = new THREE.Path();
        hole.absarc(0, 0, h - 1.6, 0, Math.PI * 2, true);
        frame.holes.push(hole);
        const geometry = new THREE.ExtrudeGeometry(frame, { depth: thick, bevelEnabled: false, curveSegments: 28 });
        geometry.rotateX(-Math.PI / 2);
        s.mesh(geometry, plastic, [0, 0, 0]);
        for (const x of [-1, 1]) for (const z of [-1, 1]) {
          if (a.fan === 'hanging' && !(x === -1 && z === -1)) continue;
          s.cylinder(1.5, 1.5, 0.8, [x * (h - 3), thick + 0.3, z * (h - 3)], tin, 8);
        }
        for (let i = 0; i < 3; i++) s.rod([0, thick - 0.6, 0], [Math.cos(i * 2.094 + 0.5) * (h - 1.6), thick - 0.6, Math.sin(i * 2.094 + 0.5) * (h - 1.6)], 0.9, plastic);
      });
      rotor = gather(s, () => {
        s.cylinder(F * 0.19, F * 0.19, thick * 0.8, [0, thick * 0.5, 0], plastic, 20);
        const sticker = s.cylinder(F * 0.15, F * 0.15, 0.1, [0, thick * 0.9 + 0.06, 0], s.material(a.finish === 'gold' ? '#c9a24a' : '#c8ccd0', { metalness: 0.5, roughness: 0.4 }), 20);
        void sticker;
        const blades = 7;
        for (let i = 0; i < blades; i++) {
          if (a.fan === 'hanging' && i === 2) continue;
          const angle = (i / blades) * Math.PI * 2;
          const blade = s.box([F * 0.25, 0.7, F * 0.2], [Math.cos(angle) * F * 0.3, thick * 0.5, -Math.sin(angle) * F * 0.3], plastic);
          blade.rotation.set(0.5, angle, 0, 'YXZ');
          if (a.fan === 'stalled') s.ball([F * 0.12, 0.8, F * 0.09], [Math.cos(angle) * F * 0.3, thick * 0.5 + 1.8, -Math.sin(angle) * F * 0.3], feltLight, 8).rotation.y = angle;
        }
      });
      fan.add(rotor);
      rotor.rotation.y = random() * 6;
      const wireEnd: [number, number, number] = [bw / 2 - 6.3, 3, bd / 2 - 3.5];
      s.box([6, 5, 3], [wireEnd[0], 2.5, wireEnd[2]], s.material('#e9e6dc', { roughness: 0.6 }));
      const sinkTop = sink.position.y + top;
      const cx = sink.position.x, cz = sink.position.z;
      if (a.fan === 'hanging') {
        fan.position.set(cx - F * 0.5 - 2, sinkTop * 0.55, cz + 3);
        fan.rotation.set(0.12, 0.3, 1.15);
      } else {
        fan.position.set(cx, sinkTop + 0.2, cz);
        fan.rotation.y = sink.rotation.y;
      }
      const from: [number, number, number] = a.fan === 'hanging' ? [cx - F * 0.3, sinkTop * 0.9, cz + F * 0.4] : [cx + F * 0.46, sinkTop + 2, cz + F * 0.46];
      for (const [index, colour] of ['#c62f2f', '#1b1c1f'].entries())
        s.tube([from, [from[0] + 5 + index, Math.max(from[1] * 0.5, 4), from[2] + 4], [wireEnd[0] + index * 1.2 - 0.6, 9, wireEnd[2] + 1], [wireEnd[0] + index * 1.6 - 0.8, 4.5, wireEnd[2]]], 0.5, s.material(colour, { roughness: 0.5 }));
    }

    s.root.scale.setScalar(0.001);
    const speed = mix(4, 26, mood.energy);
    const spin = a.fan === 'spinning' ? rotor : null;
    return s.finish({ update: spin ? (dt) => { spin.rotation.y += dt * speed; } : undefined });
  },
});
