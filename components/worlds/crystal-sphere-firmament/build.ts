import * as THREE from 'three';
import { choice, defineWorld, diorama, figure, mix } from '@conjure/kit';
import { SIGNS, drawSign, drawStar, weave } from './zodiac';

const STYLES = {
  manuscript: 'An illuminated manuscript: parchment ground, lapis-blue and gold bands, clear crystal shells with gilt rims.',
  lapis: 'Ultramarine and gold: a deep blue ground, gold rings and lettering, shells tinted blue.',
  woodcut: 'A black-and-white woodcut from a printed cosmography: cream paper, black ink rims and lettering.',
  orrery: 'A baroque brass orrery: no glass at all, only polished brass rings and planet balls on a walnut base.',
} as const;
interface Palette { bg: string; bands: [string, string]; ink: string; gilt: string; glass: string; glassOpacity: number; firmament: string; star: string; earthSea: string; earthLand: string; metal: number }
const PALETTE: Record<keyof typeof STYLES, Palette> = {
  manuscript: { bg: '#e6d9b4', bands: ['#2d55a3', '#efe2c0'], ink: '#3a2a18', gilt: '#d4aa4e', glass: '#d6ebff', glassOpacity: 0.13, firmament: '#1f3c8c', star: '#f2cf6a', earthSea: '#3f78b8', earthLand: '#8a9a52', metal: 0.75 },
  lapis: { bg: '#3d5ba3', bands: ['#1f3a82', '#2b4c98'], ink: '#efd27a', gilt: '#e8c25a', glass: '#c9dcff', glassOpacity: 0.12, firmament: '#16296a', star: '#f6d77a', earthSea: '#2f62a8', earthLand: '#c9a24a', metal: 0.8 },
  woodcut: { bg: '#ece4d0', bands: ['#f4eddc', '#e2d8c0'], ink: '#1d1a17', gilt: '#1d1a17', glass: '#ffffff', glassOpacity: 0.1, firmament: '#3a3530', star: '#f4ecd8', earthSea: '#efe7d4', earthLand: '#d8ccb0', metal: 0 },
  orrery: { bg: '#8c7a63', bands: ['#4a3324', '#5a4030'], ink: '#e8c46a', gilt: '#c9a046', glass: '#ffffff', glassOpacity: 0, firmament: '#2a2a3a', star: '#f2d27a', earthSea: '#3a6a9a', earthLand: '#7a8a4a', metal: 0.85 },
};
type Body = 'moon' | 'mercury' | 'venus' | 'sun' | 'earth' | 'mars' | 'jupiter' | 'saturn' | 'stars' | 'crystal' | 'primum';
const NAMES: Record<Body, string> = {
  moon: 'LVNA', mercury: 'MERCVRIVS', venus: 'VENVS', sun: 'SOL', earth: 'TERRA', mars: 'MARS', jupiter: 'IVPITER', saturn: 'SATVRNVS',
  stars: 'FIRMAMENTVM', crystal: 'CAELVM CRISTALLINVM', primum: 'PRIMVM MOBILE',
};
const PAINT: Record<Body, [string, number]> = {
  moon: ['#e3e5e8', 0.6], mercury: ['#b4b8bd', 0.85], venus: ['#e9d2a0', 0.4], sun: ['#f0c04a', 0.8], earth: ['#4f86b8', 0.1],
  mars: ['#b8402a', 0.3], jupiter: ['#d9aa6a', 0.3], saturn: ['#8d8576', 0.5], stars: ['#ffffff', 0], crystal: ['#ffffff', 0], primum: ['#ffffff', 0],
};

