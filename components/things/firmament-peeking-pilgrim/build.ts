import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix } from '@conjure/kit';
import { drawCrack, drawFace, drawStar, hatch } from './paint';

const STYLES = {
  coloured: 'The hand-coloured print: an ultramarine sky shell with gilt stars, green earth, warm robes.',
  woodcut: 'The original black-and-white engraving: cream paper, black ink stars and hatching, grey robes.',
  dusk: 'Violet and rose: a dusk-coloured shell with amber stars, like a later painted copy.',
} as const;
interface Palette { sky: string; star: string; outer: string; grass: string; soil: string; gilt: string; cloud: string; ink: string; skin: string }
const PALETTE: Record<keyof typeof STYLES, Palette> = {
  coloured: { sky: '#1f3c8c', star: '#f0cf6a', outer: '#b9c6e2', grass: '#7f9a4c', soil: '#7a5a3a', gilt: '#d4aa4e', cloud: '#f5f2ea', ink: '#2a2622', skin: '#e2b896' },
  woodcut: { sky: '#34302b', star: '#f4ecd8', outer: '#e2d8c0', grass: '#ece4cf', soil: '#cfc3a6', gilt: '#2a2622', cloud: '#f7f3e8', ink: '#1d1a17', skin: '#efe4cc' },
  dusk: { sky: '#3d2b62', star: '#ffc978', outer: '#d9b2c2', grass: '#5d6e48', soil: '#5a4234', gilt: '#e3ab62', cloud: '#f3dfe0', ink: '#2a2030', skin: '#dcae90' },
};
const PILGRIMS = {
  palmer: 'A palmer in a brown travelling cloak and broad-brimmed hat with a scallop badge, a staff with a gourd.',
  monk: 'A monk in a black hooded habit with a plain staff.',
  scholar: 'A scholar in a scarlet gown and black cap, his book dropped beside him.',
  child: 'A small child in a blue tunic with a stick, smaller than the hole they made.',
} as const;
const ROBES: Record<keyof typeof PILGRIMS, { top: string; bottom: string; hair: 'hat' | 'hood' | 'short'; hairColor: string; height: number }> = {
  palmer: { top: '#7a5434', bottom: '#5e4128', hair: 'hat', hairColor: '#4a3523', height: 1.65 },
  monk: { top: '#2c2a2e', bottom: '#2c2a2e', hair: 'hood', hairColor: '#2c2a2e', height: 1.65 },
  scholar: { top: '#a8302a', bottom: '#7e2620', hair: 'short', hairColor: '#5a4636', height: 1.65 },
  child: { top: '#3f6fb0', bottom: '#355d92', hair: 'short', hairColor: '#c08a4a', height: 1.1 },
};

