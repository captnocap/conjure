import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

const HULL = {
  silver: { say: 'Polished silver, spun aluminium like a hubcap.', c: '#cdd3d8', metal: 0.4 },
  brass: { say: 'Warm brass and copper, Victorian and riveted.', c: '#c79a45', metal: 0.4 },
  green: { say: 'Pea-soup green enamel, a toy-box invader.', c: '#7fae4c', metal: 0.1 },
  red: { say: 'Glossy tomato red with a cream underside.', c: '#cf3327', metal: 0.15 },
  black: { say: 'Matte gunmetal black, sinister and unmarked.', c: '#3c4046', metal: 0.3 },
  pink: { say: 'Bubblegum pink, friendly and absurd.', c: '#ee8fb4', metal: 0.1 },
} as const;
const LIGHTS = {
  white: ['#fff6d8', '#fff6d8', '#fff6d8'],
  rainbow: ['#ff4a4a', '#ffd23a', '#3ad1ff'],
  red: ['#ff3b2f', '#ff3b2f', '#ff8a3a'],
  green: ['#5dff7a', '#5dff7a', '#c8ff5a'],
  amber: ['#ffb02e', '#ffb02e', '#ffe08a'],
  violet: ['#b06bff', '#ff6bd8', '#6b9bff'],
} as const;

