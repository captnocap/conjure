import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

type P3 = [number, number, number];
function paint(w: number, h: number, draw: (c: CanvasRenderingContext2D, w: number, h: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext('2d')!, w, h);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
function star(c: CanvasRenderingContext2D, x: number, y: number, r: number) {
  c.beginPath();
  for (let i = 0; i < 10; i++) {
    const angle = (i * Math.PI) / 5 - Math.PI / 2, reach = i % 2 ? r * 0.42 : r;
    c.lineTo(x + Math.cos(angle) * reach, y + Math.sin(angle) * reach);
  }
  c.closePath();
  c.fill();
}

const NAMES = {
  barnaby: 'BARNABY',
  zampano: 'ZAMPANO',
  ringmaster: 'RINGMASTER',
  cirque: 'CIRQUE',
  madame: 'MME. ROSALIE',
  greatest: 'GREATEST SHOW',
  blank: '',
  farewell: 'FAREWELL',
} as const;
const SCHEMES = {
  'red-gold': 'Circus red with gold stars and gold mouldings: the classic.',
  'blue-silver': 'Midnight blue with silver stars: a winter circus, a night show.',
  'black-gold': 'Black lacquer and gold: severe, theatrical, a little sinister.',
  'white-gold': 'White and gold, wedding-cake grand.',
  'green-cream': 'Bottle green and cream stripes: an old European family show.',
} as const;
const HUES: Record<keyof typeof SCHEMES, { base: string; mark: string; trim: string }> = {
  'red-gold': { base: '#c5222b', mark: '#f2c230', trim: '#e9b730' },
  'blue-silver': { base: '#1c2c70', mark: '#dfe4ec', trim: '#c9cfd8' },
  'black-gold': { base: '#1c1b1f', mark: '#d6aa3c', trim: '#d6aa3c' },
  'white-gold': { base: '#f1ede2', mark: '#d9ae3a', trim: '#d9ae3a' },
  'green-cream': { base: '#1f6a4a', mark: '#f0e3bd', trim: '#d9b04a' },
};

export default defineThing({
  questions: {
    hat: choice('Where is the ringmaster\'s top hat?', {
      stand: 'On top of the coat stand, above the tailcoat, waiting.',
      podium: 'Set down on the podium, brim up, with white gloves laid in it.',
      crushed: 'Crushed flat on the ground beside the podium.',
      gone: 'There is no hat anywhere.',
    }),
    voice: choice('What does the ringmaster speak through?', {
      megaphone: 'A big brass megaphone standing mouth-down on the podium.',
      microphone: 'An old chrome ribbon microphone on a tall stand.',
      both: 'Both: the microphone on its stand and the megaphone set beside it.',
      whistle: 'Nothing but a silver whistle on a cord, hung over the rail.',
    }),
    name: choice('What is painted on the front banner?', {
      barnaby: 'BARNABY, a jovial showman\'s name.',
      zampano: 'ZAMPANO, a strongman-impresario from an old Italian road show.',
      ringmaster: 'RINGMASTER, plain and proud.',
      cirque: 'CIRQUE, elegant and French.',
      madame: 'MME. ROSALIE, a woman runs this show.',
      greatest: 'GREATEST SHOW, pure boast.',
      blank: 'Nothing: the banner is painted over, the name gone.',
      farewell: 'FAREWELL, the last night.',
    }),
    scheme: choice('What colours is the podium?', SCHEMES),
    coat: choice('What hangs on the coat stand?', {
      red: 'A scarlet tailcoat with gold braid and buttons.',
      black: 'A black tailcoat with satin lapels.',
      white: 'A white tailcoat with silver braid.',
      purple: 'A plum velvet tailcoat, moth-eaten grandeur.',
      bare: 'Nothing: the stand is bare.',
    }),
    motif: choice('How is the tub decorated?', {
      stars: 'A ring of large stars.',
      stripes: 'Bold vertical stripes like a drum.',
      swags: 'Painted swags of drapery with tassels.',
      diamonds: 'Harlequin diamonds.',
    }),
    left: choice('What else has been left there?', {
      nothing: 'Nothing else.',
      roses: 'A bouquet of roses lying on the steps.',
      whip: 'A long ring whip leaning against the tub.',
      programme: 'A scatter of printed programmes blown across the ground.',
      cane: 'A silver-topped cane and a pocket watch on the podium top.',
    }),
    footlights: noul('Is the base ringed with glowing footlight bulbs?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const p = HUES[a.scheme];
    const R = 0.62, RB = 0.74, H = 0.92;
    const rough = 0.45 + mood.wear * 0.4;
    const chips = (c: CanvasRenderingContext2D, w: number, h: number, n: number) => {
      for (let i = 0; i < n * mood.wear; i++) {
        c.fillStyle = random() < 0.5 ? '#e4dac4' : '#735c44';
        c.beginPath();
        c.ellipse(random() * w, random() * h, 3 + random() * 12, 2 + random() * 6, random() * 3, 0, 7);
        c.fill();
      }
    };

    const sideMap = paint(1024, 256, (c, w, h) => {
      c.fillStyle = p.base;
      c.fillRect(0, 0, w, h);
      c.fillStyle = p.mark;
      if (a.motif === 'stars') for (let i = 0; i < 10; i++) star(c, (i + 0.5) * (w / 10), h * 0.5, 44);
      else if (a.motif === 'stripes') for (let i = 0; i < 14; i++) c.fillRect((i * w) / 14, 0, w / 28, h);
      else if (a.motif === 'diamonds') for (let i = 0; i <= 14; i++) { c.beginPath(); c.moveTo((i * w) / 14, 20); c.lineTo((i * w) / 14 + w / 28, h / 2); c.lineTo((i * w) / 14, h - 20); c.lineTo((i * w) / 14 - w / 28, h / 2); c.fill(); }
      else for (let i = 0; i < 8; i++) {
        const x = (i * w) / 8;
        c.strokeStyle = p.mark; c.lineWidth = 16;
        c.beginPath(); c.moveTo(x, 40); c.quadraticCurveTo(x + w / 16, 190, x + w / 8, 40); c.stroke();
        c.lineWidth = 7;
        c.beginPath(); c.moveTo(x, 40); c.quadraticCurveTo(x + w / 16, 130, x + w / 8, 40); c.stroke();
        c.fillRect(x - 7, 30, 14, 110);
        c.beginPath(); c.arc(x, 150, 14, 0, 7); c.fill();
      }
      c.fillStyle = p.trim;
      c.fillRect(0, 0, w, 16);
      c.fillRect(0, h - 22, w, 22);
      chips(c, w, h, 160);
    });
    const tubPaint = new THREE.MeshStandardMaterial({ map: sideMap, roughness: rough });
    const trim = s.material(p.trim, { metalness: 0.55, roughness: 0.35 });
    const basePaint = s.material(p.base, { roughness: rough });
    const brass = s.material('#d8a93a', { metalness: 0.8, roughness: 0.28 });
    const chrome = s.material('#d5d9dd', { metalness: 0.85, roughness: 0.22 });
    const iron = s.material('#232327', { metalness: 0.5, roughness: 0.5 });
    const felt = s.material('#151418', { roughness: 0.8 });

    // The tub: tapered drum, gilt mouldings, carpeted top.
    const drum = s.mesh(new THREE.CylinderGeometry(R, RB, H - 0.12, 48, 1, true), tubPaint, [0, H / 2, 0]);
    drum.rotation.y = Math.PI / 2 + Math.PI / 10;
    s.cylinder(RB + 0.03, RB + 0.06, 0.07, [0, 0.035, 0], trim, 48);
    s.cylinder(R + 0.05, R + 0.01, 0.07, [0, H - 0.035, 0], trim, 48);
    const topMap = paint(256, 256, (c, w, h) => {
      c.fillStyle = a.scheme === 'red-gold' ? '#7a1420' : p.base;
      c.fillRect(0, 0, w, h);
      c.strokeStyle = p.mark; c.lineWidth = 8;
      c.beginPath(); c.arc(w / 2, h / 2, 104, 0, 7); c.stroke();
      c.fillStyle = p.mark;
      star(c, w / 2, h / 2, 70);
      chips(c, w, h, 60);
    });
    s.mesh(new THREE.CylinderGeometry(R + 0.02, R + 0.02, 0.02, 48), [trim, new THREE.MeshStandardMaterial({ map: topMap, roughness: 0.9 }), trim] as unknown as THREE.Material, [0, H + 0.01, 0]);

    // Front banner on a curved plate with gilt scroll ends.
    const text = NAMES[a.name];
    const bannerMap = paint(512, 128, (c, w, h) => {
      c.fillStyle = a.scheme === 'white-gold' ? '#fbf8ef' : '#f3e7c4';
      c.fillRect(0, 0, w, h);
      c.strokeStyle = p.base === '#f1ede2' ? '#b08a2a' : p.base; c.lineWidth = 8;
      c.strokeRect(8, 8, w - 16, h - 16);
      if (text) {
        c.fillStyle = p.base === '#f1ede2' ? '#8a1c26' : p.base;
        c.textAlign = 'center'; c.textBaseline = 'middle';
        c.font = `bold ${Math.min(80, (w * 1.55) / text.length)}px Georgia, serif`;
        c.fillText(text, w / 2, h / 2 + 4, w - 50);
      } else {
        c.fillStyle = 'rgba(140,128,110,0.85)';
        for (let i = 0; i < 9; i++) c.fillRect(30 + random() * 20, 24 + i * 9, w - 70 - random() * 40, 11);
      }
      chips(c, w, h, 50);
    });
    const span = 1.15;
    const banner = s.mesh(new THREE.CylinderGeometry(RB + 0.01, RB + 0.03, 0.3, 24, 1, true, -span / 2, span), new THREE.MeshStandardMaterial({ map: bannerMap, roughness: 0.75 }), [0, H * 0.52, 0]);
    banner.castShadow = false;
    for (const side of [-1, 1]) {
      const an = side * (span / 2 + 0.03);
      s.cylinder(0.035, 0.035, 0.36, [Math.sin(an) * (RB + 0.03), H * 0.52, Math.cos(an) * (RB + 0.03)], trim, 10);
    }

    // Steps up the left side: two painted treads.
    const stepAngle = -1.75;
    const out = new THREE.Vector3(Math.sin(stepAngle), 0, Math.cos(stepAngle));
    const steps = new Sculpture(context);
    for (let i = 0; i < 2; i++) {
      const height = (H * (i + 1)) / 3;
      steps.box([0.62, height, 0.34], [0, height / 2, 0.2 + (1 - i) * 0.34], basePaint);
      steps.box([0.68, 0.045, 0.38], [0, height + 0.02, 0.2 + (1 - i) * 0.34], trim);
    }
    steps.root.position.set(out.x * (RB - 0.08), 0, out.z * (RB - 0.08));
    steps.root.rotation.y = stepAngle;
    s.root.add(steps.root);

    if (a.footlights) {
      const pts: { at: P3; size: number }[] = [];
      for (let i = 0; i < 22; i++) {
        const an = (i / 22) * Math.PI * 2 + 0.1;
        if (Math.abs(Math.atan2(Math.sin(an - stepAngle), Math.cos(an - stepAngle))) < 0.5) continue;
        pts.push({ at: [Math.sin(an) * (RB + 0.1), 0.1, Math.cos(an) * (RB + 0.1)], size: 1 });
      }
      const glow = mix(0.5, 2.2, mood.cheer * 0.6 + 0.4);
      s.scatter(new THREE.SphereGeometry(0.045, 10, 8), new THREE.MeshStandardMaterial({ color: '#fff0b8', emissive: '#ffcf5a', emissiveIntensity: glow }), pts);
    }

    // Megaphone, microphone or whistle.
    const mega = () => {
      const g = new Sculpture(context);
      g.lathe([[0.2, 0], [0.205, 0.015], [0.06, 0.52], [0.045, 0.56], [0.055, 0.6], [0.035, 0.6]], brass).material.side = THREE.DoubleSide;
      g.ring(0.2, 0.014, [0, 0.008, 0], brass).rotation.x = Math.PI / 2;
      g.ring(0.07, 0.012, [0.11, 0.33, 0], brass).rotation.y = 0;
      g.cylinder(0.118, 0.128, 0.05, [0, 0.3, 0], s.material(p.base), 20);
      return g.root;
    };
    if (a.voice === 'megaphone' || a.voice === 'both') {
      const m = mega();
      if (a.voice === 'both') { m.position.set(0.3, H + 0.2, -0.22); m.rotation.set(0, random() * 6, Math.PI / 2 + 0.38, 'YXZ'); }
      else { m.position.set(0.12 + random() * 0.1, H + 0.02, 0.05); m.rotation.y = random() * 6; }
      s.root.add(m);
    }
    if (a.voice === 'microphone' || a.voice === 'both') {
      const mx = 0.02, mz = 0.26, top = H + 1.25;
      s.cylinder(0.14, 0.16, 0.04, [mx, H + 0.04, mz], iron, 20);
      s.rod([mx, H + 0.05, mz], [mx, top - 0.14, mz], 0.014, chrome);
      s.ring(0.085, 0.01, [mx, top - 0.04, mz], chrome);
      const capsule = s.box([0.09, 0.15, 0.06], [mx, top - 0.04, mz], chrome);
      capsule.geometry.dispose();
      capsule.geometry = new THREE.CapsuleGeometry(0.042, 0.09, 4, 12);
      capsule.scale.set(1, 1, 0.7);
      for (let i = 0; i < 4; i++) s.box([0.09, 0.008, 0.065], [mx, top - 0.085 + i * 0.03, mz], iron);
    }
    if (a.voice === 'whistle') {
      s.cylinder(0.022, 0.022, 0.07, [0.18, H + 0.045, 0.3], chrome, 10).rotation.z = Math.PI / 2;
      s.ball([0.03, 0.03, 0.022], [0.15, H + 0.05, 0.3], chrome, 10);
      s.tube([[0.15, H + 0.03, 0.3], [0.0, H + 0.025, 0.42], [-0.12, H + 0.025, 0.3], [0.02, H + 0.025, 0.18], [0.14, H + 0.03, 0.29]], 0.007, s.material('#c9222c'));
    }

    // Coat stand beside the tub, with the tailcoat and perhaps the hat.
    const SX = 1.22, SZ = 0.05, SH = 1.86;
    for (let i = 0; i < 4; i++) {
      const an = (i * Math.PI) / 2 + 0.6;
      s.tube([[SX, 0.34, SZ], [SX + Math.cos(an) * 0.16, 0.16, SZ + Math.sin(an) * 0.16], [SX + Math.cos(an) * 0.3, 0.02, SZ + Math.sin(an) * 0.3]], 0.022, iron);
    }
    s.cylinder(0.026, 0.03, SH - 0.3, [SX, 0.3 + (SH - 0.3) / 2, SZ], iron, 10);
    s.ball([0.04, 0.04, 0.04], [SX, SH + 0.02, SZ], brass, 10);
    for (let i = 0; i < 4; i++) {
      const an = (i * Math.PI) / 2 + 0.3;
      s.tube([[SX, SH - 0.2, SZ], [SX + Math.cos(an) * 0.14, SH - 0.2, SZ + Math.sin(an) * 0.14], [SX + Math.cos(an) * 0.2, SH - 0.1, SZ + Math.sin(an) * 0.2]], 0.014, brass);
    }
    if (a.coat !== 'bare') {
      const hue = { red: '#c2212b', black: '#18171b', white: '#f0ece1', purple: '#5a2a5e' }[a.coat];
      const braidHue = { red: '#f0c53a', black: '#3a3940', white: '#c9cfd8', purple: '#c9a548' }[a.coat];
      const cloth = s.material(hue, { roughness: a.coat === 'purple' ? 0.95 : 0.7, side: THREE.DoubleSide });
      const braid = s.material(braidHue, { metalness: 0.5, roughness: 0.4 });
      const coat = new Sculpture(context);
      // Hanger and shoulders, a waisted body, two long tails and hanging sleeves.
      coat.tube([[-0.24, -0.08, 0], [0, 0.02, 0], [0.24, -0.08, 0]], 0.018, s.material('#8a6238'));
      const torso = coat.mesh(new THREE.CylinderGeometry(0.17, 0.24, 0.6, 16, 4, true), cloth, [0, -0.36, 0]);
      torso.scale.set(1, 1, 0.5);
      coat.ball([0.25, 0.08, 0.12], [0, -0.08, 0], cloth, 14);
      for (const x of [-1, 1]) {
        coat.tube([[x * 0.24, -0.08, 0], [x * 0.3, -0.4, 0.02], [x * 0.29, -0.74, 0.03]], 0.058, cloth);
        coat.cylinder(0.064, 0.064, 0.06, [x * 0.29, -0.72, 0.03], braid, 10);
        const tail = coat.mesh(new THREE.PlaneGeometry(0.15, 0.62, 2, 4), cloth, [x * 0.09, -0.95, -0.07]);
        tail.rotation.z = x * 0.07;
        tail.rotation.x = 0.06;
        coat.ball([0.07, 0.03, 0.03], [x * 0.2, -0.07, 0.03], braid, 8);
        for (let i = 0; i < 3; i++) coat.ball([0.02, 0.02, 0.014], [x * 0.07, -0.26 - i * 0.12, 0.105 - i * 0.004], braid, 8);
        coat.box([0.06, 0.34, 0.012], [x * 0.065, -0.22, 0.09], a.coat === 'black' ? s.material('#3a3940', { roughness: 0.3 }) : braid).rotation.z = x * -0.16;
      }
      coat.root.position.set(SX, SH - 0.2, SZ + 0.13);
      coat.root.rotation.y = -0.2 + (random() - 0.5) * 0.3;
      coat.root.rotation.z = (random() - 0.5) * 0.08;
      s.root.add(coat.root);
    }

    const hat = new Sculpture(context);
    if (a.hat !== 'gone') {
      const band = s.material(a.scheme === 'blue-silver' ? '#1c2c70' : '#a81f2c');
      const crush = a.hat === 'crushed';
      const tall = crush ? 0.07 : 0.26;
      hat.cylinder(0.135, 0.115, tall, [0, tall / 2 + 0.01, 0], felt, 24);
      hat.cylinder(0.22, 0.22, 0.018, [0, 0.009, 0], felt, 24);
      hat.cylinder(0.119, 0.118, 0.05, [0, 0.045, 0], band, 24);
      if (a.hat === 'stand') { hat.root.position.set(SX, SH + 0.03, SZ); hat.root.rotation.set(0.12, random() * 6, 0.16 + random() * 0.1); }
      else if (a.hat === 'podium') {
        hat.root.position.set(-0.22, H + 0.3, -0.12);
        hat.root.rotation.set(Math.PI, random() * 6, 0);
        const glove = s.material('#f6f3ea');
        for (const dx of [-0.05, 0.05]) s.ball([0.045, 0.02, 0.1], [-0.22 + dx, H + 0.31, -0.1 + dx * 0.5], glove, 8).rotation.y = dx * 6;
      } else {
        hat.root.position.set(0.5 + random() * 0.3, 0, 1.05 + random() * 0.15);
        hat.root.rotation.set(0.08, random() * 6, 0.1);
        hat.root.scale.set(1.12, 1, 0.92);
        hat.ball([0.1, 0.02, 0.07], [0.02, tall + 0.012, 0], felt, 8);
      }
      s.root.add(hat.root);
    }

    if (a.left === 'roses') {
      const g = new Sculpture(context);
      g.mesh(new THREE.ConeGeometry(0.13, 0.42, 12, 1, true), s.material('#efe7d2', { side: THREE.DoubleSide }), [0, 0.21, 0]).rotation.x = Math.PI;
      for (let i = 0; i < 9; i++) { const an = random() * 7, r = random() * 0.1; g.ball([0.05, 0.045, 0.05], [Math.cos(an) * r, 0.44 + random() * 0.05, Math.sin(an) * r], s.material('#b3182c'), 8); }
      g.root.position.set(out.x * (RB + 0.42), H / 3 + 0.1, out.z * (RB + 0.42));
      g.root.rotation.set(0, random() * 6, 1.4);
      s.root.add(g.root);
    } else if (a.left === 'whip') {
      s.rod([0.55, 0, 0.72], [0.36, H + 0.35, 0.58], 0.016, s.material('#2a1a12'), 0.008);
      s.tube([[0.36, H + 0.35, 0.58], [0.5, H + 0.2, 0.75], [0.62, 0.5, 0.86], [0.7, 0.03, 0.95], [0.5, 0.02, 1.15], [0.2, 0.02, 1.1]], 0.008, s.material('#2a1a12'));
      s.cylinder(0.024, 0.024, 0.2, [0.535, 0.1, 0.708], s.material(p.base), 8).rotation.set(0.12, 0, 0.16);
    } else if (a.left === 'programme') {
      const sheet = paint(64, 96, (c, w, h) => { c.fillStyle = '#f1e6c6'; c.fillRect(0, 0, w, h); c.fillStyle = p.base; c.fillRect(6, 6, w - 12, 22); c.fillStyle = '#3a2a22'; for (let i = 0; i < 7; i++) c.fillRect(8, 36 + i * 8, w - 16 - (i % 3) * 8, 3); star(c, w / 2, 17, 8); });
      const mat = new THREE.MeshStandardMaterial({ map: sheet, side: THREE.DoubleSide, roughness: 0.9 });
      const n = 5 + Math.floor(mood.density * 8);
      for (let i = 0; i < n; i++) {
        const an = random() * 3.4 - 0.6, reach = RB + 0.25 + random() * 0.75;
        const page = s.mesh(new THREE.PlaneGeometry(0.17, 0.25), mat, [Math.sin(an) * reach, 0.008 + i * 0.001, Math.cos(an) * reach]);
        page.rotation.set(-Math.PI / 2 + (random() - 0.5) * 0.15, 0, random() * 6);
        page.castShadow = false;
      }
    } else if (a.left === 'cane') {
      s.rod([-0.42, H + 0.035, 0.2], [0.3, H + 0.035, -0.32], 0.014, felt);
      s.ball([0.03, 0.03, 0.03], [-0.42, H + 0.04, 0.2], chrome, 10);
      s.cylinder(0.045, 0.045, 0.014, [-0.1, H + 0.03, 0.3], brass, 16);
      s.cylinder(0.036, 0.036, 0.016, [-0.1, H + 0.031, 0.3], s.material('#f6f3ea'), 16);
      s.tube([[-0.1, H + 0.03, 0.345], [-0.02, H + 0.025, 0.42], [0.08, H + 0.025, 0.36]], 0.005, brass);
    }

    return s.finish();
  },
});
