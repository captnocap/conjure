import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';
import { drawHills, drawRose, drawSerpent, drawStar, drawTown, drawTree, flake, weave } from './paint';

const STYLES = {
  manuscript: 'Parchment land and lapis-blue sea with gilt details: an illuminated mappa mundi.',
  woodcut: 'Black ink on cream paper, hatched seas and outlined hills: a printed almanac map.',
  fresco: 'Red earth, faded sky-blue and ochre on plaster: a church ceiling.',
  lapis: 'A deep ultramarine ground with the continents laid in gold leaf.',
  globe: 'Glossy schoolroom colours: green continents, a blue sea, a brass rim on a walnut board.',
} as const;
interface Palette { board: string; ocean: string; land: string; ink: string; gilt: string; bare: string; leaf: string; wave: string; mark: string; metal: string; grain: string }
const PALETTE: Record<keyof typeof STYLES, Palette> = {
  manuscript: { board: '#e8dcb8', ocean: '#2d5fa6', land: '#e2cf9c', ink: '#3a2a18', gilt: '#d9b254', bare: '#eee4c8', leaf: '#6f8f4a', wave: '#dfe8f4', mark: '#e8d9a8', metal: '#d9b254', grain: '#000000' },
  woodcut: { board: '#efe6d0', ocean: '#e4dbc2', land: '#f3ecd8', ink: '#201b17', gilt: '#4a3f33', bare: '#f6f0dc', leaf: '#f3ecd8', wave: '#201b17', mark: '#201b17', metal: '#3a3430', grain: '#000000' },
  fresco: { board: '#d8cdb0', ocean: '#8fb0bd', land: '#cfae72', ink: '#8a3b2a', gilt: '#c9a35c', bare: '#e0d6bc', leaf: '#8a9a5a', wave: '#eef3f3', mark: '#8a3b2a', metal: '#c9a35c', grain: '#000000' },
  lapis: { board: '#1f3a7a', ocean: '#1a2e63', land: '#d8b45a', ink: '#1f2f5a', gilt: '#efd27a', bare: '#2b4488', leaf: '#b8923e', wave: '#8fa3d8', mark: '#efd27a', metal: '#efd27a', grain: '#ffffff' },
  globe: { board: '#8a6a48', ocean: '#2f6fa8', land: '#6f9a4e', ink: '#2e2e2e', gilt: '#c9a44a', bare: '#a08c6a', leaf: '#3f6a2c', wave: '#cfe3f2', mark: '#e9eef4', metal: '#c9a44a', grain: '#000000' },
};

