import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

const MODELS = {
  enamel: { body: '#1b1c1f', key: '#111214', keyTop: '#2a2c30', trim: '#cfd4d6', metal: 0.3 },
  beige: { body: '#cfc3a6', key: '#3a3936', keyTop: '#4a4944', trim: '#8d8c84', metal: 0.1 },
  modern: { body: '#5c646b', key: '#1d2024', keyTop: '#2b3036', trim: '#aab2b8', metal: 0.4 },
  brass: { body: '#4a2b1a', key: '#f1ead6', keyTop: '#fbf6e6', trim: '#c9a24a', metal: 0.2 },
} as const;

export default defineThing({
  questions: {
    model: choice('What kind of stenotype is it?', {
      enamel: 'Glossy black enamel with chrome trim, mid-century and heavy.',
      beige: 'Beige office plastic from the 1980s, yellowing.',
      modern: 'A grey electronic writer with a small glowing screen tilted up from the back.',
      brass: 'An antique in dark wood and brass with ivory keys.',
    }),
    tape: score('How much paper tape has run out of it?', ['A short tongue, the hearing has just begun', 'A neat folded pile', 'A deep heap spilling over', 'Metres of it snaking across the floor']),
    state: choice('What is the machine doing right now?', {
      typing: 'Mid-sentence: keys are going down and the tape is feeding.',
      paused: 'Paused, waiting for the next word.',
      torn: 'Stopped: the tape has been torn off and the record carried away, leaving a ragged end.',
      jammed: 'Jammed, the tape bunched into a crumpled knot at the platen.',
    }),
    mark: choice('What is on the tape?', {
      shorthand: 'Even rows of black shorthand, nothing remarkable.',
      redpen: 'One passage has been circled and struck through in red.',
      blank: 'Nothing. The tape is blank: nobody has said a word.',
      stained: 'A brown coffee stain soaked through the pile.',
    }),
    stool: choice('What does the reporter sit on?', {
      folding: 'A folding canvas camp stool.',
      swivel: 'A padded swivel stool on a pedestal.',
      chair: 'A plain wooden chair.',
      toppled: 'A folding stool, knocked over on its side.',
      none: 'Nothing; the seat has been taken away.',
    }),
    beside: choice('What is on the floor beside it?', {
      nothing: 'Nothing.',
      satchel: 'A worn leather satchel.',
      coffee: 'A paper cup of coffee.',
      rolls: 'A carton of spare fan-fold paper.',
      shoes: 'A pair of shoes slipped off under the tripod.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const m = MODELS[a.model];
    const body = s.material(m.body, { roughness: a.model === 'enamel' ? 0.25 : 0.6, metalness: m.metal });
    const keyMat = s.material(m.key, { roughness: 0.4 });
    const trim = s.material(m.trim, { metalness: 0.85, roughness: 0.25 });
    const black = s.material('#17181b');
    const paperMat = (marks: 'ink' | 'red' | 'none' | 'brown', length: number) => {
      const canvas = document.createElement('canvas'); canvas.width = 64; canvas.height = 256;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = marks === 'brown' ? '#b9905e' : '#f6f2e4'; ctx.fillRect(0, 0, 64, 256);
      if (marks !== 'none') for (let y = 6; y < 256; y += 12) {
        ctx.fillStyle = marks === 'red' ? '#c8202c' : '#2a2c33';
        let x = 6 + Math.floor(random() * 30);
        const count = 1 + Math.floor(random() * 4);
        for (let i = 0; i < count; i++) { ctx.fillRect(x, y, 5, 6); x += 7 + Math.floor(random() * 6); }
        if (marks === 'red') ctx.fillRect(2, y + 2, 60, 2);
      }
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace; texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(1, Math.max(1, length / 0.35));
      return new THREE.MeshStandardMaterial({ map: texture, roughness: 0.9, side: THREE.DoubleSide });
    };
    const ribbon = (points: THREE.Vector3[], width: number, material: THREE.Material) => {
      if (points.length < 2) return;
      const position: number[] = [], uv: number[] = [], index: number[] = [];
      let side = new THREE.Vector3(1, 0, 0), run = 0;
      const up = new THREE.Vector3(0, 1, 0);
      points.forEach((p, i) => {
        const t = points[Math.min(i + 1, points.length - 1)].clone().sub(points[Math.max(i - 1, 0)]);
        const next = t.clone().cross(up);
        if (next.lengthSq() > 1e-6) { next.normalize(); if (next.dot(side) < 0) next.negate(); side = next.lerp(side, 0.5).normalize(); }
        if (i) run += p.distanceTo(points[i - 1]);
        position.push(p.x - side.x * width / 2, p.y, p.z - side.z * width / 2, p.x + side.x * width / 2, p.y, p.z + side.z * width / 2);
        uv.push(0, run, 1, run);
        if (i) index.push(i * 2 - 2, i * 2 - 1, i * 2, i * 2 - 1, i * 2 + 1, i * 2);
      });
      for (let i = 1; i < uv.length; i += 2) uv[i] /= Math.max(run, 0.001);
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      geometry.setIndex(index); geometry.computeVertexNormals();
      s.mesh(geometry, material);
    };

    // Tripod.
    const hubY = 0.58, topY = 0.74;
    for (let i = 0; i < 3; i++) {
      const ang = i * 2.094 + Math.PI / 6 + (random() - 0.5) * 0.1;
      s.rod([0, hubY, 0], [Math.sin(ang) * 0.36, 0.01, Math.cos(ang) * 0.36], 0.014, trim, 0.011);
      s.ball([0.022, 0.014, 0.022], [Math.sin(ang) * 0.36, 0.012, Math.cos(ang) * 0.36], black, 8);
      s.rod([0, 0.3, 0], [Math.sin(ang) * 0.17, 0.3, Math.cos(ang) * 0.17], 0.006, trim);
    }
    s.cylinder(0.02, 0.02, topY - 0.28, [0, (topY + 0.28) / 2, 0], trim, 10);
    s.cylinder(0.035, 0.04, 0.06, [0, hubY, 0], black, 12);
    s.box([0.3, 0.02, 0.2], [0, topY, 0], black);

    // The machine: a wedge body, platen at the back, keys stepping down toward the reporter (+z).
    const W = 0.38, by = topY + 0.01;
    const profile = new THREE.Shape();
    profile.moveTo(-0.15, 0); profile.lineTo(0.16, 0); profile.lineTo(0.16, 0.045); profile.lineTo(0.02, 0.07); profile.lineTo(-0.02, 0.13); profile.lineTo(-0.15, 0.13); profile.closePath();
    const hull = s.mesh(new THREE.ExtrudeGeometry(profile, { depth: W, bevelEnabled: true, bevelSize: 0.008, bevelThickness: 0.008, bevelSegments: 2 }), body, [-W / 2, by, 0]);
    hull.rotation.y = -Math.PI / 2; hull.position.set(W / 2, by, 0);
    s.cylinder(0.028, 0.028, W * 0.72, [0, by + 0.15, -0.09], black, 14).rotation.z = Math.PI / 2;
    for (const x of [-1, 1]) s.cylinder(0.034, 0.034, 0.02, [x * W * 0.39, by + 0.15, -0.09], trim, 14).rotation.z = Math.PI / 2;
    if (a.model === 'enamel' || a.model === 'brass') s.box([W * 0.5, 0.004, 0.03], [0, by + 0.138, -0.03], trim);
    let screen: THREE.MeshStandardMaterial | null = null;
    if (a.model === 'modern') {
      screen = s.material('#7fd0ff', { emissive: '#4fb4ff', emissiveIntensity: 0.9, roughness: 0.2 });
      const lid = s.box([0.24, 0.14, 0.012], [0, by + 0.21, -0.15], body); lid.rotation.x = -0.35;
      const face = s.box([0.21, 0.11, 0.004], [0, by + 0.212, -0.142], screen); face.rotation.x = -0.35;
    }
    // Keys: number bar, two rows of ten, four vowel keys.
    const keys: { mesh: THREE.Mesh; y: number; phase: number }[] = [];
    const key = (x: number, y: number, z: number, w: number, d: number) => {
      const mesh = s.box([w, 0.018, d], [x, y, z], keyMat);
      keys.push({ mesh, y, phase: random() * 40 });
    };
    s.box([W * 0.86, 0.012, 0.022], [0, by + 0.088, 0.035], keyMat);
    for (let r = 0; r < 2; r++) for (let i = 0; i < 10; i++) {
      const gap = i >= 5 ? 0.012 : -0.012;
      key((i - 4.5) * 0.033 + gap, by + 0.075 - r * 0.012, 0.068 + r * 0.04, 0.027, 0.032);
    }
    for (let i = 0; i < 4; i++) key((i - 1.5) * 0.036 + (i >= 2 ? 0.02 : -0.02), by + 0.05, 0.158, 0.03, 0.03);
    if (a.model === 'brass') for (const k of keys) k.mesh.material = s.material(m.keyTop, { roughness: 0.4 });

    // Paper tray behind, and the tape.
    s.box([0.13, 0.008, 0.2], [0, by + 0.02, -0.25], trim);
    for (const x of [-1, 1]) s.box([0.006, 0.05, 0.2], [x * 0.065, by + 0.04, -0.25], trim);
    s.box([0.1, 0.05, 0.16], [0, by + 0.05, -0.25], s.material('#f6f2e4'));

    const tw = 0.1;
    const marks = a.mark === 'blank' ? 'none' : 'ink';
    const pts: THREE.Vector3[] = [];
    const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
    const py = by + 0.178;
    const side = random() > 0.5 ? 1 : -1;
    if (a.state === 'jammed') {
      // A crumpled knot at the platen, then a limp tail.
      let p = v(0, py, -0.09);
      for (let i = 0; i < 26; i++) { pts.push(p.clone()); p = v((random() - 0.5) * 0.16, py + 0.02 + random() * 0.14, -0.1 + (random() - 0.5) * 0.14); }
      pts.push(v(0.05, py, 0.0), v(0.1, by + 0.1, 0.19), v(0.11, by - 0.1 - a.tape * 0.3, 0.2));
      ribbon(pts, tw, paperMat(marks, 2));
    } else {
      // Up over the platen, forward over the top, down behind the tray to the floor.
      pts.push(v(0, by + 0.07, -0.25), v(0, py - 0.03, -0.125), v(0, py, -0.09), v(0, py - 0.005, -0.06));
      const torn = a.state === 'torn';
      const fall = torn ? mix(0.12, 0.3, random()) : topY - 0.02;
      const dropZ = 0.02;
      pts.length = 0;
      pts.push(v(0, by + 0.075, -0.2), v(0, py - 0.02, -0.12), v(0, py, -0.09), v(0, py + 0.03, -0.14), v(0, py + 0.01, -0.3), v(0.01 * side, py - 0.1, -0.37));
      const floorZ = -0.3;
      const steps = 8;
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        if (torn && t * (py - 0.1) > fall) break;
        pts.push(v(side * 0.02 * t + Math.sin(t * 5 + random()) * 0.012, mix(py - 0.1, 0.02, t), floorZ + dropZ + Math.sin(t * 3.2) * 0.03));
      }
      if (!torn) {
        // Fan-fold pile directly beneath, then a spill.
        const folds = Math.round(mix(3, 46, Math.min(1, a.tape * 1.5)));
        const pileX = side * 0.06, half = 0.15;
        for (let i = 0; i < folds; i++) {
          const slump = Math.max(0, i - 14) * 0.004;
          pts.push(v(pileX + (random() - 0.5) * (0.02 + slump), 0.006 + (folds - i) * 0.0075, floorZ + (i % 2 ? half : -half) * mix(0.8, 1.1, random()) + (random() - 0.5) * slump));
        }
        const spill = Math.max(0, a.tape - 0.4) / 0.6;
        if (spill > 0) {
          const length = mix(0.4, 3.4, spill), count = Math.round(length / 0.04);
          let x = pileX, z = floorZ + half, heading = side > 0 ? 0.2 : Math.PI - 0.2;
          for (let i = 0; i < count; i++) {
            heading += side * mix(0.05, 0.1, random()) + (random() - 0.5) * 0.45 + Math.sin(i * 0.21) * 0.14;
            x += Math.cos(heading) * 0.04; z += Math.sin(heading) * 0.04;
            const hump = Math.max(0, Math.sin(i * 0.33 + side)) ** 4 * 0.07 * mix(0.6, 1.4, mood.energy);
            pts.push(v(x, 0.005 + hump, z));
          }
        }
      }
      const cut = a.mark === 'redpen' && pts.length > 16 ? Math.floor(pts.length * mix(0.3, 0.6, random())) : -1;
      const stain = a.mark === 'stained' && pts.length > 16 ? Math.floor(pts.length * 0.55) : -1;
      if (cut > 0) {
        const span = Math.max(6, Math.floor(pts.length * 0.16));
        ribbon(pts.slice(0, cut + 1), tw, paperMat(marks, 2));
        ribbon(pts.slice(cut, cut + span + 1), tw, paperMat('red', 0.6));
        ribbon(pts.slice(cut + span), tw, paperMat(marks, 2));
      } else if (stain > 0) {
        ribbon(pts.slice(0, stain + 1), tw, paperMat(marks, 2));
        ribbon(pts.slice(stain), tw, paperMat('brown', 1));
        s.cylinder(0.2, 0.2, 0.004, [side * 0.05, 0.002, floorZ + 0.05], s.material('#6b4526', { roughness: 0.3 }), 20).scale.set(1.2, 1, 0.8);
      } else ribbon(pts, tw, paperMat(marks, 2));
      if (torn) {
        // The ragged end left behind, and a scrap on the floor.
        const scrap: THREE.Vector3[] = [];
        for (let i = 0; i < 7; i++) scrap.push(v(side * 0.15 + i * 0.03, 0.006 + Math.sin(i) * 0.012, -0.3 + Math.sin(i * 0.9) * 0.05));
        ribbon(scrap, tw, paperMat(marks, 0.3));
      }
    }

    // Seat, in front of the keys and a little to one side.
    const sx = -side * 0.08, sz = 0.62;
    const canvasMat = s.material(mood.cheer > 0.55 ? '#b8482f' : '#5a5f4e', { roughness: 0.95 });
    if (a.stool === 'folding' || a.stool === 'toppled') {
      const g = new THREE.Group();
      const leg = (from: [number, number, number], to: [number, number, number]) => {
        const p = new THREE.Vector3(...from), q = new THREE.Vector3(...to), d = q.clone().sub(p);
        const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, d.length(), 8), trim);
        mesh.position.copy(p.add(q).multiplyScalar(0.5)); mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); mesh.castShadow = true; g.add(mesh);
      };
      for (const z of [-0.15, 0.15]) { leg([-0.19, 0, z], [0.17, 0.44, z]); leg([0.19, 0, z], [-0.17, 0.44, z]); }
      for (const x of [-0.17, 0.17]) leg([x, 0.44, -0.16], [x, 0.44, 0.16]);
      for (const x of [-0.19, 0.19]) leg([x, 0.0, -0.16], [x, 0.0, 0.16]);
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.016, 0.32), canvasMat); seat.position.y = 0.435; seat.castShadow = true; g.add(seat);
      if (a.stool === 'toppled') { g.rotation.set(0.2, random() * 3, Math.PI / 2); g.position.set(sx + side * 0.25, 0.19, sz + 0.1); }
      else { g.position.set(sx, 0.011, sz); g.rotation.y = (random() - 0.5) * 0.6; }
      s.root.add(g);
    } else if (a.stool === 'swivel') {
      s.cylinder(0.17, 0.17, 0.07, [sx, 0.5, sz], s.material(mood.cheer > 0.55 ? '#8d1f2a' : '#22252a', { roughness: 0.6 }), 24);
      s.cylinder(0.02, 0.025, 0.46, [sx, 0.24, sz], trim, 10);
      for (let i = 0; i < 5; i++) s.rod([sx, 0.06, sz], [sx + Math.sin(i * 1.2566) * 0.22, 0.02, sz + Math.cos(i * 1.2566) * 0.22], 0.014, trim);
      s.ring(0.14, 0.008, [sx, 0.2, sz], trim).rotation.x = Math.PI / 2;
    } else if (a.stool === 'chair') {
      const wood = s.material('#7a5632');
      s.box([0.4, 0.04, 0.38], [sx, 0.45, sz], wood);
      for (const x of [-1, 1]) { s.box([0.04, 0.45, 0.04], [sx + x * 0.17, 0.225, sz - 0.16], wood); s.box([0.04, 0.92, 0.04], [sx + x * 0.17, 0.46, sz + 0.17], wood); }
      s.box([0.38, 0.14, 0.03], [sx, 0.82, sz + 0.17], wood);
      s.box([0.38, 0.05, 0.03], [sx, 0.62, sz + 0.17], wood);
    }

    // Beside it.
    const ox = side * 0.5, oz = 0.25;
    if (a.beside === 'satchel') {
      const hide = s.material('#6b4526', { roughness: 0.8 });
      s.box([0.34, 0.24, 0.12], [ox, 0.12, oz], hide).rotation.y = 0.3 * side;
      s.box([0.35, 0.12, 0.13], [ox, 0.2, oz], s.material('#553519')).rotation.y = 0.3 * side;
      s.ring(0.08, 0.01, [ox, 0.25, oz], hide, Math.PI).rotation.y = 0.3 * side;
    } else if (a.beside === 'coffee') {
      s.cylinder(0.042, 0.03, 0.11, [ox * 0.8, 0.055, oz], s.material('#f1eee4'), 14);
      s.cylinder(0.044, 0.044, 0.012, [ox * 0.8, 0.115, oz], s.material('#2a2c30'), 14);
      s.cylinder(0.043, 0.038, 0.04, [ox * 0.8, 0.06, oz], s.material('#8a5a33'), 14);
    } else if (a.beside === 'rolls') {
      s.box([0.34, 0.2, 0.24], [ox, 0.1, oz], s.material('#b89468', { roughness: 0.95 })).rotation.y = 0.2;
      for (let i = 0; i < 3; i++) s.box([0.09, 0.05, 0.2], [ox - 0.1 + i * 0.1, 0.2 + (i === 1 ? 0.03 : 0), oz], s.material('#f6f2e4')).rotation.y = 0.2;
    } else if (a.beside === 'shoes') {
      const shoe = s.material(mood.cheer > 0.55 ? '#a8242f' : '#1d1d20', { roughness: 0.35 });
      for (const k of [0, 1]) { const b = s.ball([0.045, 0.035, 0.12], [side * 0.12 + k * 0.11, 0.035, 0.2 + k * 0.05], shoe, 12); b.rotation.y = k ? 0.5 : -0.1; s.box([0.02, 0.07, 0.02], [side * 0.12 + k * 0.11, 0.035, 0.12 + k * 0.02], shoe); }
    }

    const typing = a.state === 'typing';
    const speed = mix(4, 16, mood.energy), lit = screen;
    return s.finish({
      update: typing || lit ? (_dt, time) => {
        if (typing) for (const k of keys) k.mesh.position.y = k.y - (Math.sin(time * speed + k.phase) > 0.75 ? 0.012 : 0);
        if (lit) lit.emissiveIntensity = 0.8 + Math.sin(time * 3) * 0.15;
      } : undefined,
    });
  },
});
