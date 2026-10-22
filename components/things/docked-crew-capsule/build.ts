import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

const ERAS = {
  'tin-can': 'A 1960s tin can: a small black corrugated bell on a flared white adapter, cramped and brave.',
  moonship: 'A late-1960s moonship: a silver cone on a long silver service drum with one big engine bell.',
  workhorse: 'A 1970s workhorse that never retired: grey-green blankets, a ball-shaped orbital module on a bell-shaped cabin.',
  taxi: 'A sleek modern commercial taxi: smooth white gumdrop with dark windows on a black trunk.',
  lifeboat: 'A stubby orange-and-white emergency lifeboat, built to be ugly and never used.',
} as const;
const HISTORIES = {
  fresh: 'Just arrived: gleaming, crisp markings, flecks of launch frost still drifting off it.',
  'long-stay': 'Parked for months: sun-faded, peppered with tiny impact pits, a little sad.',
  scorched: 'Re-entry scorched: the cabin streaked brown and black from the base upward.',
  patched: 'Improvised repairs: foil patches, tape and a blanket strapped over a wound.',
} as const;
const DOCKINGS = {
  probe: 'Free and closing in, docking probe extended like a lance.',
  port: 'Hard docked, nose buried in a ring of station port.',
  hatch: 'Drifting with the nose hatch swung open and light spilling out.',
  backing: 'Just undocked and backing away, thrusters puffing.',
} as const;
const WINGS = {
  twin: 'Two neat rectangular solar wings, both deployed.',
  stuck: 'One wing deployed, the other still folded against the hull: a small failure.',
  fans: 'Two round fan-shaped arrays like paper parasols.',
  torn: 'One wing torn half away, the broken panels dangling.',
} as const;
const MARKINGS = {
  stripe: 'A bold red band and a block-lettered name.',
  checker: 'Black-and-white roll-pattern checks, test-flight style.',
  roundel: 'A big coloured roundel with a star.',
  numeral: 'A huge mission numeral.',
  none: 'Anonymous: no markings at all.',
} as const;

type Profile = readonly (readonly [number, number])[];
const CABINS: Record<keyof typeof ERAS, { profile: Profile; tint: string; metal: number; sm: Profile; smTint: string; bell: number; top: number }> = {
  'tin-can': { profile: [[0, 0], [0.92, 0], [0.96, 0.08], [0.4, 1.3], [0.4, 1.7], [0.3, 1.75], [0.3, 2.0], [0, 2.0]], tint: '#33363b', metal: 0.5, sm: [[0.5, -1.25], [1.28, -1.25], [0.96, 0]], smTint: '#eeece5', bell: 0.3, top: 2.0 },
  moonship: { profile: [[0, 0], [1.9, 0], [1.95, 0.12], [0.5, 2.45], [0.32, 2.6], [0, 2.6]], tint: '#c7ccd1', metal: 0.85, sm: [[0.6, -3.5], [1.95, -3.5], [1.95, 0]], smTint: '#dcdfe2', bell: 1.1, top: 2.6 },
  workhorse: { profile: [[0, 0], [1.05, 0], [1.1, 0.15], [1.06, 0.8], [0.78, 1.65], [0.62, 1.85], [0, 1.85]], tint: '#7d8676', metal: 0.1, sm: [[0.5, -2.0], [1.36, -2.0], [1.3, -1.5], [1.08, -1.1], [1.08, 0]], smTint: '#8b9484', bell: 0.42, top: 3.85 },
  taxi: { profile: [[0, 0], [1.74, 0], [1.85, 0.16], [1.62, 1.3], [1.0, 2.45], [0.62, 2.85], [0, 2.92]], tint: '#f4f3ef', metal: 0.05, sm: [[1.6, -2.0], [1.85, -2.0], [1.85, 0]], smTint: '#25282d', bell: 0, top: 2.92 },
  lifeboat: { profile: [[0, 0], [1.3, 0], [1.4, 0.2], [1.3, 1.0], [0.7, 1.7], [0.5, 1.8], [0, 1.8]], tint: '#e9742a', metal: 0.05, sm: [[0.5, -1.0], [1.4, -1.0], [1.4, 0]], smTint: '#f0eee6', bell: 0.45, top: 1.8 },
};
const NAMES = ['KESTREL', 'VESNA 4', 'HALCYON', 'ORBITAL 7', 'TERN', 'ZARYA II', 'PILGRIM', 'MERIDIAN'];

