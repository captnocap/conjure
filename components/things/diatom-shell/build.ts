import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

type Outline = { points: THREE.Vector2[]; W: number; H: number; depth: number; inside: (x: number, y: number) => number };

export default defineThing({
  questions: {
    form: choice('What shape is the frustule?', {
      pillbox: 'A centric pillbox: a round lid and base, pores in rings and rays like a rose window.',
      triangle: 'A three-cornered cushion covered in honeycomb.',
      boat: 'A pennate boat: a long pointed lens with a slit down the keel and ribs across it.',
      sigmoid: 'A slender S-curved boat, like a drawn bow.',
      sun: 'A round disc ringed with long glass spines, a tiny sun.',
      chain: 'A chain of little drums joined end to end into a filament.',
    }),
    contents: choice('What is inside the shell?', {
      amber: 'Living: golden-brown chloroplasts glowing amber through the pores.',
      green: 'Living: olive-green plates, freshly dividing.',
      oil: 'A few fat golden oil droplets and not much else.',
      empty: 'Nothing; it is cleaned, empty and perfectly clear.',
      fossil: 'Nothing; it is a chalk-white fossil from a seabed millions of years old.',
    }),
    state: choice('What state is the box in?', {
      intact: 'Closed and whole, lid seated over base.',
      ajar: 'Lid lifted ajar like a jewel box.',
      apart: 'The two halves lie apart, the lid fallen beside the base among chips.',
      dividing: 'Two cells still stuck face to face, just divided.',
    }),
    lace: score('How fine is the perforation?', ['Bold round holes you could count', 'Neat rows of pores', 'Impossibly fine lace']),
    glass: choice('What is the glass like?', {
      clear: 'Water-clear with a faint blue edge.',
      opal: 'Opalescent, with rainbow interference colours.',
      smoky: 'Smoky grey quartz.',
      gilded: 'Sputter-coated in gold, as for an electron microscope.',
      rose: 'Pale rose glass.',
    }),
    display: choice('How is it lying?', {
      flat: 'Flat on its face, pattern to the sky.',
      propped: 'Propped at an angle like a plate on a stand.',
      edge: 'Standing on its edge like a coin.',
    }),
    spines: noul('Does it carry long glass spines?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const fossil = a.contents === 'fossil';
    const fine = a.lace;

    const outline = ((): Outline => {
      const points: THREE.Vector2[] = [];
      if (a.form === 'boat' || a.form === 'sigmoid') {
        const L = a.form === 'boat' ? 1.25 : 1.45, w = a.form === 'boat' ? 0.36 : 0.25;
        const mid = (x: number) => (a.form === 'sigmoid' ? 0.3 * (x / L) ** 3 + 0.06 * (x / L) : 0);
        const half = (x: number) => w * Math.pow(Math.max(0, 1 - (x / L) ** 2), 0.75) + 0.012;
        for (let i = 0; i <= 40; i++) { const x = mix(-L, L, i / 40); points.push(new THREE.Vector2(x, mid(x) + half(x))); }
        for (let i = 40; i >= 0; i--) { const x = mix(-L, L, i / 40); points.push(new THREE.Vector2(x, mid(x) - half(x))); }
        return { points, W: 2 * L, H: 2 * (w + 0.4), depth: 0.3, inside: (x, y) => half(x) - Math.abs(y - mid(x)) };
      }
      const r = (angle: number) => (a.form === 'triangle' ? 0.6 + 0.42 * Math.pow(Math.abs(Math.cos(1.5 * (angle - Math.PI / 2))), 1.6) : a.form === 'chain' ? 0.62 : 1);
      for (let i = 0; i < 72; i++) { const angle = (i / 72) * Math.PI * 2; points.push(new THREE.Vector2(Math.cos(angle) * r(angle), Math.sin(angle) * r(angle))); }
      return { points, W: 2.1, H: 2.1, depth: a.form === 'triangle' ? 0.34 : a.form === 'chain' ? 0.62 : 0.46, inside: (x, y) => r(Math.atan2(y, x)) - Math.hypot(x, y) };
    })();
    const { W, H, depth, inside } = outline;

    // The valve face: glass with real holes, painted then punched out of a canvas.
    const tint = new THREE.Color(fossil ? '#efece2' : { clear: '#dcecf0', opal: '#ece8f6', smoky: '#8c979c', gilded: '#d6ae4e', rose: '#eec4cc' }[a.glass]);
    tint.lerp(new THREE.Color('#9a927f'), mood.wear * 0.25);
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
    const px = (x: number) => (x / W + 0.5) * size, py = (y: number) => (0.5 - y / H) * size;
    const shade = 'rgba(70,90,100,0.5)';
    const holes: [number, number, number, number][] = [];
    const hole = (x: number, y: number, radius: number, across = radius) => { if (inside(x, y) > across + 0.03) holes.push([x, y, radius, across]); };
    ctx.strokeStyle = shade;
    ctx.lineWidth = 3;
    if (a.form === 'boat' || a.form === 'sigmoid') {
      const L = W / 2, n = Math.round(mix(13, 44, fine)), pitch = (2 * L) / n, q = Math.min(pitch, (a.form === 'boat' ? 0.36 : 0.25) / 3.2);
      const mid = (x: number) => (a.form === 'sigmoid' ? 0.3 * (x / L) ** 3 + 0.06 * (x / L) : 0);
      for (let i = 1; i < n; i++) {
        const x = -L + i * pitch;
        for (let y = q * 0.85; y < 0.6; y += q * 0.86) for (const side of [-1, 1]) hole(x, mid(x) + side * y, pitch * 0.3, q * 0.3);
      }
      // The raphe: a slit along the keel, interrupted at the central nodule.
      for (let x = -L * 0.9; x < L * 0.9; x += 0.02) if (Math.abs(x) > 0.1) holes.push([x, mid(x), 0.011, 0.011]);
      ctx.beginPath(); ctx.ellipse(px(0), py(0), (0.09 / W) * size, (0.07 / H) * size, 0, 0, 7); ctx.stroke();
    } else if (a.form === 'triangle') {
      const pitch = mix(0.19, 0.075, fine);
      for (let row = -14; row <= 14; row++) for (let col = -14; col <= 14; col++) hole((col + (row % 2 ? 0.5 : 0)) * pitch, row * pitch * 0.866, pitch * 0.36);
      for (let k = 0; k < 3; k++) { const angle = Math.PI / 2 + (k * Math.PI * 2) / 3; ctx.beginPath(); ctx.arc(px(Math.cos(angle) * 0.86), py(Math.sin(angle) * 0.86), 14, 0, 7); ctx.stroke(); }
    } else {
      const R = a.form === 'chain' ? 0.62 : 1, rings = Math.round(mix(3, 11, fine) * (a.form === 'chain' ? 0.6 : 1)) + 1, pitch = (R * 0.9) / rings;
      hole(0, 0, pitch * 0.3);
      for (let k = 1; k <= rings; k++) {
        const count = Math.round((Math.PI * 2 * k * pitch) / (pitch * 0.95));
        for (let i = 0; i < count; i++) { const angle = ((i + (k % 2) * 0.5) / count) * Math.PI * 2; hole(Math.cos(angle) * k * pitch, Math.sin(angle) * k * pitch, pitch * mix(0.34, 0.3, fine)); }
      }
      for (let k = 0; k < 12; k++) { const angle = (k / 12) * Math.PI * 2; ctx.beginPath(); ctx.moveTo(px(0), py(0)); ctx.lineTo(px(Math.cos(angle) * R), py(Math.sin(angle) * R)); ctx.globalAlpha = 0.35; ctx.stroke(); ctx.globalAlpha = 1; }
    }
    ctx.globalCompositeOperation = 'destination-out';
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(40,58,66,0.5)';
    for (const [x, y, radius, across] of holes) { ctx.beginPath(); ctx.ellipse(px(x), py(y), (radius / W) * size * 1.45 + 1, (across / H) * size * 1.45 + 1, 0, 0, 7); ctx.fill(); }
    ctx.globalCompositeOperation = 'destination-out';
    for (const [x, y, radius, across] of holes) { ctx.beginPath(); ctx.ellipse(px(x), py(y), (radius / W) * size, (across / H) * size, 0, 0, 7); ctx.fill(); }
    ctx.globalCompositeOperation = 'source-over';
    const lace = new THREE.CanvasTexture(canvas);
    lace.colorSpace = THREE.SRGBColorSpace;
    lace.repeat.set(1 / W, 1 / H);
    lace.offset.set(0.5, 0.5);
    lace.anisotropy = 4;
    const common = { color: tint, roughness: fossil ? 0.95 : mix(0.12, 0.5, mood.wear), metalness: a.glass === 'gilded' && !fossil ? 0.85 : 0, clearcoat: fossil ? 0 : 0.8 } as const;
    const opal = a.glass === 'opal' && !fossil ? { iridescence: 1, iridescenceIOR: 1.8, sheen: 1, sheenColor: new THREE.Color('#9fd8ff') } : {};
    const face = new THREE.MeshPhysicalMaterial({ ...common, ...opal, map: lace, alphaTest: 0.5, side: THREE.DoubleSide });
    const band = new THREE.MeshPhysicalMaterial({ ...common, ...opal, color: tint.clone().multiplyScalar(0.86), side: THREE.DoubleSide });
    const spine = new THREE.MeshPhysicalMaterial({ ...common, color: tint.clone().multiplyScalar(0.92) });

    const shape = new THREE.Shape(outline.points);
    const valveGeometry = new THREE.ExtrudeGeometry(shape, { depth: depth * 0.58, bevelEnabled: false, curveSegments: 24 });
    const valve = (scale: number) => {
      const mesh = new THREE.Mesh(valveGeometry, [face, band]);
      mesh.scale.set(scale, scale, 1);
      mesh.castShadow = true;
      return mesh;
    };
    const living = a.contents === 'amber' || a.contents === 'green' || a.contents === 'oil';
    const plastid = new THREE.MeshStandardMaterial({ color: a.contents === 'green' ? '#8a9a2c' : '#c8862a', roughness: 0.5, emissive: a.contents === 'green' ? '#55661a' : '#8a4a10', emissiveIntensity: mix(0.25, 0.6, mood.cheer) });
    const oil = new THREE.MeshPhysicalMaterial({ color: '#f0c040', roughness: 0.08, emissive: '#b07a10', emissiveIntensity: 0.45, clearcoat: 1 });
    const unit = new THREE.SphereGeometry(1, 16, 10);
    const lids: THREE.Group[] = [];

    const cell = (state: 'intact' | 'ajar' | 'apart') => {
      const group = new THREE.Group();
      const base = valve(1);
      base.position.z = -depth / 2;
      group.add(base);
      const lid = new THREE.Group();
      const top = valve(1.035);
      top.position.z = depth / 2 - depth * 0.58;
      lid.add(top);
      // A thicker girdle band where the halves overlap.
      const girdle = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: depth * 0.16, bevelEnabled: false, curveSegments: 24 }), band);
      girdle.scale.set(1.06, 1.06, 1);
      girdle.position.z = -depth * 0.08;
      girdle.castShadow = true;
      lid.add(girdle);
      if (a.spines) {
        const rim = outline.points, count = a.form === 'boat' || a.form === 'sigmoid' ? 4 : a.form === 'triangle' ? 3 : a.form === 'sun' ? 18 : 10;
        for (let i = 0; i < count; i++) {
          const p = a.form === 'boat' || a.form === 'sigmoid' ? rim[[1, 39, 42, 80][i]] : a.form === 'triangle' ? rim[18 + i * 24] : rim[Math.floor((i / count) * rim.length)];
          const dir = new THREE.Vector3(p.x, p.y, (i % 2 ? 0.25 : -0.25)).normalize(), length = mix(0.5, 0.95, random());
          const cone = new THREE.Mesh(new THREE.ConeGeometry(0.02, length, 5), spine);
          cone.position.set(p.x, p.y, 0).addScaledVector(dir, length / 2);
          cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
          cone.castShadow = true;
          lid.add(cone);
        }
      }
      if (a.form === 'sun' && !a.spines) for (let i = 0; i < 24; i++) {
        const angle = (i / 24) * Math.PI * 2;
        const ray = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.34, 4), spine);
        ray.position.set(Math.cos(angle) * 1.17, Math.sin(angle) * 1.17, 0);
        ray.rotation.z = angle - Math.PI / 2;
        lid.add(ray);
      }
      if (living) {
        const inner = new THREE.Group();
        if (a.contents === 'oil') for (let i = 0; i < 4; i++) {
          const blob = new THREE.Mesh(unit, oil), x = (random() - 0.5) * W * 0.6, y = (random() - 0.5) * 0.2;
          blob.position.set(x, y, 0);
          blob.scale.setScalar(Math.min(depth * 0.36, Math.max(0.06, inside(x, y) * 0.7)));
          inner.add(blob);
        } else if (a.form === 'boat' || a.form === 'sigmoid') for (const side of [-1, 1]) for (let i = 0; i < 6; i++) {
          const x = mix(-0.8, 0.8, i / 5) * (W / 2), room = Math.max(0.03, inside(x, 0));
          const plate = new THREE.Mesh(unit, plastid);
          plate.position.set(x, side * room * 0.45 + (a.form === 'sigmoid' ? 0.3 * (x / (W / 2)) ** 3 + 0.06 * (x / (W / 2)) : 0), 0);
          plate.scale.set(W * 0.09, room * 0.42, depth * 0.3);
          inner.add(plate);
        } else for (let i = 0; i < 26; i++) {
          const angle = random() * Math.PI * 2, d = Math.sqrt(random()) * 0.85, x = Math.cos(angle) * d, y = Math.sin(angle) * d;
          if (inside(x, y) < 0.12) continue;
          const disc = new THREE.Mesh(unit, plastid);
          disc.position.set(x, y, (random() - 0.5) * depth * 0.3);
          disc.scale.set(0.11, 0.11, depth * 0.2);
          inner.add(disc);
        }
        group.add(inner);
      }
      if (state === 'ajar') {
        const hinge = new THREE.Group();
        hinge.position.set(0, H * 0.2, depth * 0.1);
        lid.position.set(0, -H * 0.2, -depth * 0.1);
        hinge.add(lid);
        hinge.rotation.x = -mix(0.5, 0.85, random());
        hinge.position.z += depth * 0.35;
        group.add(hinge);
        lids.push(hinge);
      } else if (state === 'intact') group.add(lid);
      return { group, lid };
    };

    const pose = new THREE.Group();
    const tilt = a.form === 'chain' ? 0 : { flat: -Math.PI / 2 + 0.1, propped: -0.72, edge: a.form === 'boat' || a.form === 'sigmoid' ? -0.4 : -0.06 }[a.display];
    const loose: THREE.Object3D[] = [];
    if (a.form === 'chain') {
      const count = Math.round(mix(3, 7, mood.density));
      const row = new THREE.Group();
      for (let i = 0; i < count; i++) {
        const last = i === count - 1;
        const made = cell(last && a.state === 'ajar' ? 'ajar' : last && a.state === 'apart' ? 'apart' : 'intact');
        made.group.position.z = (i - (count - 1) / 2) * depth * 1.04;
        made.group.rotation.z = random() * 3;
        row.add(made.group);
        if (last && a.state === 'apart') loose.push(made.lid);
      }
      row.rotation.y = Math.PI / 2 - 0.35;
      row.rotation.z = a.display === 'edge' ? 0.5 : a.display === 'propped' ? 0.22 : 0;
      pose.add(row);
    } else if (a.state === 'dividing') {
      for (const side of [-1, 1]) { const made = cell('intact'); made.group.position.z = side * depth * 0.52; if (side < 0) made.group.rotation.y = Math.PI; pose.add(made.group); }
      pose.rotation.x = tilt;
    } else {
      const made = cell(a.state);
      pose.add(made.group);
      pose.rotation.x = tilt;
      if (a.state === 'apart') loose.push(made.lid);
    }
    pose.rotation.y = (random() - 0.5) * 0.3;
    pose.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(pose);
    pose.position.y = -box.min.y;
    s.root.add(pose);

    if (loose.length) {
      // The fallen lid and a scatter of glass chips.
      const lid = loose[0];
      lid.rotation.set(-Math.PI / 2 + 0.2, 0, 0.5 + random());
      lid.position.set(W * 0.5 + 0.2, depth * 0.3 + 0.12, (box.max.z - box.min.z) * 0.3 + 0.3);
      s.root.add(lid);
      const chip = new THREE.TetrahedronGeometry(0.06, 0);
      for (let i = 0; i < 10; i++) {
        const piece = s.mesh(chip, band, [mix(-W * 0.5, W * 0.9, random()), 0.02, mix(0.2, 1.0, random())]);
        piece.rotation.set(random() * 3, random() * 3, 0);
        piece.scale.setScalar(mix(0.6, 1.8, random()));
      }
    }
    if (fossil) {
      const chalk = s.mesh(new THREE.DodecahedronGeometry(1, 1), s.material('#e8e3d4', { flatShading: true, roughness: 1 }), [0, -0.16, 0]);
      chalk.scale.set(W * 0.62, 0.18, Math.max(0.8, (box.max.z - box.min.z) * 0.7));
    }

    s.root.scale.setScalar(0.14);
    const drift = mix(0.05, 0.5, mood.energy);
    return s.finish({
      update: (_dt, time) => {
        pose.rotation.y += 0;
        lids.forEach((hinge, i) => { hinge.rotation.x += Math.sin(time * 1.3 + i) * 0.0008 * drift; });
        pose.rotation.z = Math.sin(time * drift) * 0.03;
      },
    });
  },
});
