import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

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
    height: score('How tall is the dewar?', ['A squat portable can', 'Waist high', 'Chest high', 'Taller than a person']),
    shell: choice('What is the outer shell like?', {
      steel: 'Brushed stainless steel.',
      blue: 'Painted dark blue with a steel top.',
      white: 'White enamel, slightly yellowed.',
      aluminium: 'Dull grey aluminium with dents.',
    }),
    frost: score('How much frost is on it?', ['None, dry', 'A ring of frost at the neck', 'Frost down the neck and valves', 'Thick ice, frost crust everywhere']),
    venting: choice('What is it doing?', {
      quiet: 'Sitting quiet, valves closed.',
      gentle: 'Venting gently, a thin plume curling from the relief valve.',
      roaring: 'Venting hard, a thick plume pouring off the top.',
    }),
    hose: choice('What about the transfer line?', {
      none: 'No line attached.',
      floor: 'A corrugated hose from a side port trailing across the floor.',
      transfer: 'A long rigid transfer tube arcing up out of the neck.',
    }),
    labels: choice('How is it labelled?', {
      official: 'A big LIQUID HELIUM label and a hazard diamond.',
      stickers: 'Covered in coloured stickers and tape.',
      plain: 'Just a stencilled serial number.',
      chalk: 'Chalk marks: a fill level and a date.',
    }),
    dolly: noul('Is it on a wheeled dolly with a push handle?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const steel = s.material('#b5babf', { metalness: 0.8, roughness: 0.3 });
    const dark = s.material('#2a2c30', { roughness: 0.6 });
    const brass = s.material('#c9a44a', { metalness: 0.7, roughness: 0.35 });
    const shellColour = { steel: '#b5babf', blue: '#24406e', white: '#ece9dc', aluminium: '#9a9c9a' }[a.shell];
    const shell = s.material(shellColour, { metalness: a.shell === 'steel' ? 0.8 : a.shell === 'aluminium' ? 0.6 : 0.2, roughness: a.shell === 'steel' ? 0.3 : a.shell === 'aluminium' ? 0.55 : 0.4 });
    const frostMat = s.material('#f4f8fb', { roughness: 1, metalness: 0 });

    const H = mix(0.7, 2.0, a.height);
    const R = mix(0.22, 0.36, a.height);
    const dollyH = a.dolly ? 0.12 : 0;
    const base = dollyH;
    const neckR = R * 0.35, neckH = H * 0.12;
    const bodyH = H - neckH - 0.1;
    // Body: a lathe with a skirt, a shoulder and a neck.
    s.lathe([
      [R * 0.9, 0], [R, 0.02], [R, bodyH * 0.9], [R * 0.75, bodyH], [neckR + 0.02, bodyH + 0.05], [neckR, bodyH + 0.06], [neckR, bodyH + neckH + 0.05], [neckR + 0.03, bodyH + neckH + 0.05], [neckR + 0.03, bodyH + neckH + 0.09], [0, bodyH + neckH + 0.09],
    ], shell, [0, base, 0]);
    s.cylinder(R + 0.01, R + 0.01, 0.04, [0, base + bodyH * 0.55, 0], dark, 32);
    s.cylinder(R + 0.01, R + 0.01, 0.04, [0, base + 0.12, 0], dark, 32);
    // Lifting handles on the shoulder.
    for (const side of [-1, 1]) {
      const handle = s.ring(0.08, 0.012, [side * (R * 0.7), base + bodyH + 0.02, 0], steel, Math.PI);
      handle.rotation.y = Math.PI / 2;
    }
    const topY = base + bodyH + neckH + 0.09;

    // Valve tree on the neck: a riser, a tee, two handwheels, a gauge, a relief valve.
    s.cylinder(0.025, 0.025, 0.22, [0, topY + 0.11, 0], steel, 12);
    s.cylinder(0.03, 0.03, 0.05, [0, topY + 0.24, 0], brass, 12);
    s.cylinder(0.022, 0.022, 0.28, [0, topY + 0.22, 0], steel, 12).rotation.z = Math.PI / 2;
    for (const side of [-1, 1]) {
      s.cylinder(0.03, 0.03, 0.04, [side * 0.15, topY + 0.22, 0], brass, 12).rotation.z = Math.PI / 2;
      const wheel = s.ring(0.045, 0.008, [side * 0.19, topY + 0.22, 0], s.material(side < 0 ? '#c8302c' : '#2a62b8', { roughness: 0.5 }));
      wheel.rotation.y = Math.PI / 2;
      s.cylinder(0.006, 0.006, 0.09, [side * 0.19, topY + 0.22, 0], steel, 6).rotation.x = Math.PI / 2;
    }
    // Gauge.
    s.cylinder(0.05, 0.05, 0.025, [0, topY + 0.33, 0.02], dark, 20).rotation.x = Math.PI / 2;
    const gaugeFace = paint(128, 128, (ctx) => {
      ctx.fillStyle = '#f4f2ea'; ctx.beginPath(); ctx.arc(64, 64, 62, 0, 7); ctx.fill();
      ctx.strokeStyle = '#1d1d1f'; ctx.lineWidth = 3;
      for (let i = 0; i <= 10; i++) { const t = Math.PI * 0.8 + (i / 10) * Math.PI * 1.4; ctx.beginPath(); ctx.moveTo(64 + Math.cos(t) * 50, 64 + Math.sin(t) * 50); ctx.lineTo(64 + Math.cos(t) * 40, 64 + Math.sin(t) * 40); ctx.stroke(); }
      const n = Math.PI * 0.8 + (a.venting === 'roaring' ? 0.9 : a.venting === 'gentle' ? 0.5 : 0.25) * Math.PI * 1.4;
      ctx.strokeStyle = '#c8302c'; ctx.beginPath(); ctx.moveTo(64, 64); ctx.lineTo(64 + Math.cos(n) * 48, 64 + Math.sin(n) * 48); ctx.stroke();
      ctx.fillStyle = '#1d1d1f'; ctx.font = 'bold 14px monospace'; ctx.fillText('psi', 52, 100);
    });
    s.mesh(new THREE.CircleGeometry(0.046, 20), new THREE.MeshStandardMaterial({ map: gaugeFace, roughness: 0.5 }), [0, topY + 0.33, 0.034]);
    // Relief valve and vent elbow.
    s.cylinder(0.018, 0.018, 0.08, [0, topY + 0.31, -0.05], brass, 10).rotation.x = Math.PI / 2;
    const ventEnd: [number, number, number] = [0.08, topY + 0.36, -0.1];
    s.tube([[0, topY + 0.31, -0.09], [0.03, topY + 0.33, -0.1], ventEnd], 0.014, steel);
    // A thermometer stick and a cap on the neck.
    s.cylinder(neckR + 0.035, neckR + 0.035, 0.03, [0, topY - 0.015, 0], steel, 20);
    for (let i = 0; i < 6; i++) s.cylinder(0.012, 0.012, 0.02, [Math.sin(i * 1.047) * (neckR + 0.02), topY + 0.01, Math.cos(i * 1.047) * (neckR + 0.02)], dark, 6);

    // Frost: rough white bands that grow with the frost score, plus ice on the valves.
    const frostBands = Math.round(a.frost * 5);
    for (let i = 0; i < frostBands; i++) {
      const y = topY - 0.02 - i * (neckH / 4);
      const r = y > base + bodyH + 0.06 ? neckR + 0.012 : R * (0.75 + 0.1) + 0.012;
      const band = s.cylinder(r, r + 0.006, 0.05 + random() * 0.03, [0, y, 0], frostMat, 24);
      band.scale.x = 1 + random() * 0.04;
    }
    if (a.frost > 0.45) {
      s.ball([0.045, 0.035, 0.045], [0, topY + 0.24, 0], frostMat, 10);
      for (const side of [-1, 1]) s.ball([0.05, 0.03, 0.03], [side * 0.08, topY + 0.22, 0], frostMat, 10);
    }
    if (a.frost > 0.75) {
      s.cylinder(R + 0.015, R + 0.025, bodyH * 0.12, [0, base + bodyH * 0.94, 0], frostMat, 32);
      for (let i = 0; i < 10; i++) {
        const t = random() * Math.PI * 2;
        s.ball([0.03 + random() * 0.03, 0.08 + random() * 0.15, 0.015], [Math.sin(t) * (R + 0.005), base + bodyH * (0.6 + random() * 0.3), Math.cos(t) * (R + 0.005)], frostMat, 8).rotation.y = t;
      }
    }

    // Labels.
    const front = R + 0.002;
    if (a.labels === 'official') {
      s.label('LIQUID HELIUM', R * 1.5, R * 0.36, [0, base + bodyH * 0.62, front], '#ffffff', '#1f3f8a');
      const diamond = paint(128, 128, (ctx) => {
        ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 128, 128);
        ctx.fillStyle = '#2f8a3a'; ctx.beginPath(); ctx.moveTo(64, 4); ctx.lineTo(124, 64); ctx.lineTo(64, 124); ctx.lineTo(4, 64); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#ffffff'; ctx.font = 'bold 44px monospace'; ctx.fillText('2', 50, 82);
        ctx.font = 'bold 12px monospace'; ctx.fillText('GAS', 52, 40);
      });
      s.mesh(new THREE.PlaneGeometry(R * 0.7, R * 0.7), new THREE.MeshStandardMaterial({ map: diamond, roughness: 0.6 }), [R * 0.05, base + bodyH * 0.36, front]);
      s.label('He', 0.14, 0.08, [0, topY - 0.015 + 0.001, neckR + 0.036], '#1d1d1f', '#f2c21b');
    } else if (a.labels === 'stickers') {
      const colours = ['#e8b820', '#c8302c', '#2a62b8', '#3f8a2e', '#f0ede4', '#e8732a'];
      for (let i = 0; i < 11; i++) {
        const t = (random() - 0.5) * 1.6;
        const y = base + 0.2 + random() * (bodyH - 0.4);
        const sticker = s.mesh(new THREE.PlaneGeometry(0.08 + random() * 0.1, 0.05 + random() * 0.06), s.material(colours[i % colours.length], { roughness: 0.7 }), [Math.sin(t) * (R + 0.003), y, Math.cos(t) * (R + 0.003)]);
        sticker.rotation.y = t;
        sticker.rotation.z = (random() - 0.5) * 0.6;
      }
      s.label('DO NOT TIP', R * 1.2, R * 0.25, [0, base + bodyH * 0.8, front], '#1d1d1f', '#f2c21b');
    } else if (a.labels === 'plain') {
      s.label(`LHe ${100 + Math.floor(random() * 900)}`, R * 0.9, R * 0.2, [0, base + bodyH * 0.5, front], '#3a3a3a', shellColour);
    } else {
      const chalk = paint(256, 128, (ctx) => {
        ctx.clearRect(0, 0, 256, 128);
        ctx.strokeStyle = '#f0ede4'; ctx.lineWidth = 5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(30, 70); ctx.lineTo(220, 70); ctx.stroke();
        ctx.font = 'bold 36px monospace'; ctx.fillStyle = '#f0ede4';
        ctx.fillText(`${30 + Math.floor(random() * 60)}%`, 40, 50);
        ctx.font = '26px monospace'; ctx.fillText(`${1 + Math.floor(random() * 28)}/${1 + Math.floor(random() * 12)}`, 110, 110);
      });
      s.mesh(new THREE.PlaneGeometry(R * 1.4, R * 0.7), new THREE.MeshStandardMaterial({ map: chalk, transparent: true, roughness: 0.9, depthWrite: false }), [0, base + bodyH * 0.58, front + 0.001]);
    }

    // Lines and hoses.
    if (a.hose === 'floor') {
      const port: [number, number, number] = [R * 0.9, base + bodyH + 0.02, R * 0.4];
      s.cylinder(0.03, 0.03, 0.08, port, brass, 10).rotation.z = Math.PI / 2;
      s.tube([[R + 0.03, port[1], port[2]], [R + 0.35, port[1] - 0.1, port[2] + 0.1], [R + 0.5, 0.04, port[2] + 0.5], [R + 0.2, 0.04, port[2] + 0.9], [R - 0.3, 0.04, port[2] + 1.0]], 0.03, s.material('#4a4e55', { roughness: 0.6, metalness: 0.4 }));
      const rings: THREE.Matrix4[] = [];
      void rings;
    } else if (a.hose === 'transfer') {
      s.tube([[0, topY + 0.3, 0.03], [0.02, topY + 0.9, 0.05], [0.5, topY + 1.0, 0.1], [0.95, topY + 0.6, 0.15], [1.05, topY - 0.3, 0.2]], 0.018, steel);
      s.cylinder(0.04, 0.04, 0.1, [0, topY + 0.3, 0.03], brass, 10);
    }

    // Dolly.
    if (a.dolly) {
      s.cylinder(R + 0.06, R + 0.06, 0.04, [0, 0.1, 0], dark, 32);
      for (let i = 0; i < 4; i++) {
        const t = i * Math.PI / 2 + Math.PI / 4;
        s.cylinder(0.035, 0.035, 0.03, [Math.sin(t) * (R + 0.02), 0.035, Math.cos(t) * (R + 0.02)], s.material('#1f2124', { roughness: 0.8 }), 12).rotation.x = Math.PI / 2;
        s.box([0.03, 0.05, 0.03], [Math.sin(t) * (R + 0.02), 0.065, Math.cos(t) * (R + 0.02)], dark);
      }
      s.tube([[-R - 0.03, 0.12, -0.15], [-R - 0.1, H * 0.65, -0.15], [-R - 0.1, H * 0.7, 0.15], [-R - 0.03, 0.12, 0.15]], 0.014, dark);
    }

    // Vent plume: a handful of soft white puffs that rise and spread.
    const puffs = a.venting === 'quiet' ? 0 : a.venting === 'gentle' ? 14 : 28;
    let plume: THREE.InstancedMesh | null = null;
    const phases: number[] = [];
    if (puffs) {
      plume = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshStandardMaterial({ color: '#f6fbff', transparent: true, opacity: 0.38, roughness: 1, depthWrite: false }), puffs);
      plume.castShadow = false;
      plume.frustumCulled = false;
      for (let i = 0; i < puffs; i++) phases.push(random());
      s.root.add(plume);
    }
    const thick = a.venting === 'roaring' ? 1 : 0.55;
    const m = new THREE.Matrix4();
    const speed = mix(0.4, 1.4, mood.energy);
    const drawPlume = (time: number) => {
      if (!plume) return;
      for (let i = 0; i < puffs; i++) {
        const t = (phases[i] + time * 0.18 * speed) % 1;
        const size = (0.03 + t * 0.16) * thick;
        const x = ventEnd[0] + 0.04 + t * (0.25 + 0.3 * thick) + Math.sin(t * 9 + i) * 0.03;
        const y = ventEnd[1] + t * 0.22 - t * t * 0.5 * (a.venting === 'roaring' ? 0.0 : 0.6);
        const z = ventEnd[2] - t * 0.3 + Math.cos(t * 7 + i * 2) * 0.03;
        m.makeScale(size, size * 0.8, size).setPosition(x, y, z);
        plume.setMatrixAt(i, m);
      }
      plume.instanceMatrix.needsUpdate = true;
    };
    drawPlume(0);

    return s.finish({ footprint: R + 0.1, update: (_dt, time) => drawPlume(time) });
  },
});
