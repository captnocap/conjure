import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';
import { beam, glow, paint, pick } from './rig';

const COLOURS = { green: '#3dff5a', red: '#ff3a2e', blue: '#3c8cff', purple: '#b04dff', rainbow: '' } as const;
const RAINBOW = ['#ff3a2e', '#ff9a1a', '#ffe13c', '#3dff5a', '#3cc8ff', '#b04dff'];

export default defineThing({
  questions: {
    mount: choice('What is the projector mounted on?', {
      tripod: 'A black tripod lighting stand at head height.',
      truss: 'Clamped under a short length of aluminium truss on a stand.',
      case: 'Sitting on a closed flight case on the floor.',
      tall: 'High on a tall wind-up stand, well above head height.',
    }),
    beams: score('How many beams?', ['A single beam', 'A handful', 'A fan of a dozen', 'A dense fan of thirty']),
    spread: score('How wide is the fan?', ['A tight bundle', 'A narrow fan', 'A wide fan', 'Nearly flat, wall to wall']),
    colour: choice('What colour are the beams?', {
      green: 'Pure green, the classic.',
      red: 'Deep red.',
      blue: 'Ice blue.',
      purple: 'Violet.',
      rainbow: 'Every colour, a rainbow fan.',
    }),
    aim: choice('Where is it aimed?', {
      overheads: 'Out over the crowd, tilted a little upward.',
      mirrorball: 'At a mirror ball hanging above, which scatters it in every direction.',
      floor: 'Down across the floor, a fan on the concrete.',
      ceiling: 'Up at the ceiling, a sheet of light overhead.',
    }),
    state: choice('What is it doing right now?', {
      firing: 'Firing: every beam out, the aperture glowing.',
      warming: 'Warming up: one dim beam, the key turned, the interlock dangling.',
      standby: 'Standby: a red LED on the back, nothing out, a towel over the top.',
    }),
    movinghead: noul('Does a cheap moving-head light sit beside it, sweeping its own beam?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const black = s.material('#1c1d20', { roughness: 0.5, metalness: 0.2 });
    const dark = s.material('#121214', { roughness: 0.8 });
    const steel = s.material('#9ea3a8', { metalness: 0.7, roughness: 0.35 });
    const alu = s.material('#c9ced3', { metalness: 0.8, roughness: 0.3 });
    const firing = a.state === 'firing';
    const count = firing ? Math.max(1, Math.round(mix(1, 30, a.beams))) : a.state === 'warming' ? 1 : 0;
    const spreadDeg = mix(4, 160, a.spread);
    const colourOf = (i: number) => (a.colour === 'rainbow' ? RAINBOW[i % RAINBOW.length] : COLOURS[a.colour]);
    const tint = a.colour === 'rainbow' ? '#ffffff' : COLOURS[a.colour];

    // The mount decides where the projector sits.
    let mountY = 1.5;
    if (a.mount === 'tripod' || a.mount === 'tall') {
      mountY = a.mount === 'tall' ? 2.6 : 1.55;
      const legs = 3;
      for (let i = 0; i < legs; i++) {
        const t = (i / legs) * Math.PI * 2 + 0.4;
        s.rod([Math.cos(t) * 0.45, 0, Math.sin(t) * 0.45], [Math.cos(t) * 0.04, 0.5, Math.sin(t) * 0.04], 0.012, black);
        s.rod([Math.cos(t) * 0.26, 0.19, Math.sin(t) * 0.26], [0, 0.48, 0], 0.008, black);
      }
      s.rod([0, 0.45, 0], [0, mountY - 0.08, 0], 0.02, black);
      s.rod([0, 0.9, 0], [0, mountY - 0.08, 0], 0.015, steel);
      s.cylinder(0.035, 0.035, 0.05, [0, 0.9, 0], black, 12);
      if (a.mount === 'tall') { s.cylinder(0.04, 0.04, 0.06, [0, 1.5, 0], black, 12); s.box([0.08, 0.06, 0.12], [0.06, 0.95, 0], black); s.rod([0.1, 0.95, 0], [0.16, 0.95, 0.06], 0.006, steel); }
      s.box([0.06, 0.05, 0.06], [0, mountY - 0.06, 0], black);
    }
    if (a.mount === 'truss') {
      mountY = 1.75;
      // A stand with a short triangular truss across the top; the projector hangs under it on a clamp.
      s.box([0.5, 0.04, 0.5], [0, 0.02, 0], black);
      s.rod([0, 0.04, 0], [0, 2.1, 0], 0.025, black);
      const TY = 2.1, L = 0.9, r = 0.11;
      for (const [dy, dz] of [[r, 0], [-r * 0.6, r * 0.9], [-r * 0.6, -r * 0.9]] as const) s.rod([-L / 2, TY + dy, dz], [L / 2, TY + dy, dz], 0.014, alu);
      for (let i = 0; i <= 5; i++) {
        const x = -L / 2 + (i / 5) * L;
        s.rod([x, TY + r, 0], [x, TY - r * 0.6, r * 0.9], 0.006, alu);
        s.rod([x, TY + r, 0], [x, TY - r * 0.6, -r * 0.9], 0.006, alu);
        s.rod([x, TY - r * 0.6, r * 0.9], [x, TY - r * 0.6, -r * 0.9], 0.006, alu);
      }
      s.box([0.06, 0.1, 0.06], [0, TY - 0.03, 0], steel);
      s.box([0.08, 0.04, 0.04], [0.08, TY - r * 0.6 - 0.02, r * 0.9], black);
      s.rod([0.08, TY - r * 0.6, 0], [0.08, mountY + 0.08, 0], 0.012, black);
    }
    if (a.mount === 'case') {
      const shell = s.material('#1f1f22', { roughness: 0.6 });
      mountY = 0.46;
      s.box([0.6, 0.44, 0.42], [0, 0.22, 0], shell);
      s.box([0.62, 0.012, 0.44], [0, 0.22, 0], alu);
      s.scatter(new THREE.BoxGeometry(1, 1, 1), alu, [-1, 1].flatMap((sx) => [-1, 1].flatMap((sy) => [-1, 1].map((sz) => ({ at: [sx * 0.29, 0.22 + sy * 0.21, sz * 0.2] as [number, number, number], size: 0.035 })))));
      for (const sx of [-1, 1]) s.box([0.012, 0.04, 0.14], [sx * 0.305, 0.26, 0], dark);
      s.box([0.1, 0.06, 0.04], [0.18, 0.41, 0.215], steel);
    }

    // The projector: a black box with a window, scanner mirrors behind it, fins on top, a key and LED on the back.
    const PW = 0.42, PH = 0.17, PD = 0.34;
    const body = new THREE.Group();
    body.position.set(0, mountY + PH / 2 + 0.01, 0);
    s.root.add(body);
    const add = (mesh: THREE.Mesh) => { mesh.castShadow = mesh.receiveShadow = true; body.add(mesh); return mesh; };
    add(new THREE.Mesh(new THREE.BoxGeometry(PW, PH, PD), black));
    // Window on the front with a dim glass sheen and the two scanner mirrors behind it.
    const glass = new THREE.MeshPhysicalMaterial({ color: '#1a2630', transparent: true, opacity: 0.55, roughness: 0.1, metalness: 0.3, depthWrite: false });
    const window = add(new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.09, 0.012), glass));
    window.position.set(PW * 0.2, 0, PD / 2 + 0.004);
    add(new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.11, 0.01), dark)).position.set(PW * 0.2, 0, PD / 2 - 0.004);
    for (const [dx, tilt] of [[-0.02, 0.6], [0.025, -0.4]] as const) {
      const mirror = add(new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.003, 12), s.material('#dfe6ea', { metalness: 1, roughness: 0.05 })));
      mirror.position.set(PW * 0.2 + dx, 0, PD / 2 - 0.03);
      mirror.rotation.set(Math.PI / 2 + tilt, 0.5, 0);
    }
    // Heat sink fins and a fan grille on the side.
    const fins = Array.from({ length: 9 }, (_u, i) => ({ at: [-PW * 0.3 + i * 0.02, PH / 2 + 0.012, -0.04] as [number, number, number], size: 1 }));
    const finMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.008, 0.024, 0.14), black, fins.length);
    const m = new THREE.Matrix4();
    fins.forEach((f, i) => { m.makeTranslation(...f.at); finMesh.setMatrixAt(i, m); });
    finMesh.castShadow = true;
    body.add(finMesh);
    const grille = paint(128, 128, (c, w, h) => { c.fillStyle = '#222326'; c.fillRect(0, 0, w, h); c.fillStyle = '#0a0a0c'; for (let y = 10; y < h; y += 12) for (let x = 10; x < w; x += 12) { c.beginPath(); c.arc(x, y, 4, 0, 7); c.fill(); } });
    const vent = add(new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.1), new THREE.MeshStandardMaterial({ map: grille, roughness: 0.8 })));
    vent.position.set(-PW / 2 - 0.001, 0, -0.02);
    vent.rotation.y = -Math.PI / 2;
    // Back panel: key switch, interlock plug, status LED, a kettle lead.
    const key = add(new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.03, 10), steel));
    key.rotation.x = Math.PI / 2;
    key.position.set(-0.08, 0.02, -PD / 2 - 0.01);
    const led = glow(a.state === 'standby' ? '#ff2a2a' : '#3dff5a', 2);
    add(new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 6), led)).position.set(0.1, 0.04, -PD / 2 - 0.004);
    if (a.state === 'warming') {
      // The interlock dangling on its lead.
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.03, 8), black)).position.set(0.04, -0.09, -PD / 2 - 0.02);
      s.tube([[0.04, mountY + 0.04, -PD / 2 - 0.02], [0.05, mountY - 0.05, -PD / 2 - 0.03], [0.04, mountY + 0.01, -PD / 2 - 0.02]], 0.003, black);
    }
    if (a.state === 'standby') {
      const towel = s.material(pick(random, ['#d9d4c8', '#3a6b8a', '#8a3a3a']), { roughness: 1 });
      const t = s.box([PW * 0.8, 0.02, PD + 0.1], [0, mountY + PH + 0.05, 0], towel);
      t.rotation.y = 0.15;
      s.box([PW * 0.8, 0.14, 0.02], [0, mountY + PH - 0.02, -PD / 2 - 0.06], towel).rotation.z = 0.05;
    }
    const lead = s.material('#1a1a1c', { roughness: 0.9 });
    s.tube([[-0.02, mountY + 0.03, -PD / 2 - 0.01], [-0.06, mountY - 0.1, -PD / 2 - 0.08], [-0.03, 0.02, -0.3], [0.3, 0.02, -0.45]], 0.006, lead);
    s.tube([[0.08, mountY + 0.03, -PD / 2 - 0.01], [0.12, mountY - 0.15, -PD / 2 - 0.06], [0.05, 0.02, -0.25], [-0.35, 0.02, -0.4]], 0.005, lead);

    // The beams, fanned about the window.
    const aperture = new THREE.Vector3(PW * 0.2, mountY + PH / 2 + 0.01, PD / 2);
    const fan = new THREE.Group();
    fan.position.copy(aperture);
    s.root.add(fan);
    const tiltDeg = { overheads: 8, mirrorball: 28, floor: -22, ceiling: 42 }[a.aim];
    fan.rotation.x = -tiltDeg * Math.PI / 180;
    const ballAt = new THREE.Vector3(0.1, mountY + 1.45, 2.2);
    if (a.aim === 'mirrorball') {
      const dir = ballAt.clone().sub(aperture);
      fan.rotation.set(0, 0, 0);
      fan.lookAt(aperture.clone().add(dir));
      fan.rotateY(0);
    }
    const length = a.aim === 'floor' ? Math.min(7, mountY / Math.sin(22 * Math.PI / 180) * 0.98) : a.aim === 'mirrorball' ? ballAt.distanceTo(aperture) - 0.16 : 6.5;
    const beamGeometry = new THREE.PlaneGeometry(0.035, length);
    beamGeometry.translate(0, length / 2, 0);
    beamGeometry.rotateX(Math.PI / 2); // now runs along +z, out of the window
    const beamMeshes: THREE.Mesh[] = [];
    const dim = a.state === 'warming' ? 0.5 : mix(0.7, 0.95, mood.energy);
    // A ribbon that is solid colour at the window and thins out into the haze.
    const fadeMap = paint(4, 128, (c, w, h) => { const g = c.createLinearGradient(0, h, 0, 0); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.6, 'rgba(255,255,255,0.75)'); g.addColorStop(1, 'rgba(255,255,255,0.1)'); c.fillStyle = g; c.fillRect(0, 0, w, h); });
    const ribbonMaterial = (colour: string) => new THREE.MeshBasicMaterial({ color: colour, map: fadeMap, transparent: true, opacity: dim, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
    void beam;
    for (let i = 0; i < count; i++) {
      const t = count === 1 ? 0 : (i / (count - 1) - 0.5);
      const yaw = (a.aim === 'mirrorball' ? 0 : t * spreadDeg) * Math.PI / 180;
      const colour = colourOf(i);
      for (const twist of [0, Math.PI / 2]) {
        const ribbon = new THREE.Mesh(beamGeometry, ribbonMaterial(colour));
        ribbon.rotation.set(0, yaw, 0);
        ribbon.rotateZ(twist);
        ribbon.castShadow = false;
        fan.add(ribbon);
        beamMeshes.push(ribbon);
      }
    }
    // A hot spot at the window when firing.
    if (count > 0) s.ball([0.03, 0.03, 0.02], [aperture.x, aperture.y, aperture.z + 0.005], glow(tint === '#ffffff' ? '#ffffff' : tint, 3), 10).castShadow = false;
    // The mirror ball: hung from a boom off a tall stand, scattering short beams in every direction.
    if (a.aim === 'mirrorball') {
      s.rod([ballAt.x + 0.9, 0, ballAt.z - 0.6], [ballAt.x + 0.9, ballAt.y + 0.9, ballAt.z - 0.6], 0.02, black);
      s.box([0.5, 0.04, 0.5], [ballAt.x + 0.9, 0.02, ballAt.z - 0.6], black);
      s.rod([ballAt.x + 0.9, ballAt.y + 0.9, ballAt.z - 0.6], [ballAt.x, ballAt.y + 0.5, ballAt.z], 0.012, black);
      s.rod([ballAt.x, ballAt.y + 0.5, ballAt.z], [ballAt.x, ballAt.y + 0.16, ballAt.z], 0.003, steel);
      const facets = paint(256, 128, (c, w, h) => { for (let y = 0; y < h; y += 8) for (let x = 0; x < w; x += 8) { const v = 150 + random() * 105; c.fillStyle = `rgb(${v},${v + 5},${v + 10})`; c.fillRect(x, y, 7, 7); } });
      s.ball([0.16, 0.16, 0.16], [ballAt.x, ballAt.y, ballAt.z], new THREE.MeshStandardMaterial({ map: facets, metalness: 0.95, roughness: 0.15 }), 20);
      if (count > 0) {
        const scatter = new THREE.Group();
        scatter.position.copy(ballAt);
        s.root.add(scatter);
        const sparkGeometry = new THREE.PlaneGeometry(0.02, 2.2);
        sparkGeometry.translate(0, 1.1 + 0.16, 0);
        for (let i = 0; i < 28; i++) {
          const spark = new THREE.Mesh(sparkGeometry, ribbonMaterial(colourOf(i)));
          spark.rotation.set(random() * Math.PI, random() * Math.PI * 2, random() * Math.PI);
          spark.castShadow = false;
          scatter.add(spark);
          beamMeshes.push(spark);
        }
      }
    }

    // A cheap moving head beside it: base, yoke, head, lens.
    let yoke: THREE.Group | null = null;
    let head: THREE.Group | null = null;
    if (a.movinghead) {
      const mx = -0.75, mz = 0.15;
      s.box([0.26, 0.1, 0.26], [mx, 0.05, mz], black);
      s.box([0.12, 0.03, 0.08], [mx + 0.1, 0.11, mz + 0.08], dark);
      s.box([0.06, 0.02, 0.03], [mx + 0.1, 0.125, mz + 0.08], glow('#3c8cff', 1.2));
      yoke = new THREE.Group();
      yoke.position.set(mx, 0.1, mz);
      s.root.add(yoke);
      const arm = (sx: number) => { const bar = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.3, 0.05), black); bar.position.set(sx * 0.13, 0.15, 0); bar.castShadow = true; yoke!.add(bar); };
      arm(-1); arm(1);
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.29, 0.03, 0.05), black); bridge.position.y = 0.015; yoke.add(bridge);
      head = new THREE.Group();
      head.position.set(0, 0.2, 0);
      yoke.add(head);
      const can = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.08, 0.22, 16), black);
      can.rotation.x = Math.PI / 2;
      can.castShadow = true;
      head.add(can);
      const lensColour = pick(random, ['#ff3fb0', '#3cc8ff', '#ffe13c', '#3dff5a']);
      const lens = new THREE.Mesh(new THREE.CircleGeometry(0.06, 16), glow(firing ? lensColour : '#2a2a30', firing ? 2.4 : 0));
      lens.position.z = 0.111;
      head.add(lens);
      if (firing) {
        const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.6, 4.5, 16, 1, true), new THREE.MeshBasicMaterial({ color: lensColour, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
        cone.rotation.x = -Math.PI / 2;
        cone.position.z = 2.35;
        cone.castShadow = false;
        head.add(cone);
      }
      head.rotation.x = -0.6;
      yoke.rotation.y = 0.5;
    }

    const energy = mood.energy;
    const sweep = mix(0.05, 0.5, energy);
    const baseFan = fan.rotation.clone();
    return s.finish({
      footprint: a.mount === 'case' ? 0.45 : 0.4,
      update: (dt, time) => {
        if (count > 1 && a.aim !== 'mirrorball') {
          fan.rotation.y = baseFan.y + Math.sin(time * (0.8 + energy * 1.6)) * sweep * 0.35;
          fan.rotation.x = baseFan.x + Math.sin(time * 0.9 + 1) * sweep * 0.12;
        }
        if (a.colour === 'rainbow' && firing) for (const [i, b] of beamMeshes.entries()) (b.material as THREE.MeshBasicMaterial).color.setHSL(((time * 0.12) + i / Math.max(1, beamMeshes.length)) % 1, 1, 0.55);
        if (yoke && head) { yoke.rotation.y = 0.5 + Math.sin(time * (0.5 + energy)) * 0.8; head.rotation.x = -0.6 + Math.sin(time * 0.7 + 2) * 0.35; }
      },
    });
  },
});
