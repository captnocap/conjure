import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

type P = [number, number, number];

function paint(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default defineThing({
  questions: {
    work: choice('What is held in the clips?', {
      board: 'A small green circuit board bristling with components.',
      watch: 'A brass watch movement, all tiny wheels and ruby jewels.',
      fly: 'A half-tied fishing fly, bright feathers on a hook.',
      jewel: 'A gold ring with a cut gemstone.',
      miniature: 'A tiny model soldier, half painted.',
      wires: 'Two wires being spliced together, a bead of solder at the join.',
      nothing: 'Nothing: the jaws hold only air.',
    }),
    hold: choice('How is the work sitting?', {
      steady: 'Gripped firm and level, exactly where it was set.',
      slipped: 'One clip has let go and it hangs askew from the other.',
      dropped: 'It has dropped out altogether and lies below on the base.',
    }),
    lens: choice('Where is the magnifying lens?', {
      over: 'Swung low in front of the work, tilted up toward the eye.',
      aside: 'Pushed off to one side, out of the way.',
      up: 'Flipped up high and flat above everything.',
      cracked: 'In front of the work, but the glass has a crack right across it.',
    }),
    arms: choice('What are the arms like?', {
      crossbar: 'A classic steel crossbar with ball joints and wing nuts.',
      gooseneck: 'Bendy segmented gooseneck arms that hold any pose.',
      wire: 'Home-made from stiff twisted copper wire.',
    }),
    base: choice('What is the weighted base?', {
      iron: 'A round black cast-iron foot.',
      steel: 'A bright rectangular steel block.',
      wood: 'A block of scrap hardwood.',
      brass: 'A heavy turned brass foot.',
    }),
    ring: noul('Is there a lit ring lamp around the lens?'),
    tools: noul('Are fine tools (tweezers, a loupe, a little brush) laid out beside it?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const steel = s.material('#c3c8ca', { metalness: 0.85, roughness: 0.25 });
    const dark = s.material('#1f2022', { roughness: 0.55, metalness: 0.3 });
    const copper = s.material('#b86a35', { metalness: 0.75, roughness: 0.35 });
    const armMat = a.arms === 'wire' ? copper : a.arms === 'gooseneck' ? s.material('#2a2c30', { roughness: 0.45, metalness: 0.4 }) : steel;

    // ---- Base and post.
    const baseTop = a.base === 'wood' ? 0.03 : a.base === 'steel' ? 0.022 : 0.024;
    if (a.base === 'iron') s.lathe([[0, 0], [0.055, 0], [0.057, 0.008], [0.04, 0.018], [0.02, 0.024], [0, 0.024]], dark);
    else if (a.base === 'brass') s.lathe([[0, 0], [0.05, 0], [0.05, 0.01], [0.04, 0.012], [0.032, 0.02], [0.018, 0.024], [0, 0.024]], s.material('#b8913f', { metalness: 0.8, roughness: 0.28 }));
    else if (a.base === 'steel') s.box([0.12, 0.022, 0.075], [0, 0.011, 0], steel);
    else { s.box([0.13, 0.03, 0.085], [0, 0.015, 0], s.material('#8a5f38', { roughness: 0.7 })); for (let i = 0; i < 3; i++) s.box([0.13, 0.0006, 0.002], [0, 0.0304, -0.03 + i * 0.027 + random() * 0.01], s.material('#5e3d22')); }
    const postTop = 0.118;
    if (a.arms !== 'gooseneck') { s.cylinder(0.004, 0.004, postTop - baseTop + 0.004, [0, (postTop + baseTop) / 2, 0], armMat, 10); s.cylinder(0.009, 0.011, 0.012, [0, baseTop + 0.006, 0], armMat, 12); }

    // ---- The work, built around the origin with its grip points at x = ±half.
    const item = new Sculpture(context);
    let half = 0.02, both = true;
    const smokeFrom: P | null = a.work === 'wires' || a.work === 'board' ? [0, 0.004, 0] : null;
    if (a.work === 'board') {
      half = 0.036;
      const old = mood.wear > 0.6;
      const tex = paint(256, 160, (ctx) => {
        ctx.fillStyle = old ? '#b58a4a' : '#1f7a48'; ctx.fillRect(0, 0, 256, 160);
        ctx.strokeStyle = old ? '#d9b46a' : '#58c080'; ctx.lineWidth = 3;
        for (let i = 0; i < 16; i++) { const x = 10 + random() * 236, y = 10 + random() * 140; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (random() - 0.5) * 90, y); ctx.lineTo(x + (random() - 0.5) * 90, y + (random() - 0.5) * 70); ctx.stroke(); }
        ctx.fillStyle = '#d8d8cc'; for (let i = 0; i < 40; i++) { ctx.beginPath(); ctx.arc(8 + random() * 240, 8 + random() * 144, 3, 0, 7); ctx.fill(); }
      });
      item.box([0.072, 0.0018, 0.045], [0, 0, 0], new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5 }));
      item.box([0.022, 0.006, 0.009], [-0.012, 0.004, -0.008], dark);
      for (let i = 0; i < 3; i++) item.cylinder(0.004, 0.004, 0.009, [0.014 + i * 0.008, 0.0055, -0.012], s.material(['#2a5fb0', '#1d1d20', '#2a5fb0'][i]), 10);
      ['#d8bb8e', '#3f7fc4', '#d8bb8e', '#d8bb8e'].forEach((c, i) => { item.cylinder(0.0017, 0.0017, 0.009, [-0.024 + i * 0.012, 0.003, 0.011], s.material(c), 8).rotation.x = Math.PI / 2; });
      item.cylinder(0.0045, 0.0045, 0.002, [0.02, 0.002, 0.008], s.material('#e07a2a'), 12);
      item.ball([0.0035, 0.004, 0.0035], [0.027, 0.006, 0.012], new THREE.MeshStandardMaterial({ color: '#ff4030', emissive: '#ff2010', emissiveIntensity: mix(0.3, 1.6, mood.cheer) }), 10);
      item.root.rotation.x = 0.55;
    } else if (a.work === 'watch') {
      half = 0.019;
      const tex = paint(256, 256, (ctx) => {
        ctx.fillStyle = '#c9a54a'; ctx.beginPath(); ctx.arc(128, 128, 128, 0, 7); ctx.fill();
        const gear = (x: number, y: number, r: number, c: string) => { ctx.fillStyle = c; ctx.beginPath(); for (let i = 0; i < 40; i++) { const t = i / 40 * 6.283, rr = r * (i % 2 ? 1 : 0.86); ctx.lineTo(x + Math.cos(t) * rr, y + Math.sin(t) * rr); } ctx.fill(); ctx.fillStyle = '#6a5220'; ctx.beginPath(); ctx.arc(x, y, r * 0.18, 0, 7); ctx.fill(); };
        gear(92, 100, 54, '#e3c46a'); gear(170, 150, 42, '#d8d8d0'); gear(120, 190, 30, '#e3c46a');
        ctx.strokeStyle = '#8a6d2a'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(176, 78, 34, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.moveTo(142, 78); ctx.lineTo(210, 78); ctx.stroke();
        ctx.fillStyle = '#d0183a'; for (const [x, y] of [[92, 100], [170, 150], [176, 78], [120, 190], [60, 180]]) { ctx.beginPath(); ctx.arc(x, y, 7, 0, 7); ctx.fill(); }
        ctx.fillStyle = '#2a3f8a'; for (let i = 0; i < 5; i++) { const t = i * 1.3; ctx.beginPath(); ctx.arc(128 + Math.cos(t) * 104, 128 + Math.sin(t) * 104, 6, 0, 7); ctx.fill(); }
      });
      const brass = s.material('#b8913f', { metalness: 0.8, roughness: 0.3 });
      item.cylinder(0.019, 0.019, 0.005, [0, 0, 0], [brass, new THREE.MeshStandardMaterial({ map: tex, metalness: 0.5, roughness: 0.35 }), brass] as unknown as THREE.Material, 30);
      item.cylinder(0.002, 0.002, 0.008, [0.021, 0, 0], steel, 8).rotation.z = Math.PI / 2;
      item.cylinder(0.004, 0.004, 0.004, [0.026, 0, 0], steel, 10).rotation.z = Math.PI / 2;
      item.root.rotation.x = 0.7;
    } else if (a.work === 'fly') {
      half = 0.014; both = false;
      item.tube([[-0.014, 0, 0], [0.012, 0, 0], [0.02, -0.004, 0], [0.021, -0.012, 0], [0.014, -0.017, 0], [0.008, -0.012, 0]], 0.0008, steel);
      const hues = mood.cheer > 0.5 ? ['#e8452a', '#f0c020', '#2f9a58'] : ['#7a5a32', '#b08a4a', '#3a3a34'];
      item.ball([0.011, 0.005, 0.005], [0.0, 0, 0], s.material(hues[2], { roughness: 1 }), 10);
      for (let i = 0; i < 9; i++) { const t = i / 9 * 6.283; item.rod([-0.008, 0, 0], [-0.004, Math.cos(t) * 0.012, Math.sin(t) * 0.012], 0.0006, s.material(hues[i % 2], { roughness: 1 }), 0.0002); }
      for (let i = 0; i < 3; i++) item.rod([0.008, 0.001, 0], [0.03 + i * 0.004, 0.006 + i * 0.004, (i - 1) * 0.004], 0.0012, s.material(hues[0], { roughness: 1 }), 0.0002);
      item.ball([0.003, 0.003, 0.003], [-0.012, 0, 0], dark, 8);
    } else if (a.work === 'jewel') {
      half = 0.012; both = false;
      const gold = s.material('#d8a93a', { metalness: 0.95, roughness: 0.18 });
      const band = item.ring(0.0095, 0.0016, [0, 0, 0], gold);
      band.rotation.y = 0.4;
      const gemColour = mood.cheer > 0.66 ? '#e02a4a' : mood.cheer > 0.33 ? '#2a7ae0' : '#2ab06a';
      item.mesh(new THREE.OctahedronGeometry(0.0055, 0), new THREE.MeshStandardMaterial({ color: gemColour, emissive: gemColour, emissiveIntensity: 0.55, roughness: 0.05, metalness: 0.2, flatShading: true }), [0, 0.0125, 0]).scale.y = 0.75;
      for (let i = 0; i < 4; i++) { const t = i * Math.PI / 2 + 0.7; item.rod([Math.cos(t) * 0.002, 0.0085, Math.sin(t) * 0.002], [Math.cos(t) * 0.0045, 0.0135, Math.sin(t) * 0.0045], 0.0006, gold); }
    } else if (a.work === 'miniature') {
      half = 0.012; both = false;
      const primer = s.material('#b9b9b2', { roughness: 0.9 });
      const coat = s.material(mood.cheer > 0.5 ? '#c0282a' : '#2f4f8a', { roughness: 0.7 });
      item.cylinder(0.011, 0.012, 0.004, [0, -0.012, 0], dark, 16);
      item.cylinder(0.0022, 0.0026, 0.016, [-0.003, -0.002, 0], primer, 8); item.cylinder(0.0022, 0.0026, 0.016, [0.003, -0.002, 0], primer, 8);
      item.cylinder(0.005, 0.0045, 0.014, [0, 0.013, 0], coat, 10);
      item.ball([0.0038, 0.0042, 0.0038], [0, 0.0245, 0], s.material('#e0b08a'), 10);
      item.cylinder(0.0042, 0.0046, 0.006, [0, 0.03, 0], dark, 10);
      item.rod([0.006, 0.006, 0], [0.008, 0.036, 0.002], 0.0008, s.material('#5a3a22'));
      item.rod([-0.005, 0.018, 0], [-0.009, 0.009, 0.003], 0.0016, primer);
      item.rod([0.005, 0.018, 0], [0.007, 0.01, 0.002], 0.0016, coat);
    } else if (a.work === 'wires') {
      half = 0.03;
      const colours = mood.cheer > 0.5 ? ['#c8261e', '#e3c21c'] : ['#1c1c1e', '#c8261e'];
      item.tube([[-0.05, -0.012, 0.004], [-0.03, 0, 0], [-0.008, 0, 0]], 0.0022, s.material(colours[0], { roughness: 0.5 }));
      item.tube([[0.05, -0.014, -0.004], [0.03, 0, 0], [0.008, 0, 0]], 0.0022, s.material(colours[1], { roughness: 0.5 }));
      item.rod([-0.008, 0, 0], [0.008, 0, 0], 0.0011, copper);
      item.ball([0.0045, 0.0032, 0.0032], [0, 0, 0], s.material('#e2e6e8', { metalness: 0.95, roughness: 0.12 }), 12);
    } else { half = 0.016; both = false; }

    half *= 1.35; item.root.scale.setScalar(1.35);

    // ---- Where everything sits.
    const WY = 0.165, WZ = 0.03;
    const dropped = a.hold === 'dropped' && a.work !== 'nothing', slipped = a.hold === 'slipped' && a.work !== 'nothing';
    const swing = new THREE.Group();
    swing.add(item.root);
    if (a.work !== 'nothing') {
      if (dropped) {
        item.root.rotation.set(a.work === 'miniature' ? Math.PI / 2 : 0, random() * 2, 0);
        swing.position.set(0.02 + random() * 0.02, baseTop + (a.work === 'miniature' ? 0.012 : a.work === 'jewel' ? 0.011 : a.work === 'fly' ? 0.018 : 0.004), 0.02 + random() * 0.015);
        if (a.work === 'jewel') item.root.rotation.set(Math.PI / 2, 0, 0);
      } else {
        // Pivot at the left grip so a slipped piece hangs from it.
        item.root.position.x += half;
        swing.position.set(-half, WY, WZ);
        if (slipped) swing.rotation.z = -0.95 - random() * 0.3;
      }
      s.root.add(swing);
    }
    const gripL = new THREE.Vector3(-half, WY, WZ), gripR = new THREE.Vector3(half, WY, WZ);
    const openR = !both || slipped || dropped || a.work === 'nothing', openL = dropped || a.work === 'nothing';

    // ---- Alligator clips.
    const clip = (tip: THREE.Vector3, side: number, open: boolean, sleeve: string) => {
      const g = new Sculpture(context);
      const gape = open ? 0.34 : 0.1;
      for (const jaw of [-1, 1]) {
        const j = g.box([0.034, 0.0022, 0.007], [0.017, 0, 0], steel);
        j.geometry.translate(0, 0, 0);
        const pivot = new THREE.Group(); pivot.position.set(0.034, 0, 0); pivot.rotation.z = jaw * gape; g.root.add(pivot);
        j.position.set(-0.017, 0, 0); pivot.add(j);
        const back = g.box([0.02, 0.0022, 0.007], [0.044, jaw * 0.004, 0], steel); back.rotation.z = -jaw * 0.22;
      }
      g.cylinder(0.005, 0.0045, 0.02, [0.058, 0, 0], s.material(sleeve, { roughness: 0.5 }), 10).rotation.z = Math.PI / 2;
      g.root.position.copy(tip);
      g.root.rotation.y = side < 0 ? Math.PI : 0;
      g.root.rotation.z = side < 0 ? -0.18 : 0.18;
      if (side > 0 && open) g.root.rotation.z = 0.5;
      s.root.add(g.root);
      g.root.updateMatrixWorld(true);
      return g.root.localToWorld(new THREE.Vector3(0.068, 0, 0));
    };
    const tailL = clip(gripL, -1, openL, mood.cheer > 0.5 ? '#c8261e' : '#1c1c1e');
    const tailR = clip(gripR.clone().add(new THREE.Vector3(openR && a.work !== 'nothing' ? 0.012 : 0, 0, 0)), 1, openR, '#1c1c1e');

    // ---- Arms.
    const bead = new THREE.SphereGeometry(1, 10, 8);
    const jointed = (points: P[], radius: number) => {
      const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
      if (a.arms === 'gooseneck') {
        const n = Math.round(curve.getLength() / 0.008);
        s.scatter(bead, armMat, Array.from({ length: n + 1 }, (_u, i) => ({ at: curve.getPointAt(i / n).toArray() as P, size: radius * (i % 2 ? 1.15 : 1.45) })));
      } else {
        const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 30, radius * 0.75, 6), armMat); m.castShadow = true; s.root.add(m);
      }
    };
    if (a.arms === 'crossbar') {
      s.rod([-0.105, postTop, 0], [0.105, postTop, 0], 0.003, steel);
      s.box([0.016, 0.014, 0.014], [0, postTop, 0], steel);
      const nut = s.cylinder(0.003, 0.003, 0.016, [0, postTop, 0.012], steel, 8); nut.rotation.x = Math.PI / 2;
      s.box([0.018, 0.008, 0.002], [0, postTop, 0.021], steel);
      for (const [side, tail] of [[-1, tailL], [1, tailR]] as const) {
        s.box([0.012, 0.012, 0.012], [side * 0.1, postTop, 0], steel);
        s.ball([0.007, 0.007, 0.007], [side * 0.1, postTop + 0.012, 0], steel, 12);
        s.rod([side * 0.1, postTop + 0.012, 0], tail.toArray() as P, 0.0028, steel);
        s.box([0.016, 0.006, 0.002], [side * 0.1, postTop - 0.009, 0.004], steel).rotation.z = 0.5;
      }
    } else if (a.arms === 'gooseneck') {
      for (const [side, tail] of [[-1, tailL], [1, tailR]] as const) {
        s.cylinder(0.007, 0.008, 0.01, [side * 0.035, baseTop + 0.003, -0.01], armMat, 10);
        jointed([[side * 0.035, baseTop, -0.01], [side * 0.085, 0.06, -0.015], [side * 0.125, 0.12, 0.0], [tail.x + side * 0.02, tail.y - 0.01, tail.z - 0.004], tail.toArray() as P], 0.0042);
      }
    } else {
      for (const [side, tail] of [[-1, tailL], [1, tailR]] as const) {
        jointed([[0, postTop - 0.01, 0], [side * 0.03, postTop + 0.012, 0.0], [side * 0.08, postTop - 0.012 + random() * 0.01, 0.006], [side * 0.11, postTop + 0.02, 0.012], tail.toArray() as P], 0.0026);
      }
      for (let i = 0; i < 6; i++) s.ring(0.0052, 0.0014, [0, postTop - 0.03 + i * 0.005, 0], copper).rotation.x = Math.PI / 2;
    }

    // ---- Lens.
    const lensAt = { over: new THREE.Vector3(0.005, WY + 0.012, WZ + 0.075), cracked: new THREE.Vector3(0.005, WY + 0.012, WZ + 0.075), aside: new THREE.Vector3(-0.115, 0.215, -0.02), up: new THREE.Vector3(0.0, 0.25, 0.01) }[a.lens];
    const normal = { over: new THREE.Vector3(0.22, 0.55, 0.8), cracked: new THREE.Vector3(0.22, 0.55, 0.8), aside: new THREE.Vector3(-0.3, 0.25, 1), up: new THREE.Vector3(0.05, 1, 0.12) }[a.lens].normalize();
    const LR = 0.038;
    const lens = new Sculpture(context);
    lens.ring(LR, 0.003, [0, 0, 0], a.arms === 'wire' ? copper : dark);
    const glassMat = new THREE.MeshStandardMaterial({ color: '#bfe2f2', transparent: true, opacity: 0.32, roughness: 0.03, metalness: 0.1, depthWrite: false, side: THREE.DoubleSide });
    const pane = lens.mesh(new THREE.SphereGeometry(LR, 24, 8, 0, Math.PI * 2, 0, 0.5), glassMat, [0, 0, -LR * 0.87]);
    pane.rotation.x = Math.PI / 2; pane.scale.set(1.9, 1, 1.9); pane.castShadow = false;
    pane.position.z = -LR * 0.88 + 0.003;
    const shine = lens.box([LR * 0.9, 0.003, 0.0006], [-LR * 0.2, LR * 0.42, 0.004], new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 0.6, transparent: true, opacity: 0.8, depthWrite: false }));
    shine.rotation.z = 0.5; shine.castShadow = false;
    if (a.lens === 'cracked') {
      const crack = new THREE.MeshStandardMaterial({ color: '#f4fbff', emissive: '#ffffff', emissiveIntensity: 0.3 });
      let from: P = [-LR * 0.9, LR * 0.2, 0.0045];
      for (let i = 0; i < 5; i++) { const to: P = [-LR * 0.9 + (i + 1) * LR * 0.36, LR * 0.2 - (i + 1) * LR * 0.1 + (random() - 0.5) * 0.012, 0.0045]; lens.rod(from, to, 0.0007, crack); from = to; }
      lens.rod([0, 0.004, 0.0045], [LR * 0.3, LR * 0.8, 0.0045], 0.0006, crack);
    }
    const lamp = a.ring ? new THREE.MeshStandardMaterial({ color: '#fff6d8', emissive: mood.warmth > 0.5 ? '#ffd890' : '#cfe8ff', emissiveIntensity: 2.2 }) : null;
    if (lamp) lens.ring(LR + 0.006, 0.0032, [0, 0, -0.002], lamp);
    lens.root.position.copy(lensAt);
    lens.root.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
    s.root.add(lens.root);
    lens.root.updateMatrixWorld(true);
    const hilt = lens.root.localToWorld(new THREE.Vector3(0, -LR - 0.004, 0));
    const origin: P = a.arms === 'gooseneck' ? [0, baseTop, -0.025] : [0, postTop + 0.004, 0];
    if (a.arms === 'gooseneck') s.cylinder(0.007, 0.008, 0.01, [0, baseTop + 0.003, -0.025], armMat, 10);
    const bend: P[] = a.lens === 'aside'
      ? [[origin[0] - 0.02, origin[1] + 0.05, origin[2] - 0.02], [hilt.x + 0.02, hilt.y - 0.03, hilt.z - 0.01]]
      : a.lens === 'up' ? [[0.01, (origin[1] + hilt.y) / 2, origin[2] - 0.03], [0.0, hilt.y - 0.02, hilt.z - 0.035]]
        : [[0.06, origin[1] + 0.03, origin[2] - 0.01], [0.09, hilt.y - 0.03, hilt.z - 0.05], [hilt.x + 0.03, hilt.y - 0.02, hilt.z - 0.005]];
    jointed([origin, ...bend, hilt.toArray() as P], a.arms === 'gooseneck' ? 0.0042 : 0.003);

    // ---- Fine tools beside the base.
    if (a.tools) {
      const tx = 0.09, tz = 0.075;
      const tw = new Sculpture(context);
      tw.rod([0, 0.003, 0], [0.1, 0.004, 0.005], 0.0005, steel, 0.0026);
      tw.rod([0, 0.003, 0], [0.1, 0.004, -0.005], 0.0005, steel, 0.0026);
      tw.root.position.set(tx - 0.06, 0, tz + 0.02); tw.root.rotation.y = 0.2 + random() * 0.5; s.root.add(tw.root);
      const brush = new Sculpture(context);
      brush.rod([0, 0.004, 0], [0.09, 0.004, 0], 0.0025, s.material('#a8322a', { roughness: 0.4 }), 0.0018);
      brush.rod([0.09, 0.004, 0], [0.102, 0.004, 0], 0.0022, steel);
      brush.rod([0.102, 0.004, 0], [0.116, 0.004, 0], 0.0018, s.material('#3a2a1c'), 0.0003);
      brush.root.position.set(-0.13, 0, 0.07); brush.root.rotation.y = -0.7 + random() * 0.4; s.root.add(brush.root);
      s.cylinder(0.011, 0.014, 0.022, [tx + 0.03, 0.011, tz - 0.05], dark, 16);
      s.cylinder(0.0105, 0.0105, 0.002, [tx + 0.03, 0.0225, tz - 0.05], glassMat, 16);
    }
    const crumbs = [];
    for (let i = 0; i < Math.floor(mood.density * 8); i++) { const t = random() * 6.28, r = 0.07 + random() * 0.05; crumbs.push({ at: [Math.cos(t) * r, 0.0015, Math.sin(t) * r * 0.8 + 0.02] as P, size: 0.5 + random() }); }
    if (crumbs.length) s.scatter(new THREE.SphereGeometry(0.0022, 6, 4), s.material('#d4d8da', { metalness: 0.9, roughness: 0.2 }), crumbs);

    // ---- A thread of smoke from fresh solder, and a slipped piece that still swings.
    const puffs: THREE.Mesh[] = [];
    if (smokeFrom && a.hold === 'steady' && mood.energy > 0.35) {
      const smoke = new THREE.MeshStandardMaterial({ color: '#aab0b8', transparent: true, opacity: 0.4, depthWrite: false, roughness: 1 });
      for (let i = 0; i < 7; i++) { const m = new THREE.Mesh(bead, smoke); s.root.add(m); puffs.push(m); }
    }
    const from = new THREE.Vector3(0, WY + 0.004, WZ), rate = mix(0.15, 0.5, mood.energy), phase = random() * 6, rest = swing.rotation.z;
    const drift = (time: number) => puffs.forEach((m, i) => {
      const t = (i / puffs.length + time * rate) % 1;
      m.position.set(from.x + Math.sin(t * 6 + phase + time) * 0.008 * t, from.y + t * 0.09, from.z + Math.cos(t * 5 + phase) * 0.006 * t);
      m.scale.setScalar(0.003 + t * 0.007);
    });
    drift(0);
    const animated = puffs.length > 0 || slipped || lamp;
    return s.finish({
      update: animated ? (_dt, time) => {
        drift(time);
        if (slipped) swing.rotation.z = rest + Math.sin(time * 2.4 + phase) * 0.12 * mood.energy;
        if (lamp) lamp.emissiveIntensity = 2.2 + Math.sin(time * 40 + phase) * 0.15 * mood.energy * mood.wear;
      } : undefined,
    });
  },
});
