import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

type P = [number, number, number];

export default defineThing({
  questions: {
    derrick: choice('What is the derrick like?', {
      slim: 'A tall slim tripod of three bare tubes meeting at a pulley.',
      lattice: 'A tall braced tripod with cross-struts, a ladder and a small crown platform.',
      squat: 'A short, heavy tripod of thick legs, built to take a hard pull.',
    }),
    depth: score('How deep has the probe gone?', ['It has only just broken the surface', 'Tens of metres', 'Kilometres down', 'All the way through to the ocean below']),
    cable: choice('What state is the cable in?', {
      taut: 'Taut and straight as a ruled line, carrying the full weight.',
      slack: 'Slack: it sags from the pulley and lies in loose loops by the hole.',
      snapped: 'Snapped: a frayed end swings from the pulley and the rest has whipped across the ice.',
      tangled: 'Fouled in a bird-nest tangle on the drum, the winch jammed.',
    }),
    head: choice('Where is the heated drill head?', {
      down: 'Out of sight, down the hole.',
      hoisted: 'Hoisted clear and hanging under the derrick, tip still glowing.',
      laid: 'Laid out on the ice beside the hole.',
    }),
    cameUp: choice('What came up the borehole?', {
      nothing: 'Nothing but steam.',
      brine: 'Rust-orange brine slush, splashed in a ring around the hole.',
      black: 'Black water, welling up and spreading in a glossy pool.',
      glow: 'Faintly glowing green slime, smeared on the rim.',
      tendril: 'Pale tendrils, draped over the rim of the hole and reaching across the ice.',
      relic: 'A corroded object that was made by someone, laid on a tarp beside the hole.',
    }),
    power: choice('What powers the rig?', {
      rtg: 'A finned radioisotope generator, squat and faintly warm.',
      solar: 'A tilted solar panel on a stand.',
      fuel: 'A crated fuel-cell unit with two gas bottles.',
    }),
    livery: choice('What colour is the equipment?', {
      white: 'Agency white with grey trim.',
      orange: 'Hi-vis expedition orange.',
      yellow: 'Industrial yellow, like construction plant.',
      drab: 'Dark olive drab, military and unmarked.',
    }),
    beacon: noul('Is a warning beacon lit on top of the derrick?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const paint = { white: '#e9ecec', orange: '#ee6a1e', yellow: '#f0b81e', drab: '#55604a' }[a.livery];
    const body = s.material(paint, { roughness: 0.5, metalness: 0.2 });
    const steel = s.material('#8c969b', { metalness: 0.75, roughness: 0.4 });
    const dark = s.material('#24292d', { roughness: 0.7 });
    const cableMat = s.material('#1b1e21', { roughness: 0.6, metalness: 0.3 });
    const ice = s.material('#d8ecf4', { roughness: 0.35, flatShading: true });
    const hot = mix(0.6, 2.2, (mood.warmth + mood.energy) / 2);

    const squat = a.derrick === 'squat';
    const H = squat ? 3.5 : 5.2, spread = squat ? 1.75 : 1.9, legR = squat ? 0.085 : a.derrick === 'slim' ? 0.045 : 0.05;
    const feet: P[] = [90, 210, 330].map((deg) => {
      const angle = deg * Math.PI / 180;
      return [Math.cos(angle) * spread, 0, -Math.sin(angle) * spread] as P;
    });
    const apex: P = [0, H, 0];
    const along = (foot: P, t: number): P => [foot[0] * (1 - t), H * t, foot[2] * (1 - t)];
    for (const foot of feet) {
      s.rod(foot, [foot[0] * 0.04, H + 0.15, foot[2] * 0.04], legR, a.derrick === 'slim' ? steel : body);
      s.cylinder(0.16, 0.2, 0.05, [foot[0], 0.025, foot[2]], dark, 12);
    }
    if (a.derrick !== 'slim') {
      const levels = squat ? [0.4] : [0.28, 0.55, 0.78];
      levels.forEach((t, level) => {
        for (let i = 0; i < 3; i++) {
          s.rod(along(feet[i], t), along(feet[(i + 1) % 3], t), legR * 0.55, steel);
          if (!squat && level < levels.length - 1) s.rod(along(feet[i], t), along(feet[(i + 1) % 3], levels[level + 1]), legR * 0.4, steel);
        }
      });
    }
    if (a.derrick === 'lattice') {
      s.cylinder(0.5, 0.5, 0.04, [0, H * 0.86, 0], steel, 6);
      s.ring(0.5, 0.012, [0, H * 0.86 + 0.3, 0], steel).rotation.x = Math.PI / 2;
      // Ladder up the back leg.
      const back = feet[0];
      for (let r = 0; r < 14; r++) { const p = along(back, 0.06 + r * 0.055); s.box([0.3, 0.02, 0.02], [p[0], p[1], p[2] + 0.06], steel); }
    }
    // Crown block and sheave.
    s.box([0.3, 0.16, 0.16], [0, H + 0.02, 0], dark);
    const sheaveY = H - 0.28;
    const sheave = s.ring(0.17, 0.035, [0, sheaveY, 0], steel);
    s.rod([0, sheaveY, -0.07], [0, sheaveY, 0.07], 0.03, dark);
    s.rod([0, H, 0], [0, sheaveY, 0], 0.025, dark);
    let beaconMaterial: THREE.MeshStandardMaterial | null = null;
    if (a.beacon) {
      beaconMaterial = s.material('#ff4b2b', { emissive: '#ff3b1b', emissiveIntensity: 2 });
      s.rod([0, H + 0.1, 0], [0, H + 0.45, 0], 0.015, dark);
      s.ball([0.09, 0.09, 0.09], [0, H + 0.5, 0], beaconMaterial, 12);
    }

    // The borehole: a rimed mound, a steel collar and the dark throat.
    s.lathe([[0.36, 0.02], [0.4, 0.2], [0.55, 0.16], [0.85, 0.07], [1.25, 0.0]], ice);
    s.cylinder(0.4, 0.4, 0.26, [0, 0.15, 0], steel, 24);
    s.cylinder(0.345, 0.345, 0.02, [0, 0.285, 0], s.material('#05080b', { roughness: 0.3 }), 24);
    for (let i = 0; i < 9; i++) {
      const angle = random() * Math.PI * 2, r = 0.6 + random() * 0.6, size = 0.06 + random() * 0.13;
      const chip = s.mesh(new THREE.DodecahedronGeometry(size, 0), ice, [Math.cos(angle) * r, size * 0.5, Math.sin(angle) * r]);
      chip.rotation.set(random() * 3, random() * 3, random() * 3);
    }

    // Winch: a drum between two A-frames. The deeper the probe, the less cable is left on it.
    const DX = -2.5, DY = 0.75;
    for (const z of [-0.45, 0.45]) {
      s.rod([DX - 0.5, 0, z], [DX, DY, z], 0.04, body);
      s.rod([DX + 0.5, 0, z], [DX, DY, z], 0.04, body);
      s.rod([DX - 0.55, 0.04, z], [DX + 0.55, 0.04, z], 0.035, body);
      const flange = s.cylinder(0.6, 0.6, 0.04, [DX, DY, z * 0.82], body, 28);
      flange.rotation.x = Math.PI / 2;
    }
    s.rod([DX - 0.55, 0.04, -0.45], [DX - 0.55, 0.04, 0.45], 0.035, body);
    s.rod([DX + 0.55, 0.04, -0.45], [DX + 0.55, 0.04, 0.45], 0.035, body);
    const wound = mix(0.52, 0.2, a.depth);
    const drum = s.cylinder(wound, wound, 0.7, [DX, DY, 0], cableMat, 28);
    drum.rotation.x = Math.PI / 2;
    for (let w = 0; w < 9; w++) s.ring(wound + 0.004, 0.012, [DX, DY, -0.3 + w * 0.075], steel).rotation.y = 0;
    s.box([0.3, 0.34, 0.3], [DX, 0.5, -0.66], dark);
    // Control post with the depth read-out.
    const depthText = a.depth < 0.2 ? 'DEPTH 0004 m' : a.depth < 0.45 ? `DEPTH 00${40 + Math.floor(random() * 50)} m` : a.depth < 0.8 ? `DEPTH ${(2 + random() * 15).toFixed(1)} km` : 'OCEAN CONTACT';
    s.rod([DX + 0.2, 0, 0.95], [DX + 0.2, 1.05, 0.95], 0.03, steel);
    s.box([0.62, 0.3, 0.08], [DX + 0.2, 1.15, 0.95], dark).rotation.x = -0.3;
    const readout = s.label(depthText, 0.56, 0.2, [DX + 0.2, 1.165, 0.995], a.depth >= 0.8 ? '#ff5a3c' : '#7dffb0', '#0c1512');
    readout.rotation.x = -0.3;
    (readout.material as THREE.MeshStandardMaterial).emissive = new THREE.Color('#ffffff');
    (readout.material as THREE.MeshStandardMaterial).emissiveMap = (readout.material as THREE.MeshStandardMaterial).map;
    (readout.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.7;

    // Cable runs.
    const top: P = [0, sheaveY + 0.17, 0];
    const drumTop: P = [DX + wound * 0.3, DY + wound * 0.95, 0];
    const cableR = 0.022;
    const headLength = 1.25;
    const drawHead = (at: P, lying: boolean) => {
      const group = new THREE.Group();
      const shell = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.09, 0.06], [0.16, 0.22], [0.17, 0.9], [0.13, 1.1], [0.05, 1.2], [0.03, headLength]].map(([x, y]) => new THREE.Vector2(x, y)), 20), steel);
      const tip = new THREE.Mesh(new THREE.LatheGeometry([[0, -0.01], [0.095, 0.055], [0.165, 0.22], [0.172, 0.34]].map(([x, y]) => new THREE.Vector2(x, y)), 20),
        s.material('#ff7a2a', { emissive: '#ff5a14', emissiveIntensity: hot, roughness: 0.4 }));
      group.add(shell, tip);
      for (let c = 0; c < 4; c++) {
        const coil = new THREE.Mesh(new THREE.TorusGeometry(0.178, 0.014, 6, 24), s.material('#c9541c', { emissive: '#ff5a14', emissiveIntensity: hot * 0.5 }));
        coil.rotation.x = Math.PI / 2; coil.position.y = 0.44 + c * 0.1; group.add(coil);
      }
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.175, 0.175, 0.1, 20), body);
      band.position.y = 0.95; group.add(band);
      group.traverse((node) => { node.castShadow = true; });
      group.position.set(...at);
      if (lying) { group.rotation.z = -Math.PI / 2; group.rotation.y = 0.5; }
      s.root.add(group);
    };
    const headOut = a.head === 'hoisted' && a.cable !== 'snapped';
    const headLaid = a.head === 'laid' || (a.head === 'hoisted' && a.cable === 'snapped');
    const downTo = headOut ? 0.75 + headLength : 0.28;
    if (a.cable === 'snapped') {
      // A short frayed end at the pulley, and the long end thrown across the ice.
      const end: P = [0.17 + 0.25, sheaveY - 1.3 - random() * 0.6, 0.15];
      s.tube([[0.17, sheaveY, 0], [0.2, sheaveY - 0.7, 0.03], end], cableR, cableMat);
      for (let f = 0; f < 5; f++) s.rod(end, [end[0] + (random() - 0.5) * 0.25, end[1] - 0.12 - random() * 0.12, end[2] + (random() - 0.5) * 0.25], 0.006, steel, 0.002);
      s.tube([drumTop, [DX + 0.9, 1.6, 0.2], [-1.0, 0.25, 0.9], [-0.2, 0.03, 1.5], [0.9, 0.03, 1.2], [1.4, 0.03, 1.9], [0.6, 0.03, 2.3]], cableR, cableMat);
    } else {
      const sag = a.cable === 'slack' ? 1.1 : a.cable === 'tangled' ? 0.35 : 0.04;
      const mid: P = [(drumTop[0] + top[0]) / 2, (drumTop[1] + top[1]) / 2 - sag, 0];
      s.tube([drumTop, mid, [-0.17, sheaveY + 0.05, 0]], cableR, cableMat);
      if (a.cable === 'slack' && !headOut) {
        s.tube([[0.17, sheaveY, 0], [0.3, sheaveY * 0.5, 0.15], [0.55, 0.45, 0.5], [0.9, 0.04, 0.9], [0.5, 0.04, 1.3], [0.05, 0.04, 1.05], [0.35, 0.05, 0.7], [0.75, 0.06, 1.0], [0.3, 0.06, 1.2], [0.05, 0.3, 0.45], [0, 0.28, 0.05]], cableR, cableMat);
      } else s.rod([0.17, sheaveY, 0], [headOut ? 0 : 0.02, downTo, 0], cableR, cableMat);
    }
    if (a.cable === 'tangled') {
      const knot = s.mesh(new THREE.TorusKnotGeometry(0.34, cableR, 120, 6, 5, 7), cableMat, [DX, DY + wound * 0.6, 0]);
      knot.scale.set(1.15, 0.8, 0.9); knot.rotation.set(random(), random(), random());
      const knot2 = s.mesh(new THREE.TorusKnotGeometry(0.26, cableR, 90, 6, 3, 8), cableMat, [DX + 0.25, DY + wound * 0.3, 0.2]);
      knot2.rotation.set(random() * 3, random() * 3, 0);
    }
    if (headOut) drawHead([0, 0.75, 0], false);
    else if (headLaid) {
      drawHead([0.5, 0.19, 1.75], true);
      for (const x of [0.75, 1.35]) s.box([0.1, 0.06, 0.5], [x, 0.03, 1.75 - (x - 0.5) * 0.55], dark).rotation.y = 0.5;
    }

    // Power unit and its lead to the winch.
    const PX = 2.45, PZ = 0.3;
    if (a.power === 'rtg') {
      s.box([0.9, 0.08, 0.9], [PX, 0.06, PZ], dark);
      s.cylinder(0.26, 0.3, 1.1, [PX, 0.65, PZ], s.material('#3b4044', { metalness: 0.5, emissive: '#ff5a14', emissiveIntensity: 0.08 * hot }), 16);
      for (let f = 0; f < 10; f++) {
        const fin = s.box([0.34, 0.95, 0.02], [PX + Math.cos(f * Math.PI / 5) * 0.4, 0.65, PZ + Math.sin(f * Math.PI / 5) * 0.4], dark);
        fin.rotation.y = -f * Math.PI / 5;
      }
      s.cylinder(0.2, 0.26, 0.1, [PX, 1.25, PZ], body, 16);
      s.label('RTG', 0.3, 0.14, [PX, 0.4, PZ + 0.62], '#141414', '#f4c81e');
    } else if (a.power === 'solar') {
      const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 96;
      const ctx = canvas.getContext('2d')!; ctx.fillStyle = '#16305f'; ctx.fillRect(0, 0, 128, 96);
      ctx.strokeStyle = '#9db6d8'; ctx.lineWidth = 1.5;
      for (let x = 0; x <= 128; x += 16) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 96); ctx.stroke(); }
      for (let y = 0; y <= 96; y += 16) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(128, y); ctx.stroke(); }
      const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace;
      const panel = s.mesh(new THREE.BoxGeometry(1.9, 0.05, 1.3), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.25, metalness: 0.4 }), [PX, 1.15, PZ]);
      panel.rotation.set(0.75, -0.5, 0);
      s.rod([PX, 0, PZ], [PX, 1.1, PZ], 0.05, steel);
      for (const dx of [-0.5, 0.5]) s.rod([PX + dx, 0, PZ - 0.4], [PX, 0.6, PZ], 0.03, steel);
      s.rod([PX, 0, PZ + 0.55], [PX, 0.6, PZ], 0.03, steel);
      s.box([0.4, 0.3, 0.3], [PX - 0.5, 0.15, PZ + 0.5], body);
    } else {
      s.box([1.1, 0.75, 0.8], [PX, 0.42, PZ], body);
      s.box([1.16, 0.06, 0.86], [PX, 0.06, PZ], dark);
      for (let v = 0; v < 6; v++) s.box([0.5, 0.02, 0.01], [PX - 0.2, 0.3 + v * 0.07, PZ + 0.405], dark);
      for (const dz of [-0.2, 0.2]) {
        s.cylinder(0.13, 0.13, 1.15, [PX + 0.8, 0.6, PZ + dz], s.material(dz < 0 ? '#3b74b8' : '#c9cdd0', { metalness: 0.5, roughness: 0.35 }), 14);
        s.ball([0.13, 0.1, 0.13], [PX + 0.8, 1.18, PZ + dz], steel, 12);
      }
      s.rod([PX + 0.3, 0.8, PZ - 0.2], [PX + 0.3, 1.25, PZ - 0.2], 0.04, dark);
    }
    s.tube([[PX - 0.5, 0.2, PZ + 0.2], [1.5, 0.03, 1.1 + random() * 0.4], [0.2, 0.03, -1.3 - random() * 0.4], [-1.6, 0.03, -1.0], [DX, 0.3, -0.7]], 0.025, s.material('#d6a21a', { roughness: 0.6 }));

    // What came up.
    const glowBits: THREE.MeshStandardMaterial[] = [];
    if (a.cameUp === 'brine') {
      const brine = s.material('#b5502a', { roughness: 0.45 });
      for (let i = 0; i < 16; i++) {
        const angle = random() * Math.PI * 2, r = 0.5 + random() * 1.3;
        const splash = s.cylinder(0.1 + random() * 0.22, 0.14 + random() * 0.24, 0.02, [Math.cos(angle) * r, 0.02 + (r < 0.9 ? 0.12 : 0), Math.sin(angle) * r], brine, 10);
        splash.scale.x = 1 + random() * 1.6; splash.rotation.y = -angle;
      }
      s.ring(0.4, 0.05, [0, 0.29, 0], brine).rotation.x = Math.PI / 2;
    } else if (a.cameUp === 'black') {
      const oil = s.material('#06080a', { roughness: 0.05, metalness: 0.6 });
      const blobs: [number, number, number][] = [[0.3, 0.6, 1.5], [1.2, 0.9, 0.8], [-0.5, 1.2, 0.7], [0.9, 1.8, 0.6], [0, 0, 1.2]];
      for (const [x, z, r] of blobs) s.cylinder(r, r, 0.012, [x + (random() - 0.5) * 0.3, 0.012, z + (random() - 0.5) * 0.3], oil, 28).scale.z = 0.7;
      s.cylinder(0.36, 0.36, 0.03, [0, 0.29, 0], oil, 24);
    } else if (a.cameUp === 'glow') {
      const slime = s.material('#6dff8f', { emissive: '#35ff6a', emissiveIntensity: mix(0.9, 1.8, mood.cheer), roughness: 0.2 });
      glowBits.push(slime);
      for (let i = 0; i < 14; i++) {
        const angle = random() * Math.PI * 2, r = 0.38 + random() * random() * 1.1;
        s.ball([0.07 + random() * 0.1, 0.035, 0.07 + random() * 0.1], [Math.cos(angle) * r, r < 0.5 ? 0.28 : 0.03 + Math.max(0, 0.2 - (r - 0.4) * 0.3), Math.sin(angle) * r], slime, 10);
      }
      for (let d = 0; d < 4; d++) { const angle = random() * 6.28; s.rod([Math.cos(angle) * 0.41, 0.27, Math.sin(angle) * 0.41], [Math.cos(angle) * 0.42, 0.06, Math.sin(angle) * 0.42], 0.022, slime, 0.01); }
    } else if (a.cameUp === 'tendril') {
      const flesh = s.material('#d9b8c4', { roughness: 0.35, emissive: '#7a3a5a', emissiveIntensity: 0.15 });
      const count = 4 + Math.floor(random() * 3);
      for (let t = 0; t < count; t++) {
        const angle = 0.4 + t * (Math.PI * 1.5 / count) + random() * 0.4, reach = 1.2 + random() * 1.3, curl = (random() - 0.5) * 1.6;
        const pts: P[] = [[Math.cos(angle) * 0.2, 0.1, Math.sin(angle) * 0.2], [Math.cos(angle) * 0.4, 0.36, Math.sin(angle) * 0.4]];
        for (let k = 1; k <= 4; k++) { const r = 0.4 + reach * k / 4, bend = angle + curl * (k / 4) ** 2; pts.push([Math.cos(bend) * r, k === 4 ? 0.12 + random() * 0.3 : 0.05, Math.sin(bend) * r]); }
        const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)));
        // Tapered: thick at the hole, a thread at the tip.
        const geometry = new THREE.TubeGeometry(curve, 40, 0.11, 8);
        const position = geometry.getAttribute('position');
        const centre = new THREE.Vector3(), vertex = new THREE.Vector3();
        for (let i = 0; i < position.count; i++) {
          const ring = Math.floor(i / 9);
          curve.getPointAt(Math.min(1, ring / 40), centre);
          vertex.fromBufferAttribute(position, i).sub(centre).multiplyScalar(1 - 0.85 * ring / 40).add(centre);
          position.setXYZ(i, vertex.x, vertex.y, vertex.z);
        }
        geometry.computeVertexNormals();
        s.mesh(geometry, flesh);
      }
    } else if (a.cameUp === 'relic') {
      const tarp = s.box([1.3, 0.015, 1.0], [1.0, 0.012, 1.5], s.material('#3a66a8', { roughness: 0.9 }));
      tarp.rotation.y = 0.3;
      const relic = s.material('#3f5a4c', { metalness: 0.7, roughness: 0.55, emissive: '#3cffc0', emissiveIntensity: 0.12 });
      const thing = s.mesh(new THREE.TorusGeometry(0.26, 0.07, 6, 7), relic, [1.0, 0.1, 1.5]);
      thing.rotation.set(Math.PI / 2 + 0.15, 0, random() * 3);
      s.mesh(new THREE.OctahedronGeometry(0.12, 0), relic, [1.0, 0.13, 1.5]).rotation.y = random() * 3;
      for (let i = 0; i < 4; i++) s.box([0.06, 0.2, 0.06], [0.55 + i * 0.3, 0.1, 2.05 - i * 0.09], s.material('#f4c81e'));
    }

    // Steam from the hole: translucent, so it does not count as solid.
    const puffs: THREE.Mesh[] = [];
    const steamCount = Math.round(mix(6, 14, mood.energy)) + (a.cameUp === 'nothing' ? 3 : 0);
    const steamMat = new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.2, depthWrite: false, roughness: 1 });
    for (let i = 0; i < steamCount; i++) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), steamMat);
      puff.userData.phase = random();
      puff.userData.drift = (random() - 0.5) * 0.7;
      s.root.add(puff); puffs.push(puff);
    }
    const lift = squat ? 2.6 : 3.6;
    const setSteam = (time: number) => {
      for (const puff of puffs) {
        const t = (puff.userData.phase + time * mix(0.04, 0.22, mood.energy)) % 1;
        puff.position.set(puff.userData.drift * t * 1.4 + Math.sin(t * 5 + puff.userData.phase * 9) * 0.12, 0.3 + t * lift, puff.userData.drift * t * 0.6);
        puff.scale.set(0.16 + t * 0.42, 0.2 + t * 0.55, 0.16 + t * 0.42);
      }
    };
    setSteam(0);

    const blink = mix(1.5, 7, mood.energy);
    return s.finish({
      footprint: 3.2,
      update: (dt, time) => {
        setSteam(time);
        if (beaconMaterial) beaconMaterial.emissiveIntensity = Math.sin(time * blink) > 0 ? 2.4 : 0.15;
        if (a.cable === 'taut' && a.head === 'down') sheave.rotation.z -= dt * mix(0.2, 1.5, mood.energy);
        for (const bit of glowBits) bit.emissiveIntensity = 1.2 + Math.sin(time * 1.7) * 0.4;
      },
    });
  },
});
