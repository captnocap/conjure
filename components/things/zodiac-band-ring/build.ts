import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';
import { SIGNS, SIGN_NAMES, drawSign, drawStar, weave } from './zodiac';

const STYLES = {
  manuscript: 'Gold emblems on deep lapis-blue panels with parchment edges and gilt stars: an illuminated manuscript.',
  woodcut: 'Black ink emblems hatched onto cream paper, a printed almanac.',
  brass: 'Emblems engraved dark into bright polished brass, an instrument maker\'s band.',
  fresco: 'Red-earth emblems on faded sky-blue and ochre plaster, a church ceiling.',
  midnight: 'Silver-white emblems on a deep night blue scattered with constellations.',
} as const;
// Panel ground, emblem ink, divider and rim gilt, flaked or bare ground.
const PALETTE: Record<keyof typeof STYLES, [string, string, string, string]> = {
  manuscript: ['#1f3f8f', '#e8c15a', '#d9b254', '#e6d8b4'],
  woodcut: ['#ece2c6', '#201b17', '#4a3f33', '#f3ecd8'],
  brass: ['#c89a3e', '#4a2f14', '#e9cc7a', '#b48434'],
  fresco: ['#9fb7c4', '#9a3b2a', '#c9a35c', '#d8cdb0'],
  midnight: ['#182547', '#e9ecf4', '#8a93ad', '#263562'],
};

