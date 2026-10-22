import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';
import { PAINT, bladeGeometry, lerpHex, paintCanvas, stone, stoneTone } from './maya';

const STONES = {
  jade: { tint: '#3d8c64', vein: '#8fd0a8', dark: '#1f5a3e' },
  diorite: { tint: '#73857a', vein: '#d7ddd2', dark: '#3d4a44' },
  basalt: { tint: '#3d4144', vein: '#6c7276', dark: '#1e2022' },
  onyx: { tint: '#dcd4bf', vein: '#f6f1e2', dark: '#a8956e' },
} as const;

class UCurve extends THREE.Curve<THREE.Vector3> {
  constructor(private readonly radius: number, private readonly arm: number) { super(); }
  override getPoint(t: number, target = new THREE.Vector3()) {
    const arc = Math.PI * this.radius, total = this.arm * 2 + arc, d = t * total;
    if (d < this.arm) return target.set(this.radius, 0, -this.arm + d);
    if (d > this.arm + arc) return target.set(-this.radius, 0, -(d - this.arm - arc));
    const angle = (d - this.arm) / this.radius;
    return target.set(Math.cos(angle) * this.radius, 0, Math.sin(angle) * this.radius);
  }
}

export default defineThing({
  questions: {
    carving: choice('What is carved on the yoke?', {
      toad: 'An earth-monster toad: bulging eyes and a wide mouth across the curved front.',
      serpent: 'Interlaced scrolls and coils running all the way round.',
      skull: 'A death\'s head on the front, sockets and bared teeth.',
      plain: 'Nothing: a perfect polished horseshoe.',
    }),
    stone: choice('What stone is it?', {
      jade: 'Deep green jadeite with pale veins.',
      diorite: 'Speckled grey-green diorite.',
      basalt: 'Near-black volcanic basalt.',
      onyx: 'Pale banded cream onyx.',
    }),
    palma: choice('What stands with the yoke?', {
      fan: 'A palma: a tall stone flaring into a fluted fan at the top.',
      hacha: 'A hacha: a thin stone blade cut as a human head in profile.',
      plume: 'A tall narrow palma notched like a stack of feathers.',
      none: 'Nothing: the yoke and pads only.',
    }),
    layout: choice('How is the regalia arranged?', {
      neat: 'Laid out neatly side by side, ready to be put on.',
      worn: 'Assembled as it is worn: the palma standing upright on the front of the yoke.',
      burial: 'Grave goods: set round a rubber ball, dusted with red cinnabar and strewn with beads.',
      tossed: 'Thrown down after the game, askew, one pad upside down, a sweat cloth dropped on top.',
      display: 'Shown off as a trophy: the yoke stood upright like an arch on a wooden stand.',
    }),
    mat: choice('What is it laid on?', {
      reed: 'A pale woven reed mat.',
      pelt: 'A spotted jaguar pelt.',
      cloth: 'A red cotton cloth with a striped border.',
      bench: 'A bare stone bench.',
    }),
    pads: choice('What are the knee pads made of?', {
      leather: 'Thick brown leather with thong ties.',
      stone: 'Carved stone, matching the yoke: ceremonial, not for play.',
      hide: 'Pale deer hide trimmed with fur.',
    }),
    extra: choice('What else has been set down with it?', {
      nothing: 'Nothing.',
      ball: 'A black rubber ball.',
      beads: 'A coiled necklace of jade beads.',
      headband: 'A headband set with short bright feathers.',
      handstone: 'A stone handstone with a grip.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const wear = mood.wear;
    const tones = STONES[a.stone];
    const dusty = (tint: string) => lerpHex(tint, '#9a927f', wear * 0.4);
    const mottle = paintCanvas(256, 128, (ctx, w, h) => {
      ctx.fillStyle = dusty(tones.tint); ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 260; i++) { ctx.fillStyle = random() < 0.5 ? tones.vein : tones.dark; ctx.globalAlpha = 0.1 + random() * 0.25; const r = 1 + random() * (a.stone === 'diorite' ? 4 : 9); ctx.beginPath(); ctx.ellipse(random() * w, random() * h, r * (1 + random() * 3), r, random() * 3, 0, 7); ctx.fill(); }
      ctx.globalAlpha = 0.55; ctx.strokeStyle = tones.vein; ctx.lineWidth = 1.5;
      for (let i = 0; i < (a.stone === 'basalt' ? 1 : 5); i++) { let x = random() * w, y = 0; ctx.beginPath(); ctx.moveTo(x, y); while (y < h) { x += (random() - 0.5) * 30; y += 8 + random() * 14; ctx.lineTo(x, y); } ctx.stroke(); }
      ctx.globalAlpha = 1;
    });
    const rock = new THREE.MeshStandardMaterial({ map: mottle, roughness: mix(0.28, 0.8, wear), metalness: 0.05 });
    const rockSide = new THREE.MeshStandardMaterial({ map: mottle, roughness: mix(0.28, 0.8, wear), side: THREE.DoubleSide });
    const groove = s.material(lerpHex(tones.dark, '#141414', 0.4), { roughness: 0.9 });
    const solid = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, at: [number, number, number] = [0, 0, 0]) => { const mesh = new THREE.Mesh(geometry, material); mesh.position.set(...at); mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh; };

    // What it lies on.
    let top = 0.012;
    const MW = 1.1, MD = 0.9;
    if (a.mat === 'reed') {
      const weave = paintCanvas(256, 256, (ctx, w) => {
        ctx.fillStyle = dusty('#c9b480'); ctx.fillRect(0, 0, w, w);
        for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const flip = (x + y) % 4 < 2; ctx.fillStyle = flip ? 'rgba(255,240,200,0.28)' : 'rgba(90,65,30,0.25)'; if (flip) ctx.fillRect(x * 16 + 1, y * 16 + 4, 14, 8); else ctx.fillRect(x * 16 + 4, y * 16 + 1, 8, 14); }
      });
      weave.repeat.set(5, 4);
      s.box([MW, 0.012, MD], [0, 0.006, 0], new THREE.MeshStandardMaterial({ map: weave, bumpMap: weave, bumpScale: 1, roughness: 0.95 }));
      const frayed = s.material(dusty('#b7a06a'), { roughness: 1 });
      for (let i = 0; i < 26; i++) { const x = (i / 25 - 0.5) * MW; for (const side of [-1, 1]) if (random() < 0.5 + wear * 0.4) s.box([0.012, 0.006, 0.03 + random() * 0.04 * (1 + wear)], [x + (random() - 0.5) * 0.02, 0.004, side * (MD / 2 + 0.02)], frayed).rotation.y = (random() - 0.5) * 0.5; }
    } else if (a.mat === 'pelt') {
      const spots = paintCanvas(256, 256, (ctx, w) => {
        ctx.fillStyle = dusty('#d7a04c'); ctx.fillRect(0, 0, w, w);
        const belly = ctx.createLinearGradient(0, 0, w, 0); belly.addColorStop(0, 'rgba(250,240,215,0.7)'); belly.addColorStop(0.25, 'rgba(250,240,215,0)'); belly.addColorStop(0.75, 'rgba(250,240,215,0)'); belly.addColorStop(1, 'rgba(250,240,215,0.7)');
        for (let i = 0; i < 46; i++) { const x = random() * w, y = random() * w; ctx.strokeStyle = '#231a14'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(x, y, 8 + random() * 6, random() * 3, random() * 3 + 4.6); ctx.stroke(); ctx.fillStyle = '#a5672a'; ctx.beginPath(); ctx.arc(x, y, 4, 0, 7); ctx.fill(); }
      });
      spots.repeat.set(1.6, 1.6);
      const outline = new THREE.Shape();
      const pts: [number, number][] = [[0.0, 0.62], [0.12, 0.55], [0.2, 0.44], [0.5, 0.52], [0.6, 0.44], [0.36, 0.3], [0.34, -0.2], [0.58, -0.38], [0.5, -0.5], [0.24, -0.36], [0.06, -0.42], [0.03, -0.72], [-0.03, -0.72], [-0.06, -0.42], [-0.24, -0.36], [-0.5, -0.5], [-0.58, -0.38], [-0.34, -0.2], [-0.36, 0.3], [-0.6, 0.44], [-0.5, 0.52], [-0.2, 0.44], [-0.12, 0.55]];
      outline.splineThru(pts.map(([x, y]) => new THREE.Vector2(x, y))); outline.closePath();
      const hide = s.mesh(new THREE.ShapeGeometry(outline, 4), new THREE.MeshStandardMaterial({ map: spots, roughness: 0.95, side: THREE.DoubleSide }), [0, 0.008, 0]);
      hide.rotation.set(-Math.PI / 2, 0, Math.PI / 2); hide.scale.set(0.92, 1.0, 1);
      top = 0.01;
    } else if (a.mat === 'cloth') {
      const woven = paintCanvas(256, 256, (ctx, w) => {
        ctx.fillStyle = dusty(PAINT.red); ctx.fillRect(0, 0, w, w);
        ctx.fillStyle = dusty(PAINT.cream); ctx.fillRect(0, 14, w, 10); ctx.fillRect(0, w - 24, w, 10);
        ctx.fillStyle = dusty(PAINT.black); ctx.fillRect(0, 30, w, 5); ctx.fillRect(0, w - 35, w, 5);
        ctx.fillStyle = dusty(PAINT.ochre); for (let i = 0; i < 12; i++) { ctx.fillRect(i * 22 + 4, 44, 11, 11); ctx.fillRect(i * 22 + 4, w - 55, 11, 11); }
      });
      s.box([MW, 0.01, MD], [0, 0.005, 0], new THREE.MeshStandardMaterial({ map: woven, roughness: 0.95 })).rotation.y = (random() - 0.5) * 0.1;
      for (let i = 0; i < 3; i++) s.ball([0.2 + random() * 0.15, 0.012, 0.03], [(random() - 0.5) * 0.7, 0.012, (random() - 0.5) * 0.7], s.material(dusty('#a3301f'), { roughness: 1 }), 10).rotation.y = random() * 3;
      top = 0.012;
    } else {
      const face = paintCanvas(256, 256, (ctx, w, h) => stone(ctx, w, h, random, { base: stoneTone(wear), wear }));
      s.box([MW + 0.1, 0.2, MD], [0, 0.1, 0], new THREE.MeshStandardMaterial({ map: face, bumpMap: face, bumpScale: 1, roughness: 0.9 }));
      s.box([MW + 0.2, 0.05, MD + 0.08], [0, 0.225, 0], s.material(stoneTone(wear), { roughness: 0.9 }));
      top = 0.25;
    }

    // The yoke.
    const r = 0.17, arm = 0.25, tube = 0.062;
    const yoke = new THREE.Group();
    const broken = wear > 0.78;
    const body = new THREE.TubeGeometry(new UCurve(r, arm), 60, tube, 14);
    body.scale(1, 1.2, 1);
    solid(yoke, body, rock);
    for (const side of [-1, 1]) solid(yoke, new THREE.SphereGeometry(tube, 12, 8), rock, [side * r, 0, -arm]).scale.set(1, 1.2, 0.5);
    const rim = (radius: number, y: number, arc: number, thickness = 0.007) => { const line = solid(yoke, new THREE.TorusGeometry(radius, thickness, 4, 32, arc), groove, [0, y, 0]); line.rotation.set(Math.PI / 2, 0, -(Math.PI - arc) / 2 - arc); line.rotation.z = (Math.PI - arc) / 2; line.scale.y = -1; line.rotation.set(-Math.PI / 2, 0, (Math.PI - arc) / 2); return line; };
    if (a.carving === 'toad') {
      for (const side of [-1, 1]) {
        solid(yoke, new THREE.SphereGeometry(0.038, 12, 8), rock, [side * 0.075, tube * 1.15, r * 0.93]);
        solid(yoke, new THREE.SphereGeometry(0.016, 8, 6), groove, [side * 0.078, tube * 1.15 + 0.022, r * 0.93 + 0.024]);
        solid(yoke, new THREE.SphereGeometry(0.009, 6, 5), groove, [side * 0.022, 0.02, r + tube - 0.002]);
        for (const z of [-0.06, -0.18]) { const scroll = solid(yoke, new THREE.TorusGeometry(0.03, 0.007, 4, 14, Math.PI * 1.5), groove, [side * (r + tube - 0.002), 0, z]); scroll.rotation.y = Math.PI / 2; }
      }
      rim(r + tube - 0.003, -0.012, Math.PI * 0.72, 0.009);
    } else if (a.carving === 'serpent') {
      for (let i = 0; i < 9; i++) {
        const t = (i + 0.5) / 9 * Math.PI;
        const coil = solid(yoke, new THREE.TorusGeometry(0.03, 0.007, 4, 14, Math.PI * 1.6), groove, [Math.cos(t) * r, tube * 1.2 - 0.004, Math.sin(t) * r]);
        coil.rotation.set(-Math.PI / 2, 0, t + (i % 2) * Math.PI);
      }
      for (const side of [-1, 1]) for (let i = 0; i < 3; i++) { const coil = solid(yoke, new THREE.TorusGeometry(0.03, 0.007, 4, 14, Math.PI * 1.6), groove, [side * r, tube * 1.2 - 0.004, -0.04 - i * 0.085]); coil.rotation.set(-Math.PI / 2, 0, i * 2); }
      rim(r + tube - 0.003, 0, Math.PI * 0.95);
    } else if (a.carving === 'skull') {
      for (const side of [-1, 1]) { solid(yoke, new THREE.SphereGeometry(0.024, 10, 8), groove, [side * 0.04, 0.022, r + tube - 0.012]); }
      solid(yoke, new THREE.ConeGeometry(0.011, 0.024, 3), groove, [0, -0.008, r + tube - 0.004]);
      for (let i = -3; i <= 3; i++) { const t = Math.PI / 2 + i * 0.075; solid(yoke, new THREE.BoxGeometry(0.009, 0.026, 0.008), s.material(tones.vein, { roughness: 0.5 }), [Math.cos(t) * (r + tube - 0.004), -0.038, Math.sin(t) * (r + tube - 0.004)]).rotation.y = -t + Math.PI / 2; }
      rim(r + tube - 0.003, -0.022, 0.62, 0.006);
    } else {
      rim(r + tube - 0.003, 0.03, Math.PI * 0.98, 0.004); rim(r + tube - 0.003, -0.03, Math.PI * 0.98, 0.004);
    }
    const yokeH = tube * 1.2;

    // Palma or hacha, built upright in the x-y plane with its foot at the origin.
    const palma = new THREE.Group();
    let palmaH = 0;
    if (a.palma !== 'none') {
      const shape = new THREE.Shape();
      if (a.palma === 'fan') {
        palmaH = 0.5;
        shape.moveTo(-0.075, 0); shape.lineTo(0.075, 0); shape.lineTo(0.06, 0.2); shape.quadraticCurveTo(0.08, 0.36, 0.2, 0.44);
        for (let i = 0; i < 5; i++) { const x = 0.2 - (i + 0.5) * 0.08; shape.absarc(x, 0.44 + 0.02 * (2 - Math.abs(i - 2)), 0.04, 0, Math.PI, false); }
        shape.quadraticCurveTo(-0.08, 0.36, -0.06, 0.2);
      } else if (a.palma === 'hacha') {
        palmaH = 0.36;
        const pts: [number, number][] = [[-0.12, 0], [0.1, 0], [0.15, 0.05], [0.13, 0.09], [0.15, 0.115], [0.135, 0.14], [0.19, 0.18], [0.14, 0.23], [0.13, 0.29], [0.05, 0.36], [-0.06, 0.35], [-0.13, 0.27], [-0.15, 0.12]];
        shape.moveTo(...pts[0]); for (const p of pts.slice(1)) shape.lineTo(...p);
        const eye = new THREE.Path(); eye.absarc(0.07, 0.215, 0.022, 0, Math.PI * 2, true); shape.holes.push(eye);
      } else {
        palmaH = 0.62;
        shape.moveTo(-0.06, 0); shape.lineTo(0.06, 0);
        for (let i = 0; i < 5; i++) { const y = 0.1 + i * 0.09; shape.lineTo(0.1 - i * 0.008, y + 0.07); shape.lineTo(0.06 - i * 0.006, y + 0.07); }
        shape.lineTo(0, 0.62);
        for (let i = 4; i >= 0; i--) { const y = 0.1 + i * 0.09; shape.lineTo(-(0.06 - i * 0.006), y + 0.07); shape.lineTo(-(0.1 - i * 0.008), y + 0.07); }
      }
      shape.closePath();
      const depth = a.palma === 'hacha' ? 0.022 : 0.045;
      const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: 0.007, bevelSize: 0.007, bevelSegments: 2, curveSegments: 8 });
      geometry.translate(0, 0, -depth / 2);
      const uv = geometry.getAttribute('uv') as THREE.BufferAttribute;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 2.5, uv.getY(i) * 2.5);
      solid(palma, geometry, rockSide);
      if (a.palma === 'fan') for (let i = -2; i <= 2; i++) { for (const z of [-1, 1]) { const flute = solid(palma, new THREE.BoxGeometry(0.008, 0.26, 0.006), groove, [i * 0.05, 0.33, z * (depth / 2 + 0.007)]); flute.rotation.z = -i * 0.26; } }
      if (a.palma === 'hacha') for (const z of [-1, 1]) { solid(palma, new THREE.BoxGeometry(0.05, 0.007, 0.004), groove, [0.11, 0.105, z * (depth / 2 + 0.007)]); const ear = solid(palma, new THREE.TorusGeometry(0.03, 0.006, 4, 14), groove, [-0.05, 0.17, z * (depth / 2 + 0.007)]); void ear; }
    }

    // Knee pads.
    const padTone = a.pads === 'leather' ? '#6d4426' : a.pads === 'hide' ? '#c9a878' : tones.tint;
    const padPaint = a.pads === 'stone' ? rock : s.material(padTone, { roughness: 0.8 });
    const trimPaint = s.material(a.pads === 'hide' ? '#f0e6d0' : a.pads === 'leather' ? '#3d2515' : tones.dark, { roughness: 1 });
    const thong = s.material('#3d2515', { roughness: 1 });
    const pad = () => {
      const g = new THREE.Group();
      solid(g, new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), padPaint).scale.set(0.085, 0.062, 0.105);
      const edge = solid(g, new THREE.TorusGeometry(1, a.pads === 'hide' ? 0.16 : 0.08, 5, 24), trimPaint, [0, 0.006, 0]); edge.rotation.x = Math.PI / 2; edge.scale.set(0.085, 0.105, 0.085);
      if (a.pads === 'stone') solid(g, new THREE.TorusGeometry(0.035, 0.006, 4, 14), groove, [0, 0.055, 0]).rotation.x = Math.PI / 2;
      else for (const side of [-1, 1]) { const tie = solid(g, new THREE.BoxGeometry(0.2, 0.004, 0.014), thong, [side * 0.16, 0.003, (random() - 0.5) * 0.06]); tie.rotation.y = (random() - 0.5) * 0.9; }
      return g;
    };
    const padA = pad(), padB = pad();
    const stage = new THREE.Group(); stage.position.y = top; s.root.add(stage); stage.add(yoke, palma, padA, padB);
    yoke.position.y = yokeH;

    if (a.layout === 'neat') {
      yoke.position.set(0.02, yokeH, 0.04);
      palma.rotation.x = -Math.PI / 2; palma.position.set(-0.42, 0.03, 0.02 + palmaH / 2);
      padA.position.set(0.43, 0, 0.16); padB.position.set(0.43, 0, -0.12);
    } else if (a.layout === 'worn') {
      yoke.position.set(0, yokeH, -0.03);
      palma.position.set(0, yokeH * 2 - 0.012, r - 0.03 + 0.0); palma.rotation.x = -0.1;
      padA.position.set(-0.36, 0, 0.28); padB.position.set(0.36, 0, 0.28);
    } else if (a.layout === 'burial') {
      yoke.position.set(0, yokeH, 0);
      s.ball([0.105, 0.105, 0.105], [0, top + 0.105, 0.015], s.material('#1b1918', { roughness: mix(0.3, 0.8, wear) }), 20);
      palma.rotation.set(-Math.PI / 2, 0, 0.25); palma.position.set(-0.43, 0.03, palmaH / 2 - 0.05);
      padA.position.set(0.4, 0, 0.14); padB.position.set(0.42, 0, -0.14);
      const dust = new THREE.MeshBasicMaterial({ color: '#c0321f', transparent: true, opacity: 0.4, depthWrite: false });
      for (let i = 0; i < 9; i++) { const patch = s.mesh(new THREE.CircleGeometry(0.08 + random() * 0.16, 14), dust, [(random() - 0.5) * 0.9, top + 0.004 + i * 0.0006, (random() - 0.5) * 0.7]); patch.rotation.x = -Math.PI / 2; patch.castShadow = false; }
      const strewn: { at: [number, number, number]; size: number; color: string }[] = [];
      for (let i = 0; i < 20 + mood.density * 40; i++) strewn.push({ at: [(random() - 0.5) * 0.95, top + 0.012, (random() - 0.5) * 0.75], size: 0.009 + random() * 0.008, color: random() < 0.7 ? lerpHex('#3f9a6b', '#8fd0a8', random()) : '#efe6d2' });
      s.scatter(new THREE.SphereGeometry(1, 8, 6), s.material('#ffffff', { roughness: 0.35 }), strewn);
    } else if (a.layout === 'tossed') {
      yoke.position.set(0.08, yokeH + 0.075, 0.02); yoke.rotation.set(0.05, 0.8 + random() * 0.6, 0.42);
      palma.rotation.set(-Math.PI / 2, 0, 1.1 + random() * 0.6); palma.position.set(-0.36, 0.03, -0.08);
      padA.position.set(0.4, 0.062, 0.26); padA.rotation.set(Math.PI, random() * 3, 0.15);
      padB.position.set(0.3, 0, -0.32); padB.rotation.y = random() * 3;
      const cloth = s.mesh(new THREE.IcosahedronGeometry(0.13, 1), s.material(dusty('#e9e1cc'), { roughness: 1, flatShading: true }), [-0.12, top + 0.035, 0.32]);
      cloth.scale.set(1.3, 0.3, 0.9); cloth.rotation.y = random() * 3;
    } else {
      const wood = s.material(dusty('#7a5230'), { roughness: 0.8 });
      s.box([0.62, 0.06, 0.3], [0, top + 0.03, -0.05], wood);
      for (const side of [-1, 1]) s.box([0.05, 0.3, 0.05], [side * 0.25, top + 0.18, -0.16], wood);
      s.box([0.6, 0.04, 0.04], [0, top + 0.32, -0.16], wood);
      yoke.rotation.x = -Math.PI / 2 - 0.16; yoke.position.set(0, 0.06 + arm + 0.03, -0.07);
      palma.position.set(0, 0.06, 0.2); palma.rotation.x = -0.08;
      if (a.palma !== 'none') s.box([0.26, 0.04, 0.12], [0, top + 0.04, 0.2], wood);
      padA.position.set(-0.42, 0, 0.18); padB.position.set(0.42, 0, 0.18);
    }
    if (broken) {
      // Ritually "killed": a clean break across one arm, the piece shifted away.
      const chip = solid(stage, new THREE.CylinderGeometry(tube * 1.1, tube * 1.1, 0.03, 10), groove, [0, 0, 0]);
      chip.visible = false;
      const crack = solid(yoke, new THREE.BoxGeometry(tube * 2.6, tube * 2.8, 0.014), groove, [r, 0, -0.1]); crack.rotation.y = 0.3;
    }

    const ex: [number, number, number] = a.layout === 'worn' || a.layout === 'display' ? [0.34, top, -0.22] : a.layout === 'burial' ? [-0.1, top, 0.36] : [0.02, top, 0.37];
    if (a.extra === 'ball') s.ball([0.1, 0.1, 0.1], [ex[0], top + 0.1, ex[2]], s.material('#1b1918', { roughness: mix(0.3, 0.75, wear) }), 20);
    else if (a.extra === 'beads') {
      const beads: { at: [number, number, number]; size: number; color: string }[] = [];
      for (let i = 0; i < 44; i++) { const t = i / 44 * Math.PI * 4, rr = 0.05 + i * 0.0016; beads.push({ at: [ex[0] + Math.cos(t) * rr * 1.3, top + 0.014, ex[2] + Math.sin(t) * rr * 0.7], size: 0.012, color: lerpHex('#3f9a6b', '#8fd0a8', random()) }); }
      s.scatter(new THREE.SphereGeometry(1, 8, 6), s.material('#ffffff', { roughness: 0.3 }), beads);
    } else if (a.extra === 'headband') {
      const band = s.ring(0.085, 0.014, [ex[0], top + 0.016, ex[2]], s.material(dusty(PAINT.red), { roughness: 0.9 })); band.rotation.x = Math.PI / 2; band.scale.set(1.1, 0.8, 1.6);
      const tints = ['#12936a', '#d23a26', '#f2c230', '#2a8fb0'];
      for (let i = 0; i < 7; i++) { const feather = s.mesh(bladeGeometry(0.16 + random() * 0.06, 0.04, 0.9), new THREE.MeshStandardMaterial({ color: dusty(tints[i % 4]), roughness: 0.6, side: THREE.DoubleSide }), [ex[0] + (i - 3) * 0.022, top + 0.03, ex[2] - 0.05]); feather.rotation.set(-0.9, (i - 3) * -0.2, 0); }
    } else if (a.extra === 'handstone') {
      s.ball([0.075, 0.055, 0.06], [ex[0], top + 0.055, ex[2]], rock, 14);
      const grip = s.ring(0.045, 0.014, [ex[0], top + 0.1, ex[2]], rock, Math.PI); grip.rotation.y = 0.5;
    }

    return s.finish();
  },
});