export default defineThing({
  questions: {
    style: choice('How is the scene coloured?', STYLES),
    pilgrim: choice('Who has broken through the sky?', PILGRIMS),
    pose: choice('How does the pilgrim go through?', {
      crawling: 'On hands and knees, as in the engraving, head and shoulders out through the shell.',
      kneeling: 'Kneeling upright, head pushed up through the sloping sky, one hand pressed flat against it.',
      reaching: 'On hands and knees with one arm stretched out through the hole toward the wonders.',
    }),
    beyond: choice('What lies beyond the sky?', {
      wheels: 'Great gilt wheels within wheels, their rims set with eyes, turning slowly.',
      clockwork: 'Huge brass gears and cogs meshing, the clockwork that drives the heavens.',
      suns: 'Burning suns with spiky rays hanging over banks of cloud.',
      light: 'A blinding radiance of gold rays and ringed clouds: the light of heaven.',
      abyss: 'A black void with a few cold pale stars: nothing at all, and that is worse.',
    }),
    sky: choice('What is painted on the inside of the sky?', {
      stars: 'Rows of gilt stars on the shell, neat as a ceiling.',
      'sun-moon': 'A sun and a moon with painted faces among the stars.',
      constellations: 'Stars joined by thin gold lines into constellations.',
      clouds: 'Painted clouds along the bottom of the sky and a few faint stars above.',
    }),
    tear: choice('What does the hole in the sky look like?', {
      torn: 'Ragged flaps of sky peeled back like torn canvas round the shoulders.',
      clean: 'A neat round opening with a gilt rim, as if a door had always been there.',
      cracking: 'Cracks spreading across the shell from the hole, fragments of sky fallen to the ground.',
    }),
    earth: choice('What is on the earth behind the pilgrim?', {
      village: 'A little village with a church spire and red roofs among trees.',
      forest: 'Round trees and rolling green hills.',
      fields: 'Striped ploughed fields and a single windmill.',
      bare: 'Bare rock and a path leading to the edge.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const P = PALETTE[a.style];
    const woodcut = a.style === 'woodcut';
    const into = <T extends THREE.Object3D>(group: THREE.Object3D, child: T) => { group.add(child); return child; };
    const gilt = s.material(P.gilt, { metalness: woodcut ? 0 : 0.75, roughness: woodcut ? 0.8 : mix(0.3, 0.55, mood.wear) });
    const ink = s.material(P.ink, { roughness: 0.8 });
    const glowAmount = mix(0.25, 1.1, mood.cheer);
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

    // ---- The sky: the back half of a dome over a round slab of earth, open toward the viewer.
    // A tall, shallow half-ellipsoid, so the starry inside faces the viewer.
    const R = 1.5, SY = 1.3, SZ = 0.72, G = 0.08;
    const shellX = (y: number, z: number) => R * Math.sqrt(Math.max(0, 1 - (z / (R * SZ)) ** 2 - ((y - G) / (R * SY)) ** 2));

    // ---- The pilgrim, posed first so the hole can be put where the shoulders are.
    const robe = ROBES[a.pilgrim];
    const H = robe.height;
    const person = figure(s, {
      height: H, pose: 'kneeling', style: 'doll', hair: robe.hair, hairColor: woodcut ? '#3a3430' : robe.hairColor,
      top: woodcut ? '#4a4440' : robe.top, bottom: woodcut ? '#3a3430' : robe.bottom, skin: P.skin, shoes: '#2a2420',
      build: a.pilgrim === 'child' ? 'slight' : 'average', sleeves: 'long',
    });
    const j = person.joints;
    if (a.pose === 'kneeling') {
      j.spine.rotation.x = 0.3;
      j.neck.rotation.x = -0.75;
      j.body.rotation.x = 0.12;
      j.shoulders.left.rotation.set(-2.5, 0, 0.15);
      j.elbows.left.rotation.set(-0.35, 0, 0);
      j.shoulders.right.rotation.set(-0.5, 0, -0.1);
      j.elbows.right.rotation.set(-0.9, 0, 0);
    } else {
      const bend = 1.35;
      j.hips.left.rotation.set(0, 0, 0.05); j.hips.right.rotation.set(0, 0, -0.05);
      j.knees.left.rotation.x = j.knees.right.rotation.x = Math.PI / 2;
      j.ankles.left.rotation.x = j.ankles.right.rotation.x = 1.3;
      j.spine.rotation.x = bend;
      j.shoulders.left.rotation.set(-bend, 0, 0.12);
      j.shoulders.right.rotation.set(-bend, 0, -0.12);
      j.elbows.left.rotation.set(-0.05, 0, 0);
      j.elbows.right.rotation.set(-0.05, 0, 0);
      j.neck.rotation.x = -bend - 0.25;
      if (a.pose === 'reaching') {
        j.shoulders.right.rotation.set(-bend - 1.35, 0, -0.05);
        j.elbows.right.rotation.set(-0.1, 0, 0);
        j.neck.rotation.x = -bend - 0.35;
      }
    }
    // A short tunic skirt falls from the hips.
    const skirtLength = Math.min(H * 0.24, person.hipHeight * 0.5);
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(H * 0.085, H * 0.115, skirtLength, 18, 1, true), s.material(woodcut ? '#4a4440' : robe.top, { side: THREE.DoubleSide, roughness: 0.8 }));
    skirt.position.y = -skirtLength / 2 + H * 0.03;
    skirt.castShadow = true;
    j.pelvis.add(skirt);
    person.settle();
    s.root.add(person.root);
    // Measure where the chest is, in the figure's own frame (it faces +z there).
    person.root.updateMatrixWorld(true);
    const spineAt = j.spine.getWorldPosition(new THREE.Vector3());
    const neckAt = j.neck.getWorldPosition(new THREE.Vector3());
    const chest = spineAt.clone().lerp(neckAt, a.pose === 'kneeling' ? 0.72 : 0.5);
    // Turn to face +x, through the right-hand wall of the sky.
    const PZ = -0.2;
    const crossY = chest.y + G;
    const PX = shellX(crossY, PZ) - chest.z;
    person.root.rotation.y = Math.PI / 2;
    person.root.position.set(PX, G, PZ + chest.x);
    person.root.updateMatrixWorld(true);
    const hole = new THREE.Vector3(shellX(crossY, PZ), crossY, PZ);
    const normal = new THREE.Vector3(hole.x, (hole.y - G) / (SY * SY), hole.z / (SZ * SZ)).normalize();

    // ---- Paint the inside and the outside of the dome. Canvas x runs round the dome, y from the zenith down.
    const uvOf = (p: THREE.Vector3) => {
      const theta = Math.acos(Math.min(1, (p.y - G) / SY / R));
      let phi = Math.atan2(p.z / SZ, -p.x);
      if (phi < 0) phi += Math.PI * 2;
      return [(phi - Math.PI) / Math.PI, theta / (Math.PI / 2)] as const;
    };
    const TW = 2048, TH = 768;
    const [skyCanvas, sky] = sheet(TW, TH);
    sky.fillStyle = P.sky; sky.fillRect(0, 0, TW, TH);
    if (woodcut) hatch(sky, TW, TH, '#f4ecd8', 0.14, 9);
    const starCount = Math.round(mix(70, 170, mood.density));
    const stars: [number, number, number][] = [];
    if (a.sky === 'stars') {
      for (let row = 1; row < 7; row++) for (let col = 0; col < 22; col++) {
        const x = (col + 0.5 + (row % 2) * 0.5) * (TW / 22), y = (row + 0.2) * (TH / 7);
        stars.push([x + (random() - 0.5) * 20, y + (random() - 0.5) * 20, 12 + random() * 8]);
      }
    } else {
      const n = a.sky === 'clouds' ? Math.round(starCount * 0.35) : starCount;
      for (let i = 0; i < n; i++) stars.push([random() * TW, TH * 0.08 + random() * TH * (a.sky === 'clouds' ? 0.5 : 0.88), 7 + random() * 10]);
    }
    if (a.sky === 'constellations') {
      sky.strokeStyle = P.star; sky.lineWidth = 3; sky.globalAlpha = 0.85;
      for (let c = 0; c < 10; c++) {
        let [x, y] = [100 + random() * (TW - 200), 140 + random() * (TH - 260)];
        sky.beginPath(); sky.moveTo(x, y); stars.push([x, y, 15]);
        for (let k = 0; k < 4 + Math.floor(random() * 3); k++) {
          x += (random() - 0.4) * 150; y += (random() - 0.5) * 120;
          sky.lineTo(x, y); stars.push([x, y, 13 + random() * 6]);
        }
        sky.stroke();
      }
      sky.globalAlpha = 1;
    }
    sky.fillStyle = P.star;
    for (const [x, y, r] of stars) drawStar(sky, x, y, r);
    if (a.sky === 'sun-moon') {
      drawFace(sky, TW * 0.3, TH * 0.42, 95, woodcut ? '#f7f3e8' : '#f2c64e', P.ink, true);
      drawFace(sky, TW * 0.7, TH * 0.48, 75, woodcut ? '#f7f3e8' : '#e6e8ee', P.ink, false);
    }
    if (a.sky === 'clouds') {
      sky.fillStyle = woodcut ? '#f7f3e8' : P.cloud;
      for (let i = 0; i < 70; i++) {
        const x = random() * TW, y = TH - random() * TH * 0.22, r = 40 + random() * 50;
        sky.beginPath(); sky.arc(x, y, r, 0, Math.PI * 2); sky.fill();
      }
    }
    const [outCanvas, out] = sheet(TW, TH);
    out.fillStyle = P.outer; out.fillRect(0, 0, TW, TH);
    if (woodcut) hatch(out, TW, TH, P.ink, 0.12, 14);
    else {
      // A faint plaster grain on the outside: the sky was never meant to be seen from here.
      for (let i = 0; i < 1600; i++) {
        out.fillStyle = random() < 0.5 ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.08)';
        out.fillRect(random() * TW, random() * TH, 3 + random() * 8, 2 + random() * 4);
      }
    }
    const [hu, hv] = uvOf(hole);
    if (a.tear === 'cracking' || mood.wear > 0.6) {
      const reach = a.tear === 'cracking' ? 1.4 : (mood.wear - 0.6) * 2;
      drawCrack(sky, hu * TW, hv * TH, reach, random, woodcut ? '#1d1a17' : '#f5ecd2', 7);
      drawCrack(out, hu * TW, hv * TH, reach, random, woodcut ? '#1d1a17' : '#3a3550', 6);
    }
    const shellGeo = new THREE.SphereGeometry(R, 72, 28, Math.PI, Math.PI, 0, Math.PI / 2);
    shellGeo.scale(1, SY, SZ);
    const inner = s.mesh(shellGeo, new THREE.MeshStandardMaterial({ map: texture(skyCanvas), side: THREE.BackSide, roughness: 0.85 }), [0, G, 0]);
    inner.castShadow = false;
    s.mesh(shellGeo, new THREE.MeshStandardMaterial({ map: texture(outCanvas), side: THREE.FrontSide, roughness: 0.85 }), [0, G, 0]);
    // A gilt rim along the cut edge of the dome.
    const rimPoints: [number, number, number][] = [];
    for (let k = 0; k <= 60; k++) { const t = (k / 60) * Math.PI; rimPoints.push([Math.cos(t) * R, G + Math.sin(t) * R * SY, 0]); }
    s.tube(rimPoints, 0.03, gilt);

    // ---- The earth: a round slab under the dome, its rim showing soil.
    const [groundCanvas, gc] = sheet(1024, 1024);
    gc.fillStyle = P.grass; gc.fillRect(0, 0, 1024, 1024);
    if (woodcut) hatch(gc, 1024, 1024, P.ink, 0.25, 11);
    if (a.earth === 'fields') {
      for (let f = 0; f < 7; f++) {
        const x0 = f * 150 + random() * 20, w = 135;
        gc.fillStyle = f % 2 ? (woodcut ? '#e2d8c0' : '#b89a5a') : (woodcut ? '#f2ebda' : '#9aa85a');
        gc.fillRect(x0, 0, w, 1024);
        gc.strokeStyle = 'rgba(40,30,20,0.35)'; gc.lineWidth = 3;
        for (let k = 10; k < w; k += 16) { gc.beginPath(); gc.moveTo(x0 + k, 0); gc.lineTo(x0 + k, 1024); gc.stroke(); }
      }
    }
    if (a.earth === 'bare') {
      gc.fillStyle = woodcut ? '#ddd2b8' : '#a39a88'; gc.fillRect(0, 0, 1024, 1024);
      gc.strokeStyle = woodcut ? P.ink : '#c9b48a'; gc.lineWidth = 30; gc.lineCap = 'round';
      gc.beginPath(); gc.moveTo(120, 760); gc.quadraticCurveTo(520, 420, 990, 560); gc.stroke();
    }
    gc.strokeStyle = P.gilt; gc.lineWidth = 14;
    gc.beginPath(); gc.arc(512, 512, 505, 0, Math.PI * 2); gc.stroke();
    const soil = s.material(P.soil, { roughness: 0.95 });
    const top = new THREE.MeshStandardMaterial({ map: texture(groundCanvas), roughness: 0.9 });
    const slab = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.07, R + 0.03, G, 72), [soil, top, soil]);
    slab.position.set(0, G / 2, 0);
    slab.scale.z = SZ;
    slab.castShadow = slab.receiveShadow = true;
    s.root.add(slab);

    // Earth-side scenery, kept clear of the pilgrim and the middle of the foreground.
    const scenery = (count: number) => {
      const spots: [number, number][] = [];
      for (let tries = 0; spots.length < count && tries < count * 8; tries++) {
        const t = random() * Math.PI * 2, r = Math.sqrt(random()) * (R - 0.22);
        const x = Math.cos(t) * r, z = Math.sin(t) * r * SZ;
        if (x > PX - 0.6 * H && Math.abs(z - PZ) < 0.45) continue;
        if (z > 0.35 && Math.abs(x) < 0.6) continue;
        if (spots.some(([ox, oz]) => Math.hypot(ox - x, oz - z) < 0.16)) continue;
        spots.push([x, z]);
      }
      return spots;
    };
    const leaf = s.material(woodcut ? '#f2ecdc' : a.style === 'dusk' ? '#4f6a48' : '#4f7f3a', { roughness: 0.85 });
    const bark = s.material(woodcut ? P.ink : '#5a3c26');
    const density = Math.round(mix(5, 13, mood.density));
    if (a.earth === 'village' || a.earth === 'forest') {
      const trees = scenery(a.earth === 'forest' ? density + 4 : Math.round(density / 2));
      const crowns = trees.map(([x, z]) => ({ at: [x, G + 0.16 + random() * 0.04, z] as const, size: 0.08 + random() * 0.04 }));
      s.scatter(new THREE.SphereGeometry(1, 12, 9), leaf, crowns);
      s.scatter(new THREE.CylinderGeometry(0.12, 0.16, 1, 6), bark, trees.map(([x, z]) => ({ at: [x, G + 0.05, z] as const, size: 0.1 })));
      if (a.earth === 'forest') {
        const hills = scenery(4).map(([x, z]) => ({ at: [x, G, z] as const, size: 0.18 + random() * 0.1 }));
        const hill = new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
        hill.scale(1, 0.5, 1);
        s.scatter(hill, s.material(woodcut ? '#e8dfc8' : a.style === 'dusk' ? '#5f7050' : '#6f9446', { roughness: 0.9 }), hills);
      }
    }
    if (a.earth === 'village') {
      const wall = s.material(woodcut ? '#f2ecdc' : '#e8dcc0', { roughness: 0.85 });
      const roofPaint = s.material(woodcut ? P.ink : '#a8442e', { roughness: 0.7 });
      const houses = scenery(Math.round(density * 0.7));
      houses.forEach(([x, z], i) => {
        const w = 0.09 + random() * 0.05, h = 0.08 + random() * 0.04;
        const turn = random() * 0.6 - 0.3;
        s.box([w, h, w * 0.8], [x, G + h / 2, z], wall).rotation.y = turn;
        const roof = s.mesh(new THREE.ConeGeometry(w * 0.78, h * 0.8, 4), roofPaint, [x, G + h + h * 0.4, z]);
        roof.rotation.y = Math.PI / 4 + turn;
        if (i === 0) {
          s.box([0.07, 0.26, 0.07], [x + 0.1, G + 0.13, z], wall);
          s.mesh(new THREE.ConeGeometry(0.055, 0.2, 4), roofPaint, [x + 0.1, G + 0.36, z]).rotation.y = Math.PI / 4;
          s.rod([x + 0.1, G + 0.46, z], [x + 0.1, G + 0.52, z], 0.006, gilt);
        }
      });
    }
    if (a.earth === 'fields') {
      const [mx, mz] = scenery(1)[0] ?? [-0.9, -0.2];
      s.cylinder(0.05, 0.08, 0.3, [mx, G + 0.15, mz], s.material(woodcut ? '#f2ecdc' : '#d8ccb0'), 10);
      s.mesh(new THREE.ConeGeometry(0.07, 0.08, 10), s.material(woodcut ? P.ink : '#8a5a3a'), [mx, G + 0.34, mz]);
      const sails = new THREE.Group();
      sails.position.set(mx, G + 0.27, mz + 0.06);
      s.root.add(sails);
      for (let k = 0; k < 4; k++) into(sails, s.box([0.035, 0.2, 0.006], [Math.sin(k * Math.PI / 2) * 0.1, Math.cos(k * Math.PI / 2) * 0.1, 0], s.material(woodcut ? '#f7f3e8' : '#f0e8d8'))).rotation.z = -k * Math.PI / 2;
    }
    if (a.earth === 'bare') {
      const rocks = scenery(density).map(([x, z]) => ({ at: [x, G + 0.02, z] as const, size: 0.05 + random() * 0.07 }));
      s.scatter(new THREE.DodecahedronGeometry(1, 0), s.material(woodcut ? '#d8cdb4' : '#8d877c', { roughness: 0.95 }), rocks);
    }

    // ---- What the pilgrim carries, and what they dropped.
    const wood = s.material(woodcut ? '#3a3430' : '#6a4a2c', { roughness: 0.7 });
    const staffZ = PZ + (a.pilgrim === 'child' ? 0.16 : 0.22);
    if (a.pose === 'kneeling') {
      const hand = person.hands.right.getWorldPosition(new THREE.Vector3());
      s.rod([hand.x - 0.05, G, hand.z - 0.04], [hand.x + 0.02, G + H * 0.95, hand.z + 0.01], 0.018, wood);
    } else {
      s.rod([PX - 0.65 * H, G + 0.018, staffZ], [PX + 0.08, G + 0.018, staffZ - 0.04], 0.018, wood);
    }
    if (a.pilgrim === 'palmer') {
      const gourd = s.ball([0.045, 0.06, 0.045], [PX - 0.5 * H, G + 0.05, staffZ + 0.05], s.material(woodcut ? '#efe4cc' : '#c8963c', { roughness: 0.6 }), 12);
      void gourd;
      const badge = new THREE.Mesh(new THREE.CircleGeometry(0.03 * H, 10, 0, Math.PI), s.material('#f2ead6', { side: THREE.DoubleSide }));
      badge.position.set(0, 0.064 * H * 1.0, 0.064 * H * 0.95);
      person.head.add(badge);
    }
    if (a.pilgrim === 'scholar') {
      const cap = new THREE.Mesh(new THREE.BoxGeometry(0.15 * H * 0.6, 0.02, 0.15 * H * 0.6), s.material('#1f1c1e'));
      cap.position.y = 0.064 * H * 1.05;
      person.head.add(cap);
      const book = s.box([0.16, 0.035, 0.22], [PX - 0.75, G + 0.018, PZ + 0.32], s.material(woodcut ? '#3a3430' : '#5a2a22'));
      book.rotation.y = 0.5;
      s.box([0.15, 0.01, 0.2], [PX - 0.75, G + 0.04, PZ + 0.32], s.material('#efe6d0')).rotation.y = 0.5;
    }

    // ---- The hole: torn flaps, a gilt door rim, or nothing but cracks and fallen pieces.
    const side = new THREE.Vector3(0, 0, 1).cross(normal).normalize();
    const upOnShell = normal.clone().cross(side).normalize();
    const holeR = 0.15 * H + 0.04;
    const flapMaterial = new THREE.MeshStandardMaterial({ color: P.sky, side: THREE.DoubleSide, roughness: 0.8 });
    if (a.tear === 'torn') {
      const count = 11, verts: number[] = [];
      for (let i = 0; i < count; i++) {
        const t0 = (i / count) * Math.PI * 2, t1 = ((i + 0.8) / count) * Math.PI * 2, tm = (t0 + t1) / 2;
        const ring = (t: number, r: number) => hole.clone().addScaledVector(side, Math.cos(t) * r).addScaledVector(upOnShell, Math.sin(t) * r);
        const a0 = ring(t0, holeR * 0.95), a1 = ring(t1, holeR * 0.95);
        const tip = ring(tm, holeR * (1.05 + random() * 0.3)).addScaledVector(normal, 0.1 + random() * 0.1);
        verts.push(...a0.toArray(), ...a1.toArray(), ...tip.toArray());
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
      geometry.computeVertexNormals();
      s.mesh(geometry, flapMaterial);
    } else if (a.tear === 'clean') {
      const rim = s.ring(holeR, 0.022, hole.toArray() as [number, number, number], gilt);
      rim.lookAt(hole.clone().add(normal));
    } else {
      const pieces: { at: readonly [number, number, number]; size: number }[] = [];
      for (let i = 0; i < 16; i++) {
        const inside = i < 7;
        const x = inside ? PX - 0.2 - random() * 0.6 : hole.x + 0.25 + random() * 0.6;
        pieces.push({ at: [x, (inside ? G : 0) + 0.03, PZ + (random() - 0.5) * 0.8], size: 0.04 + random() * 0.05 });
      }
      const shard = new THREE.TetrahedronGeometry(1);
      shard.scale(1, 0.25, 1);
      s.scatter(shard, flapMaterial, pieces);
    }

    // ---- Beyond the sky.
    const motion: ((dt: number) => void)[] = [];
    const spin = mix(0.05, 0.9, mood.energy);
    const bx = R + 0.85;
    const glowGold = s.material(woodcut ? '#f7f3e8' : '#ffd36a', { emissive: woodcut ? '#000000' : '#ffb030', emissiveIntensity: glowAmount, roughness: 0.4 });
    const clouds = (y: number, spread: number, n: number, colour: string) => {
      const puffs: { at: readonly [number, number, number]; size: number }[] = [];
      for (let i = 0; i < n; i++) {
        const x = R + 0.1 + random() * spread, z = (random() - 0.5) * 1.2;
        const size = 0.11 + random() * 0.1;
        puffs.push({ at: [x, y + size + random() * 0.08, z], size });
      }
      s.scatter(new THREE.SphereGeometry(1, 12, 9), s.material(colour, { roughness: 0.95 }), puffs);
    };
    if (a.beyond === 'wheels') {
      clouds(0.08, 1.5, 26, P.cloud);
      const eyeWhite = s.material('#f6f2e6', { roughness: 0.5 });
      const wheel = (at: THREE.Vector3, r: number, phase: number) => {
        const group = new THREE.Group();
        group.position.copy(at);
        s.root.add(group);
        const rings: THREE.Group[] = [];
        for (const turn of [0, Math.PI / 2]) {
          const ringGroup = new THREE.Group();
          ringGroup.rotation.y = turn + phase;
          group.add(ringGroup);
          const spinner = new THREE.Group();
          ringGroup.add(spinner);
          into(spinner, s.ring(r, r * 0.06, [0, 0, 0], gilt));
          for (let k = 0; k < 8; k++) {
            const t = (k / 8) * Math.PI * 2;
            into(spinner, s.rod([0, 0, 0], [Math.cos(t) * r, Math.sin(t) * r, 0], r * 0.022, gilt));
          }
          const eyes = 10;
          const whites = new THREE.InstancedMesh(new THREE.SphereGeometry(r * 0.075, 10, 8), eyeWhite, eyes);
          const pupils = new THREE.InstancedMesh(new THREE.SphereGeometry(r * 0.04, 8, 6), ink, eyes);
          const m = new THREE.Matrix4();
          for (let k = 0; k < eyes; k++) {
            const t = ((k + 0.5) / eyes) * Math.PI * 2;
            m.makeTranslation(Math.cos(t) * r, Math.sin(t) * r, r * 0.05); whites.setMatrixAt(k, m);
            m.makeTranslation(Math.cos(t) * r, Math.sin(t) * r, r * 0.11); pupils.setMatrixAt(k, m);
          }
          spinner.add(whites, pupils);
          rings.push(spinner);
        }
        into(group, s.ball([r * 0.12, r * 0.12, r * 0.12], [0, 0, 0], glowGold, 14));
        motion.push((dt) => { rings[0].rotation.z += dt * spin; rings[1].rotation.z -= dt * spin * 0.8; });
      };
      wheel(new THREE.Vector3(bx + 0.25, 1.05, -0.2), 0.55, 0.5);
      wheel(new THREE.Vector3(bx - 0.25, 0.5, 0.35), 0.3, 1.2);
    } else if (a.beyond === 'clockwork') {
      clouds(0.06, 1.4, 16, P.cloud);
      const brass = s.material(woodcut ? '#3a3430' : '#b8893a', { metalness: woodcut ? 0 : 0.7, roughness: 0.45 });
      const toothed = s.material(woodcut ? '#1d1a17' : '#d4aa4e', { metalness: woodcut ? 0 : 0.75, roughness: 0.4 });
      const gear = (at: [number, number, number], r: number, teeth: number, rate: number, facing: number) => {
        const group = new THREE.Group();
        group.position.set(...at);
        group.rotation.y = facing;
        s.root.add(group);
        const wheelGroup = new THREE.Group();
        group.add(wheelGroup);
        const disc = into(wheelGroup, s.cylinder(r, r, 0.05, [0, 0, 0], brass, 40));
        disc.rotation.x = Math.PI / 2;
        const hubR = r * 0.18;
        into(wheelGroup, s.cylinder(hubR, hubR, 0.12, [0, 0, 0], toothed, 16)).rotation.x = Math.PI / 2;
        const size = (2 * Math.PI * r) / teeth * 0.5;
        const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(size, size * 1.3, 0.05), toothed, teeth);
        const m = new THREE.Matrix4();
        for (let k = 0; k < teeth; k++) {
          const t = (k / teeth) * Math.PI * 2;
          m.makeRotationZ(t - Math.PI / 2).setPosition(Math.cos(t) * (r + size * 0.5), Math.sin(t) * (r + size * 0.5), 0);
          mesh.setMatrixAt(k, m);
        }
        mesh.castShadow = true;
        wheelGroup.add(mesh);
        // Spokes cut out of the disc read as darker bars.
        for (let k = 0; k < 4; k++) into(wheelGroup, s.box([r * 1.6, r * 0.12, 0.06], [0, 0, 0.005], ink)).rotation.z = (k * Math.PI) / 4;
        motion.push((dt) => { wheelGroup.rotation.z += dt * spin * rate; });
      };
      gear([bx + 0.2, 1.0, -0.25], 0.5, 36, 0.5, 0.15);
      gear([bx - 0.32, 0.42, 0.05], 0.26, 20, -0.9, 0.15);
      gear([bx + 0.62, 0.32, 0.25], 0.2, 16, -1.1, -0.2);
      gear([bx - 0.1, 1.62, -0.35], 0.18, 14, -1.3, 0.1);
      s.rod([bx + 0.2, 0, -0.25], [bx + 0.2, 1.0, -0.25], 0.03, brass);
    } else if (a.beyond === 'suns') {
      clouds(0.08, 1.6, 30, P.cloud);
      const sun = (at: [number, number, number], r: number) => {
        const group = new THREE.Group();
        group.position.set(...at);
        s.root.add(group);
        into(group, s.ball([r, r, r], [0, 0, 0], glowGold, 20));
        const rays = 14;
        const mesh = new THREE.InstancedMesh(new THREE.ConeGeometry(r * 0.2, r * 0.8, 5), glowGold, rays);
        const m = new THREE.Matrix4(), q = new THREE.Quaternion();
        for (let k = 0; k < rays; k++) {
          const t = (k / rays) * Math.PI * 2;
          q.setFromAxisAngle(new THREE.Vector3(0, 0, 1), t - Math.PI / 2);
          m.compose(new THREE.Vector3(Math.cos(t) * r * 1.35, Math.sin(t) * r * 1.35, 0), q, new THREE.Vector3(1, k % 2 ? 0.7 : 1.2, 1));
          mesh.setMatrixAt(k, m);
        }
        group.add(mesh);
        const pace = 0.6 + random();
        motion.push((dt) => { group.rotation.z += dt * spin * 0.3 * pace; });
      };
      sun([bx + 0.25, 1.15, -0.25], 0.3);
      sun([bx - 0.35, 0.65, 0.25], 0.17);
      sun([bx + 0.6, 0.5, 0.3], 0.12);
      const orbit = s.ring(0.55, 0.008, [bx + 0.25, 1.15, -0.25], gilt);
      orbit.rotation.x = 1.2;
    } else if (a.beyond === 'light') {
      clouds(0.06, 1.6, 34, P.cloud);
      const centre: [number, number, number] = [bx + 0.15, 1.0, -0.3];
      s.ball([0.22, 0.22, 0.22], centre, glowGold, 20);
      const rays = new THREE.Group();
      rays.position.set(...centre);
      s.root.add(rays);
      const beam = new THREE.MeshStandardMaterial({ color: woodcut ? '#1d1a17' : '#ffe6a0', emissive: woodcut ? '#000000' : '#ffc040', emissiveIntensity: glowAmount, transparent: true, opacity: woodcut ? 0.5 : 0.55, depthWrite: false, side: THREE.DoubleSide });
      for (let k = 0; k < 22; k++) {
        const t = (k / 22) * Math.PI * 2, length = 0.6 + (k % 2) * 0.35 + random() * 0.2;
        const ray = new THREE.Mesh(new THREE.PlaneGeometry(0.04 + (k % 2) * 0.03, length), beam);
        ray.position.set(Math.cos(t) * (0.25 + length / 2), Math.sin(t) * (0.25 + length / 2), 0);
        ray.rotation.z = t - Math.PI / 2;
        rays.add(ray);
      }
      // Rings of cloud round the light, as in Dante's paradise.
      const ringPuffs: { at: readonly [number, number, number]; size: number }[] = [];
      for (let k = 0; k < 3; k++) {
        const r = 0.4 + k * 0.21, n = 13 + k * 7;
        for (let i = 0; i < n; i++) {
          const t = (i / n) * Math.PI * 2 + random() * 0.2;
          ringPuffs.push({ at: [centre[0] + Math.cos(t) * r, centre[1] + Math.sin(t) * r, centre[2] + (random() - 0.5) * 0.08], size: 0.045 + random() * 0.035 - k * 0.006 });
        }
      }
      s.scatter(new THREE.SphereGeometry(1, 10, 8), s.material(P.cloud, { roughness: 0.95, emissive: woodcut ? '#000000' : '#ffe0a0', emissiveIntensity: glowAmount * 0.3 }), ringPuffs);
      motion.push((dt) => { rays.rotation.z += dt * spin * 0.15; });
    } else {
      // The abyss: a cold black disc of nothing, a few pale stars, grey smoke at its foot.
      clouds(0.06, 1.4, 18, woodcut ? '#cfc6b0' : '#6e6a72');
      const voidDisc = s.mesh(new THREE.CircleGeometry(0.95, 48), new THREE.MeshStandardMaterial({ color: '#0d0f18', roughness: 1, side: THREE.DoubleSide }), [bx + 0.2, 1.0, -0.55]);
      voidDisc.rotation.y = -0.25;
      const cold: { at: readonly [number, number, number]; size: number }[] = [];
      for (let i = 0; i < 18; i++) {
        const t = random() * Math.PI * 2, r = random() * 0.85;
        cold.push({ at: [bx + 0.2 + Math.cos(t) * r * 0.97, 1.0 + Math.sin(t) * r, -0.52 + Math.cos(t) * r * 0.24], size: 0.012 + random() * 0.012 });
      }
      s.scatter(new THREE.OctahedronGeometry(1), s.material('#dfe8ff', { emissive: '#bcd0ff', emissiveIntensity: 0.6 }), cold);
    }

    return s.finish({
      update: (dt, time) => {
        person.update(dt, time);
        for (const step of motion) step(dt);
      },
    });
  },
});
