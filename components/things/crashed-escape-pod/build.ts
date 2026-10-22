import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

const LIVERY = {
  whitered: { say: 'White with a red band and a big number.', base: '#ece8dc', band: '#c8302a', ink: '#c8302a' },
  hazard: { say: 'Safety yellow with black hazard chevrons.', base: '#f0bc1e', band: '#1c1c1e', ink: '#1c1c1e' },
  steel: { say: 'Bare riveted steel, unpainted.', base: '#aab2b8', band: '#7d868d', ink: '#3a4046' },
  navy: { say: 'Navy blue with a white star, a warship\'s lifeboat.', base: '#2b477f', band: '#eef0ea', ink: '#eef0ea' },
  orange: { say: 'Rescue orange with white stencils.', base: '#e8691e', band: '#f4efe2', ink: '#f4efe2' },
  alien: { say: 'Dull bronze covered in unreadable glyphs: not one of ours.', base: '#9a7a4a', band: '#3f8f86', ink: '#2c5f5a' },
} as const;

export default defineThing({
  questions: {
    age: choice('How long ago did it come down?', {
      minutes: 'Minutes ago: still smoking, the underside glowing, earth freshly thrown.',
      days: 'Days ago: cold and quiet, dust settled on it.',
      years: 'Years ago: rusting, with vines creeping up the hull.',
      centuries: 'Centuries ago: sunk deep, mossed over, almost part of the ground.',
    }),
    hatch: choice('What state is the hatch in?', {
      blown: 'Blown clean off and lying nearby, the opening dark.',
      hanging: 'Hanging open from one hinge.',
      lit: 'Open, with light still glowing inside.',
      sealed: 'Still sealed. Nobody has come out.',
    }),
    tracks: choice('What tracks lead from it?', {
      none: 'None at all.',
      boots: 'One set of bootprints walking away.',
      drag: 'Drag marks: something or someone was pulled out.',
      claws: 'Three-toed prints that came up to the pod and circled it.',
      crawl: 'A crawling trail that stops a few metres away.',
    }),
    chute: choice('Where did the parachute end up?', {
      snagged: 'Snagged high in tall fronds beside the pod, lines still taut.',
      draped: 'Collapsed and draped over the pod itself.',
      shredded: 'Torn to ribbons fluttering in the fronds.',
      none: 'Nowhere to be seen.',
    }),
    livery: choice('How is the pod painted?', Object.fromEntries(Object.entries(LIVERY).map(([k, l]) => [k, l.say])) as Record<keyof typeof LIVERY, string>),
    beacon: choice('What is the rescue beacon doing?', {
      dead: 'Dead, its mast bent.',
      red: 'Blinking red.',
      green: 'A steady green light.',
      sparks: 'Shorting out in sparks.',
    }),
    left: choice('What did the survivor leave beside it?', {
      nothing: 'Nothing.',
      crate: 'An opened survival crate, half emptied.',
      helmet: 'A helmet set down on the ground.',
      fire: 'The ring of a dead campfire.',
      grave: 'A grave: a mound with a marker made of pipe.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const lv = LIVERY[a.livery];
    const old = { minutes: 0, days: 0.15, years: 0.65, centuries: 1 }[a.age];
    const decay = Math.min(1, old * 0.8 + mood.wear * 0.4);
    const R = 1.1;
    const soilHue = new THREE.Color('#4f4858').lerp(new THREE.Color('#6b4a34'), mood.warmth);
    const soil = new THREE.MeshStandardMaterial({ color: soilHue, roughness: 1, flatShading: true });
    const scar = new THREE.MeshStandardMaterial({ color: soilHue.clone().multiplyScalar(0.55), roughness: 1 });
    const steel = s.material('#aeb5ba', { metalness: 0.4, roughness: 0.4 });
    const dark = s.material('#202226', { roughness: 0.8 });
    const green = s.material(new THREE.Color('#3f8a45').lerp(new THREE.Color('#2f8f86'), 1 - mood.warmth), { roughness: 0.7, side: THREE.DoubleSide });

    // ---- Hull skin ----
    const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = lv.base; ctx.fillRect(0, 0, 1024, 512);
    if (a.livery === 'hazard') { for (let i = -2; i < 40; i++) { ctx.fillStyle = lv.band; ctx.beginPath(); ctx.moveTo(i * 52, 232); ctx.lineTo(i * 52 + 26, 232); ctx.lineTo(i * 52 + 66, 292); ctx.lineTo(i * 52 + 40, 292); ctx.fill(); } }
    else { ctx.fillStyle = lv.band; ctx.fillRect(0, 236, 1024, a.livery === 'steel' ? 10 : 50); }
    ctx.fillStyle = lv.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const tag = String(1 + Math.floor(random() * 98));
    if (a.livery === 'alien') { ctx.strokeStyle = lv.ink; ctx.lineWidth = 5; for (let i = 0; i < 46; i++) { const x = 20 + (i % 23) * 44, y = i < 23 ? 170 : 330; ctx.beginPath(); for (let k = 0; k < 4; k++) ctx.lineTo(x + random() * 30, y + random() * 46); ctx.stroke(); ctx.beginPath(); ctx.arc(x + 15, y + 20, 4 + random() * 8, 0, 7); ctx.stroke(); } }
    else for (const u of [0.37, 0.87]) {
      if (a.livery === 'navy') { ctx.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 22 : 54, t = -Math.PI / 2 + i * Math.PI / 5; ctx.lineTo(u * 1024 + Math.cos(t) * r * 0.75, 160 + Math.sin(t) * r); } ctx.fill(); }
      else { ctx.font = 'bold 110px sans-serif'; ctx.save(); ctx.translate(u * 1024, 165); ctx.scale(0.75, 1); ctx.fillText(tag, 0, 0); ctx.restore(); }
      ctx.font = 'bold 26px monospace'; ctx.fillText(a.livery === 'navy' ? 'LIFEBOAT' : 'ESCAPE POD', u * 1024, 325, 160);
    }
    ctx.strokeStyle = 'rgba(30,34,40,0.5)'; ctx.lineWidth = 3;
    for (const y of [110, 232, 290, 390]) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1024, y); ctx.stroke(); }
    for (let i = 0; i < 12; i++) { ctx.beginPath(); ctx.moveTo(i * 1024 / 12, 110); ctx.lineTo(i * 1024 / 12, 390); ctx.stroke(); }
    ctx.fillStyle = 'rgba(30,34,40,0.5)'; for (const y of [118, 224, 298, 382]) for (let i = 0; i < 96; i++) ctx.fillRect(i * 1024 / 96, y, 3, 3);
    // Re-entry scorch climbs from the heat shield; rust and grime come with age.
    const burn = ctx.createLinearGradient(0, 512, 0, 250); burn.addColorStop(0, 'rgba(20,14,10,0.97)'); burn.addColorStop(0.45, 'rgba(40,22,12,0.75)'); burn.addColorStop(1, 'rgba(40,22,12,0)');
    ctx.fillStyle = burn; ctx.fillRect(0, 0, 1024, 512);
    for (let i = 0; i < 40; i++) { const x = random() * 1024, len = 60 + random() * 150, g = ctx.createLinearGradient(0, 400, 0, 400 - len); g.addColorStop(0, 'rgba(25,15,10,0.6)'); g.addColorStop(1, 'rgba(25,15,10,0)'); ctx.fillStyle = g; ctx.fillRect(x, 400 - len, 6 + random() * 16, len); }
    for (let i = 0; i < Math.round(decay * 90); i++) { ctx.fillStyle = `rgba(${130 + random() * 40},${60 + random() * 30},25,${0.3 + random() * 0.4})`; ctx.beginPath(); ctx.ellipse(random() * 1024, random() * 512, 6 + random() * 34, 4 + random() * 22, random() * 3, 0, 7); ctx.fill(); }
    for (let i = 0; i < Math.round(Math.max(0, old - 0.5) * 2 * 60); i++) { ctx.fillStyle = `rgba(${60 + random() * 30},${110 + random() * 40},50,0.75)`; ctx.beginPath(); ctx.ellipse(random() * 1024, random() * 300, 10 + random() * 40, 8 + random() * 24, 0, 0, 7); ctx.fill(); }
    const skin = new THREE.CanvasTexture(canvas); skin.colorSpace = THREE.SRGBColorSpace;
    const hullMat = new THREE.MeshStandardMaterial({ map: skin, metalness: 0.2 * (1 - decay), roughness: mix(0.4, 0.85, decay) });

    // ---- Pod ----
    const pod = new THREE.Group();
    const sink = mix(0.3, -0.25, old);
    pod.position.set(0, sink, 0); pod.rotation.set(0.24 + (random() - 0.5) * 0.1, (random() - 0.5) * 0.3, -0.16 + (random() - 0.5) * 0.1);
    s.root.add(pod);
    const P = <T extends THREE.Object3D>(o: T) => { pod.add(o); return o; };
    const UP = new THREE.Vector3(0, 1, 0), FWD = new THREE.Vector3(0, 0, 1);
    const onHull = (dir: THREE.Vector3, o: THREE.Object3D, out = 0, axis = FWD) => { o.position.copy(dir).multiplyScalar(R + out); o.quaternion.setFromUnitVectors(axis, dir); return P(o); };
    P(s.mesh(new THREE.SphereGeometry(R, 40, 28), hullMat));
    P(s.ring(R * 1.012, 0.05, [0, 0, 0], steel)).rotation.x = Math.PI / 2;
    for (let i = 0; i < 4; i++) {
      const t = i * Math.PI / 2 + 0.4, dir = new THREE.Vector3(Math.sin(t) * 0.86, -0.5, Math.cos(t) * 0.86).normalize();
      onHull(dir, s.mesh(new THREE.CylinderGeometry(0.16, 0.09, 0.2, 12), dark), 0.06, UP);
    }
    const glowWindow = new THREE.MeshStandardMaterial({ color: '#16323f', emissive: a.hatch === 'lit' ? '#ffcf6a' : '#4fc8e8', emissiveIntensity: a.hatch === 'lit' ? 1.2 : a.hatch === 'sealed' ? 0.8 : 0.1, roughness: 0.15 });
    for (const t of [0.75, 2.2]) {
      const dir = new THREE.Vector3(Math.sin(t) * 0.92, 0.38, Math.cos(t) * 0.92).normalize();
      onHull(dir, s.mesh(new THREE.TorusGeometry(0.17, 0.04, 8, 20), steel), 0.0);
      onHull(dir.clone(), s.mesh(new THREE.CircleGeometry(0.17, 18), glowWindow), 0.012);
    }
    // Hatch, on the upper front.
    const hd = new THREE.Vector3(-0.3, 0.5, 0.82).normalize(), HR = 0.46;
    const openHatch = a.hatch !== 'sealed';
    onHull(hd, s.mesh(new THREE.TorusGeometry(HR, 0.06, 8, 28), steel), -0.03);
    const inside = a.hatch === 'lit' ? new THREE.MeshStandardMaterial({ color: '#ffe2a0', emissive: '#ffc24a', emissiveIntensity: 1.7 }) : new THREE.MeshStandardMaterial({ color: '#0b0c0f', roughness: 1 });
    const door = () => {
      const g = new THREE.Group();
      const plate = new THREE.Mesh(new THREE.SphereGeometry(HR * 1.02, 20, 8, 0, Math.PI * 2, 0, 0.6), hullMat.clone()); (plate.material as THREE.MeshStandardMaterial).map = null; (plate.material as THREE.MeshStandardMaterial).color.set(lv.base).lerp(new THREE.Color('#7a4a2a'), decay * 0.5);
      plate.scale.set(1.75, 0.55, 1.75); plate.rotation.x = Math.PI / 2; plate.position.z = -HR * 0.42; plate.castShadow = true;
      const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.028, 6, 18), dark); wheel.position.z = 0.13;
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.12, 8), dark); hub.rotation.x = Math.PI / 2; hub.position.z = 0.08;
      const rim = new THREE.Mesh(new THREE.TorusGeometry(HR * 0.95, 0.035, 6, 24), steel);
      g.add(plate, wheel, hub, rim);
      return g;
    };
    if (openHatch) {
      onHull(hd, s.mesh(new THREE.CircleGeometry(HR * 0.95, 24), inside), 0.004);
      for (let i = 0; i < 7; i++) { const t = i / 7 * Math.PI * 2 + random(), burnMark = s.mesh(new THREE.CircleGeometry(0.1 + random() * 0.08, 8), new THREE.MeshStandardMaterial({ color: '#17120e', roughness: 1 })); const side = new THREE.Vector3().crossVectors(hd, UP).normalize(), up2 = new THREE.Vector3().crossVectors(side, hd); onHull(hd.clone().addScaledVector(side, Math.cos(t) * 0.52).addScaledVector(up2, Math.sin(t) * 0.52).normalize(), burnMark, 0.006); burnMark.castShadow = false; }
      const d = door();
      if (a.hatch === 'blown') { d.position.set(-1.75 - random() * 0.4, 0.07, 1.5 + random() * 0.4); d.rotation.set(-Math.PI / 2 + 0.12, 0, random() * 3); s.root.add(d); }
      else { const side = new THREE.Vector3().crossVectors(hd, UP).normalize(); d.position.copy(hd).multiplyScalar(R + 0.2).addScaledVector(side, -HR * 1.5); d.quaternion.setFromUnitVectors(FWD, hd.clone().addScaledVector(side, -1.6).normalize()); P(d); }
    } else { const d = door(); onHull(hd, d, 0.0); }
    // Beacon mast.
    const mastTop = new THREE.Vector3(0.25, R + 0.75, -0.2), bent = a.beacon === 'dead' || a.beacon === 'sparks';
    const mastBase = new THREE.Vector3(0.2, R * 0.97, -0.15), knee = mastBase.clone().lerp(mastTop, 0.55);
    if (bent) mastTop.set(0.8, R + 0.25, -0.1);
    P(s.rod(mastBase.toArray() as [number, number, number], knee.toArray() as [number, number, number], 0.03, steel));
    P(s.rod(knee.toArray() as [number, number, number], mastTop.toArray() as [number, number, number], 0.022, steel));
    const lampHue = a.beacon === 'green' ? '#4dff7a' : a.beacon === 'red' ? '#ff3a2a' : a.beacon === 'sparks' ? '#fff2a0' : '#3a2a28';
    const lamp = new THREE.MeshStandardMaterial({ color: lampHue, emissive: a.beacon === 'dead' ? '#000000' : lampHue, emissiveIntensity: 2 });
    P(s.ball([0.09, 0.09, 0.09], mastTop.toArray() as [number, number, number], lamp, 12));
    P(s.cylinder(0.11, 0.13, 0.08, mastBase.toArray() as [number, number, number], dark, 12));

    // ---- Furrow: a gouge with thrown-up berms, running back and to the left ----
    const back = new THREE.Vector3(-0.72, 0, -0.69).normalize(), across = new THREE.Vector3(back.z, 0, -back.x);
    const length = 2.9, soften = 1 - old * 0.6;
    const lumps: { at: [number, number, number]; size: number }[] = [];
    for (let i = 0; i < 26; i++) for (const side of [-1, 1]) {
      const d = 0.2 + (i / 25) * length, w = mix(1.2, 0.5, i / 25), size = mix(0.42, 0.13, i / 25) * (0.7 + random() * 0.6) * soften;
      const p = back.clone().multiplyScalar(d + (random() - 0.5) * 0.2).addScaledVector(across, side * (w + (random() - 0.3) * 0.4));
      lumps.push({ at: [p.x, size * 0.2, p.z], size: size * (random() < 0.3 ? 1.35 : 0.9) });
      const q = back.clone().multiplyScalar(d + (random() - 0.5) * 0.4).addScaledVector(across, side * (w + 0.3 + random() * 0.7));
      lumps.push({ at: [q.x, 0.03, q.z], size: 0.05 + random() * 0.1 });
    }
    for (let i = 0; i < 16; i++) { const t = -1.5 + i / 15 * 3.0, size = (0.3 + random() * 0.3) * (1 - Math.abs(t) * 0.25) * soften, p = back.clone().multiplyScalar(-(R + 0.25) * Math.cos(t)).addScaledVector(across, (R + 0.3) * Math.sin(t)); lumps.push({ at: [p.x, size * 0.3, p.z], size }); }
    s.scatter(new THREE.DodecahedronGeometry(1, 0), soil, lumps).scale.y = 0.7;
    const gouge = new THREE.Shape([[-1.5, 0], [1.5, 0], [0.75, length + 0.4], [-0.75, length + 0.4]].map(([x, y]) => new THREE.Vector2(x, y)));
    const trench = s.mesh(new THREE.ShapeGeometry(gouge), scar, [0, 0.012, 0]); trench.rotation.set(-Math.PI / 2, 0, Math.atan2(-back.x, -back.z)); trench.castShadow = false;
    const bowl = s.mesh(new THREE.CircleGeometry(R + 0.45, 28), scar, [0, 0.011, 0]); bowl.rotation.x = -Math.PI / 2; bowl.castShadow = false;

    // ---- Fresh heat, or old growth ----
    const puffs: THREE.Mesh[] = [];
    let ember: THREE.MeshStandardMaterial | null = null;
    if (a.age === 'minutes') {
      ember = new THREE.MeshStandardMaterial({ color: '#ff8a2a', emissive: '#ff5a12', emissiveIntensity: 1.8 });
      const ring = s.ring(Math.sqrt(Math.max(0.1, R * R - sink * sink)) + 0.03, 0.06, [0, 0.03, 0], ember); ring.rotation.x = Math.PI / 2;
      const smokeMat = new THREE.MeshStandardMaterial({ color: '#5d5957', transparent: true, opacity: 0.5, depthWrite: false, roughness: 1 });
      for (let i = 0; i < Math.round(mix(8, 16, mood.density)); i++) { const puff = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), smokeMat); puff.userData = { phase: random(), drift: random() * 6, size: 0.22 + random() * 0.3 }; s.root.add(puff); puffs.push(puff); }
      for (let i = 0; i < 7; i++) { const p = back.clone().multiplyScalar(0.6 + random() * length * 0.8).addScaledVector(across, (random() - 0.5) * 0.9); s.ball([0.06, 0.03, 0.06], [p.x, 0.03, p.z], ember, 6); }
    }
    if (old > 0.5 || mood.wear > 0.75) {
      const vines = Math.round(mix(3, 9, old) * mix(0.7, 1.2, mood.density));
      for (let i = 0; i < vines; i++) {
        const t0 = random() * Math.PI * 2, climb = mix(0.9, 2.6, random()) * mix(0.7, 1.2, old), swirl = (random() - 0.5) * 1.6;
        const pts: THREE.Vector3[] = [];
        for (let k = 0; k <= 12; k++) { const u = k / 12, lat = -0.9 + u * climb, lon = t0 + u * swirl + Math.sin(u * 7) * 0.12; pts.push(new THREE.Vector3(Math.sin(lon) * Math.cos(lat), Math.sin(lat), Math.cos(lon) * Math.cos(lat)).multiplyScalar(R + 0.03)); }
        P(s.mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.028, 5), green));
        for (let k = 3; k <= 12; k += 2) { const leaf = P(s.ball([0.13, 0.02, 0.07], pts[k].toArray() as [number, number, number], green, 8)); leaf.quaternion.setFromUnitVectors(UP, pts[k].clone().normalize()); leaf.rotateY(random() * 3); leaf.translateX(0.09); }
      }
    }
    if (a.age === 'centuries') {
      const moss = s.material('#5a8a3c', { roughness: 1 });
      for (let i = 0; i < 14; i++) { const dir = new THREE.Vector3(random() - 0.5, 0.5 + random() * 0.7, random() - 0.5).normalize(); const pad = onHull(dir, s.mesh(new THREE.SphereGeometry(0.16 + random() * 0.18, 8, 6), moss), -0.08); pad.scale.z = 0.4; }
      const petals = ['#ff5aa8', '#ffd23a', '#c88aff'];
      for (let i = 0; i < 9; i++) { const t = random() * Math.PI * 2, r = R + 0.2 + random() * 1.0, h = 0.2 + random() * 0.3, x = Math.sin(t) * r, z = Math.cos(t) * r; s.rod([x, 0, z], [x, h, z], 0.012, green); s.ball([0.07, 0.04, 0.07], [x, h, z], s.material(petals[i % 3], { emissive: petals[i % 3], emissiveIntensity: 0.25 }), 8); }
      if (openHatch) { const tip = hd.clone().multiplyScalar(R + 0.8).add(new THREE.Vector3(0, 0.5, 0)); P(s.tube([hd.clone().multiplyScalar(R * 0.7).toArray() as [number, number, number], hd.clone().multiplyScalar(R + 0.3).toArray() as [number, number, number], tip.toArray() as [number, number, number]], 0.035, green)); for (let k = 0; k < 4; k++) { const leaf = P(s.ball([0.22, 0.02, 0.1], [tip.x, tip.y, tip.z], green, 8)); leaf.rotation.set(0.3, k * 1.6, 0.5); leaf.translateX(0.16); } }
    }
    if (old > 0.1) for (let i = 0; i < Math.round(mix(4, 22, old)); i++) {
      const t = random() * Math.PI * 2, r = R + 0.25 + random() * 1.6, x = Math.sin(t) * r, z = Math.cos(t) * r;
      for (let k = 0; k < 3; k++) s.rod([x, 0, z], [x + (k - 1) * 0.07, 0.16 + random() * 0.22, z + (random() - 0.5) * 0.08], 0.012, green, 0.003);
    }

    // ---- Fronds and the parachute ----
    const silk = (() => {
      const c2 = document.createElement('canvas'); c2.width = 256; c2.height = 64; const x2 = c2.getContext('2d')!;
      for (let i = 0; i < 12; i++) { x2.fillStyle = i % 2 ? '#f4efe2' : '#f0641e'; x2.fillRect(i * 256 / 12, 0, 256 / 12 + 1, 64); }
      const g = x2.createLinearGradient(0, 0, 0, 64); g.addColorStop(0, `rgba(90,70,50,${0.1 + decay * 0.5})`); g.addColorStop(1, `rgba(90,70,50,${decay * 0.5})`); x2.fillStyle = g; x2.fillRect(0, 0, 256, 64);
      const map = new THREE.CanvasTexture(c2); map.colorSpace = THREE.SRGBColorSpace;
      return new THREE.MeshStandardMaterial({ map, roughness: 0.8, side: THREE.DoubleSide });
    })();
    const cord = new THREE.LineBasicMaterial({ color: '#d8d2c4' });
    const flutter: THREE.Object3D[] = [];
    const tops: THREE.Vector3[] = [];
    if (a.chute === 'snagged' || a.chute === 'shredded') {
      const trunkMat = s.material('#5a4a6a', { roughness: 0.9 });
      const frondMat = s.material(new THREE.Color('#2f8f6a').lerp(new THREE.Color('#7a9a2a'), mood.warmth * 0.6), { roughness: 0.7, side: THREE.DoubleSide });
      for (const [fx, fz, fh] of [[1.75, -0.8, 3.3], [2.4, 0.15, 2.6], [1.15, -1.6, 2.8]] as const) {
        const lean = (random() - 0.5) * 0.5, top = new THREE.Vector3(fx + lean, fh, fz - 0.1);
        s.tube([[fx, 0, fz], [fx + lean * 0.3, fh * 0.5, fz + 0.12], [top.x, top.y, top.z]], 0.085, trunkMat);
        for (let k = 0; k < 4; k++) s.ring(0.1, 0.02, [fx + lean * 0.3 * (k / 3), 0.3 + k * fh * 0.14, fz + 0.06 * k / 3], trunkMat).rotation.x = Math.PI / 2;
        tops.push(top);
        const blades = 7;
        for (let k = 0; k < blades; k++) {
          const len = 1.0 + random() * 0.4, geo = new THREE.PlaneGeometry(len, 0.4, 8, 1), p = geo.attributes.position;
          for (let j = 0; j < p.count; j++) { const u = Math.min(1, Math.max(0, p.getX(j) / len + 0.5)); p.setXYZ(j, u * len, p.getY(j) * (Math.sin(Math.pow(u, 0.6) * Math.PI) + 0.1), Math.sin(u * 1.5) * 0.3 * len - u * u * len * 0.75); }
          geo.computeVertexNormals();
          const blade = s.mesh(geo, frondMat, [top.x, top.y, top.z]); blade.rotation.order = 'YXZ'; blade.rotation.y = k / blades * Math.PI * 2 + random() * 0.4; blade.rotation.x = -Math.PI / 2;
        }
      }
      pod.updateMatrixWorld(true);
      const anchor = pod.localToWorld(new THREE.Vector3(0.1, R, -0.1));
      if (a.chute === 'snagged') {
        const geo = new THREE.SphereGeometry(1.25, 24, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), p = geo.attributes.position;
        for (let j = 0; j < p.count; j++) { const x = p.getX(j), y = p.getY(j), z = p.getZ(j), ang = Math.atan2(z, x), rim = 1 - y / 1.25; p.setXYZ(j, x * (1 + Math.cos(ang * 12) * 0.05 * rim), y * 0.7 - rim * rim * (0.25 + Math.sin(ang * 2 + 1) * 0.25), z * (0.8 + Math.cos(ang * 12) * 0.05 * rim)); }
        geo.computeVertexNormals();
        const canopy = s.mesh(geo, silk, [tops[0].x - 0.5, tops[0].y - 0.55, tops[0].z + 0.5]); canopy.rotation.set(0.5, 0.3, 0.75); flutter.push(canopy);
        canopy.updateMatrixWorld(true);
        const lines: THREE.Vector3[] = [];
        for (let k = 0; k < 8; k++) { const t = k / 8 * Math.PI * 2 + 0.2; lines.push(canopy.localToWorld(new THREE.Vector3(Math.cos(t) * 1.25, -0.3, Math.sin(t) * 1.0)), anchor); }
        s.root.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(lines), cord));
      } else for (let k = 0; k < 7; k++) {
        const top = tops[k % 3], len = 0.9 + random() * 1.1, geo = new THREE.PlaneGeometry(0.28 + random() * 0.25, len, 1, 8), p = geo.attributes.position;
        for (let j = 0; j < p.count; j++) { const y = p.getY(j); p.setXYZ(j, p.getX(j) + Math.sin(y * 5 + k) * 0.08, y - len / 2, Math.sin(y * 4 + k * 2) * 0.12); }
        geo.computeVertexNormals();
        const rag = s.mesh(geo, silk, [top.x + (random() - 0.5) * 1.3, top.y - 0.1 - random() * 0.5, top.z + (random() - 0.5) * 1.0]); rag.rotation.y = random() * 3; flutter.push(rag);
        if (k < 3) s.root.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([rag.position.clone(), rag.position.clone().lerp(anchor, 0.5).add(new THREE.Vector3(0, -0.8, 0)), anchor]), cord));
      }
    }
    if (a.chute === 'draped') {
      const geo = new THREE.SphereGeometry(R + 0.06, 28, 14, 0, Math.PI * 2, 0, Math.PI * 0.62), p = geo.attributes.position;
      for (let j = 0; j < p.count; j++) { const x = p.getX(j), y = p.getY(j), z = p.getZ(j), ang = Math.atan2(z, x), low = Math.max(0, 0.5 - y / R); p.setXYZ(j, x * (1 + low * (0.5 + Math.cos(ang * 9) * 0.2)), y - low * 0.2, z * (1 + low * (0.5 + Math.cos(ang * 9) * 0.2))); }
      geo.computeVertexNormals();
      const shroud = s.mesh(geo, silk, [back.x * 0.55, sink + 0.05, back.z * 0.55]); shroud.rotation.set(-0.75, 0.6, 0.35);
    }

    // ---- Tracks ----
    const printMat = new THREE.MeshStandardMaterial({ color: soilHue.clone().multiplyScalar(0.5), roughness: 1 });
    const mark = (geo: THREE.BufferGeometry, x: number, z: number, turn: number, sx = 1, sz = 1) => { const m = s.mesh(geo, printMat, [x, 0.014, z]); m.rotation.set(-Math.PI / 2, 0, turn); m.scale.set(sx, sz, 1); m.castShadow = false; return m; };
    const away = new THREE.Vector3(0.62, 0, 0.78).normalize(), heading = Math.atan2(-away.x, away.z) * -1;
    const start = new THREE.Vector3(-0.5, 0, R + 0.5);
    if (a.tracks === 'boots') for (let i = 0; i < 8; i++) { const p = start.clone().addScaledVector(away, i * 0.42), side = i % 2 ? 1 : -1; mark(new THREE.CircleGeometry(0.09, 10), p.x + away.z * side * 0.13, p.z - away.x * side * 0.13, -heading, 0.75, 1.6); mark(new THREE.CircleGeometry(0.07, 8), p.x + away.z * side * 0.13 - away.x * 0.2, p.z - away.x * side * 0.13 - away.z * 0.2, -heading, 0.8, 0.8); }
    if (a.tracks === 'drag') { for (const side of [-1, 1]) for (let i = 0; i < 16; i++) { const p = start.clone().addScaledVector(away, i * 0.2); mark(new THREE.PlaneGeometry(0.11, 0.26), p.x + away.z * side * 0.16 + Math.sin(i * 0.8) * 0.04, p.z - away.x * side * 0.16, -heading); } for (let i = 0; i < 4; i++) { const p = start.clone().addScaledVector(away, 0.5 + i * 0.8); mark(new THREE.CircleGeometry(0.12 + random() * 0.08, 8), p.x + (random() - 0.5) * 0.5, p.z + (random() - 0.5) * 0.3, 0); } }
    if (a.tracks === 'claws') for (let i = 0; i < 12; i++) {
      const t = -0.6 + i * 0.36, r = i < 4 ? R + 2.6 - i * 0.45 : R + 0.85, side = i % 2 ? 0.14 : -0.14, x = Math.sin(t) * (r + side), z = Math.cos(t) * (r + side);
      mark(new THREE.CircleGeometry(0.07, 8), x, z, 0);
      for (let k = -1; k <= 1; k++) mark(new THREE.CircleGeometry(0.035, 6), x + Math.cos(t + k * 0.7) * 0.14 * (i < 4 ? -Math.sin(t) : 1), z - Math.sin(t + k * 0.7) * 0.14, -t - k * 0.7, 0.8, 2.2);
    }
    if (a.tracks === 'crawl') { for (let i = 0; i < 9; i++) { const p = start.clone().addScaledVector(away, i * 0.25); mark(new THREE.CircleGeometry(0.2, 10), p.x + Math.sin(i) * 0.06, p.z, -heading, 1, 1.3); if (i % 2) for (const side of [-1, 1]) mark(new THREE.CircleGeometry(0.06, 8), p.x + away.z * side * 0.32, p.z - away.x * side * 0.32, 0); } const end = start.clone().addScaledVector(away, 2.5); s.ball([0.1, 0.05, 0.12], [end.x, 0.04, end.z], s.material('#3a2a22'), 8); }

    // ---- Left behind ----
    const lx = 1.55, lz = 1.35;
    if (a.left === 'crate') {
      const box = s.material('#d8d2c0', { roughness: 0.7 }), red = s.material('#c8302a');
      s.box([0.6, 0.36, 0.42], [lx, 0.18, lz], box).rotation.y = 0.4; const lid = s.box([0.6, 0.04, 0.42], [lx - 0.32, 0.36, lz + 0.2], box); lid.rotation.set(0.2, 0.4, 1.1);
      const cross = s.box([0.2, 0.06, 0.01], [lx + 0.09, 0.2, lz + 0.215], red); cross.rotation.y = 0.4; const cross2 = s.box([0.06, 0.2, 0.01], [lx + 0.09, 0.2, lz + 0.215], red); cross2.rotation.y = 0.4;
      for (let i = 0; i < 4; i++) s.cylinder(0.05, 0.05, 0.14, [lx + 0.5 + random() * 0.4, 0.05, lz + (random() - 0.5) * 0.6], i % 2 ? steel : red, 10).rotation.set(Math.PI / 2, 0, random() * 3);
    }
    if (a.left === 'helmet') {
      const glass = s.ball([0.27, 0.27, 0.27], [lx, 0.3, lz], new THREE.MeshStandardMaterial({ color: '#c9eef7', transparent: true, opacity: 0.3, roughness: 0.05, depthWrite: false }), 18); glass.castShadow = false;
      s.ring(0.19, 0.05, [lx, 0.06, lz], steel).rotation.x = Math.PI / 2;
      const shine = s.mesh(new THREE.SphereGeometry(0.275, 8, 6, 0.6, 0.6, 0.6, 0.7), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.65, depthWrite: false }), [lx, 0.3, lz]); shine.castShadow = false;
    }
    if (a.left === 'fire') {
      const stone = s.material('#7a7478', { roughness: 1, flatShading: true }), char = s.material('#1c1816', { roughness: 1 });
      for (let i = 0; i < 9; i++) { const t = i / 9 * Math.PI * 2; s.mesh(new THREE.DodecahedronGeometry(0.1 + random() * 0.04, 0), stone, [lx + Math.sin(t) * 0.38, 0.06, lz + Math.cos(t) * 0.38]).rotation.y = random() * 3; }
      for (let i = 0; i < 4; i++) { const t = random() * 3; s.rod([lx - Math.sin(t) * 0.26, 0.04, lz - Math.cos(t) * 0.26], [lx + Math.sin(t) * 0.26, 0.09, lz + Math.cos(t) * 0.26], 0.035, char); }
      s.cylinder(0.3, 0.32, 0.02, [lx, 0.012, lz], char, 14);
    }
    if (a.left === 'grave') {
      const mound = s.mesh(new THREE.SphereGeometry(1, 14, 8), soil, [lx + 0.1, 0, lz + 0.1]); mound.scale.set(0.5, 0.2, 0.95); mound.rotation.y = 0.5;
      s.rod([lx - 0.35, 0, lz - 0.6], [lx - 0.35, 0.95, lz - 0.6], 0.03, steel); s.rod([lx - 0.62, 0.68, lz - 0.6], [lx - 0.08, 0.68, lz - 0.6], 0.03, steel);
      s.ring(0.12, 0.02, [lx - 0.35, 0.56, lz - 0.57], steel);
    }

    // Nothing may hang below the ground: flatten whatever dips under it, so the pod is truly half-buried.
    const bury = (root: THREE.Object3D) => {
      root.updateMatrixWorld(true);
      const v = new THREE.Vector3(), inverse = new THREE.Matrix4();
      root.traverse((node) => {
        const mesh = node as THREE.Mesh;
        if (!mesh.isMesh || !mesh.geometry.attributes.position || !(mesh.material as THREE.Material).depthWrite) return;
        const p = mesh.geometry.attributes.position; inverse.copy(mesh.matrixWorld).invert();
        for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).applyMatrix4(mesh.matrixWorld); if (v.y < -0.03) { v.y = -0.03; v.applyMatrix4(inverse); p.setXYZ(i, v.x, v.y, v.z); } }
        p.needsUpdate = true;
      });
    };
    bury(s.root);

    const animate = (time: number) => {
      const speed = mix(0.4, 2.4, mood.energy);
      for (const puff of puffs) { const d = puff.userData as { phase: number; drift: number; size: number }, t = (d.phase + time * 0.07 * speed) % 1; puff.position.set(back.x * 0.5 + Math.sin(d.drift + t * 2) * (0.4 + t * 0.8), 0.5 + t * 3.8, back.z * 0.5 + Math.cos(d.drift + t * 2) * (0.4 + t * 0.8)); puff.scale.setScalar(d.size * (0.6 + t * 1.8)); }
      if (ember) ember.emissiveIntensity = 1.5 + Math.sin(time * 3) * 0.4;
      if (a.beacon === 'red') lamp.emissiveIntensity = Math.sin(time * speed * 3) > 0 ? 2.6 : 0.15;
      if (a.beacon === 'sparks') lamp.emissiveIntensity = Math.sin(time * 37) * Math.sin(time * 11) > 0.3 ? 3 : 0;
      flutter.forEach((f, i) => { f.rotation.z += 0; f.position.y += Math.sin(time * speed * 1.5 + i) * 0.0008; f.rotation.x = (f.userData.rx ??= f.rotation.x) + Math.sin(time * speed + i * 2) * 0.05; });
    };
    animate(0);
    return s.finish({ footprint: 1.9, update: (_dt, time) => animate(time) });
  },
});