export default defineThing({
  questions: {
    state: choice('What is the saucer doing?', {
      landed: 'Landed and shut, squatting on its three legs.',
      ramp: 'Landed with the ramp down and light spilling out onto the ground.',
      hovering: 'Hovering silently a few metres up, legs folded away.',
      beam: 'Hovering with a pale beam shining straight down, stones lifting inside it.',
      crashed: 'Crashed at an angle, rim buried in a mound of earth, smoking.',
    }),
    hull: choice('What is the hull made of?', Object.fromEntries(Object.entries(HULL).map(([k, v]) => [k, v.say])) as Record<keyof typeof HULL, string>),
    dome: choice('What is the dome on top like?', {
      clear: 'A clear glass bubble showing the cockpit.',
      green: 'Green-tinted glass, glowing faintly from inside.',
      amber: 'Amber glass like a warning lamp.',
      metal: 'A solid metal cupola with a band of slit windows.',
      low: 'A low flat lens, barely a blister.',
    }),
    pilot: choice('If you can see inside, who is at the controls?', {
      nobody: 'Nobody: an empty seat.',
      grey: 'A bulb-headed figure with huge dark eyes.',
      eyes: 'Only a pair of glowing eyes on stalks.',
      blob: 'A many-armed blob pressed against the glass.',
    }),
    lamps: choice('What colour are the rim lights?', {
      white: 'Warm white, like fairground bulbs.',
      rainbow: 'Red, yellow and blue in turn.',
      red: 'Angry red.',
      green: 'Eerie green.',
      amber: 'Amber and gold.',
      violet: 'Violet and pink.',
    }),
    belly: choice('What is on the underside?', {
      smooth: 'A smooth shallow dish.',
      pods: 'Three chrome ball pods, like the famous 1950s photographs.',
      engine: 'A glowing ring of engine light.',
      turret: 'A stubby ray-projector turret pointing down.',
    }),
    rim: choice('What runs around the disc?', {
      plain: 'Nothing but the lights: a clean knife edge.',
      portholes: 'A band of round portholes on the upper slope.',
      ribs: 'Raised radial ribs like a jelly mould.',
      vanes: 'Little fins and aerials bristling from the edge.',
    }),
    topper: choice('What sits on top of the dome?', {
      none: 'Nothing.',
      aerial: 'A thin aerial with a ball on the end.',
      spinner: 'A slowly turning ring antenna.',
      horn: 'A flared loudspeaker horn, for announcements to Earthlings.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const craft = new THREE.Group();
    s.root.add(craft);
    let target: THREE.Object3D = craft;
    const put = <T extends THREE.Object3D>(o: T) => { target.add(o); return o; };
    const hull = HULL[a.hull];
    const crashed = a.state === 'crashed', flying = a.state === 'hovering' || a.state === 'beam';
    const hullMat = s.material(hull.c, { metalness: hull.metal, roughness: 0.32 });
    const under = s.material(a.hull === 'red' ? '#efe6cf' : new THREE.Color(hull.c).multiplyScalar(0.72), { metalness: hull.metal, roughness: 0.4 });
    const steel = s.material('#b9c0c6', { metalness: 0.45, roughness: 0.3 });
    const dark = s.material('#24262b', { roughness: 0.7 });

    // ---- Disc ----
    put(s.lathe([[4.05, -0.03], [3.95, 0.04], [3.5, 0.16], [2.7, 0.44], [2.15, 0.68], [1.95, 0.8]], hullMat));
    put(s.lathe([[0.001, -0.56], [1.9, -0.52], [3.0, -0.34], [3.9, -0.12], [4.05, -0.03]], under));
    put(s.ring(4.03, 0.06, [0, 0, 0], steel)).rotation.x = Math.PI / 2;
    put(s.ring(2.02, 0.1, [0, 0.77, 0], steel)).rotation.x = Math.PI / 2;
    put(s.ring(2.95, 0.035, [0, 0.35, 0], dark)).rotation.x = Math.PI / 2;

    // ---- Rim lights: three interleaved circuits so they can chase ----
    const palette = LIGHTS[a.lamps];
    const dead = crashed ? 0.5 : mood.wear * 0.3;
    const circuits = palette.map((c) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 1.5, roughness: 0.3 }));
    const deadMat = s.material('#4a4744', { roughness: 0.5 });
    const lampCount = 21;
    for (let i = 0; i < lampCount; i++) {
      const t = i / lampCount * Math.PI * 2;
      put(s.ball([0.17, 0.12, 0.17], [Math.sin(t) * 3.42, 0.2, Math.cos(t) * 3.42], random() < dead ? deadMat : circuits[i % 3], 10));
    }

    // ---- Rim detail ----
    if (a.rim === 'portholes') {
      const pane = new THREE.MeshStandardMaterial({ color: '#12283a', emissive: palette[2], emissiveIntensity: 0.35, roughness: 0.2 });
      for (let i = 0; i < 12; i++) {
        const t = (i + 0.5) / 12 * Math.PI * 2, holder = new THREE.Group();
        holder.position.set(Math.sin(t) * 2.5, 0.52, Math.cos(t) * 2.5); holder.rotation.order = 'YXZ'; holder.rotation.y = t; holder.rotation.x = -1.28;
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.045, 6, 18), steel), glass = new THREE.Mesh(new THREE.CircleGeometry(0.2, 16), pane);
        ring.castShadow = true; holder.add(ring, glass); put(holder);
      }
    }
    if (a.rim === 'ribs') for (let i = 0; i < 16; i++) { const t = i / 16 * Math.PI * 2; put(s.rod([Math.sin(t) * 2.1, 0.7, Math.cos(t) * 2.1], [Math.sin(t) * 3.9, 0.09, Math.cos(t) * 3.9], 0.07, steel, 0.04)); }
    if (a.rim === 'vanes') for (let i = 0; i < 6; i++) {
      const t = (i + 0.5) / 6 * Math.PI * 2, r = 3.9;
      const vane = put(s.box([0.06, 0.55, 0.7], [Math.sin(t) * r, 0.3, Math.cos(t) * r], hullMat)); vane.rotation.y = t;
      if (i % 2) { put(s.rod([Math.sin(t) * 4, 0.05, Math.cos(t) * 4], [Math.sin(t) * 4.9, 0.5, Math.cos(t) * 4.9], 0.025, steel, 0.01)); put(s.ball([0.07, 0.07, 0.07], [Math.sin(t) * 4.9, 0.5, Math.cos(t) * 4.9], circuits[0], 8)); }
    }

    // ---- Dome and what is inside ----
    const cabin = new THREE.Group(); cabin.scale.setScalar(1.28); cabin.position.y = 0.78 - 0.78 * 1.28; craft.add(cabin); target = cabin;
    const domeH = a.dome === 'low' ? 0.55 : 1.45;
    let topY = 0.78 + domeH;
    const seeIn = a.dome !== 'metal';
    if (seeIn) {
      const tint = { clear: '#dff3ff', green: '#8dffa0', amber: '#ffc257', low: '#dff3ff' }[a.dome as 'clear' | 'green' | 'amber' | 'low'];
      const glass = new THREE.Mesh(new THREE.SphereGeometry(1.5, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2),
        new THREE.MeshStandardMaterial({ color: tint, emissive: tint, emissiveIntensity: a.dome === 'clear' || a.dome === 'low' ? 0.05 : 0.25, transparent: true, opacity: a.dome === 'clear' || a.dome === 'low' ? 0.3 : 0.45, roughness: 0.05, depthWrite: false }));
      glass.scale.y = domeH / 1.5; glass.position.y = 0.78; put(glass);
      // A streak of highlight so the glass reads against a pale sky.
      const shine = new THREE.Mesh(new THREE.SphereGeometry(1.52, 12, 8, 0.5, 0.5, 0.35, 0.8), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.55, depthWrite: false }));
      shine.scale.y = domeH / 1.5; shine.position.y = 0.78; put(shine);
      put(s.cylinder(1.5, 1.5, 0.06, [0, 0.78, 0], dark, 28));
      if (a.dome !== 'low') {
        put(s.box([0.9, 0.3, 0.3], [0, 0.95, 0.75], steel));
        for (let i = 0; i < 4; i++) put(s.ball([0.05, 0.05, 0.05], [-0.3 + i * 0.2, 1.12, 0.75], circuits[i % 3], 8));
        put(s.box([0.5, 0.75, 0.12], [0, 1.2, -0.45], s.material('#7a2e2a')));
        const skin = s.material({ grey: '#9fb08e', eyes: '#5c7a52', blob: '#b4689a', nobody: '#000000' }[a.pilot]);
        const eye = new THREE.MeshStandardMaterial({ color: '#0b0b0d', roughness: 0.1 });
        const glowEye = new THREE.MeshStandardMaterial({ color: '#fff7a0', emissive: '#ffe23a', emissiveIntensity: 2 });
        if (a.pilot === 'grey') {
          put(s.cylinder(0.16, 0.26, 0.5, [0, 1.1, -0.1], skin, 10));
          put(s.ball([0.34, 0.4, 0.34], [0, 1.68, -0.08], skin, 16));
          for (const x of [-0.14, 0.14]) put(s.ball([0.11, 0.15, 0.06], [x, 1.62, 0.2], eye, 10)).rotation.z = x * 2.4;
        } else if (a.pilot === 'eyes') {
          put(s.ball([0.3, 0.22, 0.3], [0, 1.02, -0.05], skin, 12));
          for (const x of [-0.2, 0.2]) { put(s.rod([x * 0.5, 1.1, 0], [x, 1.7, 0.15], 0.035, skin)); put(s.ball([0.12, 0.12, 0.12], [x, 1.75, 0.16], glowEye, 12)); }
        } else if (a.pilot === 'blob') {
          put(s.ball([0.55, 0.5, 0.5], [0, 1.3, 0.05], skin, 16));
          put(s.ball([0.16, 0.16, 0.1], [0, 1.5, 0.5], glowEye, 12)); put(s.ball([0.07, 0.07, 0.05], [0, 1.5, 0.59], eye, 8));
          for (let i = 0; i < 6; i++) { const t = i / 6 * Math.PI * 2 + 0.4; put(s.tube([[0, 1.2, 0], [Math.sin(t) * 0.7, 1.25 + random() * 0.3, Math.cos(t) * 0.7], [Math.sin(t) * 1.15, 1.0 + random() * 0.7, Math.cos(t) * 1.15]], 0.06, skin)); }
        }
      }
    } else {
      put(s.lathe([[1.5, 0.78], [1.45, 1.3], [1.2, 1.8], [0.7, 2.15], [0.001, 2.25]], hullMat));
      const slit = new THREE.MeshStandardMaterial({ color: '#10202c', emissive: palette[0], emissiveIntensity: 0.9 });
      for (let i = 0; i < 10; i++) { const t = i / 10 * Math.PI * 2; put(s.box([0.5, 0.2, 0.06], [Math.sin(t) * 1.44, 1.25, Math.cos(t) * 1.44], slit)).rotation.y = t; }
      put(s.ring(1.47, 0.04, [0, 1.48, 0], steel)).rotation.x = Math.PI / 2;
    }
    let spinner: THREE.Object3D | null = null;
    if (a.topper === 'aerial') { put(s.rod([0, topY - 0.1, 0], [0, topY + 1.3, 0], 0.03, steel, 0.012)); put(s.ball([0.11, 0.11, 0.11], [0, topY + 1.3, 0], circuits[0], 10)); }
    if (a.topper === 'spinner') {
      put(s.rod([0, topY - 0.1, 0], [0, topY + 0.6, 0], 0.04, steel));
      spinner = new THREE.Group(); spinner.position.y = topY + 0.6;
      const loop = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.035, 6, 28), steel); loop.castShadow = true; loop.rotation.x = 0.5;
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1, 6), steel); bar.rotation.z = Math.PI / 2;
      spinner.add(loop, bar); put(spinner);
    }
    if (a.topper === 'horn') { put(s.rod([0, topY - 0.1, 0], [0, topY + 0.35, 0], 0.05, steel)); const horn = put(s.lathe([[0.05, 0], [0.09, 0.3], [0.22, 0.55], [0.45, 0.7]], s.material('#c79a45', { metalness: 0.4, side: THREE.DoubleSide }))); horn.position.set(0, topY + 0.35, 0); horn.rotation.x = 1.25; }

    target = craft;
    // ---- Underside ----
    const engineMat = new THREE.MeshStandardMaterial({ color: palette[2], emissive: palette[2], emissiveIntensity: flying ? 2.2 : crashed ? 0.2 : 1 });
    if (a.belly === 'pods') for (let i = 0; i < 3; i++) { const t = i / 3 * Math.PI * 2 + Math.PI; put(s.ball([0.6, 0.6, 0.6], [Math.sin(t) * 1.7, -0.62, Math.cos(t) * 1.7], steel, 18)); }
    if (a.belly === 'engine') { put(s.ring(1.25, 0.14, [0, -0.52, 0], engineMat)).rotation.x = Math.PI / 2; put(s.cylinder(0.6, 0.4, 0.25, [0, -0.62, 0], dark, 18)); }
    if (a.belly === 'turret') { put(s.cylinder(0.55, 0.4, 0.4, [0, -0.7, 0], steel, 18)); put(s.rod([0, -0.8, 0], [0.5, -1.25, 0.6], 0.09, dark, 0.14)); put(s.ball([0.1, 0.1, 0.1], [0.52, -1.27, 0.62], engineMat, 8)); }
    if (a.belly === 'smooth') put(s.cylinder(0.75, 0.6, 0.12, [0, -0.58, 0], dark, 20));

    // ---- Legs, ramp, beam ----
    const height = flying ? 4.3 : crashed ? 1.55 : 2.05;
    const legAngles = [Math.PI / 3, Math.PI, -Math.PI / 3];
    if (!flying) legAngles.forEach((t, index) => {
      if (crashed && index !== 1) return;
      const top: [number, number, number] = [Math.sin(t) * 2.3, -0.42, Math.cos(t) * 2.3], foot: [number, number, number] = [Math.sin(t) * 3.25, -height + 0.06, Math.cos(t) * 3.25];
      const knee: [number, number, number] = [mix(top[0], foot[0], 0.5), mix(top[1], foot[1], 0.5), mix(top[2], foot[2], 0.5)];
      put(s.rod(top, knee, 0.11, steel)); put(s.rod(knee, foot, 0.065, steel)); put(s.ball([0.13, 0.13, 0.13], knee, dark, 10));
      put(s.rod([Math.sin(t) * 1.4, -0.52, Math.cos(t) * 1.4], knee, 0.04, steel));
      put(s.cylinder(0.32, 0.4, 0.1, [foot[0], foot[1], foot[2]], dark, 16));
    });
    let spill: THREE.Mesh | null = null;
    if (a.state === 'ramp') {
      const rampLen = Math.hypot(height - 0.5, 2.9);
      const ramp = put(s.box([1.3, 0.08, rampLen], [0, -0.5 - (height - 0.5) / 2, 0.75 + 1.45], steel));
      ramp.rotation.x = Math.atan2(height - 0.5, 2.9);
      for (let i = 1; i < 7; i++) { const k = i / 7; put(s.box([1.3, 0.05, 0.06], [0, -0.5 - (height - 0.5) * k + 0.05, 0.75 + 2.9 * k], dark)).rotation.x = ramp.rotation.x; }
      for (const x of [-0.65, 0.65]) put(s.rod([x, -0.25, 0.75], [x, -height + 0.5, 3.65], 0.025, steel));
      const doorway = new THREE.MeshStandardMaterial({ color: '#fff3c4', emissive: '#ffd45a', emissiveIntensity: 2 });
      put(s.box([1.3, 0.5, 0.5], [0, -0.55, 0.6], doorway));
      spill = new THREE.Mesh(new THREE.CircleGeometry(1, 24), new THREE.MeshBasicMaterial({ color: '#ffe08a', transparent: true, opacity: 0.45, depthWrite: false }));
      spill.rotation.x = -Math.PI / 2; spill.scale.set(1.5, 2.6, 1); spill.position.set(0, 0.02, 3.4); s.root.add(spill);
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 1.5, height - 0.4, 4, 1, true), new THREE.MeshBasicMaterial({ color: '#ffe9a8', transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide }));
      shaft.position.set(0, -0.5 - (height - 0.5) / 2, 2.2); shaft.rotation.set(-Math.atan2(2.9, height - 0.5) * 0.9, 0, 0); shaft.rotation.order = 'XYZ'; put(shaft);
    }

    craft.position.y = height;
    const stones: THREE.Mesh[] = [];
    if (flying) {
      // The ground still answers: a pressed ring of dust under the hovering disc.
      const dust = new THREE.MeshStandardMaterial({ color: '#8a8079', roughness: 1 });
      const ring = s.mesh(new THREE.RingGeometry(3.0, 3.5, 48), dust, [0, 0.012, 0]); ring.rotation.x = -Math.PI / 2; ring.castShadow = false;
      const inner = s.mesh(new THREE.RingGeometry(0.9, 1.25, 36), dust, [0, 0.012, 0]); inner.rotation.x = -Math.PI / 2; inner.castShadow = false;
      const rock = s.material('#7d736c', { roughness: 1, flatShading: true });
      for (let i = 0; i < 9; i++) { const t = random() * Math.PI * 2, r = 2.3 + random() * 1.4; s.mesh(new THREE.DodecahedronGeometry(0.1 + random() * 0.14, 0), rock, [Math.sin(t) * r, 0.07, Math.cos(t) * r]).rotation.set(random() * 3, random() * 3, 0); }
      if (a.state === 'beam') {
        const colour = palette[2];
        const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 1.9, height - 0.5, 28, 1, true), new THREE.MeshBasicMaterial({ color: colour, transparent: true, opacity: 0.26, depthWrite: false, side: THREE.DoubleSide }));
        beam.position.y = (height - 0.5) / 2; s.root.add(beam);
        const pool = new THREE.Mesh(new THREE.CircleGeometry(1.9, 28), new THREE.MeshBasicMaterial({ color: colour, transparent: true, opacity: 0.5, depthWrite: false }));
        pool.rotation.x = -Math.PI / 2; pool.position.y = 0.025; s.root.add(pool);
        for (let i = 0; i < Math.round(mix(4, 11, mood.density)); i++) {
          const t = random() * Math.PI * 2, r = random() * 0.9;
          const stone = s.mesh(new THREE.DodecahedronGeometry(0.12 + random() * 0.2, 0), rock, [Math.sin(t) * r, 0.4 + random() * 2.6, Math.cos(t) * r]);
          stone.userData = { base: stone.position.y, phase: random() * 6 }; stones.push(stone);
        }
      }
    }
    const puffs: THREE.Mesh[] = [];
    if (crashed) {
      const dig = -0.75 + (random() - 0.5) * 0.3, tilt = 0.4 + random() * 0.12;
      craft.quaternion.setFromAxisAngle(new THREE.Vector3(Math.cos(dig), 0, -Math.sin(dig)), tilt);
      craft.position.y = 4.05 * Math.sin(tilt) - 0.45;
      const edge = new THREE.Vector3(Math.sin(dig), 0, Math.cos(dig));
      const soil = s.material('#5b4a44', { roughness: 1, flatShading: true });
      for (let i = 0; i < 11; i++) {
        const along = (i / 10 - 0.5) * 4.6, out = 3.5 + Math.cos(along * 0.55) * 1.0 + random() * 0.4, size = 0.5 + random() * 0.55 - Math.abs(along) * 0.08;
        const lump = s.mesh(new THREE.DodecahedronGeometry(size, 1), soil, [edge.x * out + edge.z * along, size * 0.25, edge.z * out - edge.x * along]);
        lump.scale.y = 0.6; lump.rotation.y = random() * 3;
      }
      // A gouge leading back from the impact, and a torn panel thrown clear.
      const gouge = s.mesh(new THREE.PlaneGeometry(2.6, 5), new THREE.MeshStandardMaterial({ color: '#3a2f2c', roughness: 1 }), [-edge.x * 2.4, 0.012, -edge.z * 2.4]);
      gouge.rotation.set(-Math.PI / 2, 0, -dig); gouge.castShadow = false;
      const panel = s.box([0.9, 0.05, 0.6], [edge.z * 3.4 + edge.x * 3, 0.1, -edge.x * 3.4 + edge.z * 3], hullMat); panel.rotation.set(0.2, random() * 3, 0.15);
      const smokeMat = new THREE.MeshStandardMaterial({ color: '#57534f', transparent: true, opacity: 0.5, depthWrite: false, roughness: 1 });
      for (let i = 0; i < Math.round(mix(8, 16, mood.density)); i++) {
        const puff = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), smokeMat);
        puff.userData = { phase: random(), drift: random() * 6, size: 0.4 + random() * 0.5 }; s.root.add(puff); puffs.push(puff);
      }
    } else craft.rotation.y = (random() - 0.5) * 0.3;

    const baseY = craft.position.y;
    const animate = (time: number) => {
      const speed = mix(0.6, 7, mood.energy);
      circuits.forEach((material, index) => {
        const phase = (time * speed + index) % 3;
        material.emissiveIntensity = crashed ? (Math.sin(time * 9 + index * 2) > 0.6 ? 1.6 : 0.15) : phase < 1 ? 2.4 : 0.35 + mood.cheer * 0.5;
      });
      for (const puff of puffs) {
        const { phase, drift, size } = puff.userData as { phase: number; drift: number; size: number };
        const t = (phase + time * mix(0.03, 0.12, mood.energy)) % 1;
        puff.position.set(Math.sin(drift + t * 2) * (0.4 + t), baseY + 0.9 + t * 4.2, -0.3 + Math.cos(drift + t * 2) * (0.4 + t));
        puff.scale.setScalar(size * (0.5 + t * 1.5));
      }
      if (flying) { craft.position.y = baseY + Math.sin(time * 1.3) * 0.12 * (0.4 + mood.energy); craft.rotation.z = Math.sin(time * 0.9) * 0.02; }
      for (const stone of stones) { const d = stone.userData as { base: number; phase: number }; stone.position.y = 0.3 + ((d.base + time * 0.35 * (0.3 + mood.energy)) % 3); stone.rotation.x = time + d.phase; }
      if (spinner) spinner.rotation.y = time * mix(0.6, 5, mood.energy);
    };
    animate(0);
    return s.finish({ footprint: 3.6, update: (_dt, time) => animate(time) });
  },
});