export default defineWorld({
  questions: {
    style: choice('How is the cosmos made?', STYLES),
    spheres: choice('How many spheres nest round the centre?', {
      three: 'A plain teaching diagram: the Moon, the Sun and the fixed stars.',
      eight: 'The full Ptolemaic set: seven planets and the sphere of fixed stars.',
      ten: 'Ten spheres: the seven planets, the fixed stars, the crystalline heaven and the Primum Mobile.',
    }),
    centre: choice('What sits at the centre?', {
      earth: 'A small round Earth, as Ptolemy and the Church taught.',
      sun: 'The Sun, as Copernicus proposed, with the Earth moved out among the planets.',
      hell: 'The Earth split open at the top, the red glow of Hell inside it, as in Dante.',
    }),
    beyond: choice('What lies beyond the outermost sphere?', {
      primum: 'The Primum Mobile: a turning cage of gilt great circles that drives all the rest.',
      empyrean: 'The Empyrean: a ring of golden cloud and rays of heavenly light all round.',
      compass: 'A great gilt compass held down from the clouds, as if God were measuring the world.',
      nothing: 'Nothing: the spheres end and there is only the bare ground of the page.',
    }),
    lettering: choice('How is the floor of the cosmos marked?', {
      names: 'Each band lettered with the Latin name of its sphere.',
      zodiac: 'The twelve zodiac signs painted round the outer rim.',
      degrees: 'Degree ticks and numbers round the rim, like an astrolabe.',
      plain: 'Plain bands of colour only.',
    }),
    state: choice('What state is the machine in?', {
      perfect: 'Perfect and whole, every sphere turning in order.',
      cracked: 'One crystal sphere has cracked: a panel has broken away and shards lie on the floor.',
      pierced: 'A comet has torn straight through the spheres, leaving holes in every shell.',
      rebuilding: 'Astronomers are rebuilding it: scaffolding and a hoist at one shell, small figures at work.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const P = PALETTE[a.style];
    const orrery = a.style === 'orrery';
    const woodcut = a.style === 'woodcut';
    const helio = a.centre === 'sun';
    // The camera looks in from this side, and every shell is cut open toward it.
    const YAW = 30;
    const facing = (YAW * Math.PI) / 180;
    const WEDGE = 0.9;

    // ---- Which spheres, how big.
    let bodies: Body[] = a.spheres === 'three' ? ['moon', 'sun', 'stars'] : ['moon', 'mercury', 'venus', 'sun', 'mars', 'jupiter', 'saturn', 'stars'];
    if (a.spheres === 'ten') bodies = [...bodies, 'crystal', 'primum'];
    if (helio) bodies = a.spheres === 'three' ? ['venus', 'earth', 'stars'] : bodies.map((body) => (body === 'sun' ? 'earth' : body)).filter((body) => body !== 'moon');
    const ROUT = a.spheres === 'ten' ? 6.6 : 6;
    const R0 = 1.25;
    const radii = bodies.map((_, i) => R0 + ((ROUT - R0) * i) / Math.max(1, bodies.length - 1));
    const starIndex = bodies.indexOf('stars');

    // ---- The stage: hero and supports stand on the equatorial floor, inside the cut.
    const slot = (r: number, turn: number, size = 1) => [Math.sin(facing + turn) * r, Math.cos(facing + turn) * r, 0, size] as const;
    const { art: s, world } = diorama(context, {
      background: P.bg, floor: null, width: ROUT * 2, depth: ROUT * 2, yaw: YAW, pitch: 36, maxHeight: ROUT * 0.62, radius: ROUT * 0.33,
      slots: [slot(ROUT * 0.5, 0.32, 1.25), slot(ROUT * 0.56, -0.42, 0.85), slot(ROUT * 0.84, 0.55, 0.75), slot(ROUT * 0.82, -0.62, 0.75), slot(ROUT * 0.3, -0.05, 0.6)],
    });
    world.background = new THREE.Color(P.bg).lerp(new THREE.Color(mood.warmth > 0.5 ? '#f0c890' : '#a8b8e0'), Math.abs(mood.warmth - 0.5) * 0.12);
    const into = <T extends THREE.Object3D>(group: THREE.Object3D, child: T) => { group.add(child); return child; };
    const gilt = s.material(P.gilt, { metalness: P.metal, roughness: mix(0.28, 0.6, mood.wear) });
    const sheet = (w: number, h: number) => {
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      return [canvas, canvas.getContext('2d')!] as const;
    };
    const texture = (canvas: HTMLCanvasElement) => {
      const map = new THREE.CanvasTexture(canvas);
      map.colorSpace = THREE.SRGBColorSpace;
      map.anisotropy = 4;
      return map;
    };
    const motion: ((dt: number, time: number) => void)[] = [];
    /** A curved pane of a sphere of radius r, centred on the origin with its outer face toward -x. */
    const pane = (r: number, wide: number, tall: number) => {
      const geometry = new THREE.SphereGeometry(r, 12, 8, -wide / 2, wide, Math.PI / 2 - tall / 2, tall);
      geometry.translate(r, 0, 0);
      return geometry;
    };
    const pace = mix(0.02, 0.35, mood.energy);

    // ---- The floor: the equatorial plane painted as a cosmographer's diagram.
    const FR = ROUT + 0.25;
    const S = 2048, C = S / 2, px = C / FR;
    const [floorCanvas, fc] = sheet(S, S);
    fc.fillStyle = P.bg; fc.fillRect(0, 0, S, S);
    for (let i = bodies.length - 1; i >= 0; i--) {
      fc.fillStyle = P.bands[i % 2];
      fc.beginPath(); fc.arc(C, C, radii[i] * px + (i === bodies.length - 1 ? 0.25 * px : 0), 0, Math.PI * 2); fc.fill();
    }
    fc.fillStyle = woodcut ? '#f6f0e0' : orrery ? '#3a281c' : P.bands[1];
    fc.beginPath(); fc.arc(C, C, R0 * 0.62 * px, 0, Math.PI * 2); fc.fill();
    if (woodcut) {
      // Engraved hatching on every other band, so the rings read in black and white.
      for (let i = 1; i < bodies.length; i += 2) {
        fc.save();
        fc.beginPath(); fc.arc(C, C, radii[i] * px, 0, Math.PI * 2); fc.arc(C, C, radii[i - 1] * px, 0, Math.PI * 2, true); fc.clip();
        fc.strokeStyle = P.ink; fc.globalAlpha = 0.55; fc.lineWidth = 2.2;
        for (let k = -S; k < S; k += 11) { fc.beginPath(); fc.moveTo(k, S); fc.lineTo(k + S, 0); fc.stroke(); }
        fc.restore();
      }
    }
    fc.strokeStyle = P.gilt === '#1d1a17' ? P.ink : P.gilt; fc.lineWidth = 6;
    for (const r of radii) { fc.beginPath(); fc.arc(C, C, r * px, 0, Math.PI * 2); fc.stroke(); }
    fc.lineWidth = 12; fc.beginPath(); fc.arc(C, C, FR * px - 8, 0, Math.PI * 2); fc.stroke();
    // Lettering round the back of each band, upright to the viewer.
    // The cylinder cap maps world z to canvas x and world x to canvas -y, so a world azimuth a is canvas angle -a.
    const backAngle = -(facing + Math.PI);
    const arcText = (text: string, r: number, size: number, colour: string, backing: string) => {
      fc.save();
      fc.fillStyle = colour; fc.font = `bold ${size}px serif`; fc.textAlign = 'center'; fc.textBaseline = 'middle';
      fc.strokeStyle = backing; fc.lineWidth = size * 0.22; fc.lineJoin = 'round';
      const spacing = (size * 0.78) / r;
      const start = backAngle - (spacing * (text.length - 1)) / 2;
      [...text].forEach((ch, i) => {
        const t = start + i * spacing;
        fc.save(); fc.translate(C + Math.cos(t) * r, C + Math.sin(t) * r); fc.rotate(t + Math.PI / 2); if (woodcut) fc.strokeText(ch, 0, 0); fc.fillText(ch, 0, 0); fc.restore();
      });
      fc.restore();
    };
    const letterInk = woodcut ? P.ink : a.style === 'lapis' ? '#f2d27a' : orrery ? '#e8c46a' : '#f3e6c4';
    if (a.lettering === 'names') bodies.forEach((body, i) => {
      const inner = i ? radii[i - 1] : R0 * 0.62, r = ((inner + radii[i]) / 2) * px;
      arcText(NAMES[body], r, Math.min(64, (radii[i] - inner) * px * 0.5), i % 2 && !orrery && !woodcut && a.style !== 'lapis' ? P.ink : letterInk, P.bands[0]);
    });
    if (a.lettering === 'zodiac' || a.lettering === 'degrees') {
      const outer = FR * px - 14, inner = (radii.at(-1)! - 0.05) * px;
      fc.fillStyle = woodcut ? '#f6f0e0' : a.style === 'manuscript' ? '#1f3c8c' : P.bands[0];
      fc.beginPath(); fc.arc(C, C, outer, 0, Math.PI * 2); fc.arc(C, C, inner - 70, 0, Math.PI * 2, true); fc.fill();
      fc.strokeStyle = letterInk; fc.lineWidth = 3;
      for (const r of [outer, inner - 70]) { fc.beginPath(); fc.arc(C, C, r, 0, Math.PI * 2); fc.stroke(); }
      if (a.lettering === 'zodiac') SIGNS.forEach((sign, i) => {
        const t = (i / 12) * Math.PI * 2 + backAngle, r = outer - 36;
        fc.save(); fc.translate(C + Math.cos(t) * r, C + Math.sin(t) * r); fc.rotate(t + Math.PI / 2); fc.scale(0.5, 0.5);
        fc.strokeStyle = letterInk; fc.lineWidth = 9; drawSign(fc, sign); fc.restore();
        const d = t + Math.PI / 12;
        fc.beginPath(); fc.moveTo(C + Math.cos(d) * outer, C + Math.sin(d) * outer); fc.lineTo(C + Math.cos(d) * (inner - 70), C + Math.sin(d) * (inner - 70)); fc.stroke();
      });
      else for (let k = 0; k < 360; k += 5) {
        const t = (k / 360) * Math.PI * 2;
        const len = k % 30 === 0 ? 40 : k % 10 === 0 ? 24 : 12;
        fc.beginPath(); fc.moveTo(C + Math.cos(t) * outer, C + Math.sin(t) * outer); fc.lineTo(C + Math.cos(t) * (outer - len), C + Math.sin(t) * (outer - len)); fc.stroke();
        if (k % 30 === 0) {
          fc.save(); fc.fillStyle = letterInk; fc.font = 'bold 26px serif'; fc.textAlign = 'center'; fc.textBaseline = 'middle';
          fc.translate(C + Math.cos(t) * (outer - 56), C + Math.sin(t) * (outer - 56)); fc.rotate(t + Math.PI / 2); fc.fillText(String(k), 0, 0); fc.restore();
        }
      }
    }
    if (!woodcut) weave(fc, S, S, random, '#000000', 260);
    if (mood.wear > 0.55) {
      // Flaked paint on an old page.
      fc.fillStyle = P.bg;
      for (let i = 0; i < (mood.wear - 0.55) * 300; i++) { fc.globalAlpha = 0.5; fc.beginPath(); fc.arc(random() * S, random() * S, 4 + random() * 14, 0, Math.PI * 2); fc.fill(); }
      fc.globalAlpha = 1;
    }
    const floorTop = new THREE.MeshStandardMaterial({ map: texture(floorCanvas), roughness: orrery ? 0.45 : 0.85, metalness: orrery ? 0.1 : 0 });
    const floorSide = s.material(orrery ? '#3a281c' : P.gilt, { metalness: orrery ? 0.1 : P.metal * 0.6, roughness: 0.5 });
    const floor = new THREE.Mesh(new THREE.CylinderGeometry(FR, FR, 0.14, 128), [floorSide, floorTop, floorSide]);
    floor.position.y = -0.07;
    floor.receiveShadow = true;
    s.root.add(floor);
    world.ground = floor;

    // ---- The shells: the upper half of each is cut open toward the viewer, the lower half whole under the floor.
    const glass = (tint: string, opacity: number, side: THREE.Side = THREE.DoubleSide) => new THREE.MeshStandardMaterial({
      color: new THREE.Color(tint).lerp(new THREE.Color(mood.warmth > 0.5 ? '#ffd9a0' : '#bcd4ff'), Math.abs(mood.warmth - 0.5) * 0.4),
      transparent: true, opacity, depthWrite: false, side, roughness: 0.12, metalness: 0.1,
    });
    const phiStart = facing + WEDGE + Math.PI / 2, phiLength = Math.PI * 2 - WEDGE * 2;
    const meridian = (r: number, azimuth: number, tube: number, material: THREE.Material) => {
      const arc = s.mesh(new THREE.TorusGeometry(r, tube, 6, 48, Math.PI / 2), material);
      arc.rotation.y = azimuth - Math.PI / 2;
      return arc;
    };
    const crackedIndex = a.state === 'cracked' ? Math.min(bodies.length - 2, Math.max(1, Math.floor(bodies.length / 2))) : -1;
    const workIndex = a.state === 'rebuilding' ? Math.max(1, Math.floor(bodies.length / 2) - 1) : -1;
    // A cracked shell loses a panel on the far right wall, where the viewer looks straight at its inside.
    const missing = a.state === 'cracked' ? 0.8 : 0.5, missingAt = a.state === 'cracked' ? facing + Math.PI / 2 + 0.75 : facing + Math.PI + 0.7;
    const [starCanvas, sc] = sheet(1024, 512);
    const [starGlowCanvas, sg] = sheet(1024, 512);
    sc.fillStyle = P.firmament; sc.fillRect(0, 0, 1024, 512);
    sg.fillStyle = '#000000'; sg.fillRect(0, 0, 1024, 512);
    const starCount = Math.round(mix(260, 520, mood.density));
    for (let i = 0; i < starCount; i++) {
      const x = random() * 1024, y = Math.acos(1 - 2 * random()) / Math.PI * 512, r = 2.5 + random() * 3.5;
      sc.fillStyle = P.star; drawStar(sc, x, y, r * 1.4);
      sg.fillStyle = P.star; drawStar(sg, x, y, r * 1.4);
    }
    bodies.forEach((body, i) => {
      const r = radii[i];
      const isStars = body === 'stars';
      const outer = i >= starIndex;
      if (!orrery) {
        // Inner shells show only their far walls (from inside), which is what reads; the firmament shows both faces.
        const material = isStars
          ? new THREE.MeshStandardMaterial({ map: texture(starCanvas), emissive: '#ffffff', emissiveMap: texture(starGlowCanvas), emissiveIntensity: mix(0.4, 1.1, mood.cheer), transparent: true, opacity: woodcut ? 0.55 : 0.5, depthWrite: false, side: THREE.DoubleSide, roughness: 0.6 })
          : i === crackedIndex ? glass('#e4f0ff', 0.3, THREE.BackSide)
          : glass(outer ? '#ffe9b0' : P.glass, P.glassOpacity * (outer ? 0.8 : 1.5), THREE.BackSide);
        // Cut a panel out of a cracked or half-rebuilt shell.
        const broken = i === crackedIndex || i === workIndex;
        const pm = missingAt + Math.PI / 2;
        const ranges: [number, number][] = broken
          ? [[phiStart, pm - missing / 2 - phiStart], [pm + missing / 2, phiStart + phiLength - pm - missing / 2]]
          : [[phiStart, phiLength]];
        for (const [start, length] of ranges) {
          const upper = s.mesh(new THREE.SphereGeometry(r, 56, 14, start, length, 0, Math.PI / 2), material);
          upper.castShadow = false;
          upper.renderOrder = 10 - i;
        }
        if (outer) {
          const lower = s.mesh(new THREE.SphereGeometry(r, 56, 14, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), material);
          lower.castShadow = false;
          lower.renderOrder = 10 - i;
        }
        const tube = isStars ? 0.07 : 0.04;
        meridian(r, facing - WEDGE, tube, gilt);
        meridian(r, facing + WEDGE, tube, gilt);
      } else {
        // The orrery: a brass hoop at the equator and a half-hoop over the back for every sphere.
        const hoop = s.mesh(new THREE.TorusGeometry(r, isStars ? 0.08 : 0.045, 8, 128), gilt);
        hoop.rotation.x = Math.PI / 2;
        hoop.position.y = 0.04;
        const arch = s.mesh(new THREE.TorusGeometry(r, isStars ? 0.06 : 0.035, 6, 96, Math.PI), gilt);
        arch.rotation.y = facing + Math.PI / 2 + (i % 2 ? 0.5 : -0.5);
        if (isStars) {
          const studs: { at: readonly [number, number, number]; size: number }[] = [];
          for (let k = 0; k < 60; k++) {
            const t = random() * Math.PI;
            const local = new THREE.Vector3(Math.cos(t) * r, Math.sin(t) * r, 0).applyEuler(arch.rotation);
            studs.push({ at: local.toArray() as [number, number, number], size: 0.07 + random() * 0.05 });
          }
          s.scatter(new THREE.OctahedronGeometry(1), s.material(P.star, { emissive: P.star, emissiveIntensity: 0.6 }), studs);
        }
      }
      // The planet riding its sphere, round the back where the cast will not cover it.
      if (body in PAINT && !isStars && body !== 'crystal' && body !== 'primum') {
        const [colour, metal] = PAINT[body];
        const size = body === 'sun' ? 0.5 : body === 'earth' ? 0.32 : body === 'jupiter' ? 0.36 : body === 'saturn' ? 0.32 : 0.24;
        const azimuth = facing + Math.PI + (i % 2 ? 1 : -1) * (0.35 + i * 0.13);
        const at = new THREE.Vector3(Math.sin(azimuth) * r, size + 0.05, Math.cos(azimuth) * r);
        const planet = new THREE.Group();
        planet.position.copy(at);
        s.root.add(planet);
        const material = woodcut ? s.material('#f4eddc', { roughness: 0.8 }) : s.material(colour, { metalness: orrery ? 0.85 : metal * 0.6, roughness: 0.35, emissive: body === 'sun' ? '#ffb030' : '#000000', emissiveIntensity: body === 'sun' ? mix(0.5, 1.3, mood.cheer) : 0 });
        into(planet, s.ball([size, size, size], [0, 0, 0], material, 24));
        if (woodcut) into(planet, s.ring(size * 1.02, 0.015, [0, 0, 0], gilt)).rotation.y = facing;
        if (body === 'sun') {
          const rays = new THREE.InstancedMesh(new THREE.ConeGeometry(0.07, 0.3, 5), material, 14);
          const m = new THREE.Matrix4(), q = new THREE.Quaternion();
          for (let k = 0; k < 14; k++) {
            const t = (k / 14) * Math.PI * 2;
            q.setFromAxisAngle(new THREE.Vector3(0, 0, 1), t - Math.PI / 2);
            m.compose(new THREE.Vector3(Math.cos(t) * (size + 0.14), Math.sin(t) * (size + 0.14), 0), q, new THREE.Vector3(1, 1, 1));
            rays.setMatrixAt(k, m);
          }
          rays.rotation.y = facing;
          planet.add(rays);
          motion.push((dt) => { rays.rotation.z += dt * pace; });
        }
        if (body === 'earth') {
          const moon = into(planet, s.ball([0.1, 0.1, 0.1], [size + 0.25, 0.1, 0], s.material('#dfe2e6', { metalness: 0.5 }), 12));
          void moon;
        }
        if (orrery) s.rod([0, 0.08, 0], [at.x, 0.08, at.z], 0.025, gilt);
        else s.cylinder(0.03, 0.05, 0.06, [at.x, 0.03, at.z], gilt, 10);
        const bob = random() * Math.PI * 2;
        motion.push((_, time) => { planet.position.y = at.y + Math.sin(time * pace * 4 + bob) * 0.04; });
      }
    });

    // ---- The zodiac band round the firmament, tilted like the ecliptic and cut open like the rest.
    if (starIndex >= 0) {
      const r = radii[starIndex] + 0.04;
      const [zc, zx] = sheet(2048, 160);
      zx.fillStyle = woodcut ? '#f4eddc' : a.style === 'orrery' ? '#b8893a' : '#1f3c8c'; zx.fillRect(0, 0, 2048, 160);
      zx.strokeStyle = woodcut ? P.ink : '#e8c15a'; zx.lineWidth = 8; zx.strokeRect(4, 4, 2040, 152);
      SIGNS.forEach((sign, i) => {
        const x = ((i + 0.5) / 12) * 2048;
        zx.save(); zx.translate(x, 80); zx.scale(1.05, 1.05);
        zx.strokeStyle = woodcut ? P.ink : orrery ? '#3a2410' : '#f2d27a'; zx.lineWidth = 9; drawSign(zx, sign); zx.restore();
        zx.beginPath(); zx.moveTo((i / 12) * 2048, 0); zx.lineTo((i / 12) * 2048, 160); zx.stroke();
      });
      const gap = WEDGE * 0.85;
      const band = s.mesh(new THREE.CylinderGeometry(r, r, 0.62, 128, 1, true, facing + gap, Math.PI * 2 - gap * 2), new THREE.MeshStandardMaterial({ map: texture(zc), side: THREE.DoubleSide, roughness: 0.6, metalness: orrery ? 0.6 : 0 }));
      band.castShadow = false;
      const tilt = new THREE.Group();
      tilt.position.y = 0.05;
      s.root.add(tilt);
      tilt.add(band);
      tilt.quaternion.setFromAxisAngle(new THREE.Vector3(Math.sin(facing), 0, Math.cos(facing)), -0.41);
    }

    // ---- The centre: Earth, Sun, or the Earth opened on Hell.
    const centre = new THREE.Group();
    s.root.add(centre);
    if (helio) {
      const size = 0.72;
      const sun = s.material(woodcut ? '#f4eddc' : '#f2c04a', { emissive: woodcut ? '#000000' : '#ffb030', emissiveIntensity: mix(0.6, 1.4, mood.cheer), metalness: 0.3, roughness: 0.4 });
      into(centre, s.ball([size, size, size], [0, size + 0.05, 0], sun, 28));
      const rays = new THREE.InstancedMesh(new THREE.ConeGeometry(0.1, 0.42, 5), sun, 18);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion();
      for (let k = 0; k < 18; k++) {
        const t = (k / 18) * Math.PI * 2;
        q.setFromAxisAngle(new THREE.Vector3(0, 0, 1), t - Math.PI / 2);
        m.compose(new THREE.Vector3(Math.cos(t) * (size + 0.2), Math.sin(t) * (size + 0.2), 0), q, new THREE.Vector3(1, 1, 1));
        rays.setMatrixAt(k, m);
      }
      rays.position.y = size + 0.05;
      rays.rotation.y = facing;
      centre.add(rays);
      motion.push((dt) => { rays.rotation.z -= dt * pace; });
    } else {
      const size = 0.62;
      const [ec, ex] = sheet(1024, 512);
      ex.fillStyle = P.earthSea; ex.fillRect(0, 0, 1024, 512);
      ex.fillStyle = P.earthLand;
      for (let k = 0; k < 7; k++) {
        const cx = random() * 1024, cy = 120 + random() * 280, n = 9;
        ex.beginPath();
        for (let j = 0; j <= n; j++) { const t = (j / n) * Math.PI * 2, rr = 60 + random() * 70; ex.lineTo(cx + Math.cos(t) * rr * 1.4, cy + Math.sin(t) * rr); }
        ex.fill();
      }
      if (woodcut) { ex.strokeStyle = P.ink; ex.lineWidth = 3; for (let y = 6; y < 512; y += 14) { ex.beginPath(); ex.moveTo(0, y); ex.lineTo(1024, y); ex.stroke(); } }
      const globe = new THREE.Group();
      globe.position.y = size + 0.08;
      centre.add(globe);
      const open = a.centre === 'hell' ? 0.75 : 0;
      into(globe, s.mesh(new THREE.SphereGeometry(size, 40, 24, 0, Math.PI * 2, open, Math.PI - open), new THREE.MeshStandardMaterial({ map: texture(ec), roughness: 0.7, side: THREE.DoubleSide })));
      motion.push((dt) => { globe.rotation.y += dt * pace * 0.8; });
      if (a.centre === 'hell') {
        // The pit opened at the top: a glowing red floor with tongues of fire.
        const fire = s.material('#ff4a1a', { emissive: '#ff3010', emissiveIntensity: mix(1.6, 0.9, mood.cheer), roughness: 0.6 });
        const lip = size * Math.cos(open), mouth = size * Math.sin(open);
        const pit = into(globe, s.mesh(new THREE.CircleGeometry(mouth, 32), fire, [0, lip - 0.12, 0]));
        pit.rotation.x = -Math.PI / 2;
        const flames = new THREE.InstancedMesh(new THREE.ConeGeometry(0.05, 0.24, 6), fire, 12);
        const m = new THREE.Matrix4();
        for (let k = 0; k < 12; k++) {
          const t = (k / 12) * Math.PI * 2, rr = mouth * (0.25 + random() * 0.55), h = 0.6 + random() * 0.8;
          m.makeScale(1, h, 1).setPosition(Math.cos(t) * rr, lip - 0.12 + 0.12 * h, Math.sin(t) * rr);
          flames.setMatrixAt(k, m);
        }
        globe.add(flames);
        const rim = into(globe, s.ring(mouth, 0.035, [0, lip, 0], s.material('#2a1a14')));
        rim.rotation.x = Math.PI / 2;
      }
    }
    s.cylinder(0.32, 0.42, 0.08, [0, 0.04, 0], gilt, 24);

    // ---- Beyond the outermost sphere.
    const RB = ROUT + 0.55;
    if (a.beyond === 'primum') {
      const cage = new THREE.Group();
      s.root.add(cage);
      const wire = s.material(P.gilt, { metalness: P.metal, roughness: 0.35 });
      for (let k = 0; k < 4; k++) {
        const hoop = into(cage, s.mesh(new THREE.TorusGeometry(RB, 0.05, 6, 160, Math.PI), wire));
        hoop.rotation.y = facing + Math.PI / 2 + 0.55 + k * 0.62;
      }
      const equator = into(cage, s.mesh(new THREE.TorusGeometry(RB, 0.06, 6, 160), wire));
      equator.rotation.x = Math.PI / 2;
      motion.push((dt) => { cage.rotation.y += dt * pace * 0.6; });
    } else if (a.beyond === 'empyrean') {
      const puffs: { at: readonly [number, number, number]; size: number }[] = [];
      for (let k = 0; k < 90; k++) {
        const t = random() * Math.PI * 2, rr = RB + random() * 0.9, size = 0.22 + random() * 0.3;
        puffs.push({ at: [Math.sin(t) * rr, size * 0.5 + random() * 0.3 - 0.2, Math.cos(t) * rr], size });
      }
      s.scatter(new THREE.IcosahedronGeometry(1, 2), s.material(woodcut ? '#f6f0e0' : '#fff1c8', { roughness: 0.9, emissive: woodcut ? '#000000' : '#ffc860', emissiveIntensity: woodcut ? 0 : 0.35 * mix(0.6, 1.3, mood.cheer) }), puffs);
      const rays = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.04, 0.12), s.material(woodcut ? P.ink : '#e8b84a', { metalness: woodcut ? 0 : 0.8, roughness: 0.35, emissive: woodcut ? '#000000' : '#a06010', emissiveIntensity: 0.4 }), 48);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion();
      for (let k = 0; k < 48; k++) {
        const t = (k / 48) * Math.PI * 2, length = k % 2 ? 1.2 : 2.1;
        q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), t - Math.PI / 2);
        m.compose(new THREE.Vector3(Math.sin(t) * (RB + 0.6 + length / 2), 0.02, Math.cos(t) * (RB + 0.6 + length / 2)), q, new THREE.Vector3(length, 1, 1));
        rays.setMatrixAt(k, m);
      }
      rays.castShadow = false;
      s.root.add(rays);
    } else if (a.beyond === 'compass') {
      const hinge = new THREE.Vector3(Math.sin(facing + Math.PI + 0.5) * ROUT * 0.55, ROUT * 1.55, Math.cos(facing + Math.PI + 0.5) * ROUT * 0.55);
      const feet = [0.75, -0.95].map((t) => new THREE.Vector3(Math.sin(facing + Math.PI + t) * ROUT * 0.72, ROUT * 0.62, Math.cos(facing + Math.PI + t) * ROUT * 0.72));
      for (const foot of feet) s.rod(hinge.toArray() as [number, number, number], foot.toArray() as [number, number, number], 0.16, gilt, 0.03);
      s.ball([0.3, 0.3, 0.3], hinge.toArray() as [number, number, number], gilt, 18);
      const puffs: { at: readonly [number, number, number]; size: number }[] = [];
      for (let k = 0; k < 18; k++) puffs.push({ at: [hinge.x + (random() - 0.5) * 2.4, hinge.y + 0.3 + random() * 0.8, hinge.z + (random() - 0.5) * 1.2], size: 0.35 + random() * 0.35 });
      s.scatter(new THREE.IcosahedronGeometry(1, 2), s.material(woodcut ? '#f6f0e0' : '#f4efe4', { roughness: 0.95 }), puffs);
      const sleeve = s.material(woodcut ? '#3a3430' : '#a8302a', { roughness: 0.7 });
      s.rod([hinge.x - 0.2, hinge.y + 1.1, hinge.z], [hinge.x, hinge.y + 0.3, hinge.z], 0.22, sleeve, 0.18);
      s.ball([0.24, 0.2, 0.22], [hinge.x, hinge.y + 0.22, hinge.z + 0.05], s.material(woodcut ? '#efe4cc' : '#e2b48e'), 14);
    }

    // ---- The state of the machine.
    if (a.state === 'cracked' && !orrery) {
      const r = radii[crackedIndex];
      const shards: { at: readonly [number, number, number]; size: number }[] = [];
      for (let k = 0; k < 26; k++) {
        const t = missingAt + (random() - 0.5) * 0.9, rr = r + (random() - 0.5) * 0.9;
        shards.push({ at: [Math.sin(t) * rr, 0.04, Math.cos(t) * rr], size: 0.08 + random() * 0.14 });
      }
      const shard = new THREE.TetrahedronGeometry(1);
      shard.scale(1, 0.2, 1);
      s.scatter(shard, s.material('#dff0ff', { roughness: 0.1, metalness: 0.2 }), shards);
      // The broken panel lies on the floor at the edge of the cut, tipped over, and cracks run out from the gap.
      const fallenAt = facing + WEDGE - 0.2;
      const fallen = s.mesh(pane(r, missing * 0.75, 0.45), glass('#e8f4ff', 0.55), [Math.sin(fallenAt) * r * 0.92, r * 0.12 + 0.05, Math.cos(fallenAt) * r * 0.92]);
      fallen.rotation.set(0, fallenAt + 0.4, -Math.PI / 2 + 0.3);
      fallen.castShadow = false;
      const crackPaint = s.material(woodcut ? P.ink : '#1a1e2c', { roughness: 0.6 });
      for (let k = 0; k < 6; k++) {
        let az = missingAt + (k % 2 ? 1 : -1) * missing / 2, el = 0.15 + random() * 1.1;
        const pts: [number, number, number][] = [];
        for (let j = 0; j < 7; j++) {
          pts.push([Math.cos(el) * Math.sin(az) * r * 0.995, Math.sin(el) * r * 0.995, Math.cos(el) * Math.cos(az) * r * 0.995]);
          az += (k % 2 ? 1 : -1) * (0.05 + random() * 0.08);
          el = Math.min(1.45, Math.max(0.05, el + (random() - 0.5) * 0.3));
        }
        s.tube(pts, 0.045, crackPaint);
      }
      for (let k = 0; k < 16; k++) {
        const t = fallenAt + (random() - 0.5) * 0.5, rr = r + (random() - 0.5) * 1.4;
        shards.push({ at: [Math.sin(t) * rr, 0.04, Math.cos(t) * rr], size: 0.08 + random() * 0.12 });
      }
      s.scatter(shard, s.material('#dff0ff', { roughness: 0.1, metalness: 0.2 }), shards.slice(26));
    }
    if (a.state === 'pierced') {
      // The comet of 1577: its head inside, its tail out through every shell, a ragged hole at each crossing.
      const head = new THREE.Vector3(Math.sin(facing + 0.9) * 2.2, 2.3, Math.cos(facing + 0.9) * 2.2);
      const dir = new THREE.Vector3(Math.sin(facing + Math.PI - 0.6), 0.55, Math.cos(facing + Math.PI - 0.6)).normalize();
      const fire = s.material(woodcut ? '#1d1a17' : '#ffcf6a', { emissive: woodcut ? '#000000' : '#ff9a30', emissiveIntensity: 1.3, roughness: 0.4 });
      s.ball([0.32, 0.32, 0.32], head.toArray() as [number, number, number], fire, 18);
      const tailLength = ROUT * 1.6;
      const tail = new THREE.Mesh(new THREE.ConeGeometry(0.9, tailLength, 24, 1, true), new THREE.MeshStandardMaterial({ color: woodcut ? '#3a3430' : '#ffd890', emissive: woodcut ? '#000000' : '#ffa040', emissiveIntensity: 0.6, transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide }));
      tail.position.copy(head).addScaledVector(dir, tailLength / 2);
      tail.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir);
      s.root.add(tail);
      for (let k = 0; k < 7; k++) {
        const off = new THREE.Vector3((random() - 0.5) * 0.5, (random() - 0.5) * 0.5, (random() - 0.5) * 0.5);
        s.rod(head.toArray() as [number, number, number], head.clone().addScaledVector(dir, tailLength * (0.6 + random() * 0.4)).add(off.multiplyScalar(4)).toArray() as [number, number, number], 0.03, fire, 0.005);
      }
      for (const r of radii) {
        // Solve |head + dir t| = r for the crossing outward.
        const b = head.dot(dir), c = head.lengthSq() - r * r, t = -b + Math.sqrt(Math.max(0, b * b - c));
        if (t <= 0 || t > tailLength) continue;
        const p = head.clone().addScaledVector(dir, t);
        if (p.y < 0.2) continue;
        const hole = s.ring(0.42, 0.06, p.toArray() as [number, number, number], s.material(woodcut ? P.ink : '#3a2a20', { roughness: 0.8 }));
        hole.lookAt(p.clone().multiplyScalar(2));
      }
    }
    const people: ReturnType<typeof figure>[] = [];
    if (a.state === 'rebuilding') {
      const r = radii[workIndex];
      const wood = s.material(woodcut ? '#3a3430' : '#7a5636', { roughness: 0.8 });
      const at = (t: number, rr: number, y: number) => [Math.sin(t) * rr, y, Math.cos(t) * rr] as [number, number, number];
      const H = Math.min(2.6, r * 0.75);
      for (const dt of [-0.22, 0.22]) for (const dr of [-0.35, 0.35]) s.rod(at(missingAt + dt, r + dr, 0), at(missingAt + dt, r + dr, H), 0.04, wood);
      for (const y of [H * 0.45, H * 0.9]) {
        const plank = s.box([1.6, 0.05, 0.75], at(missingAt, r, y), wood);
        plank.rotation.y = missingAt;
      }
      // A hoist lifting a new curved pane into the gap.
      const boom = at(missingAt, r * 0.7, H + 0.9);
      s.rod(at(missingAt, r * 0.7, 0), boom, 0.05, wood);
      s.rod(boom, at(missingAt, r * 1.0, H + 0.9), 0.04, wood);
      const paneY = H * 0.7, tall = 0.42;
      const lifted = s.mesh(pane(r, missing * 0.85, tall), glass('#e8f4ff', 0.45), [Math.sin(missingAt) * r * 0.97, paneY, Math.cos(missingAt) * r * 0.97]);
      lifted.rotation.y = missingAt + Math.PI / 2;
      lifted.castShadow = false;
      s.rod(at(missingAt, r * 1.0, H + 0.9), at(missingAt, r * 0.97, paneY + r * Math.sin(tall / 2)), 0.014, s.material('#c8b48a'));
      const coats = woodcut ? ['#3a3430', '#5a544c', '#2a2622'] : ['#3f5f8a', '#8a3a2a', '#4a6a3a'];
      for (let k = 0; k < 3; k++) {
        const pose = (['pointing', 'carrying', 'reaching'] as const)[k];
        const person = figure(s, { height: 0.75, pose, style: 'doll', hair: k === 1 ? 'hood' : 'hat', gaze: 'up', top: coats[k], bottom: coats[(k + 1) % 3], skin: woodcut ? '#efe4cc' : '#d9b08c' });
        const t = missingAt + (k - 1) * 0.3, rr = r - 0.9 - k * 0.2;
        person.root.position.set(Math.sin(t) * rr, 0, Math.cos(t) * rr);
        person.root.rotation.y = t;
        s.root.add(person.root);
        if (k === 1) person.hands.left.add(s.ring(0.12, 0.012, [0, -0.05, 0.08], gilt));
        people.push(person);
      }
    }

    world.update = (dt, time) => {
      for (const step of motion) step(dt, time);
      for (const person of people) person.update(dt, time);
    };
    return world;
  },
});
