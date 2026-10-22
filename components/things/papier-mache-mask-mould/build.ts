import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';
import { type Pt, blob, ell, g, horn, human, painted, shell, shellPoint, type ShellSpec } from './face';

export default defineThing({
  questions: {
    face: choice('What face is being made?', {
      half: 'A carnival half-mask: just the eyes and nose, with upswept cat-eye corners.',
      zanni: 'A long-nosed zanni from the commedia: low brow and a nose like a carrot.',
      animal: 'An animal: a fox or cat with pointed ears and a pushed-out muzzle.',
      grotesque: 'A grotesque: bulging brows, a bulbous nose, a huge leering grin and warts.',
    }),
    stage: choice('How far along is it?', {
      clay: 'Bare clay, just sculpted, the paper not yet started.',
      wet: 'Wet paper strips laid over about half of it, the clay still showing through.',
      gesso: 'Fully covered and gessoed chalk white, waiting for paint.',
      painted: 'Half painted: one side in harlequin diamonds and gold, the other still white.',
    }),
    paper: choice('What paper is being torn up for it?', {
      newsprint: 'Newsprint: grey columns and black headlines.',
      music: 'Old sheet music: cream pages of staves and notes.',
      letters: 'Old handwritten letters in brown ink, somebody\'s correspondence.',
    }),
    clay: choice('What clay is the positive sculpted in?', {
      terracotta: 'Red-brown terracotta clay.',
      grey: 'Cool grey modelling clay.',
      green: 'Olive green plasticine.',
    }),
    blanks: score('How many finished blanks are stacked beside it?', ['None yet', 'One', 'A few', 'A tall stack of five or six']),
    moment: choice('What moment is this?', {
      working: 'Mid-task: the brush stands in fresh wet paste, strips ready to hand.',
      paused: 'Left for the night to dry, brush laid neatly across the bowl.',
      abandoned: 'Abandoned long ago: the paste dried and cracked, the brush stuck in it, dust over everything.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const dusty = a.moment === 'abandoned' ? 1 : 0;
    const clayColour = { terracotta: '#a95b3c', grey: '#8d8f8c', green: '#6f7a45' }[a.clay];
    const dust = (hex: string) => `#${new THREE.Color(hex).lerp(new THREE.Color('#a39c8e'), dusty * 0.35).getHexString()}`;

    const reliefs = {
      half: human({ cheek: 1.1 }),
      zanni: human({ nose: 0.5, brow: 1.7, cheek: 1.3, socket: 1.2 }),
      animal: ((u: number, v: number) => 0.5 * g(u, 0, 0.3) * g(v, -0.32, 0.3) + 0.12 * g(v, 0.3, 0.1) * g(Math.abs(u), 0.42, 0.3) - 0.12 * g(Math.abs(u), 0.42, 0.18) * g(v, 0.14, 0.1) + 0.1 * g(Math.abs(u), 0.3, 0.2) * g(v, -0.45, 0.12)),
      grotesque: ((u: number, v: number) => human({ nose: 1.9, brow: 2.5, cheek: 2.1, chin: 1.9, socket: 1.7, smile: 1.6, lips: 1.6 })(u, v) + 0.1 * g(Math.hypot(u - 0.5, v - 0.55), 0, 0.08) + 0.09 * g(Math.hypot(u + 0.3, v + 0.75), 0, 0.07) + 0.08 * g(Math.hypot(u + 0.62, v - 0.0), 0, 0.06)),
    };
    const relief = reliefs[a.face];
    const area = (u: number, v: number) => a.face !== 'half' || v > -0.1 + 0.1 * Math.cos(u * Math.PI) - 0.22 * g(u, 0, 0.16) + 0.5 * Math.max(0, Math.abs(u) - 0.75);
    const eyeHole = (u: number, v: number) => ell(Math.abs(u), v, 0.42, 0.15, 0.16, 0.075, 0.25) < 1;
    const spec: ShellSpec = { w: 0.19, h: 0.25, d: 0.075, taper: 0.24, relief, segU: 72, segV: 92 };

    const p1 = random() * 6, p2 = random() * 6, p3 = random() * 6;
    const patch = (u: number, v: number) => Math.sin(u * 5 + p1) * Math.sin(v * 4 + p2) + 0.6 * Math.sin(u * 9 - v * 7 + p3) + 0.35 * Math.sin(Math.round((u + v) * 9) * 2.4 + p1);

    const printed = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      ctx.fillStyle = { newsprint: random() < 0.5 ? '#cdc9bb' : '#bdb9ac', music: random() < 0.5 ? '#e8d59a' : '#dcc688', letters: random() < 0.5 ? '#e2cfa2' : '#d6c08e' }[a.paper]; ctx.fillRect(-w / 2, -h / 2, w, h);
      ctx.fillStyle = ctx.strokeStyle = a.paper === 'letters' ? '#5a3b22' : '#25221f';
      if (a.paper === 'newsprint') {
        if (random() < 0.4) ctx.fillRect(-w / 2 + 4, -h / 2 + 4, w * 0.7, 8);
        for (let y = -h / 2 + 16; y < h / 2 - 3; y += 5) for (let c = 0; c < 2; c++) ctx.fillRect(-w / 2 + 4 + c * w / 2, y, w / 2 - 8 - random() * 12, 2.2);
      } else if (a.paper === 'music') {
        ctx.lineWidth = 1;
        for (let y = -h / 2 + 8; y < h / 2 - 18; y += 26) { for (let l = 0; l < 5; l++) { ctx.beginPath(); ctx.moveTo(-w / 2 + 3, y + l * 3.4); ctx.lineTo(w / 2 - 3, y + l * 3.4); ctx.stroke(); } for (let x = -w / 2 + 10; x < w / 2 - 6; x += 11) { const ny = y + Math.floor(random() * 5) * 3.4; ctx.beginPath(); ctx.ellipse(x, ny, 3, 2.2, -0.4, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(x + 2.2, ny - 11, 1.2, 11); } }
      } else {
        ctx.lineWidth = 1.3;
        for (let y = -h / 2 + 8; y < h / 2 - 4; y += 8) { ctx.beginPath(); ctx.moveTo(-w / 2 + 5, y); for (let x = -w / 2 + 5; x < w / 2 - 5 - random() * 30; x += 4) ctx.lineTo(x, y + (random() - 0.5) * 5 - 2); ctx.stroke(); }
      }
    };
    const paperTexture = (strips: number, damp: number) => painted(512, 640, (ctx, _X, _Y, W, H) => {
      ctx.fillStyle = { newsprint: '#c5c1b3', music: '#e2cd90', letters: '#dcc898' }[a.paper]; ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < strips; i++) {
        ctx.save(); ctx.translate(random() * W, random() * H); ctx.rotate(random() * Math.PI);
        ctx.scale(2.1, 2.1); printed(ctx, 50 + random() * 60, 26 + random() * 26);
        ctx.strokeStyle = 'rgba(60,50,40,0.5)'; ctx.lineWidth = 1.5; ctx.strokeRect(-90, -45, 0, 0);
        ctx.restore();
      }
      ctx.fillStyle = `rgba(120,105,80,${damp * 0.25})`; ctx.fillRect(0, 0, W, H);
    });

    // The propped work board.
    const work = new THREE.Group();
    const tilt = -Math.PI / 2 + 0.78;
    work.rotation.x = tilt;
    work.position.set(0, 0.012 + 0.17 * Math.cos(tilt + Math.PI / 2) * 0 + 0.17 * Math.sin(0.78), 0);
    s.root.add(work);
    const put = <T extends THREE.Object3D>(o: T) => { o.traverse((n) => { n.castShadow = n.receiveShadow = true; }); work.add(o); return o; };
    const wood = s.material(dust('#b08a5a'), { roughness: 0.8 });
    const board = put(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.34, 0.016), wood));
    board.position.z = -0.008;
    const topEdge = new THREE.Vector3(0, 0.17, -0.016).applyEuler(work.rotation).add(work.position);
    for (const x of [-0.11, 0.11]) s.rod([x, topEdge.y, topEdge.z], [x, 0, topEdge.z - 0.05], 0.008, wood);
    s.box([0.3, 0.014, 0.02], [0, 0.007, 0.17 * Math.cos(0.78) + 0.012], wood);

    const clay = new THREE.MeshStandardMaterial({ color: dust(clayColour), roughness: a.clay === 'green' ? 0.55 : 0.85, side: THREE.DoubleSide });
    put(shell(spec, clay));
    const skirt = put(new THREE.Mesh(new THREE.CylinderGeometry(1, 1.06, 1, 40), clay));
    skirt.scale.set(0.094, 0.018, 0.122); skirt.rotation.x = Math.PI / 2; skirt.position.set(0, -0.004, 0.009);

    const on = (u: number, v: number, lift = 0): Pt => { const p = shellPoint(spec, u, v); return [p.x, p.y, p.z + lift]; };
    const extras = (skin: THREE.Material, lift: number, target: THREE.Object3D) => {
      if (a.face === 'zanni') {
        const [x, y, z] = on(0, -0.02);
        target.add(horn([[x, y + 0.01, z - 0.012], [x, y - 0.012, z + 0.05], [x, y - 0.04, z + 0.1], [x + 0.004, y - 0.075, z + 0.135]], (t) => (0.023 + lift) * (1 - t) ** 0.6 + 0.004, skin, { sides: 12, steps: 20 }));
      }
      if (a.face === 'animal') for (const side of [-1, 1]) {
        const [x, y, z] = on(side * 0.5, 0.72);
        target.add(horn([[x, y - 0.02, z - 0.02], [x + side * 0.012, y + 0.03, z - 0.006], [x + side * 0.02, y + 0.08, z - 0.012]], (t) => (0.03 + lift) * (1 - t) ** 0.8 + 0.002, skin, { sides: 10, steps: 12, squash: 0.45, side: [1, 0, 0] }));
      }
    };
    const clayExtras = new THREE.Group(); extras(clay, 0, clayExtras); put(clayExtras);

    const covered = a.stage !== 'clay';
    if (covered) {
      const full = a.stage !== 'wet';
      const skin = full
        ? new THREE.MeshStandardMaterial({ roughness: 0.9, side: THREE.DoubleSide, map: painted(512, 640, (ctx, X, Y, W, H) => {
          ctx.fillStyle = dust('#f2efe6'); ctx.fillRect(0, 0, W, H);
          ctx.strokeStyle = 'rgba(190,182,165,0.5)'; ctx.lineWidth = 3;
          for (let i = 0; i < 70; i++) { const y = random() * H, x = random() * W; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 60 + random() * 120, y + (random() - 0.5) * 18); ctx.stroke(); }
          if (a.stage === 'painted') {
            ctx.save(); ctx.beginPath(); ctx.rect(0, 0, X(0.06 + (random() - 0.5) * 0.2), H); ctx.clip();
            const cols = ['#c0242c', '#1f7a4c', '#e8b530', '#1d3e8f', '#16151a'];
            const dw = W / 7, dh = H / 6;
            for (let j = -1; j < 14; j++) for (let i = -1; i < 9; i++) { ctx.fillStyle = cols[(i * 2 + j * 3 + 10) % cols.length]; const cx = i * dw + (j % 2) * dw / 2, cy = j * dh / 2; ctx.beginPath(); ctx.moveTo(cx, cy - dh / 2); ctx.lineTo(cx + dw / 2, cy); ctx.lineTo(cx, cy + dh / 2); ctx.lineTo(cx - dw / 2, cy); ctx.fill(); }
            ctx.restore();
            ctx.strokeStyle = '#d7a92c'; ctx.lineWidth = 9;
            for (const side of [-1]) { ctx.beginPath(); ctx.ellipse(X(side * 0.42), Y(0.15), W * 0.11, H * 0.055, 0.25, 0, Math.PI * 2); ctx.stroke(); }
            ctx.strokeStyle = 'rgba(90,90,100,0.6)'; ctx.lineWidth = 1.5; ctx.setLineDash([6, 5]);
            ctx.beginPath(); ctx.ellipse(X(0.42), Y(0.15), W * 0.11, H * 0.055, -0.25, 0, Math.PI * 2); ctx.stroke();
            for (let j = 0; j < 6; j++) { ctx.beginPath(); ctx.moveTo(X(0.1), j * H / 5); ctx.lineTo(W, j * H / 5 - H / 4); ctx.stroke(); }
          }
        }) })
        : new THREE.MeshStandardMaterial({ map: paperTexture(110, 1), roughness: 0.4, side: THREE.DoubleSide });
      const layer: ShellSpec = { ...spec, relief: (u, v) => relief(u, v) + 0.045, hole: (u, v) => !area(u, v) || (!full && patch(u, v) < 0.1) };
      put(shell(layer, skin));
      if (full) { const paperExtras = new THREE.Group(); extras(new THREE.MeshStandardMaterial({ color: dust('#f2efe6'), roughness: 0.9, side: THREE.DoubleSide }), 0.003, paperExtras); put(paperExtras); }
    } else {
      // Tool marks and a wire loop tool left on the board.
      const steel = s.material('#9aa0a2', { metalness: 0.7, roughness: 0.35 });
      const tool = put(new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.004, 0.11, 8), s.material('#7a5a3a')));
      tool.position.set(0.12, -0.08, 0.006); tool.rotation.z = 0.3;
      const loop = put(new THREE.Mesh(new THREE.TorusGeometry(0.011, 0.0014, 5, 16), steel));
      loop.position.set(0.102, -0.02, 0.006);
    }

    // Finished blanks stacked beside the board.
    const count = Math.round(a.blanks * 5 + (a.blanks > 0.85 ? random() : 0));
    const blankSkin = new THREE.MeshStandardMaterial({ color: dust('#f3f0e7'), roughness: 0.9, side: THREE.DoubleSide });
    for (let i = 0; i < count; i++) {
      const blank = new THREE.Group();
      blank.add(shell({ ...spec, segU: 44, segV: 56, hole: (u, v) => !area(u, v) || eyeHole(u, v) }, blankSkin));
      extras(blankSkin, 0, blank);
      blank.rotation.set(-Math.PI / 2 + 0.25 + i * 0.03, 0, (random() - 0.5) * 0.5);
      blank.position.set(0.255 + (random() - 0.5) * 0.02, 0.03 + i * 0.016, 0.05 + (random() - 0.5) * 0.02);
      blank.traverse((n) => { n.castShadow = n.receiveShadow = true; });
      s.root.add(blank);
    }

    // Paste bowl, brush and the torn paper waiting to go on.
    const bx = -0.23, bz = 0.07;
    s.lathe([[0, 0.004], [0.04, 0.004], [0.066, 0.045], [0.07, 0.058], [0.062, 0.058], [0.04, 0.014], [0, 0.012]], s.material(dust('#3f6f8a'), { roughness: 0.35, side: THREE.DoubleSide }), [bx, 0, bz]);
    const paste = s.cylinder(0.058, 0.05, 0.004, [bx, 0.044, bz], new THREE.MeshStandardMaterial({ color: a.moment === 'abandoned' ? '#b9ae93' : '#ebe6d6', roughness: a.moment === 'working' ? 0.15 : 0.9 }), 24);
    if (a.moment === 'abandoned') paste.position.y = 0.03;
    const handle = s.material('#8a3b2b', { roughness: 0.5 }), bristle = s.material('#d8c9a0', { roughness: 1 });
    const brush = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.007, 0.15, 8), handle); shaft.position.y = 0.105;
    const ferrule = new THREE.Mesh(new THREE.CylinderGeometry(0.0085, 0.0085, 0.02, 8), s.material('#b9bcc0', { metalness: 0.8, roughness: 0.3 })); ferrule.position.y = 0.03;
    const hair = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.012, 0.03, 8), bristle); hair.position.y = 0.008; hair.scale.z = 0.5;
    brush.add(shaft, ferrule, hair);
    brush.traverse((n) => { n.castShadow = true; });
    if (a.moment === 'paused') { brush.rotation.z = Math.PI / 2; brush.position.set(bx + 0.09, 0.064, bz); }
    else { brush.rotation.set(0.25, 0, a.moment === 'abandoned' ? -0.75 : -0.45); brush.position.set(bx + 0.012, 0.03, bz); }
    s.root.add(brush);

    const strips = a.stage === 'gesso' || a.stage === 'painted' ? Math.round(2 + mood.density * 4) : Math.round(6 + mood.density * 10);
    const stripSkin = new THREE.MeshStandardMaterial({ map: paperTexture(60, 0), roughness: 0.85, side: THREE.DoubleSide });
    for (let i = 0; i < strips; i++) {
      const geometry = new THREE.PlaneGeometry(0.03 + random() * 0.02, 0.09 + random() * 0.07, 1, 6);
      const uv = geometry.attributes.uv, ox = random() * 0.8, oy = random() * 0.7;
      for (let k = 0; k < uv.count; k++) uv.setXY(k, ox + uv.getX(k) * 0.16, oy + uv.getY(k) * 0.28);
      const curl = (random() - 0.5) * 0.02, pos = geometry.attributes.position;
      for (let k = 0; k < pos.count; k++) pos.setZ(k, curl * Math.sin(pos.getY(k) * 30));
      geometry.computeVertexNormals();
      const strip = s.mesh(geometry, stripSkin, [-0.17 + (random() - 0.5) * 0.14, 0.004 + i * 0.0012, 0.22 + (random() - 0.5) * 0.08]);
      strip.rotation.set(-Math.PI / 2, 0, random() * Math.PI);
    }
    if (dusty) { ctxless(); }
    function ctxless() {
      const web = s.material('#d9d6cf', { roughness: 1 });
      for (let i = 0; i < 5; i++) s.rod([topEdge.x - 0.15, topEdge.y, topEdge.z], [-0.15 - i * 0.012, 0.0, topEdge.z - 0.02 - i * 0.02], 0.0006, web);
    }
    void blob; void mix;
    return s.finish();
  },
});
