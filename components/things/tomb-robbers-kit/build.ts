import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

type P3 = [number, number, number];

export default defineThing({
  questions: {
    story: choice('Why was the kit left behind?', {
      fled: 'They ran: a lost sandal and a trail of dropped trinkets and footprints leads away.',
      eating: 'They were interrupted at a meal: bread, onions and a beer jar sit among the tools.',
      cavein: 'The roof came down: rubble has fallen across the tools and half buried the sack.',
      neverleft: 'One of them never left: the bones of a hand and forearm lie reaching toward the loot.',
      stashed: 'It was hidden on purpose, to come back for: tools laid in a neat row, the sack tied shut.',
    }),
    loot: choice('What has spilled from the sack?', {
      gold: 'Gold: rings, bangles, a little figure of a god, a cup.',
      beads: 'Faience: blue scarabs, strings of beads, a broad collar.',
      vessels: 'Small precious vessels: alabaster pots and a silver jug.',
      mixed: 'A magpie\'s mixture of everything.',
      nothing: 'Nothing. The sack is empty: they found the tomb already stripped.',
    }),
    light: choice('What were they using for light, and what state is it in?', {
      burning: 'A reed torch, dropped but still burning on the floor.',
      smouldering: 'A reed torch gone out, its tip still glowing and smoking.',
      cold: 'A reed torch long dead, charred black at the end.',
      lamp: 'A small clay oil lamp, its wick still lit.',
    }),
    rope: choice('What about the rope?', {
      coiled: 'A neat thick coil.',
      tangled: 'A loose tangle with one end trailing away across the floor.',
      basket: 'Tied to the handle of a hauling basket.',
      cut: 'Hacked through: a short coil and a frayed loose length.',
    }),
    tools: choice('Which tools were dropped?', {
      mason: 'A copper chisel and a bell-shaped wooden mallet.',
      levers: 'Wooden levers, wedges and a round stone pounder.',
      full: 'A full kit: chisels, mallet, an adze and a lever.',
      broken: 'A chisel snapped in two beside its mallet.',
    }),
    container: choice('What were they carrying the loot in?', {
      sack: 'A slumped linen sack with a drawstring.',
      bundle: 'A cloak knotted into a bundle.',
      basket: 'A lidded reed basket on its side.',
    }),
    seal: noul('Is there a broken clay door seal with its cord among the debris?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const age = Math.min(1, mood.wear * 0.7 + (a.story === 'neverleft' ? 0.35 : 0));
    const tone = (c: string, k = 0.5) => new THREE.Color(c).lerp(new THREE.Color('#9b8f7c'), age * k);
    const put = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, at: P3 = [0, 0, 0]) => { const mesh = new THREE.Mesh(geometry, material); mesh.position.set(...at); mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh; };
    const lathe = (pts: [number, number][], seg = 16) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg);
    const neat = a.story === 'stashed';
    const gold = new THREE.MeshStandardMaterial({ color: tone('#e3b23c', 0.35), metalness: 0.7, roughness: 0.3 });
    const copper = s.material(tone('#b9683c'), { metalness: 0.6, roughness: 0.4 });
    const wood = s.material(tone('#8a6238'), { roughness: 0.8 });
    const linen = s.material(tone('#d8cba4'), { roughness: 0.95 });
    const straw = s.material(tone('#c2a35a'), { roughness: 0.95 });
    const clay = s.material(tone('#a9603d'), { roughness: 0.85 });
    const flames: THREE.MeshStandardMaterial[] = [], licks: THREE.Mesh[] = [], smoke: THREE.Mesh[] = [];

    // ---- container, centre left, mouth toward the viewer's right ----
    const C = new THREE.Vector3(-0.2, 0, -0.08), dir = new THREE.Vector3(0.82, 0, 0.57).normalize();
    const yaw = Math.atan2(dir.x, dir.z);
    const bag = new THREE.Group(); bag.position.copy(C); bag.rotation.y = yaw; s.root.add(bag);
    const empty = a.loot === 'nothing';
    let mouth = 0.24;
    if (a.container === 'basket') {
      const canvas = document.createElement('canvas'); canvas.width = 64; canvas.height = 64; const c = canvas.getContext('2d')!;
      for (let y = 0; y < 64; y += 8) { c.fillStyle = (y / 8) % 3 === 0 ? '#7a4a2a' : y % 16 ? '#c9a85c' : '#b8934a'; c.fillRect(0, y, 64, 8); }
      const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace;
      const weave = new THREE.MeshStandardMaterial({ map, roughness: 0.95, side: THREE.DoubleSide, color: tone('#ffffff', 0.4) });
      const body = put(bag, lathe([[0, 0], [0.12, 0], [0.17, 0.12], [0.16, 0.28], [0.14, 0.3]]), weave, [0, neat ? 0 : 0.165, neat ? 0 : -0.1]);
      if (!neat) body.rotation.x = Math.PI / 2 - 0.06;
      const lid = put(bag, lathe([[0, 0.05], [0.08, 0.04], [0.15, 0], [0.155, 0.005]]), weave, neat ? [0, 0.3, 0] : [0.26, 0, 0.1]);
      mouth = 0.22;
      put(bag, new THREE.CircleGeometry(0.135, 16), s.material('#2a2018', { side: THREE.DoubleSide }), neat ? [0, 0.29, 0] : [0, 0.17, 0.185]).rotation.x = neat ? -Math.PI / 2 : 0;
      void lid;
    } else {
      const g = new THREE.SphereGeometry(1, 22, 16), p = g.getAttribute('position'), ph = random() * 6;
      for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = 1 + 0.13 * Math.sin(x * 5 + ph) * Math.sin(y * 4 + ph * 2) + 0.08 * Math.sin(z * 7 + ph); p.setXYZ(i, x * k, Math.max(y * k, -0.62), z * k * (z > 0 ? 0.85 : 1)); }
      g.computeVertexNormals();
      const full = empty ? 0.45 : 1;
      const sack = put(bag, g, a.container === 'bundle' ? s.material(tone('#8d5a3c'), { roughness: 0.95 }) : linen, [0, 0.62 * 0.17 * full, -0.08]); sack.scale.set(a.container === 'bundle' ? 0.17 : 0.2, 0.17 * full, a.container === 'bundle' ? 0.2 : 0.27);
      if (a.container === 'bundle') { put(bag, new THREE.SphereGeometry(0.04, 10, 8), sack.material as THREE.Material, [0, 0.27 * full, -0.08]); for (let k = 0; k < 4; k++) { const ear = put(bag, new THREE.ConeGeometry(0.03, 0.12, 5), sack.material as THREE.Material, [Math.cos(k * 1.57 + 0.6) * 0.055, 0.3 * full, -0.08 + Math.sin(k * 1.57 + 0.6) * 0.055]); ear.rotation.set(Math.sin(k * 1.57 + 0.6) * 0.9, 0, -Math.cos(k * 1.57 + 0.6) * 0.9); } if (!neat) put(bag, new THREE.BoxGeometry(0.3, 0.008, 0.26), sack.material as THREE.Material, [0.02, 0.004, 0.2]).rotation.y = 0.3; }
      else {
        const neck = put(bag, new THREE.CylinderGeometry(neat ? 0.03 : 0.085, 0.11, 0.1, 14, 1, true), new THREE.MeshStandardMaterial({ color: tone('#d8cba4'), roughness: 0.95, side: THREE.DoubleSide }), neat ? [0, 0.3, -0.08] : [0, 0.085 * full, 0.2]); if (!neat) neck.rotation.x = Math.PI / 2 - 0.15;
        if (!neat) put(bag, new THREE.CircleGeometry(0.08, 14), s.material('#241a13', { side: THREE.DoubleSide }), [0, 0.092 * full, 0.235]).rotation.x = -0.15;
        const cord = put(bag, new THREE.TorusGeometry(neat ? 0.035 : 0.1, 0.007, 5, 16), straw, neat ? [0, 0.27, -0.08] : [0, 0.08 * full, 0.165]); cord.rotation.x = neat ? Math.PI / 2 : -0.15;
      }
    }

    // ---- loot fanning out of the mouth ----
    const floorAt = (d: number, side: number): P3 => { const p = C.clone().add(dir.clone().multiplyScalar(mouth + d)).add(new THREE.Vector3(dir.z, 0, -dir.x).multiplyScalar(side)); return [p.x, 0, p.z]; };
    const kinds = a.loot === 'mixed' ? ['gold', 'beads', 'vessels'] : [a.loot];
    const amount = neat || empty ? 0 : 5 + Math.round(mood.density * 12);
    const trail = a.story === 'fled';
    const faience = (c: string) => new THREE.MeshStandardMaterial({ color: tone(c, 0.4), roughness: 0.25 });
    const beadList: { at: P3; size: number; color: THREE.Color }[] = [];
    for (let i = 0; i < amount; i++) {
      const kind = kinds[i % kinds.length], far = trail && i % 4 === 3;
      const d = far ? 0.45 + random() * 0.5 : 0.03 + Math.sqrt(random()) * 0.34, side = (random() - 0.5) * (0.22 + d * 0.7);
      const [x, , z] = floorAt(d, side), spin = random() * 6.3;
      if (kind === 'gold') {
        const pick = i % 5;
        if (pick === 0) { const ring = put(s.root, new THREE.TorusGeometry(0.032 + random() * 0.014, 0.008, 6, 18), gold, [x, 0.009, z]); ring.rotation.x = Math.PI / 2; }
        else if (pick === 1) { const idol = put(s.root, lathe([[0, 0], [0.018, 0], [0.014, 0.03], [0.022, 0.085], [0.012, 0.1], [0.017, 0.12], [0, 0.135]], 10), gold, [x, 0.02, z]); idol.rotation.set(Math.PI / 2, 0, spin); }
        else if (pick === 2) { const cup = put(s.root, lathe([[0, 0.005], [0.02, 0], [0.012, 0.02], [0.035, 0.07], [0.037, 0.072]], 12), new THREE.MeshStandardMaterial({ color: gold.color, metalness: 0.7, roughness: 0.3, side: THREE.DoubleSide }), [x, 0.035, z]); cup.rotation.set(Math.PI / 2 - 0.1, 0, spin); }
        else if (pick === 3) { const bangle = put(s.root, new THREE.TorusGeometry(0.04, 0.012, 6, 18), gold, [x, 0.04, z]); bangle.rotation.set(0.35, spin, 0); }
        else { const loop = put(s.root, new THREE.TorusGeometry(0.018, 0.006, 5, 12), gold, [x, 0.006, z - 0.03]); loop.rotation.x = Math.PI / 2; const stem = put(s.root, new THREE.BoxGeometry(0.012, 0.006, 0.06), gold, [x, 0.006, z + 0.018]); const bar = put(s.root, new THREE.BoxGeometry(0.045, 0.006, 0.012), gold, [x, 0.006, z - 0.005]); void stem; void bar; }
      } else if (kind === 'beads') {
        if (i % 3 === 0) { const scarab = put(s.root, new THREE.SphereGeometry(1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), faience(i % 2 ? '#2a8fb0' : '#3aa37a'), [x, 0, z]); scarab.scale.set(0.022, 0.016, 0.03); scarab.rotation.y = spin; }
        else if (i % 3 === 1) { const n = 16, r = 0.05 + random() * 0.03; for (let k = 0; k < n; k++) { const an = k / n * Math.PI * 1.6 + spin; beadList.push({ at: [x + Math.cos(an) * r, 0.007, z + Math.sin(an) * r * 0.7], size: 0.008, color: tone(['#2a8fb0', '#e3b23c', '#b83a2c', '#2a8fb0'][k % 4], 0.4) }); } }
        else { for (let row = 0; row < 3; row++) { const arc = put(s.root, new THREE.TorusGeometry(0.05 + row * 0.018, 0.008, 4, 16, Math.PI), faience(['#2a8fb0', '#e3b23c', '#b83a2c'][row]), [x, 0.006, z]); arc.rotation.set(Math.PI / 2, 0, spin); } }
      } else {
        const pick = i % 3, alabaster = s.material(tone('#ece0c2', 0.3), { roughness: 0.35 });
        if (pick === 0) { const pot = put(s.root, lathe([[0, 0], [0.02, 0], [0.04, 0.035], [0.035, 0.07], [0.022, 0.08], [0.03, 0.09]], 12), alabaster, [x, far ? 0.04 : 0, z]); if (far || random() < 0.5) { pot.rotation.set(Math.PI / 2, 0, spin); pot.position.y = 0.038; } }
        else if (pick === 1) { const jug = put(s.root, lathe([[0, 0], [0.018, 0], [0.036, 0.05], [0.03, 0.1], [0.012, 0.13], [0.02, 0.15]], 12), s.material(tone('#cdd2d6', 0.3), { metalness: 0.75, roughness: 0.3 }), [x, 0.034, z]); jug.rotation.set(Math.PI / 2 - 0.05, 0, spin); }
        else { const dish = put(s.root, lathe([[0, 0], [0.02, 0], [0.05, 0.02], [0.052, 0.024], [0, 0.008]], 12), alabaster, [x, 0, z]); dish.rotation.y = spin; }
      }
    }
    if (kinds.includes('gold') && amount) for (let i = 0; i < amount * 2; i++) { const [x, , z] = floorAt(random() * 0.3, (random() - 0.5) * 0.3); beadList.push({ at: [x, 0.005, z], size: 0.006 + random() * 0.005, color: tone('#e3b23c', 0.35) }); }
    if (beadList.length) s.scatter(new THREE.SphereGeometry(1, 7, 5), new THREE.MeshStandardMaterial({ metalness: 0.4, roughness: 0.3 }), beadList);

    // ---- light, front right ----
    const T = new THREE.Vector3(0.36, 0, 0.36);
    const light = neat && a.light !== 'lamp' ? 'cold' : a.light;
    if (light === 'lamp') {
      put(s.root, lathe([[0, 0], [0.035, 0], [0.065, 0.025], [0.068, 0.03], [0.05, 0.012], [0, 0.01]], 14), clay, [T.x, 0, T.z]);
      put(s.root, new THREE.CylinderGeometry(0.05, 0.03, 0.004, 12), s.material('#5a431f', { roughness: 0.2 }), [T.x, 0.016, T.z]);
      const flame = new THREE.MeshStandardMaterial({ color: '#ffc24a', emissive: '#ff9a2a', emissiveIntensity: 1.5, roughness: 1 }); flames.push(flame);
      const lick = put(s.root, new THREE.ConeGeometry(0.012, 0.055, 8), flame, [T.x + 0.055, 0.058, T.z]); lick.castShadow = false; licks.push(lick);
    } else {
      const torch = new THREE.Group(); torch.position.set(T.x, 0.035, T.z); torch.rotation.set(0, neat ? 0.2 : -0.9 + random() * 0.4, Math.PI / 2 - 0.06, 'YXZ'); s.root.add(torch);
      for (let i = 0; i < 7; i++) { const an = i / 6 * Math.PI * 2, r = i === 6 ? 0 : 0.017; put(torch, new THREE.CylinderGeometry(0.014, 0.008, 0.62, 6), straw, [Math.cos(an) * r, 0, Math.sin(an) * r]); }
      for (const y of [-0.2, 0, 0.18]) put(torch, new THREE.CylinderGeometry(0.03, 0.028, 0.025, 10), s.material(tone('#7a5a2c')), [0, y, 0]);
      put(torch, new THREE.CylinderGeometry(0.036, 0.03, 0.1, 10), s.material('#1c1714', { roughness: 1 }), [0, 0.33, 0]);
      const tip = new THREE.Vector3(0, 0.38, 0).applyEuler(torch.rotation).add(torch.position);
      if (light !== 'cold') {
        const ember = new THREE.MeshStandardMaterial({ color: '#3a1c12', emissive: '#ff5a14', emissiveIntensity: 1.4, roughness: 1 }); flames.push(ember);
        put(s.root, new THREE.SphereGeometry(0.034, 10, 8), ember, [tip.x, tip.y, tip.z]).castShadow = false;
        put(s.root, new THREE.CircleGeometry(0.1, 14), s.material('#2a221c', { roughness: 1 }), [tip.x, 0.002, tip.z]).rotation.x = -Math.PI / 2;
      }
      if (light === 'burning') {
        const flame = new THREE.MeshStandardMaterial({ color: '#ffb23c', emissive: '#ff8a1c', emissiveIntensity: 1.8, roughness: 1 }); flames.push(flame);
        for (let i = 0; i < 4; i++) { const lick = put(s.root, new THREE.ConeGeometry(0.03 - i * 0.004, 0.13 + random() * 0.08, 8), flame, [tip.x + (random() - 0.5) * 0.05, tip.y + 0.07, tip.z + (random() - 0.5) * 0.05]); lick.castShadow = false; lick.userData.phase = i * 1.7; licks.push(lick); }
      }
      if (light === 'smouldering') {
        const haze = new THREE.MeshStandardMaterial({ color: '#d9d4c8', transparent: true, opacity: 0.18, depthWrite: false, roughness: 1 });
        for (let i = 0; i < 6; i++) { const puff = new THREE.Mesh(new THREE.SphereGeometry(0.025 + i * 0.008, 8, 6), haze); puff.position.set(tip.x, tip.y + 0.06 + i * 0.08, tip.z); puff.userData.phase = i; puff.userData.x = tip.x; s.root.add(puff); smoke.push(puff); }
      }
    }

    // ---- rope, back right ----
    const rc = document.createElement('canvas'); rc.width = 32; rc.height = 32; const rcx = rc.getContext('2d')!;
    rcx.fillStyle = '#' + tone('#c7a660').getHexString(); rcx.fillRect(0, 0, 32, 32); rcx.strokeStyle = '#' + tone('#7c6030').getHexString(); rcx.lineWidth = 4; for (let i = -32; i < 64; i += 11) { rcx.beginPath(); rcx.moveTo(i, 0); rcx.lineTo(i + 32, 32); rcx.stroke(); }
    const ropeMap = new THREE.CanvasTexture(rc); ropeMap.colorSpace = THREE.SRGBColorSpace; ropeMap.wrapS = ropeMap.wrapT = THREE.RepeatWrapping; ropeMap.repeat.set(60, 2);
    const ropeMat = new THREE.MeshStandardMaterial({ map: ropeMap, roughness: 1 });
    const ropeTube = (pts: P3[], r = 0.016) => { const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p))), pts.length * 10, r, 7), ropeMat); m.castShadow = m.receiveShadow = true; s.root.add(m); return m; };
    const RC = new THREE.Vector3(0.3, 0, -0.34);
    const spiral = (turns: number, r0: number, mess: number): P3[] => Array.from({ length: Math.round(turns * 14) + 1 }, (_u, i) => { const t = i / 14, an = t * Math.PI * 2, r = r0 + Math.sin(t * 2.3) * 0.012 + (random() - 0.5) * mess; return [RC.x + Math.cos(an) * r * (1 + mess * 2), 0.016 + t * (mess > 0.01 ? 0.008 : 0.03), RC.z + Math.sin(an) * r] as P3; });
    if (a.rope === 'tangled') { const pts = spiral(3, 0.14, 0.05); pts.push([RC.x + 0.3, 0.016, RC.z + 0.12], [RC.x + 0.42, 0.016, RC.z + 0.38], [RC.x + 0.36, 0.016, RC.z + 0.6]); ropeTube(pts); }
    else if (a.rope === 'cut') { ropeTube(spiral(2.5, 0.11, 0.004)); const ox = RC.x - 0.34, oz = RC.z + 0.12; ropeTube([[ox, 0.016, oz], [ox + 0.1, 0.016, oz + 0.07], [ox + 0.16, 0.016, oz - 0.03], [ox + 0.27, 0.016, oz + 0.03]]); for (const [fx, fz] of [[ox, oz], [RC.x + 0.11, RC.z]] as const) for (let k = 0; k < 5; k++) s.rod([fx, 0.018, fz], [fx - 0.03 + (random() - 0.5) * 0.04, 0.012 + random() * 0.03, fz - 0.03 + (random() - 0.5) * 0.04], 0.003, straw); put(s.root, new THREE.BoxGeometry(0.02, 0.006, 0.16), copper, [ox + 0.12, 0.004, oz + 0.14]).rotation.y = 0.8; }
    else { ropeTube(spiral(a.rope === 'basket' ? 3 : 5, 0.13, 0.003)); }
    if (a.rope === 'basket') {
      const bx = RC.x - 0.34, bz = RC.z + 0.02;
      put(s.root, lathe([[0, 0], [0.09, 0], [0.15, 0.16], [0.155, 0.17], [0.14, 0.15], [0.085, 0.012], [0, 0.012]]), new THREE.MeshStandardMaterial({ color: tone('#b9954e'), roughness: 1, side: THREE.DoubleSide }), [bx, 0, bz]);
      const handle = put(s.root, new THREE.TorusGeometry(0.15, 0.01, 5, 18, Math.PI), straw, [bx, 0.165, bz]); handle.rotation.y = 0.5;
      ropeTube([[RC.x - 0.13, 0.03, RC.z], [RC.x - 0.2, 0.05, RC.z + 0.03], [bx + 0.06, 0.24, bz], [bx, 0.315, bz]]);
      if (a.loot !== 'nothing') for (let i = 0; i < 5; i++) put(s.root, new THREE.DodecahedronGeometry(0.035 + random() * 0.02, 0), s.material(tone('#b7a98c')), [bx + (random() - 0.5) * 0.14, 0.05 + random() * 0.05, bz + (random() - 0.5) * 0.14]);
    }

    // ---- tools, front left ----
    const TL = new THREE.Vector3(-0.42, 0, 0.4);
    const lay = (obj: THREE.Object3D, i: number, len: number, lift: number) => { if (neat) { obj.position.set(TL.x + i * 0.11, lift, TL.z - 0.02); obj.rotation.set(0, 0, Math.PI / 2, 'YXZ'); obj.rotation.y = Math.PI / 2; } else { obj.position.set(TL.x + (i % 2) * 0.2 + (random() - 0.5) * 0.08, lift, TL.z + (i > 1 ? -0.18 : 0) + (random() - 0.5) * 0.08); obj.rotation.set(0, random() * Math.PI, Math.PI / 2, 'YXZ'); } void len; s.root.add(obj); };
    const chisel = (len = 0.22, snapped = false) => { const g = new THREE.Group(); put(g, new THREE.CylinderGeometry(0.011, 0.012, len, 8), copper); if (!snapped) { const edge = put(g, new THREE.CylinderGeometry(0.012, 0.02, 0.05, 4), copper, [0, -len / 2 - 0.025, 0]); edge.scale.z = 0.3; edge.rotation.y = Math.PI / 4; } put(g, new THREE.CylinderGeometry(0.016, 0.011, 0.012, 8), copper, [0, len / 2, 0]); return g; };
    const mallet = () => { const g = new THREE.Group(); put(g, lathe([[0, 0], [0.018, 0], [0.02, 0.14], [0.055, 0.2], [0.065, 0.3], [0.04, 0.34], [0, 0.345]], 14), wood, [0, -0.17, 0]); return g; };
    const lever = (len: number) => { const g = new THREE.Group(); put(g, new THREE.CylinderGeometry(0.018, 0.024, len, 8), wood); return g; };
    const adze = () => { const g = new THREE.Group(); put(g, new THREE.CylinderGeometry(0.014, 0.018, 0.36, 8), wood); const blade = put(g, new THREE.BoxGeometry(0.04, 0.14, 0.008), copper, [0, 0.14, 0.055]); blade.rotation.x = 0.9; put(g, new THREE.TorusGeometry(0.02, 0.006, 4, 10), straw, [0, 0.16, 0.01]).rotation.x = Math.PI / 2; return g; };
    const kit: [THREE.Group, number][] = [];
    if (a.tools === 'mason') kit.push([chisel(), 0.012], [mallet(), 0.06]);
    if (a.tools === 'broken') kit.push([chisel(0.12, true), 0.012], [chisel(0.1), 0.012], [mallet(), 0.06]);
    if (a.tools === 'levers') { kit.push([lever(0.75), 0.022], [lever(0.5), 0.022]); for (let i = 0; i < 3; i++) { const w = put(s.root, new THREE.CylinderGeometry(0.03, 0.03, 0.05, 3), wood, [TL.x + 0.1 + i * 0.07 + (neat ? 0 : random() * 0.05), 0.02, TL.z + 0.14 + (neat ? 0 : random() * 0.08)]); w.rotation.set(Math.PI / 2, 0, Math.PI / 2 + (neat ? 0 : random())); w.scale.y = 2.2; } put(s.root, new THREE.IcosahedronGeometry(0.075, 1), s.material(tone('#3f4347', 0.3), { roughness: 0.7 }), [TL.x - 0.08, 0.072, TL.z - 0.24]); }
    if (a.tools === 'full') kit.push([chisel(), 0.012], [chisel(0.16), 0.012], [mallet(), 0.06], [adze(), 0.02], [lever(0.7), 0.022]);
    kit.forEach(([g, lift], i) => lay(g, i, 0, lift));

    // ---- evidence ----
    const away = new THREE.Vector3(0.75, 0, 0.66).normalize();
    if (a.story === 'fled') {
      const dust = s.material('#6f6253', { roughness: 1 });
      for (let i = 0; i < 6; i++) { const p = new THREE.Vector3(0.1, 0, 0.12).add(away.clone().multiplyScalar(i * 0.17)).add(new THREE.Vector3(away.z, 0, -away.x).multiplyScalar(i % 2 ? 0.06 : -0.06)); const print = put(s.root, new THREE.CylinderGeometry(1, 1, 0.003, 12), dust, [p.x, 0.0015, p.z]); print.scale.set(0.035, 1, 0.085); print.rotation.y = Math.atan2(away.x, away.z) + (i % 2 ? 0.15 : -0.15); print.castShadow = false; }
      const sandal = new THREE.Group(); const sole = put(sandal, new THREE.CylinderGeometry(1, 1, 0.012, 14), straw); sole.scale.set(0.045, 1, 0.12);
      for (const side of [-1, 1]) { const strap = put(sandal, new THREE.CylinderGeometry(0.004, 0.004, 0.11, 5), straw, [side * 0.02, 0.03, 0.02]); strap.rotation.set(1.1, 0, side * 0.45); }
      sandal.position.set(0.02, 0.006, 0.52); sandal.rotation.set(0, 2.1, 0.12); s.root.add(sandal);
    }
    if (a.story === 'eating') {
      const bx = -0.02, bz = 0.42;
      const loaf = put(s.root, new THREE.SphereGeometry(1, 14, 8), s.material(tone('#c99a55'), { roughness: 0.9 }), [bx, 0.03, bz]); loaf.scale.set(0.09, 0.034, 0.09);
      const bite = put(s.root, new THREE.SphereGeometry(1, 10, 6), s.material(tone('#ecdcb4')), [bx + 0.07, 0.03, bz + 0.02]); bite.scale.set(0.035, 0.028, 0.05);
      put(s.root, lathe([[0, 0], [0.03, 0], [0.085, 0.14], [0.09, 0.24], [0.05, 0.34], [0.058, 0.38], [0.045, 0.38]]), clay, [bx - 0.2, 0, bz + 0.16]);
      for (let i = 0; i < 3; i++) { put(s.root, new THREE.SphereGeometry(0.022, 8, 6), s.material(tone('#efe9da')), [bx + 0.16 + i * 0.035, 0.022, bz + 0.12]); const leaf = put(s.root, new THREE.CylinderGeometry(0.004, 0.008, 0.2, 5), s.material(tone('#6f9a4c')), [bx + 0.19, 0.02, bz + 0.22]); leaf.rotation.set(Math.PI / 2, 0, (i - 1) * 0.12); }
      put(s.root, lathe([[0, 0], [0.025, 0], [0.04, 0.06], [0.043, 0.062], [0.03, 0.01], [0, 0.008]], 12), clay, [bx + 0.02, 0, bz + 0.2]);
    }
    if (a.story === 'cavein') {
      const rock = s.material('#b9aa8c', { roughness: 1 });
      for (let i = 0; i < 9 + Math.round(mood.density * 6); i++) { const big = i < 3, r = big ? 0.1 + random() * 0.08 : 0.03 + random() * 0.05; const x = i < 3 ? C.x - 0.05 + (i - 1) * 0.2 : (random() - 0.5) * 1.0, z = i < 3 ? C.z - 0.24 + random() * 0.12 : (random() - 0.5) * 0.9; const m = put(s.root, new THREE.DodecahedronGeometry(r, 0), rock, [x, r * 0.6, z]); m.rotation.set(random() * 3, random() * 3, random() * 3); m.scale.y = 0.7; }
      const dustPile = put(s.root, new THREE.SphereGeometry(1, 14, 8), s.material('#c9bb9c', { roughness: 1 }), [C.x - 0.05, 0, C.z - 0.3]); dustPile.scale.set(0.42, 0.07, 0.24);
    }
    if (a.story === 'neverleft') {
      const bone = s.material('#e6dcc0', { roughness: 0.8 });
      const [hx, , hz] = floorAt(0.5, -0.02), back = dir.clone();
      const at = (d: number, side: number, y = 0.014): P3 => [hx + back.x * d + back.z * side, y, hz + back.z * d - back.x * side];
      s.rod(at(0.12, 0.012), at(0.4, 0.035), 0.011, bone, 0.014); s.rod(at(0.12, -0.014), at(0.4, -0.01), 0.009, bone, 0.012);
      for (let f = 0; f < 5; f++) { const sp = (f - 2) * 0.016, len = f === 0 ? 0.05 : 0.085 - Math.abs(f - 2.3) * 0.008; s.rod(at(0.1, sp * 0.8), at(0.05, sp * 1.4), 0.005, bone); s.rod(at(0.045, sp * 1.45), at(0.05 - len, sp * 1.9 + (f === 0 ? 0.03 : 0)), 0.004, bone); }
      for (let i = 0; i < 6; i++) { const p = at(0.1 + (i % 3) * 0.014, (Math.floor(i / 3) - 0.5) * 0.02); s.ball([0.008, 0.006, 0.008], p, bone, 6); }
      const sleeve = put(s.root, new THREE.BoxGeometry(0.16, 0.006, 0.2), linen, at(0.42, 0.02, 0.004)); sleeve.rotation.y = yaw + 0.2;
    }
    if (a.seal) {
      const sx = 0.05, sz = -0.42, mudMat = s.material(tone('#8d7358'), { roughness: 1 });
      for (const [dx, dz, r] of [[0, 0, 0.05], [0.09, 0.03, 0.035], [-0.03, 0.08, 0.025]] as const) { const lump = put(s.root, new THREE.DodecahedronGeometry(r, 1), mudMat, [sx + dx, r * 0.35, sz + dz]); lump.scale.y = 0.45; lump.rotation.y = random() * 3; }
      put(s.root, new THREE.CylinderGeometry(0.03, 0.03, 0.004, 12), s.material(tone('#6d563f')), [sx, 0.024, sz]);
      const cord = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(sx - 0.02, 0.012, sz), new THREE.Vector3(sx - 0.1, 0.008, sz + 0.05), new THREE.Vector3(sx - 0.16, 0.008, sz - 0.02), new THREE.Vector3(sx - 0.24, 0.008, sz + 0.04)]), 16, 0.005, 5), straw); s.root.add(cord);
    }
    if (age > 0.45) {
      const grit = Array.from({ length: Math.round(age * 60) }, () => ({ at: [(random() - 0.5) * 1.1, 0.004, (random() - 0.5) * 1.0] as P3, size: 0.006 + random() * 0.012 }));
      s.scatter(new THREE.DodecahedronGeometry(1, 0), s.material('#a89a80', { roughness: 1 }), grit);
    }

    const speed = mix(5, 16, mood.energy), glow = mix(0.9, 2.2, mood.warmth);
    const update = flames.length ? (_dt: number, time: number) => {
      const flick = 0.8 + 0.2 * Math.sin(time * speed) * Math.sin(time * speed * 0.41 + 1);
      for (const flame of flames) flame.emissiveIntensity = glow * flick;
      for (const lick of licks) { lick.scale.y = 0.85 + 0.25 * Math.sin(time * speed * 0.7 + (lick.userData.phase ?? 0)); lick.rotation.z = 0.12 * Math.sin(time * speed * 0.5 + (lick.userData.phase ?? 0)); }
      for (const puff of smoke) { const cycle = (time * 0.25 * mix(0.6, 1.6, mood.energy) + puff.userData.phase / 6) % 1; puff.position.y = 0.08 + cycle * 0.6; puff.position.x = puff.userData.x + Math.sin(cycle * 5 + puff.userData.phase) * 0.05; puff.scale.setScalar(0.6 + cycle * 1.8); }
    } : undefined;
    return s.finish({ update });
  },
});