export default defineThing({
  questions: {
    era: choice('What era and style is the capsule?', ERAS),
    history: choice('What has it been through?', HISTORIES),
    docking: choice('What is it doing at the docking port?', DOCKINGS),
    wings: choice('What are its solar wings like?', WINGS),
    markings: choice('What markings does it carry?', MARKINGS),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const add = <T extends THREE.Object3D>(parent: THREE.Object3D, child: T) => { parent.add(child); return child; };
    const spec = CABINS[a.era];
    const grime = a.history === 'long-stay' ? 0.5 + mood.wear * 0.5 : a.history === 'fresh' ? mood.wear * 0.25 : 0.3 + mood.wear * 0.5;
    const accent = ['#c8362c', '#2f5fb5', '#e08a1c', '#1f7a5a'][Math.floor(random() * 4)];
    const name = NAMES[Math.floor(random() * NAMES.length)];

    // One painted skin per hull section: seams, windows, markings, then soot and pits on top.
    const skin = (base: string, part: 'cabin' | 'service') => {
      const canvas = document.createElement('canvas');
      canvas.width = 1024; canvas.height = 256;
      const c = canvas.getContext('2d')!;
      c.fillStyle = base; c.fillRect(0, 0, 1024, 256);
      const corrugated = a.era === 'tin-can' && part === 'cabin';
      c.strokeStyle = corrugated ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.16)';
      c.lineWidth = corrugated ? 3 : 2;
      for (let i = 0; i < (corrugated ? 96 : 12); i++) { const x = (i / (corrugated ? 96 : 12)) * 1024; c.beginPath(); c.moveTo(x, 0); c.lineTo(x, 256); c.stroke(); }
      if (!corrugated) for (const y of [64, 150, 215]) { c.beginPath(); c.moveTo(0, y); c.lineTo(1024, y); c.stroke(); }
      if (part === 'cabin') {
        if (a.era === 'taxi' || a.era === 'lifeboat') { c.fillStyle = '#1d1f23'; c.fillRect(0, 226, 1024, 30); }
        if (a.era === 'lifeboat') { c.fillStyle = '#f0eee6'; for (let i = 0; i < 8; i++) c.fillRect(i * 128, 120, 64, 46); }
        // Windows, repeated round the hull so one always faces the viewer.
        const lit = mix(0.25, 1, mood.cheer);
        for (let i = 0; i < 4; i++) {
          const x = 128 + i * 256, y = a.era === 'moonship' ? 96 : 118;
          c.fillStyle = '#16181c';
          c.beginPath(); c.roundRect(x - 34, y - 22, 68, 44, 16); c.fill();
          c.fillStyle = `rgba(255,214,140,${lit})`;
          c.beginPath(); c.roundRect(x - 26, y - 15, 52, 30, 11); c.fill();
        }
      } else {
        const band = (y: number, h: number) => {
          if (a.markings === 'stripe') { c.fillStyle = accent; c.fillRect(0, y, 1024, h * 0.35); }
          if (a.markings === 'checker') for (let i = 0; i < 16; i++) for (let j = 0; j < 2; j++) { c.fillStyle = (i + j) % 2 ? '#17181b' : '#f4f3ee'; c.fillRect(i * 64, y + j * h * 0.5, 64, h * 0.5); }
          c.textAlign = 'center'; c.textBaseline = 'middle';
          for (const x of [256, 768]) {
            if (a.markings === 'stripe') { c.fillStyle = base === '#25282d' ? '#f4f3ee' : '#1b1d21'; c.font = 'bold 54px sans-serif'; c.fillText(name, x, y + h * 0.72, 380); }
            if (a.markings === 'numeral') { c.fillStyle = accent; c.font = 'bold 150px sans-serif'; c.fillText(String(1 + Math.floor(random() * 19)), x, y + h * 0.5); }
            if (a.markings === 'roundel') {
              c.fillStyle = '#f4f3ee'; c.beginPath(); c.arc(x, y + h * 0.5, 62, 0, 7); c.fill();
              c.fillStyle = accent; c.beginPath(); c.arc(x, y + h * 0.5, 50, 0, 7); c.fill();
              c.fillStyle = '#f4f3ee'; c.beginPath();
              for (let p = 0; p < 10; p++) { const r = p % 2 ? 14 : 36, t = (p / 10) * Math.PI * 2 - Math.PI / 2; c.lineTo(x + Math.cos(t) * r, y + h * 0.5 + Math.sin(t) * r); }
              c.fill();
            }
          }
        };
        band(40, 150);
      }
      // Sun fade, impact pits, soot.
      if (grime > 0.2) for (let i = 0; i < grime * 260; i++) {
        c.fillStyle = `rgba(${random() < 0.5 ? '40,36,30' : '120,110,95'},${0.15 + random() * 0.35})`;
        c.beginPath(); c.arc(random() * 1024, random() * 256, 1 + random() * 3.5, 0, 7); c.fill();
      }
      if (a.history === 'scorched') {
        const strength = part === 'cabin' ? 1 : 0.45;
        const char = c.createLinearGradient(0, 256, 0, 0);
        char.addColorStop(0, `rgba(18,12,8,${0.95 * strength})`); char.addColorStop(0.45, `rgba(70,38,16,${0.7 * strength})`); char.addColorStop(1, `rgba(90,60,30,${0.12 * strength})`);
        c.fillStyle = char; c.fillRect(0, 0, 1024, 256);
        for (let i = 0; i < 90; i++) {
          const x = random() * 1024, w = 4 + random() * 22, h = 60 + random() * 190;
          const streak = c.createLinearGradient(0, 256, 0, 256 - h);
          streak.addColorStop(0, `rgba(10,8,6,${0.8 * strength})`); streak.addColorStop(1, 'rgba(40,24,10,0)');
          c.fillStyle = streak; c.fillRect(x, 256 - h, w, h);
        }
      }
      if (a.history === 'patched') for (let i = 0; i < 7; i++) {
        c.save(); c.translate(random() * 1024, 40 + random() * 180); c.rotate((random() - 0.5) * 0.8);
        c.fillStyle = ['#d1a23a', '#b9bec4', '#e6e2d4'][Math.floor(random() * 3)]; c.fillRect(-36, -26, 72, 52);
        c.strokeStyle = '#6b6f76'; c.lineWidth = 5; c.strokeRect(-36, -26, 72, 52);
        c.restore();
      }
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = THREE.RepeatWrapping;
      return texture;
    };

    const craft = add(s.root, new THREE.Group());
    const hullPaint = new THREE.MeshStandardMaterial({ map: skin(spec.tint, 'cabin'), metalness: spec.metal, roughness: spec.metal > 0.4 ? 0.38 : 0.8 });
    const servicePaint = new THREE.MeshStandardMaterial({ map: skin(spec.smTint, 'service'), metalness: a.era === 'moonship' ? 0.6 : 0.1, roughness: a.era === 'moonship' ? 0.45 : 0.8, side: THREE.DoubleSide });
    const dark = s.material('#24272c', { roughness: 0.6, metalness: 0.3 });
    const metal = s.material('#c5c9cd', { metalness: 0.85, roughness: 0.3 });
    const white = s.material('#efede6', { roughness: 0.85 });

    // Map the paint by height, not by profile point, so bands and windows sit where they were drawn.
    const wrap = (mesh: THREE.Mesh) => {
      const { position, uv } = mesh.geometry.attributes;
      mesh.geometry.computeBoundingBox();
      const { min, max } = mesh.geometry.boundingBox!;
      for (let i = 0; i < uv.count; i++) uv.setY(i, (position.getY(i) - min.y) / (max.y - min.y));
      return mesh;
    };
    add(craft, wrap(s.lathe(spec.profile, hullPaint)));
    const smBottom = spec.sm[0][1];
    add(craft, wrap(s.lathe(spec.sm, servicePaint)));
    add(craft, s.cylinder(spec.profile[1][0] * 1.01, spec.profile[1][0] * 1.01, 0.08, [0, 0, 0], dark, 40));
    if (a.era === 'workhorse') {
      // The ball-shaped orbital module rides on top of the bell cabin.
      add(craft, s.ball([1.02, 1.0, 1.02], [0, 2.8, 0], new THREE.MeshStandardMaterial({ map: skin(spec.tint, 'service'), roughness: 0.85 }), 32));
      add(craft, s.cylinder(0.55, 0.62, 0.2, [0, 1.92, 0], dark, 24));
      add(craft, s.cylinder(0.5, 0.6, 0.15, [0, 3.8, 0], metal, 24));
    }
    if (a.era === 'taxi') {
      for (let i = 0; i < 4; i++) {
        const fin = add(craft, s.box([0.06, 1.7, 0.5], [Math.cos(i * Math.PI / 2 + 0.78) * 2.0, -1.05, Math.sin(i * Math.PI / 2 + 0.78) * 2.0], white));
        fin.rotation.y = -(i * Math.PI / 2 + 0.78) + Math.PI / 2;
      }
    }
    // Engine: a bell on the service module, or a ring of small ones under the taxi's trunk.
    const bellPaint = s.material(a.history === 'scorched' ? '#3a2c22' : '#5b5f66', { metalness: 0.7, roughness: 0.45, side: THREE.DoubleSide });
    if (spec.bell > 0) {
      add(craft, s.lathe([[spec.bell * 0.28, 0], [spec.bell * 0.45, -spec.bell * 0.5], [spec.bell * 0.8, -spec.bell * 1.0], [spec.bell, -spec.bell * 1.3]], bellPaint, [0, smBottom, 0]));
      add(craft, s.cylinder(spec.sm[0][0], spec.sm[0][0], 0.06, [0, smBottom + 0.02, 0], dark, 24));
    } else add(craft, s.cylinder(1.6, 1.6, 0.05, [0, smBottom + 0.3, 0], dark, 32));
    // Thruster quads round the service module.
    const smRadius = spec.sm[spec.sm.length - 1][0];
    const quadY = smBottom * 0.45;
    const puffs: THREE.Mesh[] = [];
    for (let i = 0; i < 4; i++) {
      const angle = i * Math.PI / 2 + Math.PI / 4;
      const quad = add(craft, new THREE.Group());
      quad.position.set(Math.cos(angle) * smRadius, quadY, Math.sin(angle) * smRadius);
      quad.rotation.y = -angle;
      add(quad, s.box([0.14, 0.3, 0.3], [0.05, 0, 0], white));
      for (const [y, z] of [[0.2, 0], [-0.2, 0], [0, 0.2], [0, -0.2]] as const) add(quad, s.cylinder(0.05, 0.03, 0.12, [0.12, y, z], dark, 8)).rotation.z = Math.PI / 2;
      if (a.docking === 'backing') {
        const puff = add(quad, s.mesh(new THREE.ConeGeometry(0.22, 0.9, 10, 1, true), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.4, depthWrite: false, side: THREE.DoubleSide }), [0.1, 0.62, 0]));
        puff.rotation.z = Math.PI;
        puff.castShadow = false;
        puffs.push(puff);
      }
    }
    // Whip antennas and a beacon.
    for (let i = 0; i < 2; i++) add(craft, s.rod([Math.cos(i * 3 + 1) * smRadius, smBottom * 0.8, Math.sin(i * 3 + 1) * smRadius], [Math.cos(i * 3 + 1) * (smRadius + 0.9), smBottom * 0.8 - 0.7, Math.sin(i * 3 + 1) * (smRadius + 0.9)], 0.015, metal));
    const beaconPaint = new THREE.MeshStandardMaterial({ color: '#ff5540', emissive: '#ff2a18', emissiveIntensity: 1.5 });
    add(craft, s.ball([0.07, 0.07, 0.07], [smRadius + 0.05, smBottom * 0.15, 0], beaconPaint, 10));
    if (a.era === 'moonship') {
      add(craft, s.rod([1.9, -3.2, 0.4], [3.0, -3.7, 0.9], 0.03, metal));
      for (const [dx, dz] of [[0.2, 0.2], [-0.2, 0.2], [0.2, -0.2], [-0.2, -0.2]] as const) add(craft, s.lathe([[0.02, 0], [0.16, 0.03], [0.22, 0.1]], white, [3.0 + dx, -3.7, 0.9 + dz]));
    }

    // Solar wings on booms either side of the service module.
    const cells = (() => {
      const canvas = document.createElement('canvas');
      canvas.width = 256; canvas.height = 128;
      const c = canvas.getContext('2d')!;
      c.fillStyle = '#16264f'; c.fillRect(0, 0, 256, 128);
      c.strokeStyle = '#7f95c9'; c.lineWidth = 1.5;
      for (let x = 0; x <= 256; x += 16) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, 128); c.stroke(); }
      for (let y = 0; y <= 128; y += 32) { c.beginPath(); c.moveTo(0, y); c.lineTo(256, y); c.stroke(); }
      c.strokeStyle = '#c9a23a'; c.lineWidth = 4; c.strokeRect(2, 2, 252, 124);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      return texture;
    })();
    const cellPaint = new THREE.MeshStandardMaterial({ map: cells, metalness: 0.35, roughness: 0.35, side: THREE.DoubleSide, emissive: '#1a3a9a', emissiveIntensity: 0.25 });
    const wingScale = Math.max(0.75, smRadius / 1.3);
    const wingY = smBottom * 0.55;
    [-1, 1].forEach((side, index) => {
      const mount = add(craft, new THREE.Group());
      mount.position.set(0, wingY, side * smRadius);
      mount.scale.setScalar(wingScale);
      const folded = a.wings === 'stuck' && index === 1;
      const torn = a.wings === 'torn' && index === 0;
      if (a.wings === 'fans') {
        add(mount, s.rod([0, 0, 0], [0, 0, side * 0.8], 0.04, metal));
        const fan = add(mount, s.cylinder(1.25, 1.25, 0.03, [0, 0, side * 2.05], cellPaint, 12));
        fan.rotation.z = Math.PI / 2;
        for (let r = 0; r < 6; r++) add(mount, s.rod([0.02, Math.cos(r * Math.PI / 6) * -1.25, side * 2.05 + Math.sin(r * Math.PI / 6) * -1.25], [0.02, Math.cos(r * Math.PI / 6) * 1.25, side * 2.05 + Math.sin(r * Math.PI / 6) * 1.25], 0.012, metal));
        return;
      }
      if (folded) {
        for (let p = 0; p < 4; p++) add(mount, s.box([0.05, 1.05, 0.85], [0.0, 0, side * (0.12 + p * 0.07)], p % 2 ? cellPaint : dark)).rotation.z = Math.PI / 2;
        add(mount, s.box([0.1, 0.1, 0.4], [0, 0, side * 0.2], accentPaint()));
        return;
      }
      add(mount, s.rod([0, 0, 0], [0, 0, side * 0.6], 0.04, metal));
      const panels = torn ? 2 : 4;
      for (let p = 0; p < 4; p++) {
        const panel = s.box([0.035, 1.05, 0.86], [0, 0, side * (1.05 + p * 0.9)], cellPaint);
        add(mount, panel);
        if (p >= panels) {
          // Broken panels hang off at wrong angles from a thread of wiring.
          panel.position.set(0.3 + random() * 0.5, -0.3 - random() * 0.6 - (p - panels) * 0.7, side * (1.05 + panels * 0.9 - 0.3 + random() * 0.5));
          panel.rotation.set(random() * 2, random() * 2, random() * 2);
          add(mount, s.rod([0, 0, side * (0.6 + panels * 0.9)], panel.position.toArray() as [number, number, number], 0.008, dark));
        }
      }
      add(mount, s.rod([0, 0, side * 0.6], [0, 0, side * (0.6 + panels * 0.9)], 0.02, metal));
    });
    function accentPaint() { return s.material(accent, { roughness: 0.7 }); }

    // The nose: probe, open hatch, or a ring of station port.
    const top = spec.top;
    const noseRadius = a.era === 'workhorse' ? 0.5 : spec.profile[spec.profile.length - 2][0];
    add(craft, s.cylinder(noseRadius * 1.05, noseRadius * 1.1, 0.14, [0, top + 0.04, 0], metal, 24));
    if (a.docking === 'probe' || a.docking === 'backing') {
      add(craft, s.rod([0, top, 0], [0, top + 0.75, 0], 0.07, metal, 0.045));
      add(craft, s.cylinder(0.02, 0.12, 0.22, [0, top + 0.86, 0], dark, 14));
      for (let i = 0; i < 3; i++) add(craft, s.rod([Math.cos(i * 2.09) * noseRadius * 0.8, top + 0.1, Math.sin(i * 2.09) * noseRadius * 0.8], [0, top + 0.5, 0], 0.02, metal));
    } else if (a.docking === 'hatch') {
      add(craft, s.cylinder(noseRadius * 0.8, noseRadius * 0.8, 0.05, [0, top + 0.12, 0], new THREE.MeshStandardMaterial({ color: '#ffe2a8', emissive: '#ffd27a', emissiveIntensity: mix(0.8, 2.2, mood.cheer) }), 24));
      const lid = add(craft, s.cylinder(noseRadius * 0.85, noseRadius * 0.85, 0.07, [noseRadius * 1.5, top + 0.55, 0], white, 24));
      lid.rotation.z = -1.1;
      add(craft, s.rod([noseRadius * 0.9, top + 0.1, 0], [noseRadius * 1.25, top + 0.3, 0], 0.03, metal));
    } else {
      const port = s.material('#d9d7cf', { roughness: 0.8 });
      add(craft, s.cylinder(noseRadius * 1.5, noseRadius * 1.5, 0.5, [0, top + 0.36, 0], port, 28));
      add(craft, s.cylinder(noseRadius * 1.9, noseRadius * 1.9, 0.12, [0, top + 0.66, 0], dark, 28));
      add(craft, s.cylinder(Math.max(1.3, noseRadius * 2.6), Math.max(1.3, noseRadius * 2.6), 0.5, [0, top + 0.97, 0], port, 32));
      for (let i = 0; i < 8; i++) add(craft, s.box([0.1, 0.2, 0.1], [Math.cos(i * 0.785) * noseRadius * 1.5, top + 0.2, Math.sin(i * 0.785) * noseRadius * 1.5], accentPaint()));
    }
    if (a.history === 'patched') {
      const strap = s.material('#d1a23a', { metalness: 0.7, roughness: 0.4 });
      const blanket = add(craft, s.box([0.9, 0.9, 0.06], [0, spec.profile[2][1] + 0.55, spec.profile[1][0] * 0.82], strap));
      blanket.rotation.x = -0.5;
      add(craft, s.ring(smRadius * 1.02, 0.03, [0, smBottom * 0.3, 0], s.material('#d8d2c0'))).rotation.x = Math.PI / 2;
    }
    // Loose frost and flecks: thick around a new arrival, sparse otherwise.
    const flecks = Math.round((a.history === 'fresh' ? 40 : 8) * mix(0.4, 1.4, mood.density));
    s.scatter(new THREE.OctahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#cfe6ff', emissiveIntensity: 0.5, roughness: 0.4 }),
      Array.from({ length: flecks }, () => ({ at: [(random() - 0.5) * 7, (random() - 0.5) * 3.2 + 1.2, (random() - 0.5) * 5] as [number, number, number], size: 0.02 + random() * 0.035 })));

    // Lay it over: nose forward and a little up, wings spread across the view.
    craft.rotation.set(0, 0.5 + (random() - 0.5) * 0.4, -1.12 + (random() - 0.5) * 0.25);
    const pace = mix(0.2, 1.5, mood.energy);
    const phase = random() * 6;
    return s.finish({
      update: (_dt, time) => {
        beaconPaint.emissiveIntensity = Math.sin(time * 2.2 * pace + phase) > 0.6 ? 2.6 : 0.15;
        for (const [index, puff] of puffs.entries()) puff.visible = Math.sin(time * 5 * pace + index * 1.7 + phase) > 0.2;
      },
    });
  },
});
