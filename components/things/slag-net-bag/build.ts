import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

const CONTENTS = {
  slag: 'Dark clinker and waste rock, the leavings of the smelter.',
  ice: 'Dirty blue-white ice chunks, somebody\'s water ration.',
  scrap: 'Scrap metal: plates, pipes and girders poking through the mesh.',
  belongings: "Someone's belongings: suitcases, a chair, a rolled mattress, a lamp.",
  hot: 'Green-glowing tailings that should have been buried.',
} as const;

function netTexture(ink: string) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.strokeStyle = ink; ctx.lineWidth = 4;
  for (let i = -128; i <= 256; i += 32) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + 128, 128); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(i + 128, 0); ctx.lineTo(i, 128); ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(6, 2.5);
  return texture;
}

export default defineThing({
  questions: {
    size: score('How big is the bag?', ['A sack you could carry', 'As big as a person', 'As big as a truck', 'A house-sized bulge blotting out the stars']),
    contents: choice('What is in the net?', CONTENTS),
    shape: choice('What shape has the load settled into?', {
      round: 'A fat round ball, evenly packed.',
      teardrop: 'A teardrop hanging point-down from its tether like a balloon.',
      lumpy: 'A lopsided lumpy mass with one big bulge.',
      double: 'Two bulges cinched in the middle, like a figure eight.',
    }),
    tether: choice('How does it ride on its tether?', {
      taut: 'Straight up on a taut line, perfectly still.',
      drifting: 'Leaning well off to one side, tugging at the stake.',
      slack: 'Barely off the ground on a slack looping line.',
    }),
    torn: noul('Has the net torn, letting pieces spill out and drift away?'),
    tag: choice('What does the tag on the stake say?', {
      none: 'No tag at all.',
      waste: 'WASTE',
      hands: 'HANDS OFF',
      name: 'A surname and a bunk number.',
      sale: 'FOR SALE',
      owed: 'SEIZED FOR DEBT',
    }),
    strobe: noul('Is there a warning strobe clipped to the top of it?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const r = mix(0.5, 2.3, a.size);
    const steel = s.material('#868c90', { metalness: 0.7, roughness: 0.4 });
    const dark = s.material('#2a2d30', { roughness: 0.8 });
    const rope = s.material('#c7b27c', { roughness: 0.95 });
    const tints: Record<keyof typeof CONTENTS, string[]> = {
      slag: ['#3c3a3a', '#55504c', '#2c2b2d', '#6a5f55'], ice: ['#cde6f3', '#a8d3ec', '#eef9fc', '#8fb4c8'],
      scrap: ['#8a5a3a', '#7d8a90', '#a9743c', '#40464a', '#b8b0a0'], belongings: ['#b0503a', '#3f78a8', '#d8c9a0', '#6b8a52', '#d8a8b8'],
      hot: ['#4f5c34', '#9df04a', '#3a4428', '#c8ff70'],
    };
    const palette = tints[a.contents];

    // Stake driven into the rock.
    const stakeTop: [number, number, number] = [0, 0.85, 0];
    s.rod([0.12, 0, 0.05], stakeTop, 0.05, steel, 0.04);
    s.box([0.3, 0.05, 0.05], [0.02, 0.7, 0], steel);
    s.ring(0.09, 0.025, [0, 0.93, 0], steel);
    const chips: { at: [number, number, number]; size: number; color: string }[] = [];
    for (let i = 0; i < 9; i++) { const angle = random() * 7, d = 0.15 + random() * 0.35; chips.push({ at: [0.12 + Math.cos(angle) * d, 0.04, Math.sin(angle) * d], size: mix(0.04, 0.1, random()), color: '#77736c' }); }
    if (a.tag !== 'none') {
      const text = { waste: 'WASTE', hands: 'HANDS OFF', name: ['OKAFOR B7', 'LINDQVIST 12', 'REYES B3', 'TANAKA 9'][Math.floor(random() * 4)], sale: 'FOR SALE', owed: 'SEIZED FOR DEBT' }[a.tag];
      const paper = a.tag === 'owed' ? '#e8d23a' : a.tag === 'sale' ? '#f2efe2' : '#d9d2b8';
      const tag = s.label(text, 0.62, 0.26, [0.02, 0.5, 0.08], a.tag === 'hands' ? '#b3261e' : '#22262a', paper);
      tag.rotation.z = (random() - 0.5) * 0.3;
    }

    // Everything that floats swings from the stake ring.
    const afloat = new THREE.Group();
    afloat.position.set(...stakeTop);
    s.root.add(afloat);
    const put = <T extends THREE.Object3D>(node: T) => { afloat.add(node); node.traverse((child) => { child.castShadow = child.receiveShadow = true; }); return node; };

    const tall = a.shape === 'teardrop' ? 1.35 : a.shape === 'double' ? 1.7 : 1;
    const lean = a.tether === 'drifting' ? mix(0.5, 0.85, random()) * (random() > 0.5 ? 1 : -1) : a.tether === 'taut' ? 0 : 0.25;
    const line = a.tether === 'slack' ? 0.25 + r * 0.15 : 0.9 + r * 0.8;
    const knot = new THREE.Vector3(Math.sin(lean) * line, Math.cos(lean) * line, 0);
    if (a.tether === 'slack') knot.set(r * 0.9, Math.max(0.1, r * 0.2), 0.2);
    const axis = a.tether === 'slack' ? new THREE.Vector3(0.12, 1, 0).normalize() : knot.clone().normalize();
    const centre = knot.clone().addScaledVector(axis, r * tall * 1.12);

    if (a.tether === 'slack') put(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0.08, 0), new THREE.Vector3(-0.5, -0.7, 0.4), new THREE.Vector3(0.1, -0.8, 0.8), new THREE.Vector3(r * 0.6, -0.78, 0.5), knot.clone()]), 40, 0.03, 6), rope));
    else put(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0.08, 0), knot.clone().multiplyScalar(0.5).add(new THREE.Vector3(0, 0, a.tether === 'drifting' ? 0.12 : 0)), knot.clone()]), 24, 0.03, 6), rope));

    // The load: a lumpy solid, with loose pieces bedded in its skin.
    const phases = Array.from({ length: 6 }, () => ({ k: new THREE.Vector3(random() - 0.5, random() - 0.5, random() - 0.5).normalize(), f: mix(1.5, 4, random()), p: random() * 7, amp: mix(0.04, 0.12, random()) }));
    const bulge = new THREE.Vector3(random() - 0.5, random() * 0.5, random() - 0.5).normalize();
    const radial = (dir: THREE.Vector3) => {
      let k = 1;
      for (const wave of phases) k += Math.sin(dir.dot(wave.k) * wave.f + wave.p) * wave.amp;
      if (a.shape === 'lumpy') k += Math.max(0, dir.dot(bulge)) ** 2 * 0.45 - 0.1;
      if (a.shape === 'teardrop') k *= dir.y < 0 ? 1 - dir.y * dir.y * 0.45 : 1;
      if (a.shape === 'double') k *= 0.62 + 0.38 * Math.abs(dir.y) ** 0.6 + (Math.abs(dir.y) < 0.15 ? -0.12 : 0);
      return k;
    };
    const surface = (dir: THREE.Vector3, scale = 1) => {
      const k = radial(dir) * r * scale;
      return new THREE.Vector3(dir.x * k, dir.y * k * tall, dir.z * k);
    };
    const shaped = (scale: number, detail: number) => {
      const geometry = new THREE.SphereGeometry(1, detail, Math.round(detail * 0.7));
      const position = geometry.attributes.position, dir = new THREE.Vector3();
      for (let i = 0; i < position.count; i++) {
        dir.fromBufferAttribute(position, i).normalize();
        const p = surface(dir, scale);
        position.setXYZ(i, p.x, p.y, p.z);
      }
      geometry.computeVertexNormals();
      return geometry;
    };
    const bag = new THREE.Group();
    bag.position.copy(centre);
    bag.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis);
    put(bag);
    const glow = a.contents === 'hot' ? 0.75 : a.contents === 'ice' ? 0.12 : 0;
    const coreMaterial = new THREE.MeshStandardMaterial({ color: palette[0], roughness: 0.92, flatShading: true, emissive: a.contents === 'hot' ? '#7cff2a' : '#7fc4ee', emissiveIntensity: glow * 0.5 });
    bag.add(new THREE.Mesh(shaped(0.93, 22), coreMaterial));
    const netInk = a.contents === 'slag' ? '#d8c68c' : '#4a4334';
    const net = new THREE.MeshStandardMaterial({ map: netTexture(netInk), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.95 });
    bag.add(new THREE.Mesh(shaped(1.06, 28), net));

    const pieces: { at: [number, number, number]; size: number; color: string }[] = [];
    const pieceCount = Math.round(mix(40, 110, a.size));
    const hole = new THREE.Vector3(0.8, 0.25, 0.55).normalize();
    for (let i = 0; i < pieceCount; i++) {
      const dir = new THREE.Vector3(random() - 0.5, random() - 0.5, random() - 0.5).normalize();
      const p = surface(dir, mix(0.86, 0.99, random()));
      pieces.push({ at: p.toArray() as [number, number, number], size: r * mix(0.09, 0.2, random()) * (a.contents === 'belongings' ? 0.8 : 1), color: palette[Math.floor(random() * palette.length)] });
    }
    if (a.torn) {
      // A dark rent in the net and a trail of escapees.
      const tear = new THREE.Mesh(new THREE.SphereGeometry(r * 0.34, 10, 8), new THREE.MeshStandardMaterial({ color: '#141416', roughness: 1 }));
      tear.position.copy(surface(hole, 0.9)); tear.scale.set(1, 1.5, 0.6);
      bag.add(tear);
      for (let i = 0; i < 16; i++) {
        const t = (i + 1) / 16;
        const p = surface(hole, 1.05 + t * 1.3).add(new THREE.Vector3((random() - 0.5) * r * 0.5 * t, (random() - 0.2) * r * 0.7 * t, (random() - 0.5) * r * 0.5 * t));
        pieces.push({ at: p.toArray() as [number, number, number], size: r * mix(0.06, 0.15, random()), color: palette[Math.floor(random() * palette.length)] });
      }
      for (let i = 0; i < 3; i++) {
        const from = surface(hole.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), (i - 1) * 0.3), 1.05);
        const strand = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.012, r * 0.6, 5), rope);
        strand.position.copy(from).addScaledVector(hole, r * 0.25); strand.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), hole.clone().add(new THREE.Vector3(0, (i - 1) * 0.4, 0)).normalize());
        bag.add(strand);
      }
    }
    const blocky = a.contents === 'ice' || a.contents === 'scrap' || a.contents === 'belongings';
    const bits = new THREE.InstancedMesh(blocky ? new THREE.BoxGeometry(1.5, 1.1, 1.3) : new THREE.DodecahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: a.contents === 'ice' ? 0.25 : 0.85, metalness: a.contents === 'scrap' ? 0.5 : 0, flatShading: true, emissive: a.contents === 'hot' ? '#8cff3a' : '#000000', emissiveIntensity: glow }), pieces.length);
    const matrix = new THREE.Matrix4(), turn = new THREE.Quaternion(), size = new THREE.Vector3();
    pieces.forEach((piece, index) => {
      turn.setFromEuler(new THREE.Euler(random() * 6, random() * 6, random() * 6));
      matrix.compose(new THREE.Vector3(...piece.at), turn, size.setScalar(piece.size));
      bits.setMatrixAt(index, matrix);
      bits.setColorAt(index, new THREE.Color(piece.color));
    });
    bag.add(bits);

    // Things that poke out through the mesh.
    const poke = (length: number, radius: number, colour: string, metal = 0.5) => {
      const dir = new THREE.Vector3(random() - 0.5, random() * 0.9 - 0.2, random() - 0.3).normalize();
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 8), s.material(colour, { metalness: metal }));
      rod.position.copy(surface(dir, 0.85)).addScaledVector(dir, length * 0.25);
      rod.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().add(new THREE.Vector3(random() - 0.5, random() - 0.5, random() - 0.5).multiplyScalar(0.6)).normalize());
      bag.add(rod);
      return { rod, dir };
    };
    if (a.contents === 'scrap') for (let i = 0; i < 6; i++) poke(r * mix(0.7, 1.3, random()), r * mix(0.03, 0.07, random()), ['#8a5a3a', '#9aa4a8', '#b08040'][i % 3]);
    if (a.contents === 'belongings') {
      // Chair legs, a lamp, a rolled mattress and a suitcase handle give the bundle away.
      for (let i = 0; i < 4; i++) poke(r * 0.55, r * 0.03, '#6b4a2e', 0);
      const lamp = poke(r * 0.8, r * 0.025, '#b9a050');
      const shade = new THREE.Mesh(new THREE.ConeGeometry(r * 0.2, r * 0.26, 12, 1, true), new THREE.MeshStandardMaterial({ color: '#f0d890', emissive: '#f0c060', emissiveIntensity: mix(0.1, 0.7, mood.warmth), side: THREE.DoubleSide }));
      shade.position.set(0, r * 0.42, 0); lamp.rod.add(shade);
      const roll = poke(r * 0.9, r * 0.2, '#d8d0e0', 0);
      roll.rod.material = s.material('#c9d2e8');
      for (let i = 0; i < 3; i++) {
        const dir = new THREE.Vector3(random() - 0.5, random() - 0.5, random() + 0.2).normalize();
        const box = new THREE.Mesh(new THREE.BoxGeometry(r * 0.55, r * 0.38, r * 0.2), s.material(['#8a3a2a', '#2f5f8a', '#6a5a3a'][i]));
        box.position.copy(surface(dir, 0.96)); box.lookAt(box.position.clone().multiplyScalar(2)); box.rotateZ(random() * 3);
        bag.add(box);
      }
    }
    bag.traverse((child) => { child.castShadow = child.receiveShadow = true; });

    // Gathering lines from the net down to the knot.
    const down = new THREE.Vector3(0, -1, 0);
    for (let i = 0; i < 8; i++) {
      const angle = i / 8 * Math.PI * 2;
      const dir = new THREE.Vector3(Math.cos(angle) * 0.75, -0.66, Math.sin(angle) * 0.75).normalize();
      const from = surface(dir, 1.05), to = down.clone().multiplyScalar(r * tall * 1.12);
      const strand = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, from.distanceTo(to), 5), rope);
      strand.position.copy(from).add(to).multiplyScalar(0.5);
      strand.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize());
      bag.add(strand);
    }
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.09 + r * 0.03, 0.03, 6, 16), steel);
    ring.position.copy(knot); put(ring);

    let lampMaterial: THREE.MeshStandardMaterial | null = null;
    if (a.strobe) {
      lampMaterial = new THREE.MeshStandardMaterial({ color: '#ff8a2a', emissive: '#ff6a10', emissiveIntensity: 1.6 });
      const topPoint = surface(new THREE.Vector3(0, 1, 0), 1.06);
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.14, 8), dark); base.position.copy(topPoint).add(new THREE.Vector3(0, 0.05, 0));
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.1 + r * 0.03, 10, 8), lampMaterial); lamp.position.copy(topPoint).add(new THREE.Vector3(0, 0.2, 0));
      bag.add(base, lamp);
    }

    // A crowded yard ties smaller sacks to the same stake.
    const extras = mood.density > 0.55 ? (mood.density > 0.85 ? 2 : 1) : 0;
    for (let i = 0; i < extras; i++) {
      const er = r * mix(0.25, 0.4, random()), angle = mix(0.5, 1.1, random()) * (i ? -1 : 1) * (lean > 0 ? -1 : 1);
      const at = new THREE.Vector3(Math.sin(angle), Math.cos(angle), (random() - 0.5) * 0.6).multiplyScalar(0.7 + er * 2.2 + random() * 0.6);
      put(new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, at.length() - er * 0.9, 5), rope)).position.copy(at).multiplyScalar(0.5 - er * 0.45 / at.length());
      afloat.children.at(-1)!.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), at.clone().normalize());
      const sack = put(new THREE.Mesh(new THREE.DodecahedronGeometry(er, 1), new THREE.MeshStandardMaterial({ color: palette[1], roughness: 0.9, flatShading: true })));
      sack.position.copy(at); sack.scale.y = 1.2;
      const cover = put(new THREE.Mesh(new THREE.SphereGeometry(er * 1.08, 12, 8), net)); cover.position.copy(at); cover.scale.y = 1.2;
    }
    s.scatter(new THREE.DodecahedronGeometry(1, 0), s.material('#77736c', { flatShading: true }), chips);

    const sway = mix(0.01, 0.06, mood.energy);
    return s.finish({
      footprint: 0.8,
      update: (_dt, time) => {
        afloat.rotation.z = Math.sin(time * 0.7) * sway;
        afloat.rotation.x = Math.sin(time * 0.53 + 1) * sway * 0.7;
        if (lampMaterial) lampMaterial.emissiveIntensity = Math.sin(time * 5) > 0.6 ? 2.4 : 0.3;
      },
    });
  },
});
