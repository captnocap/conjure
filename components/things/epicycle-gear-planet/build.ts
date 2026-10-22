import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

const PLANETS = {
  mars: 'Mars: a small rust-red globe with dark blotches.',
  venus: 'Venus: a pale cream pearl with a faint gold sheen.',
  jupiter: 'Jupiter: a fat globe striped in ochre and cream bands.',
  saturn: 'Saturn: a dull gold globe wearing a thin brass ring.',
  mercury: 'Mercury: a tiny grey globe, quick and plain.',
  moon: 'The Moon: a silver-white globe pocked with craters.',
  sun: 'The Sun itself, a glowing gilt ball riding the loop as the old system had it.',
} as const;
const METALS = {
  brass: 'Warm polished yellow brass.',
  iron: 'Blackened iron with bright filed edges.',
  silver: 'Cold bright silver and steel.',
  verdigris: 'Copper gone green at every joint.',
} as const;
const METAL_HEX: Record<keyof typeof METALS, [string, string]> = {
  brass: ['#c9a04a', '#8a6426'], iron: ['#3a3a3e', '#9a9a9c'], silver: ['#c8ccd0', '#6f7880'], verdigris: ['#b8683e', '#5fa38c'],
};

export default defineThing({
  questions: {
    planet: choice('Which planet rides the loop?', PLANETS),
    metal: choice('What is the mechanism made of?', METALS),
    mount: choice('How is it mounted?', {
      pedestal: 'On a turned column rising from a stepped dark base: a desk piece.',
      plate: 'Bolted flat onto a square engraved plate, like a clock movement laid open.',
      drum: 'On a fat geared drum with a hand crank at the side, ready to be wound.',
    }),
    dial: choice('What marks the planet\'s circle?', {
      ring: 'A thin brass track ring with degree ticks all the way round.',
      plate: 'A flat painted dial under the arm, divided into degrees and signs.',
      none: 'Nothing: the arm sweeps empty air.',
    }),
    trace: noul('Is the planet\'s looping path traced in dark wire, so the retrograde knots show?'),
    nest: score('How elaborate is the machinery?', ['One loop on the arm', 'A loop riding on a loop', 'Loops on loops, absurdly nested']),
    state: choice('What state is the machine in?', {
      whole: 'Whole and oiled, everything meshing.',
      jammed: 'A tooth has snapped from the hub gear and lies on the base; the arm stands jammed.',
      fallen: 'The planet has dropped from its pin and lies on the base below the empty loop.',
      parts: 'Being recalibrated: a spare globe, a loose cog and a tiny screwdriver lie on the base.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const [metalHex, trimHex] = METAL_HEX[a.metal];
    const metal = s.material(metalHex, { metalness: 0.78, roughness: mix(0.28, 0.6, mood.wear) });
    const trim = s.material(trimHex, { metalness: 0.6, roughness: 0.45 });
    const dark = s.material('#2a2622', { roughness: 0.7 });
    const into = <T extends THREE.Object3D>(group: THREE.Object3D, child: T) => { group.add(child); return child; };
    const L = 0.34, E = 0.13;
    const nested = a.nest < 0.34 ? 1 : a.nest < 0.67 ? 2 : 3;
    const ratios = [7, 5, 4];

    // A gear: a disc with instanced square teeth round its edge.
    const gear = (parent: THREE.Object3D, radius: number, thick: number, at: readonly [number, number, number], teeth: number, missing = -1) => {
      into(parent, s.cylinder(radius, radius, thick, at, metal, 32));
      const count = teeth - (missing >= 0 ? 1 : 0);
      const size = (radius * 2 * Math.PI) / teeth * 0.5;
      const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(size, thick, size * 1.1), trim, count);
      const matrix = new THREE.Matrix4();
      let slot = 0;
      for (let i = 0; i < teeth; i++) {
        if (i === missing) continue;
        const angle = (i / teeth) * Math.PI * 2;
        matrix.makeRotationY(angle).setPosition(at[0] + Math.sin(angle) * (radius + size * 0.45), at[1], at[2] + Math.cos(angle) * (radius + size * 0.45));
        mesh.setMatrixAt(slot++, matrix);
      }
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };

    // The mount, and the height the arm turns at.
    let top = 0.46;
    if (a.mount === 'pedestal') {
      s.box([0.5, 0.04, 0.5], [0, 0.02, 0], dark);
      s.box([0.38, 0.03, 0.38], [0, 0.055, 0], dark);
      s.lathe([[0, 0.07], [0.09, 0.07], [0.05, 0.12], [0.035, 0.2], [0.05, 0.28], [0.03, 0.36], [0.045, 0.42], [0.03, top]], metal);
    } else if (a.mount === 'plate') {
      top = 0.12;
      s.box([0.62, 0.025, 0.62], [0, 0.0125, 0], metal);
      for (const x of [-0.27, 0.27]) for (const z of [-0.27, 0.27]) s.cylinder(0.016, 0.016, 0.01, [x, 0.03, z], trim, 10);
      s.cylinder(0.03, 0.03, 0.09, [0, 0.07, 0], metal, 16);
    } else {
      top = 0.3;
      s.cylinder(0.2, 0.22, 0.03, [0, 0.015, 0], dark, 32);
      gear(s.root, 0.16, 0.14, [0, 0.11, 0], 32);
      s.rod([0.17, 0.11, 0], [0.26, 0.11, 0], 0.012, trim);
      s.rod([0.26, 0.11, 0], [0.26, 0.17, 0.05], 0.009, trim);
      s.ball([0.022, 0.022, 0.022], [0.26, 0.18, 0.058], dark, 10);
      s.cylinder(0.03, 0.06, 0.12, [0, 0.24, 0], metal, 16);
    }
    const jammedTooth = a.state === 'jammed' ? Math.floor(random() * 24) : -1;
    gear(s.root, 0.085, 0.02, [0, top + 0.01, 0], 24, jammedTooth);
    s.cylinder(0.02, 0.02, 0.05, [0, top + 0.04, 0], metal, 12);

    // The dial or track under the arm.
    const armY = top + 0.05;
    if (a.dial === 'ring') {
      const track = s.ring(L, 0.004, [0, armY - 0.025, 0], trim);
      track.rotation.x = Math.PI / 2;
      const ticks = new THREE.InstancedMesh(new THREE.BoxGeometry(0.003, 0.006, 0.014), trim, 72);
      const matrix = new THREE.Matrix4();
      for (let i = 0; i < 72; i++) {
        const angle = (i / 72) * Math.PI * 2, long = i % 6 === 0 ? 1.8 : 1;
        matrix.makeRotationY(angle).setPosition(Math.sin(angle) * L, armY - 0.025, Math.cos(angle) * L);
        matrix.scale(new THREE.Vector3(1, 1, long));
        ticks.setMatrixAt(i, matrix);
      }
      ticks.castShadow = true;
      s.root.add(ticks);
      for (let i = 0; i < 3; i++) {
        const angle = (i / 3) * Math.PI * 2 + 0.4;
        s.rod([Math.sin(angle) * L, armY - 0.025, Math.cos(angle) * L], [Math.sin(angle) * L, 0.045, Math.cos(angle) * L], 0.004, trim);
      }
    } else if (a.dial === 'plate') {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 512;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#e9dcb8';
      ctx.fillRect(0, 0, 512, 512);
      ctx.strokeStyle = '#2b2218';
      ctx.lineWidth = 2;
      for (const r of [250, 232, 200, 60]) { ctx.beginPath(); ctx.arc(256, 256, r, 0, Math.PI * 2); ctx.stroke(); }
      for (let i = 0; i < 360; i += 2) {
        const angle = (i / 180) * Math.PI, long = i % 30 === 0 ? 50 : i % 10 === 0 ? 24 : 12;
        ctx.lineWidth = i % 30 === 0 ? 3 : 1.2;
        ctx.beginPath();
        ctx.moveTo(256 + Math.cos(angle) * 250, 256 + Math.sin(angle) * 250);
        ctx.lineTo(256 + Math.cos(angle) * (250 - long), 256 + Math.sin(angle) * (250 - long));
        ctx.stroke();
      }
      ctx.fillStyle = '#1f3f8f';
      for (let i = 0; i < 12; i++) {
        const angle = ((i + 0.5) / 12) * Math.PI * 2;
        ctx.beginPath(); ctx.arc(256 + Math.cos(angle) * 216, 256 + Math.sin(angle) * 216, 9, 0, Math.PI * 2); ctx.fill();
      }
      const map = new THREE.CanvasTexture(canvas);
      map.colorSpace = THREE.SRGBColorSpace;
      const plate = s.mesh(new THREE.CylinderGeometry(L + 0.06, L + 0.06, 0.012, 48), new THREE.MeshStandardMaterial({ map, roughness: 0.8 }), [0, armY - 0.035, 0]);
      void plate;
    }

    // The deferent arm turning on the hub, and the loop or loops riding it.
    const deferent = new THREE.Group();
    deferent.position.y = armY;
    s.root.add(deferent);
    const arm = into(deferent, s.box([L + 0.03, 0.016, 0.04], [L / 2, 0, 0], metal));
    void arm;
    into(deferent, s.cylinder(0.035, 0.035, 0.016, [0, 0, 0], trim, 16));
    const spinners: { node: THREE.Group; speed: number }[] = [];
    let parent: THREE.Object3D = deferent;
    let reach = L;
    let last: THREE.Group = deferent;
    let stack = 0;
    const phase = random() * Math.PI * 2;
    deferent.rotation.y = phase;
    for (let level = 0; level < nested; level++) {
      const e = E * (level === 0 ? 1 : 0.55 ** level);
      const loop = new THREE.Group();
      loop.position.set(reach, 0.012 + level * 0.014, 0);
      stack += 0.012 + level * 0.014;
      parent.add(loop);
      into(loop, s.cylinder(0.008, 0.008, 0.03, [0, 0.008, 0], trim, 8));
      gear(loop, e * 0.45, 0.012, [0, 0.016, 0], 12);
      const ring = into(loop, s.ring(e, 0.009, [0, 0.014, 0], trim));
      ring.rotation.x = Math.PI / 2;
      into(loop, s.box([e, 0.01, 0.022], [e / 2, 0.024, 0], metal));
      loop.rotation.y = phase * (ratios[level] - 1);
      spinners.push({ node: loop, speed: ratios[level] });
      parent = loop;
      reach = e;
      last = loop;
    }
    // The planet on its pin at the end of the last loop.
    const pin = into(last, s.cylinder(0.006, 0.006, 0.07, [reach, 0.055, 0], trim, 8));
    void pin;
    const planetSize = { mars: 0.058, venus: 0.062, jupiter: 0.084, saturn: 0.074, mercury: 0.046, moon: 0.058, sun: 0.086 }[a.planet];
    const paintPlanet = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 128; canvas.height = 64;
      const ctx = canvas.getContext('2d')!;
      const base = { mars: '#b4442a', venus: '#efe2c0', jupiter: '#d6b27a', saturn: '#d9c48a', mercury: '#9a9590', moon: '#e4e2da', sun: '#ffcc55' }[a.planet];
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, 128, 64);
      if (a.planet === 'jupiter' || a.planet === 'saturn') {
        for (let i = 0; i < 9; i++) { ctx.fillStyle = i % 2 ? '#a9794a' : '#f0e0bd'; ctx.globalAlpha = 0.7; ctx.fillRect(0, 6 + i * 6, 128, 3 + random() * 3); }
        if (a.planet === 'jupiter') { ctx.fillStyle = '#b5543a'; ctx.beginPath(); ctx.ellipse(80, 40, 12, 6, 0, 0, 6.3); ctx.fill(); }
      }
      if (a.planet === 'mars' || a.planet === 'moon' || a.planet === 'mercury') {
        ctx.fillStyle = a.planet === 'mars' ? '#6e2a1a' : '#a9a69c';
        for (let i = 0; i < 14; i++) { ctx.globalAlpha = 0.5 + random() * 0.4; ctx.beginPath(); ctx.ellipse(random() * 128, random() * 64, 4 + random() * 12, 3 + random() * 7, 0, 0, 6.3); ctx.fill(); }
        if (a.planet === 'mars') { ctx.fillStyle = '#f2ebe2'; ctx.globalAlpha = 1; ctx.fillRect(0, 0, 128, 5); ctx.fillRect(0, 59, 128, 5); }
      }
      ctx.globalAlpha = 1;
      const map = new THREE.CanvasTexture(canvas);
      map.colorSpace = THREE.SRGBColorSpace;
      return new THREE.MeshStandardMaterial({
        map, roughness: a.planet === 'venus' ? 0.3 : 0.6, metalness: a.planet === 'venus' ? 0.2 : 0,
        emissive: a.planet === 'sun' ? '#ff9a2a' : '#000000', emissiveIntensity: a.planet === 'sun' ? mix(0.6, 1.4, mood.cheer) : 0,
      });
    };
    const planetAt = (group: THREE.Object3D, at: readonly [number, number, number]) => {
      const ball = into(group, s.mesh(new THREE.SphereGeometry(planetSize, 20, 14), paintPlanet(), at));
      ball.rotation.y = random() * 6;
      if (a.planet === 'saturn') {
        const hoop = into(group, s.ring(planetSize * 1.7, planetSize * 0.12, at, trim));
        hoop.rotation.x = Math.PI / 2 - 0.3;
        hoop.scale.z = 0.3;
      }
      if (a.planet === 'sun') for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const ray = into(group, s.cylinder(0.002, 0.008, planetSize * 0.9, [at[0] + Math.cos(angle) * planetSize * 1.35, at[1] + Math.sin(angle) * planetSize * 1.35, at[2]], trim, 5));
        ray.rotation.z = angle - Math.PI / 2;
      }
      return ball;
    };
    if (a.state !== 'fallen') planetAt(last, [reach, 0.07 + planetSize, 0]);
    else {
      // The empty pin, and the globe lying on the base where it fell.
      const t = random() * Math.PI * 2, d = 0.1 + random() * 0.15;
      planetAt(s.root, [Math.cos(t) * d, 0.04 + planetSize, Math.sin(t) * d]);
    }

    // The path of the planet, traced in dark wire: the loop knots where it goes backwards.
    if (a.trace) {
      const points: [number, number, number][] = [];
      const steps = 420;
      for (let i = 0; i <= steps; i++) {
        const t = (i / steps) * Math.PI * 2;
        let x = Math.cos(t) * L, z = -Math.sin(t) * L, r = E, rate = 1;
        for (let level = 0; level < nested; level++) {
          rate += ratios[level] - 1;
          x += Math.cos(t * rate) * r;
          z += -Math.sin(t * rate) * r;
          r *= 0.55;
        }
        points.push([x, armY + stack + 0.07 + planetSize, z]);
      }
      const curve = new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(...point)), true);
      s.mesh(new THREE.TubeGeometry(curve, steps, 0.0065, 5, true), s.material('#4a1f16', { roughness: 0.6 }));
    }

    // Spare parts and damage on the base.
    const baseTop = a.mount === 'pedestal' ? 0.04 : a.mount === 'plate' ? 0.025 : 0.03;
    const spot = (radius: number) => { const t = random() * Math.PI * 2; const d = radius * (0.5 + random() * 0.5); return [Math.cos(t) * d, Math.sin(t) * d] as const; };
    if (a.state === 'jammed') {
      const [x, z] = spot(0.2);
      s.box([0.01, 0.01, 0.012], [x, baseTop + 0.005, z], trim).rotation.y = random() * 3;
    }
    if (a.state === 'parts') {
      const [x, z] = spot(0.2);
      const spare = s.ball([planetSize, planetSize, planetSize], [x, baseTop + planetSize, z], s.material('#cdb98a', { roughness: 0.5 }), 14);
      void spare;
      const [gx, gz] = spot(0.22);
      const cog = s.cylinder(0.03, 0.03, 0.008, [gx, baseTop + 0.004, gz], trim, 12);
      void cog;
      const [dx, dz] = spot(0.2);
      const driver = s.rod([dx, baseTop + 0.004, dz], [dx + 0.08, baseTop + 0.004, dz + 0.03], 0.003, s.material('#d8d6cf', { metalness: 0.7, roughness: 0.3 }));
      void driver;
      s.cylinder(0.007, 0.007, 0.03, [dx - 0.012, baseTop + 0.005, dz - 0.004], s.material('#7a3b22'), 8).rotation.z = Math.PI / 2;
    }

    const pace = a.state === 'jammed' ? 0 : mix(0.08, 0.9, mood.energy);
    return s.finish({
      update: (dt) => {
        deferent.rotation.y += dt * pace;
        for (const spinner of spinners) spinner.node.rotation.y += dt * pace * (spinner.speed - 1);
      },
    });
  },
});