export default defineThing({
  questions: {
    style: choice('How is the band painted?', STYLES),
    between: choice('What fills the spaces between the signs?', {
      stars: 'Tiny gilt stars scattered between the emblems.',
      ticks: 'Degree ticks along both edges, like a measuring instrument.',
      names: 'The Latin name of each sign lettered beneath its emblem.',
      plain: 'Nothing: the emblems alone on their panels.',
    }),
    sit: choice('How does the ring sit?', {
      upright: 'Standing nearly upright like a hoop, leaning back a little.',
      slanted: 'Leaning at a steep slant, like the ecliptic against the equator.',
      flat: 'Lying almost flat, tipped toward the viewer like a dish or a ceiling piece.',
    }),
    centre: choice('What is held at the centre of the ring?', {
      nothing: 'Nothing: the ring is open and empty.',
      earth: 'A small painted Earth on a gilt axle.',
      sun: 'A gilt sun disc with rays on a gilt axle.',
      armillary: 'Two crossed gilt rings, a small armillary, on the axle.',
    }),
    rider: choice('What rides along the outer face of the band?', {
      none: 'Nothing rides on it.',
      sun: 'A gilt sun disc with rays, creeping along the signs.',
      moon: 'A silver crescent moon.',
      planet: 'A small painted red planet on a brass pin.',
    }),
    teeth: choice('What is the inner edge like?', {
      fine: 'Fine clockwork teeth, many and small.',
      coarse: 'Big square cogs like a mill wheel.',
      smooth: 'A plain gilt rim with no teeth.',
    }),
    state: choice('What has happened to the band?', {
      whole: 'Freshly painted, every sign in place.',
      scratched: 'One sign has been scraped away to bare canvas, as if condemned.',
      broken: 'A wedge of the ring has broken off and lies on the ground beneath it.',
      repainting: 'One panel is blank but for a charcoal sketch of a new thirteenth sign, half painted.',
      flaking: 'The paint has flaked and faded; bare canvas shows through in patches.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const [ground, ink, gilt, bare] = PALETTE[a.style];
    const R = 1.1, H = 0.5;
    const wedge = a.state === 'broken' ? mix(0.7, 1.05, random()) : 0;
    const arc = Math.PI * 2 - wedge;
    const gapAt = Math.PI * 0.3; // where the missing wedge starts, measured round the band
    const odd = Math.floor(random() * 12);

    // The painting: twelve panels round a strip of canvas.
    const W = 3072, Hc = 224, panel = W / 12;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = Hc;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = ground;
    ctx.fillRect(0, 0, W, Hc);
    if (a.style === 'manuscript' || a.style === 'fresco') {
      // Parchment or plaster borders along both edges.
      ctx.fillStyle = bare;
      ctx.fillRect(0, 0, W, 18);
      ctx.fillRect(0, Hc - 18, W, 18);
    }
    weave(ctx, W, Hc, random, a.style === 'brass' ? '#ffffff' : '#000000', 700);
    const faded = a.state === 'flaking' ? 0.55 : 1;
    SIGNS.forEach((sign, index) => {
      const x0 = index * panel;
      ctx.strokeStyle = gilt;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(x0, 12);
      ctx.lineTo(x0, Hc - 12);
      ctx.stroke();
      if (a.state === 'scratched' && index === odd) {
        ctx.fillStyle = bare;
        ctx.fillRect(x0 + 8, 20, panel - 16, Hc - 40);
        ctx.strokeStyle = '#8a7d66';
        ctx.lineWidth = 3;
        for (let i = 0; i < 14; i++) {
          ctx.beginPath();
          ctx.moveTo(x0 + 20 + random() * (panel - 40), 30 + random() * (Hc - 60));
          ctx.lineTo(x0 + 20 + random() * (panel - 40), 30 + random() * (Hc - 60));
          ctx.stroke();
        }
        return;
      }
      if (a.state === 'repainting' && index === odd) {
        ctx.fillStyle = bare;
        ctx.fillRect(x0 + 8, 20, panel - 16, Hc - 40);
        // Charcoal: a serpent-bearer, sketched as a winding line and a stick figure.
        ctx.strokeStyle = '#4a4540';
        ctx.lineWidth = 3;
        ctx.save();
        ctx.translate(x0 + panel / 2, Hc / 2);
        ctx.beginPath();
        ctx.moveTo(-60, 30); ctx.quadraticCurveTo(-20, -40, 0, 10); ctx.quadraticCurveTo(20, 50, 60, -20);
        ctx.moveTo(0, -40); ctx.lineTo(0, 30); ctx.moveTo(-18, -8); ctx.lineTo(18, -8); ctx.moveTo(0, 30); ctx.lineTo(-14, 60); ctx.moveTo(0, 30); ctx.lineTo(14, 60);
        ctx.arc(0, -50, 10, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = ground;
        ctx.globalAlpha = 0.6;
        ctx.fillRect(-panel / 2 + 8, -Hc / 2 + 20, panel * 0.3, Hc - 40);
        ctx.globalAlpha = 1;
        ctx.restore();
        return;
      }
      ctx.save();
      ctx.translate(x0 + panel / 2, Hc / 2 - (a.between === 'names' ? 14 : 0));
      ctx.scale(1.6, 1.6);
      ctx.strokeStyle = ink;
      ctx.lineWidth = a.style === 'brass' ? 11 : 9;
      ctx.globalAlpha = faded;
      if (a.style === 'woodcut') {
        // Hatching behind the glyph.
        ctx.lineWidth = 1.2;
        ctx.globalAlpha = 0.5;
        for (let y = -44; y < 48; y += 6) { ctx.beginPath(); ctx.moveTo(-56, y); ctx.lineTo(56, y + 3); ctx.stroke(); }
        ctx.globalAlpha = 1;
        ctx.lineWidth = 9;
      }
      drawSign(ctx, sign);
      ctx.restore();
      ctx.globalAlpha = 1;
      if (a.between === 'names') {
        ctx.fillStyle = ink;
        ctx.font = `bold 28px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(SIGN_NAMES[sign], x0 + panel / 2, Hc - 36, panel - 30);
      }
      if (a.between === 'stars') {
        ctx.fillStyle = gilt;
        for (let i = 0; i < 7; i++) drawStar(ctx, x0 + 14 + random() * (panel - 28), 26 + random() * (Hc - 52), 4 + random() * 5);
      }
      if (a.between === 'ticks') {
        ctx.strokeStyle = gilt;
        ctx.lineWidth = 2;
        for (let i = 0; i < 30; i++) {
          const x = x0 + (i / 30) * panel;
          const long = i % 5 === 0 ? 22 : 11;
          ctx.beginPath(); ctx.moveTo(x, 14); ctx.lineTo(x, 14 + long); ctx.moveTo(x, Hc - 14); ctx.lineTo(x, Hc - 14 - long); ctx.stroke();
        }
      }
    });
    if (a.state === 'flaking' || mood.wear > 0.7) {
      ctx.fillStyle = bare;
      const flakes = a.state === 'flaking' ? 140 : 40;
      for (let i = 0; i < flakes; i++) {
        ctx.globalAlpha = 0.5 + random() * 0.5;
        ctx.beginPath();
        ctx.ellipse(random() * W, random() * Hc, 6 + random() * 26, 4 + random() * 12, random() * 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    texture.wrapS = THREE.RepeatWrapping;
    texture.repeat.x = arc / (Math.PI * 2);
    texture.offset.x = (gapAt + wedge) / (Math.PI * 2);
    const paintMaterial = new THREE.MeshStandardMaterial({ map: texture, roughness: a.style === 'brass' ? 0.4 : 0.85, metalness: a.style === 'brass' ? 0.5 : 0, side: THREE.DoubleSide });
    const gold = s.material(gilt, { metalness: 0.75, roughness: mix(0.3, 0.55, mood.wear) });
    const dark = s.material('#3b2f22', { roughness: 0.7 });

    // The ring, in its own tilted frame: the cylinder's axis is the ring's axis.
    const tilt = { upright: 1.4, slanted: 0.95, flat: 0.16 }[a.sit];
    const frame = new THREE.Group();
    frame.rotation.x = tilt;
    s.root.add(frame);
    const ring = new THREE.Group();
    frame.add(ring);
    const into = <T extends THREE.Object3D>(group: THREE.Object3D, child: T) => { group.add(child); return child; };
    into(ring, s.mesh(new THREE.CylinderGeometry(R, R, H, 96, 1, true, gapAt + wedge, arc), paintMaterial));
    for (const y of [-H / 2, H / 2]) {
      const rim = into(ring, s.ring(R, 0.02, [0, y, 0], gold, arc));
      rim.rotation.x = Math.PI / 2;
      rim.rotation.z = Math.PI / 2 - gapAt;
    }
    if (wedge) {
      // The broken ends, and the fallen wedge lying beneath.
      for (const angle of [gapAt, gapAt + wedge]) {
        const x = Math.sin(angle) * R, z = Math.cos(angle) * R;
        into(ring, s.box([0.03, H + 0.02, 0.06], [x, 0, z], dark)).rotation.y = angle;
      }
    }
    if (a.teeth !== 'smooth') {
      const count = a.teeth === 'fine' ? 84 : 30;
      const size = a.teeth === 'fine' ? 0.035 : 0.075;
      const teeth = new THREE.InstancedMesh(new THREE.BoxGeometry(size, size, size * 0.7), gold, count);
      const matrix = new THREE.Matrix4();
      for (let i = 0; i < count; i++) {
        const angle = gapAt + wedge + ((i + 0.5) / count) * arc;
        matrix.makeRotationY(angle).setPosition(Math.sin(angle) * (R - size * 0.45), -H / 2 + size * 0.5, Math.cos(angle) * (R - size * 0.45));
        teeth.setMatrixAt(i, matrix);
      }
      teeth.castShadow = teeth.receiveShadow = true;
      ring.add(teeth);
    }

    // Something on the axle at the centre, held by a column that rises from the ground behind.
    if (a.centre !== 'nothing') {
      into(ring, s.cylinder(0.02, 0.02, 0.9, [0, 0, 0], gold, 10));
      into(ring, s.cylinder(0.035, 0.015, 0.06, [0, 0.47, 0], gold, 10));
      for (let i = 0; i < 3; i++) {
        const angle = gapAt + wedge + arc * ((i + 0.5) / 3);
        into(ring, s.rod([0, 0, 0], [Math.sin(angle) * R, 0, Math.cos(angle) * R], 0.012, gold));
      }
      if (a.centre === 'earth') {
        const earthCanvas = document.createElement('canvas');
        earthCanvas.width = 256; earthCanvas.height = 128;
        const e = earthCanvas.getContext('2d')!;
        e.fillStyle = '#2f6fa8'; e.fillRect(0, 0, 256, 128);
        e.fillStyle = '#6f9a4e';
        for (let i = 0; i < 9; i++) { e.beginPath(); e.ellipse(random() * 256, 30 + random() * 70, 18 + random() * 30, 12 + random() * 18, random() * 3, 0, 6.3); e.fill(); }
        e.strokeStyle = gilt; e.lineWidth = 3;
        for (let i = 0; i < 4; i++) { e.beginPath(); e.moveTo(0, 20 + i * 30); e.lineTo(256, 20 + i * 30); e.stroke(); }
        const map = new THREE.CanvasTexture(earthCanvas);
        map.colorSpace = THREE.SRGBColorSpace;
        into(ring, s.mesh(new THREE.SphereGeometry(0.22, 24, 16), new THREE.MeshStandardMaterial({ map, roughness: 0.6 })));
      } else if (a.centre === 'sun') {
        const sun = into(ring, s.cylinder(0.24, 0.24, 0.04, [0, 0, 0], s.material(gilt, { emissive: '#ffb347', emissiveIntensity: mix(0.2, 0.7, mood.cheer), metalness: 0.6, roughness: 0.35 }), 24));
        sun.rotation.x = Math.PI / 2;
        for (let i = 0; i < 12; i++) {
          const angle = (i / 12) * Math.PI * 2;
          const ray = into(ring, s.cylinder(0.005, 0.03, 0.16, [Math.cos(angle) * 0.32, Math.sin(angle) * 0.32, 0], gold, 6));
          ray.rotation.z = angle - Math.PI / 2;
        }
      } else {
        for (const turn of [0, Math.PI / 2]) {
          const hoop = into(ring, s.ring(0.3, 0.018, [0, 0, 0], gold));
          hoop.rotation.y = turn;
        }
        into(ring, s.ball([0.05, 0.05, 0.05], [0, 0, 0], dark, 12));
      }
    }

    // The rider, on its own pivot so it can creep round the signs.
    const pivot = new THREE.Group();
    ring.add(pivot);
    pivot.rotation.y = gapAt + wedge + arc * mix(0.2, 0.8, random());
    if (a.rider === 'sun') {
      const disc = into(pivot, s.cylinder(0.11, 0.11, 0.03, [0, 0, R + 0.03], s.material(gilt, { emissive: '#ffb347', emissiveIntensity: mix(0.2, 0.8, mood.cheer), metalness: 0.6, roughness: 0.35 }), 20));
      disc.rotation.x = Math.PI / 2;
      for (let i = 0; i < 10; i++) {
        const angle = (i / 10) * Math.PI * 2;
        const ray = into(pivot, s.cylinder(0.004, 0.02, 0.09, [Math.cos(angle) * 0.16, Math.sin(angle) * 0.16, R + 0.03], gold, 6));
        ray.rotation.z = angle - Math.PI / 2;
      }
    } else if (a.rider === 'moon') {
      const silver = s.material('#e3e6ea', { metalness: 0.7, roughness: 0.3 });
      const disc = into(pivot, s.cylinder(0.11, 0.11, 0.03, [0, 0, R + 0.03], silver, 20));
      disc.rotation.x = Math.PI / 2;
      const bite = into(pivot, s.cylinder(0.095, 0.095, 0.034, [0.06, 0.02, R + 0.03], paintMaterial, 20));
      bite.rotation.x = Math.PI / 2;
    } else if (a.rider === 'planet') {
      into(pivot, s.cylinder(0.012, 0.012, 0.12, [0, 0, R + 0.05], gold, 8)).rotation.x = Math.PI / 2;
      into(pivot, s.ball([0.07, 0.07, 0.07], [0, 0, R + 0.14], s.material('#b7432b', { roughness: 0.5 }), 16));
    }

    // Where the ground is, in the ring's frame: the front rim's lower edge is the lowest point of the hoop.
    const lowEdge = -R * Math.sin(tilt) - (H / 2 + 0.02) * Math.cos(tilt);
    const lowZ = R * Math.cos(tilt) - (H / 2) * Math.sin(tilt);
    let floor = lowEdge;
    if (a.sit === 'flat') {
      // Lying almost flat like a dish set down: three low gilt feet under the rim.
      floor = lowEdge - 0.06;
      for (let i = 0; i < 3; i++) {
        const angle = (i / 3) * Math.PI * 2 + 0.5;
        const foot = new THREE.Vector3(Math.sin(angle) * R * 0.92, -H / 2, Math.cos(angle) * R * 0.92).applyAxisAngle(new THREE.Vector3(1, 0, 0), tilt);
        s.cylinder(0.04, 0.06, 0.1, [foot.x, foot.y - 0.03, foot.z], gold, 10);
      }
    } else {
      // A dark block under the lowest point of the hoop keeps it from rolling.
      floor = lowEdge + 0.01 - 0.08;
      s.box([0.5, 0.08, 0.3], [0, floor + 0.04, lowZ], dark);
    }
    if (wedge) {
      const fragment = s.mesh(new THREE.CylinderGeometry(R, R, H, 24, 1, true, 0, wedge), paintMaterial.clone());
      const map = texture.clone();
      map.repeat.x = wedge / (Math.PI * 2);
      map.offset.x = gapAt / (Math.PI * 2);
      (fragment.material as THREE.MeshStandardMaterial).map = map;
      fragment.rotation.set(Math.PI / 2, 0, Math.PI / 2 + random() * 0.8);
      fragment.position.set(mix(-0.3, 0.3, random()) + R * 0.7, floor + R, lowZ + 0.3);
    }

    const spin = mix(0.02, 0.35, mood.energy);
    const creep = mix(0.05, 0.6, mood.energy);
    return s.finish({
      update: (dt) => {
        if (!wedge) ring.rotation.y += dt * spin;
        pivot.rotation.y += dt * creep;
      },
    });
  },
});
