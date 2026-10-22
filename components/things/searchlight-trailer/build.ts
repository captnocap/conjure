import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

const LIVERY = {
  surplus: { body: '#5d6a3f', trim: '#2d3320', text: '#f1ead0' },
  circus: { body: '#b8231c', trim: '#e0b22a', text: '#fff4c2' },
  rental: { body: '#e6e4da', trim: '#1f55d8', text: '#1f55d8' },
  chrome: { body: '#b9c0c4', trim: '#2a2c30', text: '#17181a' },
  primer: { body: '#8a5a3c', trim: '#4a4038', text: '#e8dcc0' },
} as const;
const SIGNS = { opening: 'GRAND OPENING', sale: 'SALE TONIGHT', rent: 'RENT ME', premiere: 'PREMIERE', none: '' } as const;
const BEAMS = { white: '#f3f6ff', warm: '#ffe6a0', blue: '#9fd0ff', pink: '#ff9ad6', green: '#a8ffb0' } as const;

function paint(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default defineThing({
  questions: {
    head: choice('What kind of searchlight is it?', {
      drum: 'One huge war-surplus carbon-arc drum, a metre and a half across, with a chimney on top.',
      twin: 'Two medium lamps side by side on one yoke.',
      quad: 'A modern four-head sky tracker whose beams fan out and wheel like a flower.',
    }),
    livery: choice('How is the trailer painted?', {
      surplus: 'Army olive drab with stencilled numbers.',
      circus: 'Showman red with gold trim.',
      rental: 'White with a blue rental-company stripe.',
      chrome: 'Polished bare metal.',
      primer: 'Rust-brown primer, never finished.',
    }),
    state: choice('What is it doing?', {
      lit: 'Running: generator thumping, beam on and sweeping the sky.',
      warming: 'Aimed and ready but dark, the operator still fussing with it.',
      tarped: 'Shut down with a canvas tarp roped over the lamp.',
      relic: 'A cold relic: cracked lens, flat tyre, weeds up through the frame.',
    }),
    sign: choice('What does the board on the generator say?', {
      opening: 'GRAND OPENING', sale: 'SALE TONIGHT', rent: 'RENT ME', premiere: 'PREMIERE', none: 'No board.',
    }),
    beam: choice('If the beam is lit, what colour is it?', {
      white: 'Hard blue-white carbon arc.', warm: 'Warm yellow-white.', blue: 'Pale blue.', pink: 'Pink gel.', green: 'Green gel.',
    }),
    aim: score('How steeply is the lamp aimed?', ['Raking low across the rooftops', 'Up at forty-five degrees', 'Almost straight up']),
    operator: noul('Has the operator left a folding chair, a thermos and a fuel can beside it?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const livery = LIVERY[a.livery];
    const relic = a.state === 'relic';
    const lit = a.state === 'lit';
    const rust = relic ? 0.55 : mood.wear * 0.4;
    const tone = (hex: string) => new THREE.Color(hex).lerp(new THREE.Color('#7a5236'), rust);
    const body = new THREE.MeshStandardMaterial({ color: tone(livery.body), roughness: a.livery === 'chrome' ? mix(0.2, 0.8, rust) : 0.7, metalness: a.livery === 'chrome' ? 0.85 : 0.2 });
    const trim = new THREE.MeshStandardMaterial({ color: tone(livery.trim), roughness: 0.6, metalness: 0.3 });
    const frame = s.material('#2a2c2f', { metalness: 0.4, roughness: 0.7 });
    const rubber = s.material('#1b1b1d', { roughness: 0.95 });
    const steel = s.material('#aab0b3', { metalness: 0.8, roughness: 0.3 });
    const bed = 0.62;

    // ---- trailer --------------------------------------------------------------
    s.box([3.3, 0.12, 1.6], [-0.1, bed - 0.06, 0], frame);
    s.box([3.3, 0.04, 1.62], [-0.1, bed + 0.02, 0], body);
    const flatSide = relic ? (random() < 0.5 ? -1 : 1) : 0;
    for (const side of [-1, 1]) {
      const squash = side === flatSide ? 0.82 : 1;
      const wheel = s.cylinder(0.36, 0.36, 0.24, [0.35, 0.36 * squash, side * 0.96], rubber, 18);
      wheel.rotation.x = Math.PI / 2; wheel.scale.z = squash;
      const hub = s.cylinder(0.18, 0.18, 0.26, [0.35, 0.36 * squash, side * 0.96], side === flatSide ? frame : steel, 12);
      hub.rotation.x = Math.PI / 2;
      const fender = s.mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.3, 14, 1, true, -Math.PI / 2, Math.PI), body, [0.35, 0.38, side * 0.96]);
      fender.rotation.x = Math.PI / 2;
      (fender.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
      s.rod([-1.75, bed - 0.08, side * 0.7], [-2.75, bed - 0.14, 0], 0.045, frame);
    }
    s.box([0.22, 0.1, 0.16], [-2.8, bed - 0.14, 0], steel);
    s.rod([-2.45, bed - 0.1, 0], [-2.45, 0.06, 0], 0.035, steel);
    s.cylinder(0.12, 0.12, 0.05, [-2.45, 0.025, 0], frame, 10);
    for (const x of [1.45, -1.6]) for (const z of [-0.7, 0.7]) { s.rod([x, bed - 0.1, z], [x, 0.05, z], 0.03, steel); s.box([0.2, 0.04, 0.2], [x, 0.02, z], frame); }

    // ---- generator ------------------------------------------------------------
    const gx = -1.05;
    s.box([1.25, 0.85, 1.25], [gx, bed + 0.465, 0], body);
    s.box([1.31, 0.07, 1.31], [gx, bed + 0.92, 0], trim);
    for (let i = 0; i < 7; i++) s.box([0.8, 0.03, 0.02], [gx, bed + 0.2 + i * 0.08, -0.632], frame);
    for (let i = 0; i < 6; i++) s.box([0.02, 0.5, 0.9], [gx - 0.632, bed + 0.5, 0], frame).scale.set(1, 1 - i * 0.02, 1);
    s.rod([gx - 0.3, bed + 0.9, -0.35], [gx - 0.3, bed + 1.35, -0.35], 0.045, frame);
    const flap = s.box([0.14, 0.012, 0.12], [gx - 0.3, bed + 1.37, -0.35], frame);
    s.cylinder(0.06, 0.06, 0.05, [gx + 0.35, bed + 0.98, 0.3], steel, 10);
    // control panel with gauges
    s.box([0.5, 0.36, 0.03], [gx + 0.3, bed + 0.62, 0.635], frame);
    for (let i = 0; i < 3; i++) { const gauge = s.cylinder(0.055, 0.055, 0.02, [gx + 0.15 + i * 0.15, bed + 0.68, 0.655], s.material('#f1eee0', lit ? { emissive: '#ffe9a8', emissiveIntensity: 0.6 } : {}), 12); gauge.rotation.x = Math.PI / 2; }
    s.box([0.05, 0.1, 0.05], [gx + 0.15, bed + 0.52, 0.66], s.material(lit ? '#3bd14a' : '#b8231c', { emissive: lit ? '#3bd14a' : '#000', emissiveIntensity: lit ? 1 : 0 }));
    if (a.sign !== 'none') {
      const board = s.label(SIGNS[a.sign], 1.5, 0.5, [gx - 0.05, bed + 1.32, 0.5], `#${tone(livery.text).getHexString()}`, `#${tone(livery.trim === '#e0b22a' ? '#7a1712' : livery.trim).getHexString()}`);
      board.rotation.z = relic ? (random() - 0.5) * 0.3 : 0;
      for (const x of [-0.6, 0.5]) s.rod([gx + x, bed + 0.9, 0.48], [gx + x, bed + 1.2, 0.48], 0.02, frame);
    }
    if (a.livery === 'surplus') s.label(`US ${1000 + Math.floor(random() * 8999)}`, 0.7, 0.16, [gx - 0.2, bed + 0.3, 0.631], '#f1ead0', `#${tone(livery.body).getHexString()}`);
    if (a.livery === 'rental') s.box([1.26, 0.14, 1.26], [gx, bed + 0.3, 0], trim);
    if (a.livery === 'circus') for (const y of [0.12, 0.8]) s.box([1.26, 0.05, 1.26], [gx, bed + y, 0], trim);

    // ---- lamp head on a turntable -------------------------------------------------
    const lx = 0.6;
    s.cylinder(0.55, 0.62, 0.16, [lx, bed + 0.12, 0], trim, 24);
    const turntable = new THREE.Group();
    turntable.position.set(lx, bed + 0.2, 0);
    turntable.rotation.y = random() * Math.PI * 2;
    s.root.add(turntable);
    const put = <T extends THREE.Object3D>(parent: THREE.Object3D, node: T) => { node.traverse((n) => { n.castShadow = true; }); parent.add(node); return node; };
    const elevation = mix(0.35, 1.45, a.aim);
    const beamHex = BEAMS[a.beam];
    const beams: THREE.Mesh[] = [];
    const tarped = a.state === 'tarped';

    const lensMap = paint(128, 128, (ctx) => {
      const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 64);
      if (lit) { g.addColorStop(0, '#ffffff'); g.addColorStop(0.6, beamHex); g.addColorStop(1, '#e8d9a0'); }
      else { g.addColorStop(0, '#c9d6dc'); g.addColorStop(0.5, '#5d6f78'); g.addColorStop(1, '#2a3338'); }
      ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
      ctx.strokeStyle = lit ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.22)'; ctx.lineWidth = 2;
      for (const r of [22, 40, 56]) { ctx.beginPath(); ctx.arc(64, 64, r, 0, 6.3); ctx.stroke(); }
      if (relic) {
        ctx.strokeStyle = '#101214'; ctx.lineWidth = 2.5;
        for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.moveTo(50 + random() * 20, 70 + random() * 20); ctx.lineTo(random() * 128, random() * 128); ctx.stroke(); }
        ctx.fillStyle = '#0c0d0e'; ctx.beginPath(); ctx.arc(58, 78, 16, 0, 6.3); ctx.fill();
      }
    });
    const lensMaterial = new THREE.MeshStandardMaterial({ map: lensMap, emissiveMap: lensMap, emissive: '#ffffff', emissiveIntensity: lit ? 1.6 : 0.05, roughness: 0.15 });
    const tarp = new THREE.MeshStandardMaterial({ color: tone('#8b8563'), roughness: 1 });

    // A lamp: a drum whose axis is local +y, lens at the +y end, with its beam.
    const makeLamp = (radius: number, depth: number, chimney: boolean) => {
      const lamp = new THREE.Group();
      put(lamp, new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 0.94, depth, 28), body));
      const back = put(lamp, new THREE.Mesh(new THREE.SphereGeometry(radius * 0.94, 20, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), body));
      back.position.y = -depth / 2; back.scale.y = 0.45;
      const bezel = put(lamp, new THREE.Mesh(new THREE.TorusGeometry(radius, radius * 0.07, 8, 28), trim));
      bezel.rotation.x = Math.PI / 2; bezel.position.y = depth / 2;
      const lens = put(lamp, new THREE.Mesh(new THREE.CircleGeometry(radius * 0.95, 28), lensMaterial));
      lens.rotation.x = -Math.PI / 2; lens.position.y = depth / 2 + 0.012;
      for (let i = 0; i < 2; i++) { const bar = put(lamp, new THREE.Mesh(new THREE.BoxGeometry(i ? 0.03 : radius * 1.9, 0.02, i ? radius * 1.9 : 0.03), frame)); bar.position.y = depth / 2 + 0.03; }
      if (chimney) {
        const stack = put(lamp, new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.16, radius * 0.2, radius * 0.5, 10), trim));
        stack.rotation.x = Math.PI / 2; stack.position.set(0, -depth * 0.1, -radius - radius * 0.2);
        const cap = put(lamp, new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.26, radius * 0.26, 0.04, 10), trim));
        cap.rotation.x = Math.PI / 2; cap.position.set(0, -depth * 0.1, -radius - radius * 0.47);
        const wheel = put(lamp, new THREE.Mesh(new THREE.TorusGeometry(radius * 0.22, 0.02, 6, 16), steel));
        wheel.position.set(0, -depth / 2 - radius * 0.42, 0); wheel.rotation.x = Math.PI / 2;
      }
      if (tarped) {
        const cover = put(lamp, new THREE.Mesh(new THREE.SphereGeometry(radius * 1.16, 16, 12), tarp));
        cover.scale.set(1, (depth * 0.5 + radius * 0.5) / radius, 1.02);
        const rope = put(lamp, new THREE.Mesh(new THREE.TorusGeometry(radius * 1.13, 0.02, 6, 24), s.material('#d9cfae')));
        rope.rotation.x = Math.PI / 2; rope.position.y = -depth * 0.1;
      }
      if (lit) {
        const reach = 15;
        for (const [grow, opacity] of [[1, 0.2], [0.55, 0.26]] as const) {
          const beam = new THREE.Mesh(new THREE.CylinderGeometry(radius * 1.9 * grow, radius * 0.9 * grow, reach, 20, 1, true),
            new THREE.MeshBasicMaterial({ color: beamHex, transparent: true, opacity: opacity * mix(0.7, 1.15, 1 - Math.sin(mood.daylight * Math.PI)), depthWrite: false, side: THREE.DoubleSide }));
          beam.position.y = depth / 2 + reach / 2;
          beam.renderOrder = 2;
          lamp.add(beam);
          beams.push(beam);
        }
      }
      return lamp;
    };

    const tilters: THREE.Group[] = [];
    if (a.head === 'quad') {
      const mast = put(turntable, new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 1.0, 12), trim));
      mast.position.y = 0.5;
      const rosette = new THREE.Group();
      rosette.position.y = 1.05;
      turntable.add(rosette);
      put(rosette, new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.5), frame));
      for (let i = 0; i < 4; i++) {
        const arm = new THREE.Group();
        arm.rotation.y = (i / 4) * Math.PI * 2;
        const tilt = new THREE.Group();
        tilt.position.set(0.52, 0.12, 0);
        tilt.rotation.z = -(Math.PI / 2 - elevation) * 0.75 - 0.2;
        tilt.add(makeLamp(0.3, 0.5, false));
        const strut = put(arm, new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.08), frame));
        strut.position.set(0.3, 0, 0);
        arm.add(tilt);
        rosette.add(arm);
        tilters.push(tilt);
      }
    } else {
      const radius = a.head === 'drum' ? 0.76 : 0.44, depth = a.head === 'drum' ? 0.95 : 0.7;
      const spread = a.head === 'drum' ? 0 : 0.5;
      const axisY = radius + 0.42;
      const halfSpan = radius + spread + 0.1;
      // U-shaped yoke
      put(turntable, new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, halfSpan * 2 + 0.1), trim)).position.y = 0.05;
      for (const side of [-1, 1]) put(turntable, new THREE.Mesh(new THREE.BoxGeometry(0.16, axisY + 0.1, 0.08), trim)).position.set(0, axisY / 2 + 0.05, side * halfSpan);
      const tilt = new THREE.Group();
      tilt.position.y = axisY;
      tilt.rotation.z = -(Math.PI / 2 - elevation);
      turntable.add(tilt);
      tilters.push(tilt);
      for (const z of a.head === 'drum' ? [0] : [-spread, spread]) { const lamp = makeLamp(radius, depth, a.head === 'drum'); lamp.position.z = z; tilt.add(lamp); }
      const axle = put(tilt, new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, halfSpan * 2 + 0.14, 8), steel));
      axle.rotation.x = Math.PI / 2;
      for (const side of [-1, 1]) { const knob = put(tilt, new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.05, 12), steel)); knob.rotation.x = Math.PI / 2; knob.position.z = side * (halfSpan + 0.07); }
    }
    // cable from generator to lamp
    s.tube([[gx + 0.6, bed + 0.3, 0.3], [gx + 0.95, bed + 0.08, 0.5], [lx - 0.3, bed + 0.07, 0.55], [lx, bed + 0.12, 0.5]], 0.03, rubber);

    // ---- story dressing ---------------------------------------------------------
    if (relic) {
      const weed = s.material('#6f8a3a', { roughness: 1 });
      const tufts = 14 + Math.floor(random() * 10);
      for (let i = 0; i < tufts; i++) {
        const x = -2.4 + random() * 4, z = (random() - 0.5) * 2.4, h = 0.25 + random() * 0.55;
        const blade = s.mesh(new THREE.ConeGeometry(0.05 + random() * 0.05, h, 5), weed, [x, h / 2, z]);
        blade.rotation.set((random() - 0.5) * 0.5, 0, (random() - 0.5) * 0.5);
      }
    }
    if (a.operator) {
      const ox = 1.5 + random() * 0.3, oz = 1.35;
      const cloth = s.material(relic ? '#6d6a5e' : '#2f6a8f');
      s.box([0.44, 0.03, 0.42], [ox, 0.44, oz], cloth);
      const back = s.box([0.44, 0.4, 0.03], [ox, 0.72, oz - 0.24], cloth); back.rotation.x = -0.18;
      for (const sx of [-1, 1]) { s.rod([ox + sx * 0.21, 0, oz - 0.22], [ox + sx * 0.21, 0.92, oz - 0.28], 0.014, steel); s.rod([ox + sx * 0.21, 0, oz + 0.2], [ox + sx * 0.21, 0.44, oz - 0.18], 0.014, steel); }
      s.cylinder(0.05, 0.05, 0.28, [ox - 0.5, 0.14, oz + 0.1], s.material('#3f6a45', { metalness: 0.4 }), 10);
      s.cylinder(0.035, 0.05, 0.05, [ox - 0.5, 0.3, oz + 0.1], steel, 10);
      s.box([0.34, 0.4, 0.2], [ox + 0.6, 0.2, oz - 0.1], s.material('#b8231c'));
      s.cylinder(0.03, 0.03, 0.1, [ox + 0.7, 0.44, oz - 0.1], s.material('#e8b417'), 8);
    }

    // ---- motion ---------------------------------------------------------------
    const speed = mix(0.12, 0.9, mood.energy);
    const baseYaw = turntable.rotation.y;
    const baseTilt = tilters.map((tilt) => tilt.rotation.z);
    return s.finish({
      footprint: 2.0,
      update: lit ? (_dt, time) => {
        turntable.rotation.y = a.head === 'quad' ? baseYaw + time * speed * 1.4 : baseYaw + Math.sin(time * speed) * 1.1;
        tilters.forEach((tilt, i) => { tilt.rotation.z = baseTilt[i] + Math.sin(time * speed * 1.7 + i * 1.57) * (a.head === 'quad' ? 0.3 : 0.12); });
        flap.rotation.z = Math.abs(Math.sin(time * 14)) * 0.5;
      } : undefined,
    });
  },
});
