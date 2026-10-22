import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';
import { type P3, arcText, circleHole, crossings, engraving, finishTexture, gearShape, ribbon, slab, spiral, tile } from './bits';

export default defineThing({
  questions: {
    lid: choice('Is the barrel open?', {
      off: 'The lid has been lifted off and laid beside it; the whole spring is on show.',
      ajar: 'The lid is prised up on one side, propped on the rim.',
      skeleton: 'The lid is on but cut away into windows, so the coils show through.',
      on: 'Closed, the lid snapped in flush: a sealed drum keeping its contents private.',
      lost: 'Open, with no lid anywhere.',
    }),
    spring: choice('What state is the mainspring in?', {
      removed: 'Taken out: the barrel is empty and the spring lies beside it in a long loose S.',
      snapped: 'Broken. A stub is still wrapped on the arbor and the free end has sprung up out of the drum.',
      half: 'Half run down, coils spread evenly across the barrel.',
      slack: 'Run right down: the coils have relaxed out against the wall and the centre is nearly empty.',
      tight: 'Fully wound: every coil clenched tight around the arbor, empty space out to the wall.',
    }),
    metal: choice('What is the barrel made of?', {
      brass: 'Plain yellow brass, turned and honest.',
      gilt: 'Gilded with a sunburst grain, rich and warm.',
      nickel: 'Pale rhodium-plated nickel silver, cool and modern.',
      red: 'Reddish beryllium bronze.',
    }),
    steel: choice('What colour is the spring?', {
      blued: 'Old carbon steel, blued by heat.',
      white: 'Modern white alloy, pale and unbreakable-looking.',
      straw: 'Steel tempered to a straw gold.',
    }),
    teeth: score('How fine are the teeth around the drum?', ['A few big chunky teeth', 'Ordinary', 'Very fine and many']),
    stamp: choice('If the lid is there, what is stamped on it?', {
      plain: 'Nothing, just the turned finish.',
      warning: 'A warning in a ring: DO NOT OPEN.',
      arrow: 'A curved arrow showing the direction of wind.',
      number: 'A calibre number and a tiny maker mark.',
    }),
    ratchet: noul('Is the steel ratchet wheel still fitted on top of the arbor?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const dull = mix(0.25, 0.65, mood.wear);
    const base = { brass: '#d2a640', gilt: '#e4b23a', nickel: '#c6cace', red: '#c9824a' }[a.metal];
    const brass = s.material(base, { metalness: 0.6, roughness: dull, side: THREE.DoubleSide });
    const steel = s.material('#c3c9ce', { metalness: 0.7, roughness: dull });
    const springMaterial = s.material({ blued: '#2d57c9', white: '#e3e6ea', straw: '#d9b45c' }[a.steel], {
      metalness: 0.5, roughness: mix(0.25, 0.7, mood.wear),
      emissive: { blued: '#0f2a80', white: '#3c4044', straw: '#4a3608' }[a.steel], emissiveIntensity: 0.5,
    });
    const R = 6, H = 2.7;
    const teeth = Math.round(mix(28, 84, a.teeth) / 2) * 2;

    // The drum: a turned cup with a ring of teeth round its base.
    s.lathe([[0.9, 0.3], [R - 0.4, 0.3], [R - 0.4, H], [R, H], [R, 0], [0.9, 0]], brass);
    const ring = gearShape(R + mix(1, 0.6, a.teeth), R + 0.05, teeth, 0, 0.22);
    ring.holes.push(circleHole(R - 0.1));
    slab(s, ring, 0.85, brass, 0, 0.05);
    // The arbor with its hook and squared top.
    s.cylinder(1, 1, H - 0.5, [0, 0.3 + (H - 0.5) / 2, 0], steel, 20);
    s.cylinder(0.55, 0.55, 1.2, [0, H + 0.4, 0], steel, 16);
    s.box([0.62, 0.6, 0.62], [0, H + 1.25, 0], steel).rotation.y = random() * 1.5;

    // The spring.
    const y = 0.35 + 0.95, tall = 1.8, thick = 0.1;
    const wall = R - 0.62;
    const phase = random() * 6;
    const coilAt = (points: readonly P3[]) => ribbon(s, points, thick, tall, springMaterial);
    const join = (...parts: P3[][]) => parts.flat();
    let coil: THREE.Mesh | null = null;
    if (a.spring === 'tight') {
      const inner = spiral(8, 1.12, 3.5, y, undefined, 0, phase);
      const last = Math.atan2(inner[inner.length - 1][2], inner[inner.length - 1][0]);
      coil = coilAt(join(inner, spiral(0.8, 3.6, wall, y, undefined, 0, last + 0.1).slice(1)));
    } else if (a.spring === 'half') coil = coilAt(spiral(8, 1.12, wall, y, undefined, 0, phase));
    else if (a.spring === 'slack') {
      const inner = spiral(1.2, 1.12, 3.1, y, undefined, 0, phase);
      const last = Math.atan2(inner[inner.length - 1][2], inner[inner.length - 1][0]);
      coil = coilAt(join(inner, spiral(8, 3.2, wall, y, undefined, 0, last + 0.1).slice(1)));
    } else if (a.spring === 'snapped') {
      coilAt(spiral(1.6, 1.12, 1.7, y, undefined, 0, phase));
      const outer = spiral(6, 3.4, wall, y, undefined, 0, phase + 2).reverse();
      // The broken end climbs out of the drum and curls over the wall.
      const lastPoint = outer[outer.length - 1];
      const from = Math.atan2(lastPoint[2], lastPoint[0]);
      const escape: P3[] = [];
      for (let i = 1; i <= 12; i++) {
        const t = i / 12, angle = from - t * 2.4;
        const radius = wall + t * 3.4 + Math.sin(t * Math.PI) * 1.0;
        escape.push([Math.cos(angle) * radius, y + Math.sin(t * Math.PI * 0.8) * 3.4 + t * 0.6, Math.sin(angle) * radius]);
      }
      coilAt(join(outer, escape));
      // The jagged break.
      const tip = escape[escape.length - 1];
      void tip;
    } else {
      // Out of the barrel a mainspring relaxes into a big reversed S.
      const loose: P3[] = [];
      const cx = R + 9.5, cz = 0.5;
      for (let i = 0; i <= 60; i++) {
        const t = i / 60;
        if (t < 0.55) {
          const u = t / 0.55, angle = phase + u * Math.PI * 4.2, radius = 0.8 + u * 5;
          loose.push([cx + Math.cos(angle) * radius, tall / 2, cz + Math.sin(angle) * radius]);
        } else {
          const u = (t - 0.55) / 0.45, endAngle = phase + Math.PI * 4.2;
          const ex = cx + Math.cos(endAngle) * 5.8, ez = cz + Math.sin(endAngle) * 5.8;
          const tx = -Math.sin(endAngle), tz = Math.cos(endAngle);
          const bend = Math.sin(u * Math.PI) * 3.2;
          loose.push([ex + tx * u * 9 + Math.cos(endAngle) * bend, tall / 2, ez + tz * u * 9 + Math.sin(endAngle) * bend]);
        }
      }
      coilAt(loose);
    }

    // The lid.
    const hasLid = a.lid !== 'lost';
    if (hasLid) {
      const lid = new THREE.Group();
      s.root.add(lid);
      const paper = `#${new THREE.Color(base).getHexString()}`;
      const top = engraving(512, paper, '#3a2a10', (ctx, size) => {
        // Turned rings, then the stamp.
        for (let i = 0; i < 60; i++) {
          ctx.strokeStyle = `rgba(${random() > 0.5 ? '255,245,200' : '60,40,10'},${0.05 + random() * 0.14})`;
          ctx.lineWidth = 1 + random() * 3;
          ctx.beginPath();
          ctx.arc(size / 2, size / 2, 20 + random() * 235, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.fillStyle = '#2e2008';
        ctx.strokeStyle = '#2e2008';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        if (a.stamp === 'warning') {
          ctx.font = 'bold 50px monospace';
          arcText(ctx, 'DO NOT OPEN', size / 2, size / 2, 160, -Math.PI / 2, 0.21);
          arcText(ctx, 'NE PAS OUVRIR', size / 2, size / 2, 160, Math.PI / 2, 0.19);
        } else if (a.stamp === 'arrow') {
          ctx.lineWidth = 12;
          ctx.beginPath();
          ctx.arc(size / 2, size / 2, 150, -2.6, 0.2);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(size / 2 + 150 * Math.cos(0.2) - 34, size / 2 + 150 * Math.sin(0.2) - 14);
          ctx.lineTo(size / 2 + 150 * Math.cos(0.5), size / 2 + 150 * Math.sin(0.5));
          ctx.lineTo(size / 2 + 150 * Math.cos(0.2) + 34, size / 2 + 150 * Math.sin(0.2) - 6);
          ctx.fill();
        } else if (a.stamp === 'number') {
          ctx.font = 'bold 44px monospace';
          ctx.fillText(`CAL ${1000 + Math.floor(random() * 8999)}`, size / 2, size / 2 + 130);
          ctx.font = 'bold 30px monospace';
          ctx.fillText('SWISS', size / 2, size / 2 - 130);
        }
      });
      top.repeat.set(1 / (R * 2), 1 / (R * 2));
      top.offset.set(0.5, 0.5);
      const lidShape = new THREE.Shape();
      lidShape.absarc(0, 0, R - 0.45, 0, Math.PI * 2, false);
      lidShape.holes.push(circleHole(0.62));
      if (a.lid === 'skeleton') crossings(lidShape, 1.5, R - 1.4, 3, 0.5);
      const plate = slab(s, lidShape, 0.32, s.material('#ffffff', { map: top, metalness: 0.5, roughness: dull }), 0, 0.04);
      lid.attach(plate);
      // A snap rim round the edge so it reads as a lid from the side.
      const rim = new THREE.Mesh(new THREE.TorusGeometry(R - 0.5, 0.12, 6, 48), brass);
      rim.rotation.x = Math.PI / 2;
      rim.position.y = 0.16;
      rim.castShadow = true;
      lid.add(rim);
      if (a.lid === 'on' || a.lid === 'skeleton') lid.position.y = H - 0.25;
      else if (a.lid === 'ajar') {
        const angle = random() * 6;
        lid.rotation.set(0, angle, 0);
        lid.rotateZ(0.42);
        lid.position.set(Math.cos(angle) * -0.6, H + 2.0, Math.sin(angle) * 0.6);
      } else {
        const side = a.spring === 'removed' ? -1 : 1;
        lid.position.set(side * (R * 2 + 1.8), 0, 1.5 + random() * 2);
        lid.rotation.y = random() * 6;
        if (random() < 0.4) lid.rotation.x = Math.PI;
        if (lid.rotation.x) lid.position.y = 0.32;
      }
    }

    if (a.ratchet && (a.lid === 'on' || a.lid === 'skeleton')) {
      const wheel = gearShape(2.9, 2.35, 22, 0.18, 0.08);
      wheel.holes.push(circleHole(0.45));
      slab(s, wheel, 0.4, steel, H + 0.25, 0.04);
      s.cylinder(0.75, 0.75, 0.2, [0, H + 0.75, 0], s.material('#2f55c8', { metalness: 0.55, roughness: 0.28, emissive: '#10235f', emissiveIntensity: 0.5 }), 14);
    }

    // Grease and grit collect in an old barrel.
    if (mood.wear > 0.45 && a.spring !== 'removed') {
      const grime = s.material('#3a2a18', { roughness: 0.95 });
      const blobs = [];
      for (let i = 0; i < Math.round(mood.wear * 12); i++) {
        const angle = random() * 6.3, radius = 1.5 + random() * 3.6;
        blobs.push({ at: [Math.cos(angle) * radius, y + tall / 2 + 0.02, Math.sin(angle) * radius] as [number, number, number], size: 0.1 + random() * 0.16 });
      }
      if (a.lid !== 'on') s.scatter(new THREE.SphereGeometry(1, 6, 4), grime, blobs).scale.y = 1;
    }

    // A wound spring shivers with the energy in it.
    const tension = a.spring === 'tight' ? 1 : a.spring === 'half' ? 0.5 : 0;
    const live = coil;
    const baseY = live ? live.scale.y : 1;
    s.root.scale.setScalar(0.05);
    return s.finish({
      update: live && tension > 0
        ? (_dt, time) => {
            const pulse = 1 + Math.sin(time * mix(1, 7, mood.energy)) * 0.012 * tension * mix(0.4, 1.6, mood.energy);
            live.scale.set(pulse, baseY, pulse);
          }
        : undefined,
    });
  },
});
