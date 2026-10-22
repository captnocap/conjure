import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

const SCRAWLS = ['WE WERE WARM', 'LAST ONE OUT', 'STILL HERE', 'IT WORKED'];

export default defineThing({
  questions: {
    extent: choice('How much of the shell is left in this piece?', {
      shard: 'A single shard: a handful of huge panels on a stub of frame.',
      rib: 'One long curved rib of truss with panels hanging off it here and there.',
      quarter: 'A broad curved sheet, a quarter-sphere in miniature, holed and ragged at the edge.',
      split: 'A broad sheet cracked in two, the halves just beginning to drift apart.',
    }),
    surface: choice('What are the panels faced with?', {
      mirror: 'Pale silvered mirror, most of it gone dull.',
      collector: 'Black solar collector with a blue cast.',
      foil: 'Crinkled gold foil, warm and cheap-looking at this scale.',
      frost: 'Whatever it was, it is overgrown with white frost and ice crystals.',
    }),
    shine: score('How many panels still catch the light?', ['None, all dead', 'A few here and there', 'About half', 'Most of it still gleams']),
    marking: choice('If its builders left a mark on it, what is it?', {
      none: 'No mark at all.',
      stripe: 'A band of hazard-orange panels running across it.',
      sigil: 'A great ring-and-dot emblem picked out in coloured panels.',
      serial: 'A stencilled sector number in blocky letters.',
      graffiti: 'A few hand-painted words, crooked and personal.',
      tally: 'Rows of scratched tally marks, someone counting days.',
    }),
    damage: choice('How did it come apart?', {
      snapped: 'Clean breaks: truss ends sticking out like snapped bones.',
      impact: 'Something went through it, leaving a round hole with the panels around it pushed in.',
      peeled: 'It is shedding: panels hang by one corner and drift loose.',
    }),
    pose: choice('How does it hang in space?', {
      wall: 'Standing on edge like a sail or a cliff, facing us.',
      bowl: 'Lying on its back like an empty bowl.',
      tumble: 'Tilted mid-tumble, turning slowly.',
    }),
    beacon: noul('Is one small maintenance light still blinking on the frame?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const piece = new THREE.Group();
    s.root.add(piece);
    const Rc = 7, hex = a.extent === 'shard' ? 0.72 : 0.4, thick = hex * 0.09, depth = hex * 1.1;
    const centre = new THREE.Vector3(0, 0, Rc);
    const seedA = random() * 40, seedB = random() * 40;
    const wob = (x: number, y: number) => Math.sin(x * 1.7 + seedA) * Math.cos(y * 2.1 + seedB) * 0.5 + Math.sin(x * 4.3 + y * 3.1 + seedB) * 0.25;
    const split = a.extent === 'split';
    // A point on the shell: u runs sideways, v upward, lift toward the vanished star (+) or outward (-).
    const onShell = (u: number, v: number, lift = 0) => {
      const shift = split ? (u > 0.35 * Math.sin(v * 1.3) ? 0.3 : -0.3) : 0;
      const al = (u + shift) / Rc, be = v / Rc;
      const out = new THREE.Vector3(Math.sin(al) * Math.cos(be), Math.sin(be), -Math.cos(al) * Math.cos(be));
      return centre.clone().addScaledVector(out, Rc - lift);
    };
    const frameAt = (u: number, v: number) => {
      const n = centre.clone().sub(onShell(u, v)).normalize();
      const tu = onShell(u + 0.01, v).sub(onShell(u - 0.01, v)).normalize();
      return { n, tu, tv: new THREE.Vector3().crossVectors(tu, n) };
    };

    const impact = { u: (random() - 0.5) * 3, v: (random() - 0.5) * 1.6, r: 0.95 + random() * 0.4 };
    const decal = a.marking === 'serial' || a.marking === 'graffiti' || a.marking === 'tally' ? { u: (random() - 0.5) * 1.2 - (split ? 1.9 : 0), v: (random() - 0.5) * 0.8, w: a.extent === 'shard' ? 2.6 : split ? 2.4 : 3.2, h: a.extent === 'shard' ? 0.9 : 1.0 } : null;
    const inDecal = (u: number, v: number) => decal !== null && Math.abs(u - decal.u) < decal.w / 2 + hex * 0.6 && Math.abs(v - decal.v) < decal.h / 2 + hex * 0.6;
    const region = (u: number, v: number) => {
      const edge = wob(u, v);
      if (a.extent === 'shard') return Math.hypot(u, v * 1.15) < 2.15 + edge * 0.7;
      if (a.extent === 'rib') return Math.abs(v + Math.sin(u * 0.5) * 0.25) < 0.75 && Math.abs(u) < 4.6;
      const inside = (u / 4.3) ** 2 + (v / 2.9) ** 2 < 1 + edge * 0.45;
      return split ? inside && Math.abs(u - 0.35 * Math.sin(v * 1.3)) > 0.3 : inside;
    };
    const holed = (u: number, v: number) => a.damage === 'impact' && a.extent !== 'rib' && Math.hypot(u - impact.u, v - impact.v) < impact.r;

    type Cell = { q: number; r: number; u: number; v: number; frame: boolean; panel: boolean; hang: boolean; dent: number };
    const cells = new Map<string, Cell>();
    const span = Math.ceil(5 / hex);
    for (let r = -span; r <= span; r++) for (let q = -span * 2; q <= span * 2; q++) {
      const u = hex * Math.sqrt(3) * (q + r / 2), v = hex * 1.5 * r;
      if (Math.abs(u) > 5.2 || Math.abs(v) > 3.6) continue;
      const frame = region(u, v) && !holed(u, v);
      let panel = frame && random() > 0.05 + mood.wear * 0.24 + (a.damage === 'peeled' ? 0.1 : 0);
      if (a.extent === 'rib') panel = !holed(u, v) && Math.abs(u) < 4.6 && Math.abs(v) < 1.9 && (frame ? random() > 0.25 : random() < 0.26 - Math.abs(v) * 0.06) ;
      if (inDecal(u, v) && (frame || a.extent === 'shard')) panel = true;
      if (!frame && !panel) continue;
      const near = Math.hypot(u - impact.u, v - impact.v);
      const dent = a.damage === 'impact' && near < impact.r + 0.9 ? 1 - (near - impact.r) / 0.9 : 0;
      const hang = panel && !inDecal(u, v) && (a.damage === 'peeled' ? random() < 0.22 : a.extent === 'rib' ? !frame && random() < 0.6 : random() < 0.03);
      cells.set(`${q},${r}`, { q, r, u, v, frame: frame || (a.extent === 'shard' && panel), panel, hang, dent });
    }

    // Panels: a dull set and a still-gleaming set, each one instanced mesh, tinted per panel.
    const face = { mirror: '#aab4bd', collector: '#1d2534', foil: '#b98f3a', frost: '#cfdde6' }[a.surface];
    const gleam = { mirror: '#eef6fb', collector: '#3f6ea8', foil: '#ffd76a', frost: '#f4fbff' }[a.surface];
    const dullMat = new THREE.MeshStandardMaterial({ roughness: a.surface === 'frost' ? 0.9 : 0.55, metalness: a.surface === 'frost' ? 0 : 0.35, flatShading: true });
    const gleamMat = new THREE.MeshStandardMaterial({ roughness: 0.18, metalness: 0.2, emissive: gleam, emissiveIntensity: 0.32, flatShading: true });
    const frameMat = s.material('#6b6a6c', { metalness: 0.5, roughness: 0.55 });
    const panelGeo = new THREE.CylinderGeometry(hex * 0.93, hex * 0.93, thick, 6);
    const backGeo = new THREE.CylinderGeometry(hex * 1.0, hex * 1.0, thick * 0.8, 6);
    const paneled = [...cells.values()].filter((cell) => cell.panel);
    const shineRate = Math.min(0.92, a.shine * 0.8 + 0.03);
    const marked = (cell: Cell) => {
      if (a.marking === 'stripe') return Math.abs(cell.v - cell.u * 0.35 - 0.3) < hex * 1.7 ? (Math.abs(cell.q) % 3 ? '#e0741e' : '#2a2620') : null;
      if (a.marking === 'sigil') { const d = Math.hypot(cell.u + (split ? 2 : 0), cell.v); const big = a.extent === 'shard' ? 1.5 : a.extent === 'rib' ? 1.3 : 2.0; return Math.abs(d - big) < hex * 0.62 || d < hex * 0.9 ? '#b8322a' : null; }
      return null;
    };
    const dull: { cell: Cell; colour: THREE.Color }[] = [], bright: { cell: Cell; colour: THREE.Color }[] = [];
    for (const cell of paneled) {
      const mark = marked(cell);
      const colour = new THREE.Color(mark ?? face);
      colour.offsetHSL((random() - 0.5) * 0.02, 0, (random() - 0.5) * (a.surface === 'collector' ? 0.06 : 0.14));
      if (a.surface === 'frost' && !mark && random() < 0.3) colour.lerp(new THREE.Color('#5d6f80'), 0.6);
      if (!mark && random() < shineRate) bright.push({ cell, colour: new THREE.Color(gleam).offsetHSL(0, 0, (random() - 0.5) * 0.1) });
      else dull.push({ cell, colour });
    }
    const m = new THREE.Matrix4(), basis = new THREE.Matrix4(), quat = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1);
    const loose: { mesh: THREE.InstancedMesh; index: number; at: THREE.Vector3; quat: THREE.Quaternion; axis: THREE.Vector3; rate: number }[] = [];
    const layPanels = (list: { cell: Cell; colour: THREE.Color }[], material: THREE.Material, geometry: THREE.BufferGeometry, behind: number) => {
      if (!list.length) return;
      const mesh = new THREE.InstancedMesh(geometry, material, list.length);
      list.forEach(({ cell, colour }, i) => {
        const { n, tu, tv } = frameAt(cell.u, cell.v);
        const at = onShell(cell.u, cell.v, -behind - cell.dent * hex * 1.3);
        basis.makeBasis(tu, n, tv);
        quat.setFromRotationMatrix(basis);
        if (cell.dent > 0) quat.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(Math.sign(cell.v - impact.v) || 1, 0, -Math.sign(cell.u - impact.u) || 1).normalize(), cell.dent * 0.7));
        if (cell.hang) {
          quat.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler((random() - 0.5) * 1.6, random() * 2, (random() - 0.5) * 1.6)));
          at.addScaledVector(n, hex * (0.3 + random() * 1.5)).addScaledVector(tv, (random() - 0.5) * hex);
          if (behind === 0) loose.push({ mesh, index: i, at: at.clone(), quat: quat.clone(), axis: new THREE.Vector3(random() - 0.5, random() - 0.5, random() - 0.5).normalize(), rate: 0.1 + random() * 0.3 });
        }
        mesh.setMatrixAt(i, m.compose(at, quat, one));
        mesh.setColorAt(i, colour);
      });
      mesh.castShadow = mesh.receiveShadow = true;
      piece.add(mesh);
    };
    layPanels(dull, dullMat, panelGeo, 0);
    layPanels(bright, gleamMat, panelGeo, 0);
    layPanels(paneled.filter((cell) => !cell.hang).map((cell) => ({ cell, colour: new THREE.Color('#4a4b50') })), frameMat, backGeo, thick);
    // Every bay keeps its hexagonal rim, so a missing panel shows as an empty socket.
    const rimGeo = new THREE.TorusGeometry(hex * 0.97, hex * 0.07, 4, 6).rotateX(Math.PI / 2).rotateY(Math.PI / 6);
    layPanels([...cells.values()].filter((cell) => cell.frame).map((cell) => ({ cell: { ...cell, hang: false }, colour: new THREE.Color('#77777a') })), frameMat, rimGeo, thick * 0.5);

    // Truss: an outer layer of struts behind the panels, tied to them with posts and diagonals.
    const struts: [THREE.Vector3, THREE.Vector3, number][] = [];
    const lamps: THREE.Vector3[] = [];
    for (const cell of cells.values()) {
      if (!cell.frame) continue;
      const front = onShell(cell.u, cell.v, -thick), back = onShell(cell.u, cell.v, -depth - cell.dent * hex);
      struts.push([front, back, 0.04]);
      [[1, 0], [0, 1], [1, -1], [-1, 0], [0, -1], [-1, 1]].forEach(([dq, dr], k) => {
        const other = cells.get(`${cell.q + dq},${cell.r + dr}`);
        const farU = hex * Math.sqrt(3) * (cell.q + dq + (cell.r + dr) / 2), farV = hex * 1.5 * (cell.r + dr);
        if (other?.frame) {
          if (k < 3) {
            struts.push([back, onShell(other.u, other.v, -depth - other.dent * hex), 0.042]);
            if (k === 0) struts.push([front, onShell(other.u, other.v, -depth - other.dent * hex), 0.026]);
          }
        } else if (random() < (a.damage === 'snapped' ? 0.75 : 0.4)) {
          // A snapped member: a stub pointing at where its neighbour used to be, bent a little.
          const stub = back.clone().lerp(onShell(farU, farV, -depth * (0.4 + random() * 1.4)), 0.35 + random() * 0.5);
          struts.push([back, stub, 0.04]);
          if (random() < 0.3) struts.push([stub, stub.clone().add(new THREE.Vector3(random() - 0.5, random() - 0.5, random() - 0.5).multiplyScalar(hex * 0.7)), 0.02]);
        }
      });
      if (random() < 0.08) lamps.push(back.clone());
    }
    if (a.extent === 'rib') for (let i = -22; i < 22; i++) { const u0 = i * 0.21, u1 = u0 + 0.21; for (const side of [-0.3, 0.3]) struts.push([onShell(u0, side - Math.sin(u0 * 0.5) * 0.25, -depth * 1.6), onShell(u1, side - Math.sin(u1 * 0.5) * 0.25, -depth * 1.6), 0.07]); if (i % 2 === 0) struts.push([onShell(u0, -0.3 - Math.sin(u0 * 0.5) * 0.25, -depth * 1.6), onShell(u1, 0.3 - Math.sin(u1 * 0.5) * 0.25, -depth * 1.6), 0.03]); }
    if (struts.length) {
      const rods = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 1, 5), frameMat, struts.length);
      const up = new THREE.Vector3(0, 1, 0), dir = new THREE.Vector3(), mid = new THREE.Vector3(), size = new THREE.Vector3();
      const girth = a.extent === 'shard' ? 1.7 : 1;
      struts.forEach(([from, to, radius], i) => {
        dir.subVectors(to, from);
        const length = Math.max(dir.length(), 0.001);
        quat.setFromUnitVectors(up, dir.normalize());
        rods.setMatrixAt(i, m.compose(mid.addVectors(from, to).multiplyScalar(0.5), quat, size.set(radius * girth, length, radius * girth)));
      });
      rods.castShadow = true;
      piece.add(rods);
    }

    // Frost crystals growing along the sunward face.
    if (a.surface === 'frost') {
      const crystals = paneled.flatMap((cell) => Array.from({ length: random() < 0.55 ? 2 + Math.floor(random() * 4) : 0 }, () => {
        const u = cell.u + (random() - 0.5) * hex * 1.3, v = cell.v + (random() - 0.5) * hex * 1.3;
        const at = onShell(u, v, cell.hang ? -hex : thick * 0.5 - cell.dent * hex * 1.3);
        return { at: at.toArray() as [number, number, number], size: 0.03 + random() ** 2 * 0.11 };
      }));
      const ice = new Sculpture(context);
      ice.scatter(new THREE.OctahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: '#f2f9fd', roughness: 0.3, emissive: '#a9c4d6', emissiveIntensity: 0.25, flatShading: true }), crystals);
      piece.add(ice.root);
    }

    // Written marks: a transparent decal curved onto the shell.
    if (decal) {
      const canvas = document.createElement('canvas');
      canvas.width = 1024; canvas.height = Math.round(1024 * decal.h / decal.w);
      const ctx = canvas.getContext('2d')!;
      const H = canvas.height;
      const ink = a.surface === 'collector' ? '#e9e2cf' : a.surface === 'frost' ? '#3a4652' : '#2b2a2c';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      if (a.marking === 'serial') {
        ctx.fillStyle = ink;
        ctx.font = `bold ${H * 0.5}px monospace`;
        const code = `SECTOR ${1000 + Math.floor(random() * 8999)}-${'ABCDEFGHK'[Math.floor(random() * 9)]}`;
        ctx.fillText(code, 512, H * 0.4, 980);
        ctx.font = `bold ${H * 0.17}px monospace`;
        ctx.fillText('SUNWARD FACE  ·  DO NOT SHADE', 512, H * 0.82, 900);
        // Stencil bridges and missing chips.
        ctx.globalCompositeOperation = 'destination-out';
        for (let x = 30; x < 1024; x += 58) ctx.fillRect(x, 0, 5, H * 0.7);
        for (let i = 0; i < 60 + mood.wear * 260; i++) ctx.fillRect(random() * 1024, random() * H, 4 + random() * 22, 3 + random() * 10);
      } else if (a.marking === 'graffiti') {
        const text = SCRAWLS[Math.floor(random() * SCRAWLS.length)];
        ctx.strokeStyle = ['#d8452e', '#f0ead8', '#e8a92a'][Math.floor(random() * 3)];
        ctx.fillStyle = ctx.strokeStyle;
        ctx.translate(512, H / 2); ctx.rotate(-0.05 + random() * 0.08); ctx.translate(-512, -H / 2);
        ctx.font = `italic bold ${H * 0.52}px sans-serif`;
        ctx.fillText(text, 512, H * 0.5, 940);
        ctx.lineWidth = 6; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(90, H * 0.86); ctx.quadraticCurveTo(500, H * 0.98, 930, H * 0.82); ctx.stroke();
        for (let i = 0; i < 7; i++) { const x = 120 + random() * 780; ctx.fillRect(x, H * 0.7, 5, 20 + random() * H * 0.25); }
      } else {
        ctx.strokeStyle = ink; ctx.lineWidth = 9; ctx.lineCap = 'round';
        const groups = 9 + Math.floor(random() * 8);
        for (let g = 0; g < groups; g++) {
          const x = 50 + (g % 9) * 108, y = g < 9 ? H * 0.28 : H * 0.72, n = g === groups - 1 ? 1 + Math.floor(random() * 4) : 4;
          for (let k = 0; k < n; k++) { ctx.beginPath(); ctx.moveTo(x + k * 17 + random() * 4, y - H * 0.16); ctx.lineTo(x + k * 17 + random() * 6, y + H * 0.16); ctx.stroke(); }
          if (n === 4) { ctx.beginPath(); ctx.moveTo(x - 12, y + H * 0.1); ctx.lineTo(x + 66, y - H * 0.1); ctx.stroke(); }
        }
      }
      const map = new THREE.CanvasTexture(canvas);
      map.colorSpace = THREE.SRGBColorSpace;
      const plane = new THREE.PlaneGeometry(decal.w, decal.h, 20, 6);
      const pos = plane.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) { const at = onShell(decal.u + pos.getX(i), decal.v + pos.getY(i), thick * 0.5 + 0.012); pos.setXYZ(i, at.x, at.y, at.z); }
      plane.computeVertexNormals();
      const sign = new THREE.Mesh(plane, new THREE.MeshStandardMaterial({ map, transparent: true, alphaTest: 0.35, roughness: 0.9, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 }));
      piece.add(sign);
    }

    const lamp = new THREE.MeshStandardMaterial({ color: '#ff5b3a', emissive: '#ff3b20', emissiveIntensity: 1.4 });
    if (a.beacon) {
      const spot = lamps[0] ?? onShell(0, 0, -depth);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(hex * 0.17, 10, 8), lamp);
      bulb.position.copy(spot);
      const glow = new THREE.Mesh(new THREE.SphereGeometry(hex * 0.5, 12, 8), new THREE.MeshBasicMaterial({ color: '#ff5b3a', transparent: true, opacity: 0.2, depthWrite: false }));
      glow.position.copy(spot);
      piece.add(bulb, glow);
    }

    if (a.pose === 'wall') piece.rotation.set(0.05, 0.3 - random() * 0.6, (random() - 0.5) * 0.3);
    if (a.pose === 'bowl') piece.rotation.set(-Math.PI / 2 + 0.3, 0, (random() - 0.5) * 0.3);
    if (a.pose === 'tumble') piece.rotation.set(-0.55, 0.5, 0.45 + random() * 0.4);

    const turn = mix(0.05, 0.6, mood.energy);
    const q2 = new THREE.Quaternion();
    return s.finish({
      update(_dt, time) {
        lamp.emissiveIntensity = Math.sin(time * 2.2) > 0.6 ? 1.6 : 0.15;
        for (const part of loose) {
          q2.setFromAxisAngle(part.axis, Math.sin(time * part.rate * turn) * 0.5).multiply(part.quat);
          part.mesh.setMatrixAt(part.index, m.compose(part.at, q2, one));
          part.mesh.instanceMatrix.needsUpdate = true;
        }
      },
    });
  },
});