export default defineThing({
  questions: {
    style: choice('How is the world painted?', STYLES),
    edge: choice('What happens at the edge of the world?', {
      waterfall: 'The rim ocean pours off the edge in white cascades that hang below the disc.',
      ice: 'A jagged wall of blue-white ice stands all round the rim.',
      fire: 'A ring of flames burns round the edge of the world.',
      serpent: 'A great green serpent lies coiled round the rim, biting its own tail.',
      plain: 'A plain gilt rim and nothing beyond it.',
    }),
    centre: choice('What stands at the centre of the world?', {
      city: 'A small walled holy city with corner towers and a gilt dome.',
      tower: 'A tall stepped tower of ochre brick with a ramp spiralling up it, like Babel.',
      paradise: 'A green mound with a single tree: the garden at the top of the world.',
      cathedral: 'A grey cathedral with a tall spire.',
      star: 'Nothing built: a gilt star on a pin marks the navel of the world.',
    }),
    marks: choice('How is the map lettered and decorated?', {
      names: 'The continents lettered in Latin capitals: ASIA, EVROPA, AFRICA.',
      beasts: 'Sea serpents drawn swimming in the rim ocean.',
      rhumbs: 'A compass rose with rhumb lines ruled across the board beneath.',
      plain: 'Only the painted land and sea.',
    }),
    winds: choice('Who blows the winds?', {
      four: 'Four fat-cheeked cherub heads at the corners, each blowing a cone of breath at the world.',
      two: 'Two cherubs at opposite corners blowing against each other.',
      one: 'One great wind-head with a long gale of breath.',
      none: 'No wind-heads: the corners are bare.',
    }),
    stand: choice('How is the disc held up?', {
      feet: 'Lying flat on three gilt feet on a map board.',
      lectern: 'Propped on a wooden slab tilted toward the viewer like a lectern.',
      cloud: 'Lifted on a column of white cloud.',
      turtle: 'Carried on the back of a great turtle, as some tales had it.',
    }),
    state: choice('What is happening on the world?', {
      whole: 'All in order: calm seas and tidy continents.',
      ship: 'A tiny ship has reached the edge and is tipping over it, sail and all.',
      cracked: 'A crack runs across the disc and one half has lifted and sheared.',
      unpainted: 'The mapmaker is mid-work: one continent is blank vellum, and a brush and ink pot lie on the board.',
      drowned: 'The seas have risen: only three islands remain where the continents were.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const P = PALETTE[a.style];
    const R = 0.55, T = 0.09;
    const into = <T extends THREE.Object3D>(group: THREE.Object3D, child: T) => { group.add(child); return child; };
    const gold = s.material(P.metal, { metalness: 0.75, roughness: mix(0.3, 0.55, mood.wear) });
    const dark = s.material('#3b2f22', { roughness: 0.7 });
    const drowned = a.state === 'drowned';
    const blank = a.state === 'unpainted' ? Math.floor(random() * 3) : -1;
    const sheet = (size: number, h = size) => {
      const canvas = document.createElement('canvas');
      canvas.width = size; canvas.height = h;
      return [canvas, canvas.getContext('2d')!] as const;
    };
    const texture = (canvas: HTMLCanvasElement) => {
      const map = new THREE.CanvasTexture(canvas);
      map.colorSpace = THREE.SRGBColorSpace;
      map.anisotropy = 4;
      return map;
    };

    // ---- The map: a T-O world, east at the top, the rim ocean all round.
    const S = 1024, C = 512, Rin = 405;
    const [mapCanvas, ctx] = sheet(S);
    ctx.fillStyle = P.ocean;
    ctx.fillRect(0, 0, S, S);
    if (a.style === 'woodcut') {
      ctx.strokeStyle = P.ink; ctx.lineWidth = 1.6; ctx.globalAlpha = 0.5;
      for (let y = 8; y < S; y += 13) {
        ctx.beginPath(); ctx.moveTo(0, y);
        for (let x = 0; x <= S; x += 24) ctx.quadraticCurveTo(x + 12, y + 5, x + 24, y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    } else {
      ctx.strokeStyle = P.wave; ctx.lineWidth = 2.5;
      const from = drowned ? 40 : Rin + 18;
      for (let i = 0; i < 380; i++) {
        const ang = random() * Math.PI * 2, r = from + random() * (C - from - 30);
        ctx.beginPath(); ctx.arc(C + Math.cos(ang) * r, C + Math.sin(ang) * r, 6 + random() * 7, Math.PI, Math.PI * 2); ctx.stroke();
      }
    }
    const ISLANDS: readonly (readonly [number, number, number, number])[] = [[C, C - 200, 175, 120], [C - 195, C + 205, 125, 110], [C + 195, C + 205, 120, 125]];
    const inside = (i: number, x: number, y: number) => {
      if (drowned) { const [cx, cy, rx, ry] = ISLANDS[i]; return ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 < 0.8; }
      if (Math.hypot(x - C, y - C) > Rin - 16) return false;
      return i === 0 ? y < C - 32 : i === 1 ? y > C + 32 && x < C - 32 : y > C + 32 && x > C + 32;
    };
    ctx.lineWidth = 3; ctx.strokeStyle = P.ink;
    if (drowned) {
      ISLANDS.forEach(([cx, cy, rx, ry], i) => {
        ctx.fillStyle = i === blank ? P.bare : P.land;
        ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      });
    } else {
      ctx.fillStyle = P.land;
      ctx.beginPath(); ctx.arc(C, C, Rin, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.save();
      ctx.beginPath(); ctx.arc(C, C, Rin, 0, Math.PI * 2); ctx.clip();
      if (blank >= 0) {
        ctx.fillStyle = P.bare;
        if (blank === 0) ctx.fillRect(0, 0, S, C); else if (blank === 1) ctx.fillRect(0, C, C, C); else ctx.fillRect(C, C, C, C);
      }
      // The T: the inland seas that divide the three continents.
      ctx.fillStyle = P.ocean;
      ctx.fillRect(C - 18, C - 18, 36, Rin + 40);
      ctx.fillRect(C - Rin - 40, C - 18, Rin * 2 + 80, 36);
      ctx.strokeStyle = P.ink; ctx.lineWidth = 3;
      ctx.strokeRect(C - 18, C - 18, 36, Rin + 60);
      ctx.strokeRect(C - Rin - 60, C - 18, Rin * 2 + 120, 36);
      ctx.restore();
    }
    // Hills, trees and little towns scattered over the land.
    const marks = Math.round(mix(26, 64, mood.density));
    for (let i = 0; i < marks; i++) {
      const ang = random() * Math.PI * 2, r = random() * (drowned ? C : Rin);
      const x = C + Math.cos(ang) * r, y = C + Math.sin(ang) * r;
      const cont = [0, 1, 2].find((c) => inside(c, x, y));
      if (cont === undefined || cont === blank || Math.hypot(x - C, y - C) < 70) continue;
      const kind = random(), size = 13 + random() * 9;
      if (kind < 0.4) drawHills(ctx, x, y, size, P.ink, P.leaf);
      else if (kind < 0.75) drawTree(ctx, x, y, size, P.ink, P.leaf);
      else drawTown(ctx, x, y, size * 0.8, P.ink, P.bare);
    }
    if (blank >= 0) {
      // The unpainted continent: a charcoal sketch of a coastline, nothing more.
      ctx.strokeStyle = '#5a534c'; ctx.lineWidth = 2; ctx.setLineDash([9, 7]);
      const [cx, cy] = drowned ? ISLANDS[blank] : [[C, C - 200], [C - 200, C + 200], [C + 200, C + 200]][blank];
      ctx.beginPath();
      for (let k = 0; k <= 24; k++) { const t = (k / 24) * Math.PI * 2, rr = 90 + Math.sin(t * 3) * 18; ctx.lineTo(cx + Math.cos(t) * rr, cy + Math.sin(t) * rr); }
      ctx.stroke(); ctx.setLineDash([]);
    }
    if (a.marks === 'names') {
      ctx.font = 'bold 62px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const spots = drowned ? ISLANDS.map(([cx, cy]) => [cx, cy]) : [[C, C - Rin * 0.5], [C - Rin * 0.5, C + Rin * 0.55], [C + Rin * 0.5, C + Rin * 0.55]];
      ['ASIA', 'EVROPA', 'AFRICA'].forEach((name, i) => {
        if (i === blank) return;
        ctx.lineWidth = 10; ctx.strokeStyle = P.land; ctx.strokeText(name, spots[i][0], spots[i][1]);
        ctx.fillStyle = P.ink; ctx.fillText(name, spots[i][0], spots[i][1]);
      });
    }
    if (a.marks === 'beasts') {
      for (let i = 0; i < 5; i++) {
        const ang = (i / 5) * Math.PI * 2 + random() * 0.8;
        const r = drowned ? 150 + random() * 300 : (Rin + C) / 2 - 6 + (random() - 0.5) * 30;
        drawSerpent(ctx, C + Math.cos(ang) * r, C + Math.sin(ang) * r, 26 + random() * 14, ang + Math.PI / 2, P.mark);
      }
    }
    if (a.marks === 'rhumbs' && !drowned) drawRose(ctx, C + Math.cos(0.8) * 456, C - Math.sin(0.8) * 456, 38, P.mark, P.gilt);
    // The navel of the world, and the gilt rim.
    ctx.fillStyle = P.gilt; ctx.beginPath(); ctx.arc(C, C, 46, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = P.ink; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = P.ink; drawStar(ctx, C, C, 18);
    ctx.strokeStyle = P.gilt; ctx.lineWidth = 12; ctx.beginPath(); ctx.arc(C, C, C - 7, 0, Math.PI * 2); ctx.stroke();
    if (mood.wear > 0.55) flake(ctx, S, S, random, P.bare, Math.round((mood.wear - 0.55) * 220));
    weave(ctx, S, S, random, P.grain, 500);
    const mapMaterial = new THREE.MeshStandardMaterial({ map: texture(mapCanvas), roughness: a.style === 'globe' ? 0.45 : 0.85, metalness: a.style === 'lapis' ? 0.15 : 0 });

    // The painted rim: a strip of sea with a gilt line top and bottom.
    const [rimCanvas, rc] = sheet(1024, 128);
    rc.fillStyle = P.ocean; rc.fillRect(0, 0, 1024, 128);
    rc.strokeStyle = P.wave; rc.lineWidth = 2.5;
    for (let i = 0; i < 90; i++) { rc.beginPath(); rc.arc(random() * 1024, 20 + random() * 88, 6 + random() * 6, Math.PI, Math.PI * 2); rc.stroke(); }
    rc.strokeStyle = P.gilt; rc.lineWidth = 12;
    rc.beginPath(); rc.moveTo(0, 6); rc.lineTo(1024, 6); rc.moveTo(0, 122); rc.lineTo(1024, 122); rc.stroke();
    weave(rc, 1024, 128, random, P.grain, 120);
    const rimMap = texture(rimCanvas);
    rimMap.wrapS = THREE.RepeatWrapping;
    rimMap.repeat.x = 3;
    const rimMaterial = new THREE.MeshStandardMaterial({ map: rimMap, roughness: 0.8, side: THREE.DoubleSide });

    // ---- The base: a map board, or the ground itself under a turtle.
    const hasBoard = a.stand !== 'turtle';
    const baseTop = hasBoard ? 0.04 : 0;
    if (hasBoard) {
      s.box([1.5, 0.04, 1.5], [0, 0.02, 0], s.material(P.board, { roughness: 0.85 }));
      const [boardCanvas, bc] = sheet(1024);
      bc.fillStyle = P.board; bc.fillRect(0, 0, S, S);
      weave(bc, S, S, random, P.grain, 600);
      bc.strokeStyle = P.gilt; bc.lineWidth = 6; bc.strokeRect(26, 26, S - 52, S - 52);
      bc.strokeStyle = P.ink; bc.lineWidth = 2; bc.strokeRect(40, 40, S - 80, S - 80);
      if (a.marks === 'rhumbs') {
        for (const [cx, cy, colour, alpha] of [[150, 874, P.ink, 0.5], [874, 150, P.gilt, 0.55]] as const) {
          bc.strokeStyle = colour; bc.lineWidth = 1.5; bc.globalAlpha = alpha;
          for (let k = 0; k < 16; k++) {
            const t = (k / 16) * Math.PI;
            bc.beginPath(); bc.moveTo(cx - Math.cos(t) * 1600, cy - Math.sin(t) * 1600); bc.lineTo(cx + Math.cos(t) * 1600, cy + Math.sin(t) * 1600); bc.stroke();
          }
          bc.globalAlpha = 1;
        }
        drawRose(bc, 150, 874, 70, P.ink, P.gilt);
      } else {
        bc.fillStyle = P.gilt;
        for (const [x, y] of [[80, 80], [S - 80, 80], [80, S - 80], [S - 80, S - 80]]) drawStar(bc, x, y, 16);
      }
      const top = s.mesh(new THREE.PlaneGeometry(1.5, 1.5), new THREE.MeshStandardMaterial({ map: texture(boardCanvas), roughness: 0.85 }), [0, 0.0405, 0]);
      top.rotation.x = -Math.PI / 2;
    }

    // ---- The stand, and where it puts the disc.
    const tilt = a.stand === 'lectern' ? 0.42 : 0;
    const lift = a.stand === 'feet' ? 0.08 : a.stand === 'cloud' ? 0.3 : 0;
    let centreY = baseTop + lift + T / 2;
    if (a.stand === 'lectern') centreY = baseTop + R * Math.sin(tilt) + (T / 2) * Math.cos(tilt) + 0.006;
    if (a.stand === 'turtle') {
      const shell = s.material('#5a6b3a', { roughness: 0.6 });
      const hide = s.material('#8a9a5a', { roughness: 0.8 });
      s.ball([0.62, 0.27, 0.66], [0, 0.2, 0], shell, 24);
      s.ball([0.64, 0.06, 0.68], [0, 0.17, 0], s.material('#c8b47a'), 20);
      for (const x of [-1, 1]) for (const z of [-1, 1]) s.cylinder(0.065, 0.08, 0.2, [x * 0.42, 0.1, z * 0.34], hide, 12);
      s.rod([0, 0.2, 0.55], [0, 0.22, 0.72], 0.045, hide);
      const head = s.ball([0.08, 0.07, 0.1], [0, 0.23, 0.78], hide, 14);
      for (const x of [-0.04, 0.04]) s.ball([0.012, 0.012, 0.012], [x, 0.26, 0.85], dark, 8);
      s.cylinder(0.005, 0.03, 0.14, [0, 0.17, -0.68], hide, 8).rotation.x = -Math.PI / 2 - 0.3;
      centreY = 0.45 + T / 2;
      void head;
    }
    const disc = new THREE.Group();
    disc.position.y = centreY;
    disc.rotation.x = tilt;
    s.root.add(disc);
    if (a.stand === 'feet') for (let i = 0; i < 3; i++) {
      const ang = (i / 3) * Math.PI * 2 + 0.6;
      into(disc, s.cylinder(0.035, 0.055, lift, [Math.sin(ang) * 0.4, -T / 2 - lift / 2, Math.cos(ang) * 0.4], gold, 12));
    }
    if (a.stand === 'lectern') {
      const wood = s.material('#5a3c26', { roughness: 0.6 });
      into(disc, s.box([0.5, 0.05, 0.72], [0, -T / 2 - 0.025, 0], wood));
      into(disc, s.box([0.6, 0.05, 0.06], [0, -T / 2 - 0.01, R + 0.02], wood));
      for (const x of [-0.2, 0.2]) {
        const corner = new THREE.Vector3(x, -T / 2 - 0.05, -0.32).applyAxisAngle(new THREE.Vector3(1, 0, 0), tilt).add(new THREE.Vector3(0, centreY, 0));
        s.rod([corner.x, baseTop, corner.z], [corner.x, corner.y, corner.z], 0.02, wood);
      }
    }
    if (a.stand === 'cloud') {
      const puffs: { at: readonly [number, number, number]; size: number }[] = [];
      for (let i = 0; i < 40; i++) {
        const h = random(), ang = random() * Math.PI * 2, spread = 0.16 + (1 - h) * 0.12 + random() * 0.06;
        puffs.push({ at: [Math.cos(ang) * spread, baseTop + 0.03 + h * (lift - 0.06), Math.sin(ang) * spread], size: 0.06 + random() * 0.07 });
      }
      for (let i = 0; i < 12; i++) {
        const ang = (i / 12) * Math.PI * 2 + random() * 0.3;
        puffs.push({ at: [Math.cos(ang) * 0.42, baseTop + lift - 0.04, Math.sin(ang) * 0.42], size: 0.08 + random() * 0.05 });
      }
      s.scatter(new THREE.SphereGeometry(1, 10, 7), s.material('#f4f6fa', { roughness: 0.95 }), puffs);
    }

    // ---- The disc itself: a painted top on a painted rim, whole or cracked in two.
    const halves: THREE.Group[] = [];
    const crack = a.state === 'cracked' ? random() * Math.PI : -1;
    const pieces = crack >= 0 ? [0, 1] : [0];
    for (const i of pieces) {
      const half = new THREE.Group();
      disc.add(half);
      halves.push(half);
      const start = crack >= 0 ? crack + i * Math.PI : 0, length = crack >= 0 ? Math.PI : Math.PI * 2;
      into(half, s.mesh(new THREE.CylinderGeometry(R, R, T, 96, 1, false, start, length), rimMaterial));
      const top = into(half, s.mesh(new THREE.CircleGeometry(R, 96, start - Math.PI / 2, length), mapMaterial, [0, T / 2 + 0.0008, 0]));
      top.rotation.x = -Math.PI / 2;
      if (crack >= 0) {
        // The sheared face along the crack, and the lifted half.
        const face = into(half, s.box([R * 2, T, 0.012], [Math.cos(crack) * 0.006 * (i ? 1 : -1), 0, -Math.sin(crack) * 0.006 * (i ? 1 : -1)], s.material(P.bare, { roughness: 0.9 })));
        face.rotation.y = crack - Math.PI / 2;
        if (i === 1) {
          half.position.y += 0.025;
          half.rotateOnAxis(new THREE.Vector3(Math.sin(crack), 0, Math.cos(crack)), -0.14);
        }
      }
    }
    const topY = T / 2;

    // ---- The edge of the world.
    if (a.edge === 'waterfall') {
      const hang = lift + T + (a.stand === 'lectern' ? 0.2 : 0.02);
      const water = new THREE.MeshStandardMaterial({ color: '#dff0ff', transparent: true, opacity: 0.6, depthWrite: false, side: THREE.DoubleSide, roughness: 0.3, emissive: '#9fc8ff', emissiveIntensity: 0.15 });
      const count = 20;
      for (let i = 0; i < count; i++) {
        const ang = (i / count) * Math.PI * 2 + random() * 0.1;
        const fall = into(disc, s.mesh(new THREE.PlaneGeometry(0.07 + random() * 0.05, hang), water, [Math.sin(ang) * (R + 0.012), topY - hang / 2, Math.cos(ang) * (R + 0.012)]));
        fall.rotation.y = ang;
      }
      const foam: { at: readonly [number, number, number]; size: number }[] = [];
      for (let i = 0; i < 60; i++) {
        const ang = random() * Math.PI * 2, r = R + 0.03 + random() * 0.08;
        foam.push({ at: [Math.sin(ang) * r, topY - hang + 0.01, Math.cos(ang) * r], size: 0.012 + random() * 0.02 });
      }
      disc.add(s.scatter(new THREE.SphereGeometry(1, 8, 6), s.material('#ffffff', { roughness: 0.9 }), foam));
    } else if (a.edge === 'ice') {
      const count = 46;
      const ice = new THREE.InstancedMesh(new THREE.BoxGeometry(0.06, 0.1, 0.05), s.material('#dff3ff', { roughness: 0.35, metalness: 0.1 }), count);
      const matrix = new THREE.Matrix4(), quaternion = new THREE.Quaternion(), euler = new THREE.Euler();
      for (let i = 0; i < count; i++) {
        const ang = (i / count) * Math.PI * 2 + random() * 0.08, h = 0.45 + random() * 0.8;
        euler.set((random() - 0.5) * 0.3, ang + (random() - 0.5) * 0.6, (random() - 0.5) * 0.3);
        matrix.compose(new THREE.Vector3(Math.sin(ang) * (R + 0.02), topY + 0.05 * h - 0.015, Math.cos(ang) * (R + 0.02)), quaternion.setFromEuler(euler), new THREE.Vector3(1, h, 1));
        ice.setMatrixAt(i, matrix);
      }
      ice.castShadow = ice.receiveShadow = true;
      disc.add(ice);
    } else if (a.edge === 'fire') {
      const count = 44;
      const flame = new THREE.InstancedMesh(new THREE.ConeGeometry(0.035, 0.15, 6), s.material('#ff7a1a', { emissive: '#ff5a10', emissiveIntensity: mix(0.8, 1.6, mood.cheer), roughness: 0.6 }), count);
      const matrix = new THREE.Matrix4(), quaternion = new THREE.Quaternion(), euler = new THREE.Euler();
      for (let i = 0; i < count; i++) {
        const ang = (i / count) * Math.PI * 2 + random() * 0.08, h = 0.6 + random() * 1.1;
        euler.set((random() - 0.5) * 0.3, 0, (random() - 0.5) * 0.3);
        matrix.compose(new THREE.Vector3(Math.sin(ang) * (R + 0.025), topY + 0.075 * h, Math.cos(ang) * (R + 0.025)), quaternion.setFromEuler(euler), new THREE.Vector3(1, h, 1));
        flame.setMatrixAt(i, matrix);
      }
      flame.castShadow = true;
      disc.add(flame);
    } else if (a.edge === 'serpent') {
      const green = s.material('#4f7a3a', { roughness: 0.55 });
      const points: [number, number, number][] = [];
      for (let i = 0; i < 48; i++) {
        const ang = (i / 48) * Math.PI * 2, r = R + 0.04 + Math.sin(ang * 6) * 0.012;
        points.push([Math.sin(ang) * r, topY + 0.03 + Math.sin(ang * 9) * 0.012, Math.cos(ang) * r]);
      }
      disc.add(s.tube(points, 0.035, green, true));
      const head = into(disc, s.ball([0.065, 0.05, 0.095], [0, topY + 0.045, R + 0.04], green, 14));
      void head;
      for (const x of [-0.03, 0.03]) into(disc, s.ball([0.012, 0.012, 0.012], [x, topY + 0.07, R + 0.1], s.material('#f2d24a', { emissive: '#f2d24a', emissiveIntensity: 0.5 }), 8));
      for (let i = 0; i < 24; i++) {
        const ang = (i / 24) * Math.PI * 2 + 0.3;
        into(disc, s.box([0.014, 0.04, 0.02], [Math.sin(ang) * (R + 0.04), topY + 0.085, Math.cos(ang) * (R + 0.04)], s.material('#2f4f22'))).rotation.y = ang;
      }
    } else {
      const rim = into(disc, s.ring(R, 0.013, [0, topY, 0], gold));
      rim.rotation.x = Math.PI / 2;
    }

    // ---- What stands at the navel of the world.
    const centre = new THREE.Group();
    centre.position.y = topY;
    disc.add(centre);
    const stone = s.material('#cfc4ad', { roughness: 0.85 });
    const roof = s.material('#9a3b2a', { roughness: 0.7 });
    const glow = s.material(P.metal, { metalness: 0.7, roughness: 0.3, emissive: '#ffb347', emissiveIntensity: mix(0.1, 0.6, mood.cheer) });
    if (a.centre === 'city') {
      into(centre, s.cylinder(0.1, 0.105, 0.035, [0, 0.0175, 0], stone, 24));
      into(centre, s.cylinder(0.075, 0.075, 0.03, [0, 0.05, 0], stone, 20));
      for (let i = 0; i < 4; i++) {
        const ang = (i / 4) * Math.PI * 2 + Math.PI / 4;
        into(centre, s.cylinder(0.014, 0.016, 0.075, [Math.sin(ang) * 0.09, 0.0725, Math.cos(ang) * 0.09], stone, 10));
        into(centre, s.cylinder(0.001, 0.02, 0.03, [Math.sin(ang) * 0.09, 0.125, Math.cos(ang) * 0.09], roof, 10));
      }
      into(centre, s.cylinder(0.04, 0.04, 0.04, [0, 0.085, 0], stone, 16));
      into(centre, s.ball([0.042, 0.04, 0.042], [0, 0.105, 0], glow, 16));
      into(centre, s.box([0.03, 0.03, 0.012], [0, 0.015, 0.1], dark));
    } else if (a.centre === 'tower') {
      const brick = s.material('#b8864a', { roughness: 0.8 });
      for (let level = 0; level < 6; level++) {
        const r = 0.1 - level * 0.013;
        into(centre, s.cylinder(r, r + 0.006, 0.04, [0, 0.02 + level * 0.04, 0], brick, 18));
        const ang = level * 1.2;
        into(centre, s.box([0.035, 0.012, 0.045], [Math.sin(ang) * (r + 0.012), 0.04 + level * 0.04 - 0.004, Math.cos(ang) * (r + 0.012)], s.material('#8a6436'))).rotation.y = ang;
      }
      into(centre, s.cylinder(0.001, 0.03, 0.04, [0, 0.26, 0], roof, 10));
    } else if (a.centre === 'paradise') {
      into(centre, s.ball([0.13, 0.06, 0.13], [0, 0, 0], s.material('#6f9a4e', { roughness: 0.9 }), 18));
      into(centre, s.rod([0, 0.05, 0], [0.01, 0.17, 0], 0.014, s.material('#5a3c26'), 0.008));
      into(centre, s.ball([0.07, 0.06, 0.07], [0.012, 0.2, 0], s.material('#4f8a3a', { roughness: 0.8 }), 14));
      for (let i = 0; i < 7; i++) {
        const ang = random() * Math.PI * 2, r = random() * 0.06;
        into(centre, s.ball([0.008, 0.008, 0.008], [0.012 + Math.cos(ang) * r, 0.2 + (random() - 0.5) * 0.06, Math.sin(ang) * r], s.material('#d8323c'), 6));
      }
    } else if (a.centre === 'cathedral') {
      const grey = s.material('#9ea0a3', { roughness: 0.85 });
      into(centre, s.box([0.06, 0.055, 0.15], [0, 0.0275, 0.01], grey));
      into(centre, s.box([0.13, 0.05, 0.05], [0, 0.025, -0.02], grey));
      into(centre, s.box([0.07, 0.012, 0.16], [0, 0.06, 0.01], s.material('#5a5e63')));
      into(centre, s.box([0.04, 0.1, 0.04], [0, 0.05, 0.07], grey));
      into(centre, s.cylinder(0.001, 0.028, 0.12, [0, 0.16, 0.07], s.material('#5a5e63'), 4));
      into(centre, s.rod([0, 0.22, 0.07], [0, 0.26, 0.07], 0.004, gold));
      into(centre, s.rod([-0.012, 0.245, 0.07], [0.012, 0.245, 0.07], 0.004, gold));
    } else {
      into(centre, s.cylinder(0.006, 0.006, 0.12, [0, 0.06, 0], gold, 8));
      into(centre, s.ball([0.03, 0.03, 0.03], [0, 0.13, 0], glow, 12));
      for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * Math.PI * 2;
        const ray = into(centre, s.cylinder(0.002, 0.009, 0.05, [Math.cos(ang) * 0.05, 0.13 + Math.sin(ang) * 0.05, 0], gold, 5));
        ray.rotation.z = ang - Math.PI / 2;
      }
    }

    // ---- The ship at the edge, or the mapmaker's tools.
    let ship: THREE.Group | null = null;
    if (a.state === 'ship') {
      ship = new THREE.Group();
      const ang = random() * Math.PI * 2;
      ship.position.set(Math.sin(ang) * (R - 0.01), topY + 0.01, Math.cos(ang) * (R - 0.01));
      ship.rotation.y = ang;
      ship.rotation.x = 0.85;
      disc.add(ship);
      into(ship, s.box([0.045, 0.03, 0.11], [0, 0.015, 0], s.material('#5a3c26', { roughness: 0.7 })));
      into(ship, s.box([0.05, 0.012, 0.03], [0, 0.036, -0.045], s.material('#7a5236')));
      into(ship, s.rod([0, 0.03, 0.01], [0, 0.13, 0.01], 0.004, dark));
      const sail = into(ship, s.mesh(new THREE.PlaneGeometry(0.06, 0.06), new THREE.MeshStandardMaterial({ color: '#f4efe2', side: THREE.DoubleSide, roughness: 0.9 }), [0, 0.085, 0.014]));
      sail.rotation.y = 0;
      into(ship, s.box([0.006, 0.02, 0.002], [0, 0.14, 0.012], s.material('#c43a2a')));
    }
    if (a.state === 'unpainted') {
      s.cylinder(0.028, 0.03, 0.045, [0.6, baseTop + 0.0225, 0.12], s.material('#1e1b1a', { roughness: 0.4 }), 14);
      s.cylinder(0.02, 0.02, 0.006, [0.6, baseTop + 0.048, 0.12], s.material('#3b3634'), 14);
      s.rod([0.5, baseTop + 0.007, 0.3], [0.64, baseTop + 0.007, 0.42], 0.007, s.material('#c9a870'), 0.005);
      s.rod([0.5, baseTop + 0.007, 0.3], [0.46, baseTop + 0.007, 0.265], 0.007, s.material('#2a2320'), 0.002);
    }

    // ---- The wind-heads at the corners, blowing at the world.
    const breaths: { pivot: THREE.Group; phase: number; base: number }[] = [];
    const corners: [number, number][] = a.winds === 'four' ? [[1, 1], [-1, 1], [1, -1], [-1, -1]] : a.winds === 'two' ? [[1, 1], [-1, -1]] : a.winds === 'one' ? [[-1, 1]] : [];
    const big = a.winds === 'one' ? 1.6 : 1;
    const skin = s.material('#f0c8b0', { roughness: 0.6 });
    const cheekPaint = s.material('#f2a898', { roughness: 0.6 });
    const curls = s.material('#c9a44a', { metalness: 0.4, roughness: 0.5 });
    const breathPaint = new THREE.MeshStandardMaterial({ color: '#dbe9ff', transparent: true, opacity: 0.4, depthWrite: false, side: THREE.DoubleSide, roughness: 0.4 });
    for (const [cx, cz] of corners) {
      const x = cx * 0.66, z = cz * 0.66, y = centreY + 0.1 + big * 0.04;
      s.rod([x, baseTop, z], [x, y - 0.05 * big, z], 0.012, gold);
      const head = new THREE.Group();
      head.position.set(x, y, z);
      head.rotation.y = Math.atan2(-x, -z);
      head.scale.setScalar(big);
      s.root.add(head);
      into(head, s.ball([0.062, 0.06, 0.06], [0, 0, 0], skin, 16));
      for (const side of [-1, 1]) into(head, s.ball([0.028, 0.024, 0.024], [side * 0.036, -0.012, 0.045], cheekPaint, 10));
      into(head, s.ball([0.012, 0.009, 0.01], [0, -0.022, 0.062], dark, 8));
      for (const side of [-1, 1]) into(head, s.ball([0.006, 0.006, 0.006], [side * 0.024, 0.015, 0.054], dark, 6));
      into(head, s.ball([0.056, 0.05, 0.05], [0, 0.03, -0.015], curls, 12));
      for (let i = 0; i < 6; i++) into(head, s.ball([0.016, 0.016, 0.016], [Math.cos(i * 1.05) * 0.055, 0.045 + Math.sin(i * 0.8) * 0.015, -0.01 + Math.sin(i * 1.05) * 0.03], curls, 7));
      for (const side of [-1, 1]) {
        const wing = into(head, s.ball([0.075, 0.035, 0.012], [side * 0.085, 0.012, -0.03], gold, 12));
        wing.rotation.z = side * 0.5;
        wing.rotation.y = side * 0.4;
      }
      const pivot = new THREE.Group();
      pivot.position.set(0, -0.022, 0.065);
      pivot.rotation.x = Math.PI / 2;
      head.add(pivot);
      const length = a.winds === 'one' ? 0.34 : 0.22;
      into(pivot, s.mesh(new THREE.CylinderGeometry(0.055, 0.012, length, 12, 1, true), breathPaint, [0, length / 2, 0]));
      for (let i = 0; i < 3; i++) into(pivot, s.mesh(new THREE.SphereGeometry(0.012 + i * 0.008, 8, 6), breathPaint, [(random() - 0.5) * 0.04, length * (0.5 + i * 0.2), (random() - 0.5) * 0.04]));
      breaths.push({ pivot, phase: random() * Math.PI * 2, base: 1 });
    }

    const pace = mix(0.2, 3, mood.energy);
    const swell = mix(0.05, 0.3, mood.energy);
    return s.finish({
      update: (dt, time) => {
        void dt;
        for (const breath of breaths) breath.pivot.scale.y = breath.base + Math.sin(time * pace + breath.phase) * swell;
        if (ship) ship.rotation.z = Math.sin(time * pace * 0.7) * 0.12 * mood.energy;
      },
    });
  },
});
